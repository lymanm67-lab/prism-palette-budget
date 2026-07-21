import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { household_id, metrics, period_month } = await req.json();
    if (!household_id) {
      return new Response(JSON.stringify({ error: "household_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sys = `You are a personal CFO writing a monthly financial review for a household.
Tone: warm, direct, actionable. Non-judgmental. Frame everything in terms of Legacy Worth and long-term freedom, not shame.
Output in markdown with these sections in this exact order:
## Executive Summary
## Wins This Month
## Concerns to Address
## Recommended Next Actions (Top 3)
## Legacy Worth Impact
End with one motivational sentence.`;

    const userMsg = `Period: ${period_month}\nMetrics (JSON):\n${JSON.stringify(metrics ?? {}, null, 2)}\n\nGenerate the monthly CFO review.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (!resp.ok) {
      const status = resp.status === 429 || resp.status === 402 ? resp.status : 500;
      const errMsg = resp.status === 429 ? "Rate limited" : resp.status === 402 ? "Credits exhausted" : "AI error";
      return new Response(JSON.stringify({ error: errMsg }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const j = await resp.json();
    const summary_md = j.choices?.[0]?.message?.content || "";

    // Cache the review
    const { data: saved } = await supabase
      .from("monthly_financial_reviews")
      .insert({
        household_id,
        user_id: user.id,
        period_month,
        summary_md,
        metrics,
        model_used: "google/gemini-2.5-flash",
      })
      .select()
      .maybeSingle();

    return new Response(JSON.stringify({ summary_md, id: saved?.id ?? null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
