import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, snapshot, question } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const systemPrompt = `You are the Prism Mortgage Freedom AI Coach — a sharp, non-hype financial advisor.
Your job: help users decide the fastest, safest, lowest-cost path to mortgage freedom without harming retirement, cash flow, or reserves.

Rules:
- Reference the user's EXACT numbers in every sentence.
- Compare tradeoffs (speed vs risk vs liquidity). Quantify.
- Never recommend HELOC/1st-lien HELOC when emergency fund is under 3 months or FICO under 680 — say so directly.
- Prefer fixed-rate strategies when mortgage rate < market.
- Use markdown bullets. Bold key numbers. Keep total under 220 words.
- Never mention "as an AI" or hedge with disclaimers.`;

    let userPrompt = '';
    if (mode === 'narrative') {
      userPrompt = `Explain the recommended payoff strategy in detail.\n\nSnapshot:\n${JSON.stringify(snapshot, null, 2)}`;
    } else if (mode === 'score-improve') {
      userPrompt = `The user's Mortgage Freedom Score is ${snapshot.score}/100 (grade ${snapshot.grade}). Their weakest factors are:\n${JSON.stringify(snapshot.weakFactors, null, 2)}\n\nGive 3 specific, prioritized actions to raise the score by 10+ points within 6-12 months. Reference their actual numbers.`;
    } else if (mode === 'qa') {
      userPrompt = `User question: "${question}"\n\nContext:\n${JSON.stringify(snapshot, null, 2)}`;
    } else {
      userPrompt = `Analyze:\n${JSON.stringify(snapshot, null, 2)}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit — try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("mortgage-freedom-coach gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("mortgage-freedom-coach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
