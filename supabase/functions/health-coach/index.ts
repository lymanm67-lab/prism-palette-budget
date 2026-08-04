import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the PrismMoney™ Health Coach inside a Financial Operating System that treats health like a portfolio: daily deposits (walking, protein, water, sleep) compound into weight loss, energy, productivity and lower lifetime healthcare cost.

RULES:
- Ground EVERY number in the HEALTH DATA block. Never invent miles, weights, protein grams, or dollars. If data is missing, say plainly what to start logging.
- Never shame. Focus on progress, not perfection. Celebrate streaks and milestones by name.
- Structure with short markdown sections and bullets. No more than ~400 words.
- Connect health habits to the financial plan when the data supports it (grocery spend, cost per meal, avoided medical cost, more healthy years for the portfolio to compound).
- You are NOT a physician, dietitian, or licensed medical professional. Include a one-line reminder to consult a doctor before changing diet or exercise.

REPORT SHAPES:
- daily: today's focus. What to walk, protein target remaining, water remaining, one habit to protect, one sentence of encouragement.
- weekly: what worked, what slipped, the weekly health score drivers, next week's single priority.
- monthly: weight trend, walking totals, nutrition consistency, milestone progress, grocery/cost-per-meal read, and the health-to-wealth connection.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json().catch(() => ({}));
    const householdId = body.household_id as string | undefined;
    const reportType = String(body.report_type ?? "daily");
    if (!householdId || !["daily", "weekly", "monthly"].includes(reportType)) {
      return new Response(
        JSON.stringify({ error: "household_id and a valid report_type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    const since = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);

    const [profile, logs, meals, preps, milestones] = await Promise.all([
      supabase.from("health_profile").select("*").eq("household_id", householdId).is("deleted_at", null).maybeSingle(),
      supabase.from("health_daily_logs").select("*").eq("household_id", householdId).is("deleted_at", null).gte("log_date", since).order("log_date", { ascending: false }).limit(120),
      supabase.from("health_meals").select("meal_date, meal_type, name, calories, protein_g").eq("household_id", householdId).is("deleted_at", null).gte("meal_date", since).limit(200),
      supabase.from("health_meal_prep").select("prep_date, containers_packed, meals_consumed").eq("household_id", householdId).is("deleted_at", null).order("prep_date", { ascending: false }).limit(8),
      supabase.from("health_milestones").select("weight_target, reward, achieved_on").eq("household_id", householdId).is("deleted_at", null).order("sort_order"),
    ]);

    if (profile.error) throw profile.error;
    if (!profile.data) {
      return new Response(
        JSON.stringify({ error: "Set up your health profile first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rows = logs.data ?? [];
    const sum = (f: (r: any) => number) => rows.reduce((s, r) => s + (Number(f(r)) || 0), 0);
    const weighIns = rows.filter((r: any) => r.weight != null).map((r: any) => ({ date: r.log_date, weight: Number(r.weight) }));

    const ctx = {
      today,
      report_type: reportType,
      profile: profile.data,
      today_log: rows.find((r: any) => r.log_date === today) ?? null,
      recent_logs: rows.slice(0, 30),
      weigh_ins: weighIns.slice(0, 20),
      totals_last_90_days: {
        miles: sum((r) => r.miles),
        days_logged: rows.length,
        avg_protein_g: rows.length ? sum((r) => r.protein_g) / rows.length : 0,
        avg_water_oz: rows.length ? sum((r) => r.water_oz) / rows.length : 0,
      },
      recent_meals: (meals.data ?? []).slice(0, 30),
      meal_prep: preps.data ?? [],
      milestones: milestones.data ?? [],
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content:
              `Write the ${reportType} brief.\n\n--- HEALTH DATA ---\n` +
              JSON.stringify(ctx, null, 2),
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "429 Rate limited — try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "402 AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ai = await response.json();
    const content = ai?.choices?.[0]?.message?.content ?? "";

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error: insErr } = await admin.from("health_coach_reports").insert({
      household_id: householdId,
      report_type: reportType,
      content,
      data_snapshot: ctx.totals_last_90_days,
    });
    if (insErr) console.error("could not store report", insErr);

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("health-coach error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
