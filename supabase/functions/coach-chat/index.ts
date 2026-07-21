import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are PrismMoney™ Coach — a supportive, plain-spoken behavioral financial coach inside the world's first AI-powered Financial Operating System.

MISSION — every recommendation must answer:
"Will this decision increase or decrease this user's Financial Freedom and Legacy Worth?"

Never simply tell users what happened. Always explain:
- WHY it happened
- What it COSTS (dollars and Days-Until-Freedom)
- What to DO next (one specific play)
- How it affects long-term wealth (Legacy Worth delta)

Reframing rules:
- Instead of "You exceeded your dining budget" → "This trend delays Financial Freedom by ~X days. Here's the swap."
- Instead of "You spent $500" → "If invested for 30 years at your planning return, this could have grown to ~$Y. Here's the opportunity cost."
- Always show trade-offs. When appropriate, present 4 scenarios: Conservative / Average / Growth / Aggressive.

Tone (NEVER violate):
- Never shame, never say "you failed", "you overspent", or use judgmental language.
- Focus on PROGRESS, not perfection.
- Be educational, encouraging, transparent — explain the reasoning behind every recommendation.
- Short paragraphs, bullet lists, markdown formatting. State confidence level.

KUNG FOO™ Financial Order of Operations (default hierarchy, reordered dynamically per user):
1. Starter Emergency Fund  2. Employer Match  3. HSA  4. High-Interest Debt  5. Full Emergency Fund
6. Roth  7. Tax-Deferred  8. Taxable  9. Real Estate  10. Montgomery Family Legacy Trust  11. Charitable Giving

Purchase Guard questions (use when discussing spending):
- Need or Want?
- Will Future You thank Present You?
- Does this move you closer to Financial Freedom?
- Does this increase your Legacy Worth?
- Can this wait 24 hours?

Disclaimers:
- Educational guidance only. NOT a CPA, CFP, attorney, or licensed advisor.
- For tax, legal, investment, Social Security, insurance, or estate decisions → recommend a qualified professional.

You are given the user's live Coach data (over-budget categories, leaks, paycheck plan, purchase-guard history, Safe-to-Spend). Use it. Quote specific dollar amounts, categories, and Days-Until-Freedom when relevant. If data is missing, say so plainly.`;

async function loadCoachContext(supabase: any, householdId: string) {
  const month = new Date().toISOString().slice(0, 7) + '-01';

  const [budgets, txns, leaks, deployments, guards, recovery, mode, accounts] = await Promise.all([
    supabase.from('budgets').select('id, planned_amount, categories(name)').eq('household_id', householdId).eq('month', month),
    supabase.from('transactions').select('amount, date, category_id, merchant').eq('household_id', householdId).gte('date', month).is('deleted_at', null).limit(1000),
    supabase.from('money_leaks').select('leak_type, title, monthly_cost, annual_cost, risk_level, recommended_fix').eq('household_id', householdId).eq('status', 'open').limit(15),
    supabase.from('paycheck_deployments').select('pay_date, net_amount, bills_amount, min_debt_amount, extra_debt_amount, savings_amount, investment_amount, buffer_amount, safe_to_spend_amount, status').eq('household_id', householdId).order('pay_date', { ascending: true }).limit(3),
    supabase.from('purchase_guard_checks').select('amount, classification, decision, fit_score, post_review_worth_it').eq('household_id', householdId).order('created_at', { ascending: false }).limit(10),
    supabase.from('recovery_plans').select('category_name, plan_type, title, target_amount, overage_amount, status').eq('household_id', householdId).eq('status', 'active').limit(5),
    supabase.from('financial_mode_settings').select('buffer_percent, buffer_mode').eq('household_id', householdId).maybeSingle(),
    supabase.from('accounts').select('name, type, balance').eq('household_id', householdId).is('deleted_at', null),
  ]);

  // Compute over-budget categories
  const txnsByCat = new Map<string, number>();
  for (const t of (txns.data || [])) {
    if (Number(t.amount) >= 0 || !t.category_id) continue;
    txnsByCat.set(t.category_id, (txnsByCat.get(t.category_id) || 0) + Math.abs(Number(t.amount)));
  }
  const overBudget: any[] = [];
  for (const b of (budgets.data || [])) {
    const catId = (b as any).categories?.id;
    const name = (b as any).categories?.name || 'Uncategorized';
    const spent = catId ? (txnsByCat.get(catId) || 0) : 0;
    if (spent > Number(b.planned_amount)) {
      overBudget.push({ name, planned: Number(b.planned_amount), spent, overBy: spent - Number(b.planned_amount) });
    }
  }
  const totalIncome = (txns.data || []).filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);
  const totalSpend = (txns.data || []).filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const cashBalance = (accounts.data || [])
    .filter((a: any) => ['checking', 'cash', 'savings'].includes((a.type || '').toLowerCase()))
    .reduce((s: number, a: any) => s + Number(a.balance || 0), 0);

  return {
    month,
    cashBalance,
    monthIncome: totalIncome,
    monthSpend: totalSpend,
    overBudget: overBudget.sort((a, b) => b.overBy - a.overBy).slice(0, 5),
    leaks: leaks.data || [],
    deployments: deployments.data || [],
    recentGuards: guards.data || [],
    activeRecoveryPlans: recovery.data || [],
    buffer: mode.data,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json();
    const messages = body.messages as Array<{ role: string; content: string }>;
    const householdId = body.household_id as string;
    if (!householdId || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "household_id and messages required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ctx = await loadCoachContext(supabase, householdId);
    const ctxBlock = `\n\n--- LIVE COACH DATA (${ctx.month}) ---\n` + JSON.stringify(ctx, null, 2);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + ctxBlock },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited — try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Top up to keep chatting with Coach." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("coach-chat error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
