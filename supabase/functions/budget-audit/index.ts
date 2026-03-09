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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader! } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { household_id, month } = await req.json();
    if (!household_id) {
      return new Response(JSON.stringify({ error: "Missing household_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: isMember } = await adminClient.rpc("is_household_member", {
      _user_id: user.id, _household_id: household_id,
    });
    if (!isMember) {
      return new Response(JSON.stringify({ error: "Not a household member" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all category groups and categories
    const { data: categoryGroups } = await adminClient
      .from("category_groups")
      .select("id, name, expense_type, budget_type, color")
      .eq("household_id", household_id)
      .order("sort_order");

    const { data: categories } = await adminClient
      .from("categories")
      .select("id, name, group_id, color")
      .eq("household_id", household_id)
      .order("sort_order");

    // Fetch budgets for the month
    const { data: budgets } = await adminClient
      .from("budgets")
      .select("id, category_id, planned_amount, rollover")
      .eq("household_id", household_id)
      .eq("month", month || new Date().toISOString().slice(0, 7) + "-01");

    // Fetch last 90 days of transactions
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const { data: transactions } = await adminClient
      .from("transactions")
      .select("amount, category_id, merchant, date")
      .eq("household_id", household_id)
      .is("deleted_at", null)
      .gte("date", ninetyDaysAgo.toISOString().split("T")[0]);

    // Build spending summary
    const spendByCategory = new Map<string, number>();
    const incomeByCategory = new Map<string, number>();
    for (const t of (transactions || [])) {
      if (!t.category_id) continue;
      if (t.amount < 0) {
        spendByCategory.set(t.category_id, (spendByCategory.get(t.category_id) || 0) + Math.abs(t.amount));
      } else {
        incomeByCategory.set(t.category_id, (incomeByCategory.get(t.category_id) || 0) + t.amount);
      }
    }

    // Build context for AI
    const groupMap = new Map((categoryGroups || []).map(g => [g.id, g]));
    const catDetails = (categories || []).map(c => {
      const group = groupMap.get(c.group_id);
      const budget = (budgets || []).find(b => b.category_id === c.id);
      const spent90 = spendByCategory.get(c.id) || 0;
      const income90 = incomeByCategory.get(c.id) || 0;
      return {
        name: c.name,
        group: group?.name || "Unknown",
        expense_type: group?.expense_type || "flexible",
        monthly_budget: budget?.planned_amount || 0,
        avg_monthly_spend: Math.round(spent90 / 3),
        avg_monthly_income: Math.round(income90 / 3),
        has_budget: !!budget,
      };
    });

    const prompt = `You are a personal finance advisor. Audit this household budget and provide actionable recommendations.

## Current Category Groups & Categories:
${(categoryGroups || []).map(g => {
  const cats = (categories || []).filter(c => c.group_id === g.id);
  return `### ${g.name} (${g.expense_type}, ${g.budget_type})
${cats.map(c => {
  const detail = catDetails.find(d => d.name === c.name);
  return `  - ${c.name}: Budget $${detail?.monthly_budget || 0}/mo, Avg Spend $${detail?.avg_monthly_spend || 0}/mo, Avg Income $${detail?.avg_monthly_income || 0}/mo`;
}).join('\n')}`;
}).join('\n\n')}

## Unbudgeted Categories:
${catDetails.filter(d => !d.has_budget).map(d => `- ${d.name} (${d.group}): Avg Spend $${d.avg_monthly_spend}/mo`).join('\n') || 'None'}

Please provide:
1. **Category Organization Issues** - Are categories in the right groups? Should any be moved? (e.g., income items in expense groups)
2. **Missing Categories** - What common categories are missing that most households need?
3. **Budget Amount Suggestions** - For unbudgeted or under-budgeted categories, suggest amounts based on spending patterns
4. **Group Improvements** - Should any groups be renamed, merged, or split?
5. **Overall Budget Health** - Is the budget balanced? Any red flags?

Keep it concise and actionable. Use markdown formatting.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a certified financial planner specializing in household budgeting. Give specific, numbers-backed advice." },
          { role: "user", content: prompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("budget-audit error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
