// Monthly Spending Report
// Runs on the 1st of each month. For each household:
//  - Computes last-month spending vs budget by category
//  - Identifies overage categories + likely causes (top merchants, new charges, subscription creep)
//  - Flags transactions posted to the "wrong" account (category.default_account_id mismatch)
//  - Flags multi-entity charges that weren't split (auto_split_rules matched but no splits)
//  - Uses Lovable AI to write a narrative with 3-5 next-month action steps
//  - Stores result as a financial_insights row (insight_type = 'monthly_report')
//
// Trigger: pg_cron (1st of month 07:00 UTC) or manual POST { household_id }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

function firstOfMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function addMonths(d: Date, n: number) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
}
function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}
function money(n: number) {
  return `$${(Math.round(n * 100) / 100).toFixed(2)}`;
}

async function processHousehold(supabase: any, householdId: string) {
  const now = new Date();
  const currentMonth = firstOfMonth(now);
  const prevMonth = addMonths(currentMonth, -1);
  const prevPrevMonth = addMonths(currentMonth, -2);

  // Categories + groups + default account
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, group_id, default_account_id, category_groups!inner(name, expense_type)")
    .eq("household_id", householdId);

  const catMap = new Map<string, any>();
  for (const c of categories || []) catMap.set(c.id, c);

  // Budgets for prev month
  const { data: budgets } = await supabase
    .from("budgets")
    .select("category_id, planned_amount")
    .eq("household_id", householdId)
    .eq("month", iso(prevMonth));
  const budgetMap = new Map<string, number>();
  for (const b of budgets || []) budgetMap.set(b.category_id, Number(b.planned_amount));

  // Prev month transactions (spending only, exclude transfers + soft-deleted)
  const { data: txns } = await supabase
    .from("transactions")
    .select("id, date, amount, merchant, category_id, account_id, notes")
    .eq("household_id", householdId)
    .is("deleted_at", null)
    .eq("is_transfer", false)
    .gte("date", iso(prevMonth))
    .lt("date", iso(currentMonth));

  // Prior month (for "new charges" detection)
  const { data: priorTxns } = await supabase
    .from("transactions")
    .select("merchant")
    .eq("household_id", householdId)
    .is("deleted_at", null)
    .eq("is_transfer", false)
    .gte("date", iso(prevPrevMonth))
    .lt("date", iso(prevMonth));
  const priorMerchants = new Set(
    (priorTxns || []).map((t: any) => (t.merchant || "").toLowerCase().trim()).filter(Boolean),
  );

  // Aggregate spending per category
  const spendByCat = new Map<string, number>();
  const merchantByCat = new Map<string, Map<string, number>>();
  let totalSpend = 0;
  const newChargeMerchants = new Map<string, number>();
  const wrongAccountTxns: any[] = [];

  for (const t of txns || []) {
    if (t.amount >= 0) continue; // spending only
    const spend = Math.abs(Number(t.amount));
    totalSpend += spend;
    if (t.category_id) {
      spendByCat.set(t.category_id, (spendByCat.get(t.category_id) || 0) + spend);
      const m = (t.merchant || "Unknown").trim();
      if (!merchantByCat.has(t.category_id)) merchantByCat.set(t.category_id, new Map());
      const mm = merchantByCat.get(t.category_id)!;
      mm.set(m, (mm.get(m) || 0) + spend);

      // Wrong-account detection
      const cat = catMap.get(t.category_id);
      if (cat?.default_account_id && cat.default_account_id !== t.account_id) {
        wrongAccountTxns.push({
          date: t.date,
          merchant: t.merchant,
          amount: spend,
          category: cat.name,
        });
      }
    }
    const mkey = (t.merchant || "").toLowerCase().trim();
    if (mkey && !priorMerchants.has(mkey)) {
      newChargeMerchants.set(mkey, (newChargeMerchants.get(mkey) || 0) + spend);
    }
  }

  // Overage analysis
  const overages: any[] = [];
  let totalBudget = 0;
  for (const [catId, budget] of budgetMap.entries()) {
    totalBudget += budget;
    const spent = spendByCat.get(catId) || 0;
    if (spent > budget && budget > 0) {
      const cat = catMap.get(catId);
      if (!cat) continue;
      const merchants = Array.from(merchantByCat.get(catId)?.entries() || [])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([m, amt]) => ({ merchant: m, amount: amt }));
      overages.push({
        category: cat.name,
        group: cat.category_groups?.name,
        budget,
        spent,
        overage: spent - budget,
        overage_pct: Math.round(((spent - budget) / budget) * 100),
        top_merchants: merchants,
      });
    }
  }
  overages.sort((a, b) => b.overage - a.overage);

  // Top new merchants ($25+)
  const newCharges = Array.from(newChargeMerchants.entries())
    .filter(([_, amt]) => amt >= 25)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([m, amt]) => ({ merchant: m, amount: amt }));

  // Unsplit multi-entity charges: rules exist for household, txn matches, no split
  const { data: rules } = await supabase
    .from("auto_split_rules")
    .select("id, name, match_type, match_value, business_category_id, personal_category_id")
    .eq("household_id", householdId)
    .eq("is_active", true);

  const unsplitCharges: any[] = [];
  if (rules?.length) {
    for (const t of txns || []) {
      if (!t.category_id) continue;
      const { count } = await supabase
        .from("transaction_splits")
        .select("id", { count: "exact", head: true })
        .eq("transaction_id", t.id);
      if ((count ?? 0) > 0) continue;
      for (const r of rules as any[]) {
        const mv = String(r.match_value || "").toLowerCase();
        let matches = false;
        if (r.match_type === "merchant" || r.match_type === "description_keyword") {
          matches =
            (t.merchant || "").toLowerCase().includes(mv) ||
            (t.notes || "").toLowerCase().includes(mv);
        } else if (r.match_type === "category") {
          matches = t.category_id === r.match_value;
        }
        if (matches) {
          unsplitCharges.push({
            date: t.date,
            merchant: t.merchant,
            amount: Math.abs(Number(t.amount)),
            rule: r.name,
          });
          break;
        }
      }
    }
  }

  const summary = {
    month: iso(prevMonth).slice(0, 7),
    total_spend: totalSpend,
    total_budget: totalBudget,
    net_vs_budget: totalBudget - totalSpend,
    overages: overages.slice(0, 8),
    new_charges: newCharges,
    wrong_account_count: wrongAccountTxns.length,
    wrong_account_sample: wrongAccountTxns.slice(0, 5),
    unsplit_multi_entity_count: unsplitCharges.length,
    unsplit_multi_entity_sample: unsplitCharges.slice(0, 5),
  };

  // AI narrative
  let narrative = "";
  if (LOVABLE_API_KEY) {
    const prompt = `You are a household CFO. Analyze last month's spending report and produce a concise action-oriented brief.

Data (JSON):
${JSON.stringify(summary, null, 2)}

Return markdown with these sections:
### Month Summary
One paragraph: total spend vs budget, headline number.

### Where You Went Over
For each overage (up to 5), one line: "**Category** — over by $X (Y%). Driver: <top merchant> ($Z). Likely cause: <one-line hypothesis>."

### Account & Entity Issues
- If wrong_account_count > 0: list count + first 2 examples.
- If unsplit_multi_entity_count > 0: list count + examples. Explain the tax/bookkeeping impact.
- If both are 0: say "Accounts and splits clean this month."

### 3-5 Steps for Next Month
Numbered, specific, dollar-anchored steps. Focus on the biggest overages and any account/entity issues. No fluff.

Keep it under 400 words. Be direct, no compliments.`;

    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a pragmatic household CFO. Direct, specific, dollar-anchored." },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (resp.ok) {
        const j = await resp.json();
        narrative = j.choices?.[0]?.message?.content || "";
      } else {
        console.error("AI gateway error", resp.status, await resp.text());
      }
    } catch (e) {
      console.error("AI call failed", e);
    }
  }

  if (!narrative) {
    narrative = `### Month Summary\nSpent ${money(totalSpend)} against ${money(totalBudget)} budget (${totalBudget - totalSpend >= 0 ? "under" : "over"} by ${money(Math.abs(totalBudget - totalSpend))}).\n\n### Where You Went Over\n${overages.slice(0, 5).map(o => `- **${o.category}** — over by ${money(o.overage)} (${o.overage_pct}%). Top: ${o.top_merchants[0]?.merchant || "n/a"}.`).join("\n") || "No overages."}\n\n### Account & Entity Issues\n${summary.wrong_account_count ? `- ${summary.wrong_account_count} transactions posted to the wrong account.\n` : ""}${summary.unsplit_multi_entity_count ? `- ${summary.unsplit_multi_entity_count} multi-entity charges weren't split.\n` : ""}${!summary.wrong_account_count && !summary.unsplit_multi_entity_count ? "Accounts and splits clean this month." : ""}\n\n### Next Month\nReview overage categories and tighten budgets.`;
  }

  // Persist. Clear prior monthly_report for same month, then insert fresh.
  await supabase
    .from("financial_insights")
    .delete()
    .eq("household_id", householdId)
    .eq("insight_type", "monthly_report")
    .contains("metadata", { month: summary.month });

  await supabase.from("financial_insights").insert({
    household_id: householdId,
    insight_type: "monthly_report",
    title: `Monthly Report — ${summary.month}`,
    content: narrative,
    metadata: summary,
  });

  return { household_id: householdId, month: summary.month, overages: overages.length, wrong_account_count: wrongAccountTxns.length, unsplit: unsplitCharges.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Auth: allow cron via CRON_SECRET, or manual with household_id from any caller
    const authHeader = req.headers.get("authorization") || "";
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const householdId: string | undefined = body.household_id;

    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const apikey = req.headers.get("apikey") || "";
    const isCron =
      (CRON_SECRET && authHeader.includes(CRON_SECRET)) ||
      (ANON_KEY && (authHeader.includes(ANON_KEY) || apikey === ANON_KEY));
    if (!isCron && !householdId) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    let households: string[] = [];
    if (householdId) {
      households = [householdId];
    } else {
      const { data } = await supabase.from("households").select("id");
      households = (data ?? []).map((r: any) => r.id);
    }

    const results = [];
    for (const h of households) {
      try {
        results.push(await processHousehold(supabase, h));
      } catch (e) {
        console.error(`household ${h} failed`, e);
        results.push({ household_id: h, error: String(e) });
      }
    }

    return new Response(JSON.stringify({ ok: true, results, ran_at: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("monthly-spending-report error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
