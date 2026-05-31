import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { answers } = await req.json();
    if (!answers) throw new Error("Missing answers");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a friendly, plain-spoken home-buying coach. You are NOT a licensed mortgage advisor — always remind the user to confirm specifics with a loan officer.

Given the user's profile, produce a personalized readiness report in markdown with these sections:

## Where You Stand
A short paragraph in plain English. Be honest.

## Strengths
3-5 bullets.

## Gaps to Close
3-5 bullets, each with a concrete action.

## Loan Types That Fit You
Recommend 1-3 loan types from: Conventional, FHA, VA, USDA, HomeReady, Home Possible, Jumbo. Explain WHY each fits.

## Estimated Affordability
Using the 28/36 rule and their income/debt, give a rough max home price range. Show the math briefly.

## Suggested Down-Payment Assistance
Mention 1-2 federal programs and tell them to check the State Assistance tab for their state's specific programs.

## Your Next 3 Actions
Numbered, specific, time-bound.

Keep total length under 600 words. Use markdown headings and bullets. Don't use emojis.`;

    const userPrompt = `User profile:
- State: ${answers.state}, City: ${answers.city || 'not specified'}
- Gross monthly income: $${answers.income}
- Monthly debts: $${answers.monthlyDebt}
- Current savings: $${answers.savings}
- Target home price: $${answers.targetPrice}
- Buying timeline: ${answers.timelineMonths} months
- First-time buyer: ${answers.firstTime}
- Credit range: ${answers.creditRange}
- Employment: ${answers.employment}
- Veteran: ${answers.veteranStatus}
- Family / lifestyle plans: ${answers.familyPlans || 'not specified'}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded — please try again in a minute." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI request failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const report = data.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("home-buying-coach error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
