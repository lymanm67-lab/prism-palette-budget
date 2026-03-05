import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transactions, accounts, financial_journey, monthly_income, monthly_expenses } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build spending by category summary
    const categoryMap: Record<string, number> = {};
    for (const t of (transactions || [])) {
      if (t.amount < 0) {
        const cat = t.category_name || "Uncategorized";
        categoryMap[cat] = (categoryMap[cat] || 0) + Math.abs(t.amount);
      }
    }
    const topCategories = Object.entries(categoryMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, amount]) => `- ${name}: $${amount.toFixed(2)}`)
      .join("\n");

    const accountSummary = (accounts || [])
      .map((a: any) => `- ${a.name} (${a.account_type}): $${a.balance}`)
      .join("\n");

    const savingsRate = monthly_income > 0
      ? ((monthly_income - monthly_expenses) / monthly_income * 100).toFixed(1)
      : "N/A";

    const systemPrompt = `You are PrismBudget's AI Financial Advisor — a warm, insightful coach who analyzes spending patterns and gives personalized, actionable tips.

Your personality: Encouraging, data-driven, specific. Use the user's actual numbers. Celebrate good habits and gently flag concerns.

Format guidelines:
- Use markdown: **bold** key numbers, ## for sections, bullet points for tips
- Keep it under 400 words — punchy and valuable
- Include exactly 3-4 personalized insights based on their data
- Include one "🎯 Quick Win" they can act on today
- End with an encouraging one-liner

IMPORTANT: This is educational guidance, not professional financial advice.`;

    const userPrompt = `Analyze my financial snapshot and give me personalized spending insights:

**Monthly Summary:**
- Income: $${(monthly_income || 0).toFixed(2)}
- Expenses: $${(monthly_expenses || 0).toFixed(2)}
- Savings Rate: ${savingsRate}%

**Top Spending Categories (this month):**
${topCategories || "No spending data yet."}

**My Accounts:**
${accountSummary || "No accounts set up."}

${financial_journey ? `**My Financial Goal:** ${financial_journey}` : ""}

Please provide:
1. Key insights about my spending patterns
2. Personalized tips aligned with my financial goal
3. A quick win I can act on today
4. How my savings rate compares to recommended benchmarks`;

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
    console.error("spending-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
