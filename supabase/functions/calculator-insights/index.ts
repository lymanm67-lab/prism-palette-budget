import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { calculatorType, inputs, results } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a sharp, friendly financial advisor embedded in a calculator app. The user just ran a calculation. Give them 2-3 short, specific, actionable insights based on their exact numbers. Be conversational but data-driven.

Rules:
- Reference their EXACT numbers (don't be vague)
- Include at least one "what if" scenario (e.g., "If you paid $X more per month...")
- Keep each tip to 1-2 sentences max
- Use emoji sparingly (1-2 per response)
- Format as bullet points with bold key numbers
- Total response under 150 words
- Don't repeat what they can already see in the results
- Focus on surprising insights, hidden costs, or optimization opportunities`;

    const userPrompt = buildUserPrompt(calculatorType, inputs, results);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("calculator-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildUserPrompt(type: string, inputs: Record<string, string>, results: Record<string, any>): string {
  switch (type) {
    case "mortgage":
      return `Mortgage calculation:
- Home price: $${inputs.price}, Down payment: $${inputs.down}
- Rate: ${inputs.rate}%, Term: ${inputs.years} years
- Monthly payment: $${results.payment?.toFixed(2)}
- Total interest: $${results.totalInterest?.toFixed(2)}
- Total paid: $${results.totalPaid?.toFixed(2)}`;

    case "auto":
      return `Auto loan calculation:
- Vehicle price: $${inputs.price}, Down: $${inputs.down}, Trade-in: $${inputs.tradeIn}
- Rate: ${inputs.rate}%, Term: ${inputs.years} years
- Monthly payment: $${results.payment?.toFixed(2)}
- Total interest: $${results.totalInterest?.toFixed(2)}`;

    case "credit":
      return `Credit card payoff:
- Balance: $${inputs.balance}, APR: ${inputs.apr}%
- Monthly payment: $${inputs.payment}
- Months to payoff: ${results.months}
- Total interest: $${results.totalInterest?.toFixed(2)}`;

    case "investment":
      return `Investment projection:
- Initial: $${inputs.initial}, Monthly contribution: $${inputs.monthly}
- Annual return: ${inputs.rate}%, Time: ${inputs.years} years
- Final balance: $${results.finalBalance?.toFixed(2)}
- Total contributions: $${results.totalContributions?.toFixed(2)}
- Total earnings: $${results.totalInterest?.toFixed(2)}`;

    case "debt":
      return `Debt payoff:
- Balance: $${inputs.balance}, Rate: ${inputs.rate}%
- Monthly payment: $${inputs.payment}
- Months to payoff: ${results.months}
- Total interest: $${results.totalInterest?.toFixed(2)}`;

    case "wealth":
      return `Wealth multiplier:
- Current age: ${inputs.age}
- Every $1 invested now becomes $${results.multiplier?.toFixed(2)} by retirement
- Monthly needed for $1M: $${results.monthlyTo1M?.toFixed(2)}
- Monthly needed for $2M: $${results.monthlyTo2M?.toFixed(2)}`;

    case "offers":
      return `Revenue planning:
- Monthly goal: $${inputs.goal}
- Offers: ${results.offers?.map((o: any) => `${o.name} at $${o.price} (need ${o.unitsNeeded}/mo)`).join(', ')}`;

    default:
      return `Calculator results: ${JSON.stringify({ inputs, results })}`;
  }
}
