import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FREQ_PER_MONTH: Record<string, number> = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  semi_monthly: 2,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

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

    const body = await req.json().catch(() => ({}));
    const householdId = body.household_id as string;
    const payDateStr = body.pay_date as string | undefined; // YYYY-MM-DD
    const netAmountInput = body.net_amount as number | undefined;
    const frequency = (body.frequency as string) || "biweekly";
    const persist = body.persist !== false;

    if (!householdId) {
      return new Response(JSON.stringify({ error: "household_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pay date defaults to next Friday
    const today = new Date();
    let payDate: Date;
    if (payDateStr) {
      payDate = new Date(payDateStr + "T00:00:00");
    } else {
      payDate = new Date(today);
      const dow = payDate.getDay();
      const delta = (5 - dow + 7) % 7 || 7;
      payDate.setDate(payDate.getDate() + delta);
    }
    const payIso = payDate.toISOString().slice(0, 10);

    // 1. Income — prefer override, else estimate from positive transactions last 90d
    let netAmount = netAmountInput || 0;
    if (!netAmount) {
      const ninety = new Date(today);
      ninety.setDate(ninety.getDate() - 90);
      const { data: incomeTxns } = await supabase
        .from("transactions")
        .select("amount, date")
        .eq("household_id", householdId)
        .gte("date", ninety.toISOString().slice(0, 10))
        .gt("amount", 0)
        .is("deleted_at", null);
      const total = (incomeTxns || []).reduce((s, t: any) => s + Number(t.amount || 0), 0);
      const monthly = total / 3;
      const perPay = monthly / (FREQ_PER_MONTH[frequency] || 2.17);
      netAmount = Math.round(perPay * 100) / 100;
    }

    // 2. Upcoming bills until next pay (estimate next pay = pay + cycle days)
    const cycleDays = frequency === "weekly" ? 7 : frequency === "monthly" ? 30 : frequency === "semi_monthly" ? 15 : 14;
    const windowEnd = new Date(payDate);
    windowEnd.setDate(windowEnd.getDate() + cycleDays);

    const { data: recurring } = await supabase
      .from("recurring_transactions")
      .select("id, merchant, amount, next_due_date, frequency, category_id")
      .eq("household_id", householdId)
      .eq("is_active", true)
      .lte("next_due_date", windowEnd.toISOString().slice(0, 10));

    const billItems = (recurring || [])
      .filter((r: any) => Number(r.amount) < 0)
      .map((r: any) => ({
        id: r.id,
        merchant: r.merchant || "Recurring bill",
        amount: Math.abs(Number(r.amount)),
        due_date: r.next_due_date,
      }))
      .sort((a, b) => a.due_date.localeCompare(b.due_date));
    const billsTotal = billItems.reduce((s, b) => s + b.amount, 0);

    // 3. Debt — sum minimum_payments + plan extra_payment, prorated per-pay
    const { data: debtPlan } = await supabase
      .from("debt_plans")
      .select("id, extra_payment")
      .eq("household_id", householdId)
      .eq("is_active", true)
      .maybeSingle();

    let minDebtMonthly = 0;
    let extraDebtMonthly = 0;
    if (debtPlan) {
      const { data: items } = await supabase
        .from("debt_items")
        .select("minimum_payment")
        .eq("plan_id", debtPlan.id);
      minDebtMonthly = (items || []).reduce((s: number, i: any) => s + Number(i.minimum_payment || 0), 0);
      extraDebtMonthly = Number(debtPlan.extra_payment || 0);
    }
    const perPayDivisor = FREQ_PER_MONTH[frequency] || 2.17;
    const minDebt = Math.round((minDebtMonthly / perPayDivisor) * 100) / 100;
    const extraDebt = Math.round((extraDebtMonthly / perPayDivisor) * 100) / 100;

    // 4. Goals — top-priority savings target, prorated
    const { data: goals } = await supabase
      .from("financial_goals")
      .select("target_amount, current_amount, target_date, goal_type")
      .eq("household_id", householdId)
      .eq("is_completed", false);

    let savingsMonthly = 0;
    let investmentMonthly = 0;
    for (const g of (goals || [])) {
      const remaining = Math.max(0, Number(g.target_amount) - Number(g.current_amount));
      if (remaining <= 0) continue;
      let months = 12;
      if (g.target_date) {
        const diff = (new Date(g.target_date).getTime() - today.getTime()) / (30.44 * 86400000);
        months = Math.max(1, diff);
      }
      const monthlyNeeded = remaining / months;
      if (g.goal_type === "investment" || g.goal_type === "retirement") {
        investmentMonthly += monthlyNeeded;
      } else {
        savingsMonthly += monthlyNeeded;
      }
    }
    const savings = Math.round((savingsMonthly / perPayDivisor) * 100) / 100;
    const investment = Math.round((investmentMonthly / perPayDivisor) * 100) / 100;

    // 5. Buffer — pull from adaptive/manual mode_settings
    const { data: mode } = await supabase
      .from("financial_mode_settings")
      .select("buffer_percent, buffer_mode")
      .eq("household_id", householdId)
      .maybeSingle();
    const bufferPct = Number((mode as any)?.buffer_percent || 15);
    const buffer = Math.round((netAmount * (bufferPct / 100)) * 100) / 100;

    // 6. Safe-to-Spend = remainder
    const claimed = billsTotal + minDebt + extraDebt + savings + investment + buffer;
    let safeToSpend = Math.max(0, Math.round((netAmount - claimed) * 100) / 100);

    // If short, peel back extra_debt, then investment, then savings
    let shortfall = claimed - netAmount;
    let trimmedExtraDebt = extraDebt;
    let trimmedInvestment = investment;
    let trimmedSavings = savings;
    if (shortfall > 0) {
      const peel = (val: number) => {
        if (shortfall <= 0) return val;
        const take = Math.min(val, shortfall);
        shortfall -= take;
        return val - take;
      };
      trimmedExtraDebt = peel(trimmedExtraDebt);
      trimmedInvestment = peel(trimmedInvestment);
      trimmedSavings = peel(trimmedSavings);
      safeToSpend = 0;
    }

    const confidence = (recurring && recurring.length > 0) && (debtPlan || (goals && goals.length > 0))
      ? "high"
      : (recurring && recurring.length > 0) ? "medium" : "low";

    const rationale = [
      `Pay date ${payIso} (${frequency}).`,
      `Reserve ${billItems.length} bill(s) due before next paycheck.`,
      minDebt + extraDebt > 0 ? `Cover debt minimums${extraDebt > 0 ? ` + $${extraDebt.toFixed(0)} extra attack` : ''}.` : null,
      savings + investment > 0 ? `Fund goals on schedule.` : null,
      `Set aside ${bufferPct}% Smart Buffer.`,
      safeToSpend > 0 ? `Remainder is true Safe-to-Spend.` : `Plan is fully claimed — no discretionary this pay.`,
    ].filter(Boolean).join(" ");

    const result = {
      pay_date: payIso,
      net_amount: netAmount,
      frequency,
      bills_amount: Math.round(billsTotal * 100) / 100,
      min_debt_amount: minDebt,
      extra_debt_amount: trimmedExtraDebt,
      savings_amount: trimmedSavings,
      investment_amount: trimmedInvestment,
      buffer_amount: buffer,
      safe_to_spend_amount: safeToSpend,
      bills_breakdown: billItems,
      rationale,
      confidence,
      status: "suggested",
      source: "ai",
    };

    let saved = null;
    if (persist) {
      const { data, error } = await supabase
        .from("paycheck_deployments")
        .insert({ household_id: householdId, ...result })
        .select()
        .maybeSingle();
      if (error) console.error("insert error", error);
      saved = data;
    }

    return new Response(JSON.stringify({ deployment: saved || result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("paycheck-deploy error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
