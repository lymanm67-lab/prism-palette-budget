import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const tab = data?.tab || "spending";
    const dateLabel = data?.dateLabel || "this period";

    let dataContext = "";

    if (tab === "spending" && data.categories) {
      const cats = data.categories.map((c: any) => `- ${c.name}: $${c.amount.toFixed(2)}`).join("\n");
      dataContext = `**Spending by Category (${dateLabel}):**\nTotal: $${(data.total || 0).toFixed(2)}\n${cats}`;
    } else if (tab === "budget" && data.budgets) {
      const items = data.budgets.map((b: any) => {
        const pct = b.budget > 0 ? Math.round((b.actual / b.budget) * 100) : 0;
        const status = b.actual > b.budget ? "OVER" : "OK";
        return `- ${b.name}: Budget $${b.budget.toFixed(2)}, Actual $${b.actual.toFixed(2)} (${pct}%, ${status})`;
      }).join("\n");
      dataContext = `**Budget vs Actual (${dateLabel}):**\n${items}`;
    } else if ((tab === "cashflow" || tab === "trends") && data.cashflow) {
      const rows = data.cashflow.map((m: any) => `- ${m.month}: Income $${m.income.toFixed(2)}, Expenses $${m.expenses.toFixed(2)}, Savings $${m.savings.toFixed(2)}`).join("\n");
      dataContext = `**Cash Flow (${dateLabel}):**\n${rows}`;
      if (data.savingsRate) {
        const rates = data.savingsRate.map((r: any) => `- ${r.month}: ${r.rate}%`).join("\n");
        dataContext += `\n\n**Savings Rate:**\n${rates}`;
      }
    } else if (tab === "networth" && data.netWorth) {
      const points = data.netWorth.map((n: any) => `- ${n.month}: $${n.netWorth.toFixed(2)}`).join("\n");
      dataContext = `**Net Worth Trend (${dateLabel}):**\n${points}`;
    } else if (tab === "merchants" && data.merchants) {
      const merch = data.merchants.map((m: any) => `- ${m.name}: $${m.total.toFixed(2)} (${m.count} transactions)`).join("\n");
      dataContext = `**Top Merchants (${dateLabel}):**\n${merch}`;
    }

    const systemPrompt = `You are PrismMoney's financial analyst. Provide a concise, actionable narrative for the user's ${tab} report.

Format:
- Write 3-5 short paragraphs with markdown formatting
- Start with a headline summary sentence
- Highlight areas of concern with specific numbers
- Identify positive patterns to reinforce
- End with 1-2 actionable recommendations
- Use **bold** for key figures and category names
- Keep under 250 words — be direct and valuable
- This is educational guidance, not professional financial advice.`;

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
          { role: "user", content: `Analyze this report data and provide a narrative summary with areas to focus on:\n\n${dataContext}` },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached." }), {
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
    console.error("report-narrative error:", e);
    return new Response(JSON.stringify({ error: "An unexpected error occurred." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
