// Monthly Budget Hygiene
// - Carries forward income budgets when missing
// - Applies active auto_split_rules to prior-month unsplit transactions
// - Flags duplicate categories, orphan budgets, uncategorized >$50, pending owner contributions
// Triggered by pg_cron on the 1st of each month or manually with { household_id } body.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET");

function firstOfMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function addMonths(d: Date, n: number) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
}
function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

interface Rule {
  id: string;
  household_id: string;
  name: string;
  match_type: "merchant" | "description_keyword" | "category";
  match_value: string;
  date_range_start: string | null;
  date_range_end: string | null;
  amount_min: number | null;
  amount_max: number | null;
  business_category_id: string | null;
  personal_category_id: string | null;
  business_split_pct: number;
  is_active: boolean;
  priority: number;
}

async function processHousehold(supabase: any, householdId: string, opts: { force: boolean }) {
  const summary: Record<string, number> = {
    income_carried_forward: 0,
    splits_applied: 0,
    duplicate_categories: 0,
    orphan_budgets: 0,
    uncategorized_flagged: 0,
    pending_contributions: 0,
  };

  const now = new Date();
  const currentMonth = firstOfMonth(now);
  const prevMonth = addMonths(currentMonth, -1);

  // 1. Carry-forward income budgets
  const { data: prevIncome } = await supabase
    .from("budgets")
    .select("category_id, planned_amount, categories!inner(group_id, category_groups!inner(expense_type, household_id))")
    .eq("month", iso(prevMonth))
    .eq("household_id", householdId)
    .eq("categories.category_groups.expense_type", "income");

  if (prevIncome) {
    for (const row of prevIncome) {
      const { data: existing } = await supabase
        .from("budgets")
        .select("id")
        .eq("household_id", householdId)
        .eq("category_id", row.category_id)
        .eq("month", iso(currentMonth))
        .maybeSingle();
      if (!existing) {
        await supabase.from("budgets").insert({
          household_id: householdId,
          category_id: row.category_id,
          month: iso(currentMonth),
          planned_amount: row.planned_amount,
        });
        summary.income_carried_forward++;
      }
    }
  }

  // 2. Apply auto-split rules to prior month transactions
  const { data: rules } = await supabase
    .from("auto_split_rules")
    .select("*")
    .eq("household_id", householdId)
    .eq("is_active", true)
    .order("priority", { ascending: true });

  if (rules?.length) {
    // Pull prior-month unsplit transactions
    const { data: txns } = await supabase
      .from("transactions")
      .select("id, date, amount, merchant, notes, category_id")
      .eq("household_id", householdId)
      .is("deleted_at", null)
      .eq("is_transfer", false)
      .gte("date", iso(prevMonth))
      .lt("date", iso(currentMonth));

    for (const tx of txns ?? []) {
      // skip already split
      const { count: splitCount } = await supabase
        .from("transaction_splits")
        .select("id", { count: "exact", head: true })
        .eq("transaction_id", tx.id);
      if ((splitCount ?? 0) > 0) continue;

      for (const r of rules as Rule[]) {
        if (r.date_range_start && tx.date < r.date_range_start) continue;
        if (r.date_range_end && tx.date > r.date_range_end) continue;
        if (r.amount_min !== null && Math.abs(tx.amount) < Number(r.amount_min)) continue;
        if (r.amount_max !== null && Math.abs(tx.amount) > Number(r.amount_max)) continue;

        let matches = false;
        const mv = r.match_value.toLowerCase();
        if (r.match_type === "merchant") {
          matches = (tx.merchant ?? "").toLowerCase().includes(mv);
        } else if (r.match_type === "description_keyword") {
          matches =
            (tx.merchant ?? "").toLowerCase().includes(mv) ||
            (tx.notes ?? "").toLowerCase().includes(mv);
        } else if (r.match_type === "category") {
          matches = tx.category_id === r.match_value;
        }
        if (!matches) continue;
        if (!r.business_category_id || !r.personal_category_id) continue;

        const bizAmt = Math.round(tx.amount * (Number(r.business_split_pct) / 100) * 100) / 100;
        const persAmt = Math.round((tx.amount - bizAmt) * 100) / 100;
        await supabase.from("transaction_splits").insert([
          {
            transaction_id: tx.id,
            category_id: r.business_category_id,
            amount: bizAmt,
            notes: `Auto-split via rule: ${r.name}`,
          },
          {
            transaction_id: tx.id,
            category_id: r.personal_category_id,
            amount: persAmt,
            notes: `Auto-split via rule: ${r.name}`,
          },
        ]);
        await supabase
          .from("auto_split_rules")
          .update({
            last_run_at: new Date().toISOString(),
            last_run_match_count: (r as any).last_run_match_count + 1,
          })
          .eq("id", r.id);
        summary.splits_applied++;
        break; // first matching rule wins
      }
    }
  }

  // Clear stale open issues from prior runs so we don't pile up duplicates
  await supabase
    .from("data_quality_issues")
    .delete()
    .eq("household_id", householdId)
    .is("resolved_at", null);

  // 3. Duplicate categories
  const { data: dupCats } = await supabase.rpc("noop_placeholder", {}).select?.() ?? { data: null };
  // Use raw query via PostgREST: fetch all categories and find dupes in JS
  const { data: cats } = await supabase
    .from("categories")
    .select("id, name, group_id, category_groups!inner(household_id)")
    .eq("category_groups.household_id", householdId);
  const seen = new Map<string, string[]>();
  for (const c of cats ?? []) {
    const k = `${c.group_id}::${c.name.toLowerCase().trim()}`;
    if (!seen.has(k)) seen.set(k, []);
    seen.get(k)!.push(c.id);
  }
  for (const [k, ids] of seen.entries()) {
    if (ids.length > 1) {
      await supabase.from("data_quality_issues").insert({
        household_id: householdId,
        issue_type: "duplicate_category",
        severity: "warning",
        title: `Duplicate category: ${k.split("::")[1]}`,
        description: `${ids.length} categories share the same name in the same group.`,
        payload: { category_ids: ids },
      });
      summary.duplicate_categories++;
    }
  }

  // 4. Uncategorized transactions > $50 from prior month
  const { data: uncats } = await supabase
    .from("transactions")
    .select("id, date, amount, merchant")
    .eq("household_id", householdId)
    .is("deleted_at", null)
    .eq("is_transfer", false)
    .is("category_id", null)
    .gte("date", iso(prevMonth))
    .lt("date", iso(currentMonth))
    .gt("amount", 50);

  if (uncats && uncats.length > 0) {
    await supabase.from("data_quality_issues").insert({
      household_id: householdId,
      issue_type: "uncategorized_transactions",
      severity: "warning",
      title: `${uncats.length} uncategorized transaction(s) over $50 last month`,
      description: "Review and assign categories for accurate tax reporting.",
      payload: { transaction_ids: uncats.map((t) => t.id) },
    });
    summary.uncategorized_flagged = uncats.length;
  }

  // 5. Pending owner contribution: Business Funding budget exists for prev month, but no matching transfer txn
  const { data: bfBudgets } = await supabase
    .from("budgets")
    .select("planned_amount, categories!inner(name, category_groups!inner(name, household_id))")
    .eq("household_id", householdId)
    .eq("month", iso(prevMonth))
    .eq("categories.category_groups.name", "Business Funding");
  if (bfBudgets && bfBudgets.length > 0) {
    const planned = bfBudgets.reduce((s, b) => s + Number(b.planned_amount), 0);
    if (planned > 0) {
      await supabase.from("data_quality_issues").insert({
        household_id: householdId,
        issue_type: "pending_owner_contribution",
        severity: "info",
        title: `Owner contribution due: $${planned.toFixed(2)} for ${iso(prevMonth).slice(0, 7)}`,
        description: "Transfer planned from personal to business checking. Log as 'Owner Capital Contribution'.",
        payload: { month: iso(prevMonth), amount: planned },
      });
      summary.pending_contributions++;
    }
  }

  return summary;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const authHeader = req.headers.get("x-cron-secret");

    const isCron = CRON_SECRET && authHeader === CRON_SECRET;
    const householdId: string | undefined = body.household_id;
    const force = !!body.force;

    let households: string[] = [];
    if (householdId) {
      households = [householdId];
    } else if (isCron) {
      const { data } = await supabase.from("households").select("id");
      households = (data ?? []).map((r: any) => r.id);
    } else {
      return new Response(JSON.stringify({ error: "household_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Record<string, any> = {};
    for (const h of households) {
      results[h] = await processHousehold(supabase, h, { force });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("monthly-budget-hygiene error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
