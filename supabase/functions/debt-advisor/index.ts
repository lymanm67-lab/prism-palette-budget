import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { debts, extra_payment, financial_journey } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const debtSummary = (debts || []).map((d: any) => 
      `- ${d.name}: $${d.balance} balance, ${d.interest_rate}% APR, $${d.minimum_payment}/mo minimum`
    ).join("\n");

    const totalDebt = (debts || []).reduce((s: number, d: any) => s + d.balance, 0);
    const totalMinPayments = (debts || []).reduce((s: number, d: any) => s + d.minimum_payment, 0);
    const highestRate = Math.max(...(debts || []).map((d: any) => d.interest_rate), 0);
    const lowestBalance = Math.min(...(debts || []).map((d: any) => d.balance), Infinity);

    const systemPrompt = `You are PrismBudget's AI Debt Advisor — a friendly, expert financial coach who helps users eliminate debt faster. You analyze their actual debt portfolio and provide personalized, actionable recommendations.

Your personality: Encouraging but honest. Use plain language. Be specific with numbers. Celebrate wins.

Guidelines:
- Always recommend ONE primary strategy with a clear explanation of WHY it's best for THIS user's specific situation
- Provide 3-5 personalized tips based on their actual numbers
- Include a motivational insight (e.g. "You could be debt-free by [date]")
- Mention specific dollar amounts and time savings
- If debts have very different interest rates (>5% spread), strongly favor avalanche
- If debts are similar in rate but vary in size, consider snowball for motivation
- If the user has many small debts, snowball can build momentum
- Always suggest a specific extra payment amount if they haven't set one high enough
- Include a "Quick Win" — one immediate action they can take today
- Format with markdown: use **bold** for key numbers, ## for sections, and bullet points
- Keep response under 500 words — be concise and punchy
- End with an encouraging closing statement

IMPORTANT: This is educational guidance, not professional financial advice.`;

    const userPrompt = `Analyze my debt portfolio and recommend the optimal payoff strategy:

**My Debts:**
${debtSummary || "No debts added yet."}

**Summary:**
- Total debt: $${totalDebt.toFixed(2)}
- Total minimum payments: $${totalMinPayments.toFixed(2)}/month
- Highest interest rate: ${highestRate}%
- Smallest balance: $${lowestBalance === Infinity ? 0 : lowestBalance}
- Extra monthly payment I can make: $${extra_payment || 0}
${financial_journey ? `- My financial goal: ${financial_journey}` : ''}

Please recommend:
1. Which strategy (snowball, avalanche, or hybrid) is best for MY specific situation and why
2. Personalized tips to accelerate my payoff
3. A quick win I can do today
4. An estimated debt-free date`;

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
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("debt-advisor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
