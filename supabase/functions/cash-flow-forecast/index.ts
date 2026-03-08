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

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader! } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { household_id, forecast_days = 90, adjustments } = await req.json();
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

    // Get current balances
    const { data: accounts } = await adminClient
      .from("accounts")
      .select("id, name, balance, account_type")
      .eq("household_id", household_id)
      .eq("is_active", true);

    const currentBalance = (accounts || []).reduce((s, a) => s + a.balance, 0);

    // Get last 90 days of transactions for pattern analysis
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: transactions } = await adminClient
      .from("transactions")
      .select("amount, date, merchant, category_id, categories(name)")
      .eq("household_id", household_id)
      .gte("date", ninetyDaysAgo.toISOString().split("T")[0])
      .order("date");

    // Get recurring transactions
    const { data: recurring } = await adminClient
      .from("recurring_transactions")
      .select("amount, frequency, next_due_date, merchant")
      .eq("household_id", household_id)
      .eq("is_active", true);

    if (!transactions?.length) {
      return new Response(JSON.stringify({
        forecast: [],
        current_balance: currentBalance,
        message: "Not enough data to generate forecast.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate daily averages
    const incomeByDay = new Map<number, number[]>(); // day of month -> amounts
    const expenseByDay = new Map<number, number[]>();

    for (const t of transactions) {
      const day = new Date(t.date).getDate();
      if (t.amount > 0) {
        incomeByDay.set(day, [...(incomeByDay.get(day) || []), t.amount]);
      } else {
        expenseByDay.set(day, [...(expenseByDay.get(day) || []), Math.abs(t.amount)]);
      }
    }

    // Monthly averages
    const totalIncome = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    const monthlyIncome = totalIncome / 3;
    const monthlyExpenses = totalExpenses / 3;
    const dailyDiscretionary = (monthlyExpenses - (recurring || []).reduce((s, r) => s + Math.abs(r.amount), 0)) / 30;

    // Apply adjustments
    let adjustedDailyExpense = dailyDiscretionary;
    let adjustedMonthlyIncome = monthlyIncome;
    if (adjustments) {
      if (adjustments.spending_reduction_pct) {
        adjustedDailyExpense *= (1 - adjustments.spending_reduction_pct / 100);
      }
      if (adjustments.additional_savings) {
        adjustedDailyExpense += adjustments.additional_savings / 30;
      }
      if (adjustments.cancel_subscriptions_amount) {
        adjustedDailyExpense -= adjustments.cancel_subscriptions_amount / 30;
      }
    }

    // Generate daily forecast
    const forecast: { date: string; projected_balance: number; income: number; expenses: number; event?: string }[] = [];
    let runningBalance = currentBalance;
    const today = new Date();

    for (let i = 0; i < forecast_days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dayOfMonth = date.getDate();
      const dateStr = date.toISOString().split("T")[0];

      let dayIncome = 0;
      let dayExpense = 0;

      // Check for recurring transactions
      for (const r of recurring || []) {
        const nextDue = new Date(r.next_due_date);
        const dueDay = nextDue.getDate();
        if (dayOfMonth === dueDay) {
          if (r.amount > 0) dayIncome += r.amount;
          else dayExpense += Math.abs(r.amount);
        }
      }

      // Add estimated discretionary spending
      dayExpense += adjustedDailyExpense;

      // Add estimated income on typical income days
      const incomeAmounts = incomeByDay.get(dayOfMonth);
      if (incomeAmounts) {
        const avgIncome = incomeAmounts.reduce((s, v) => s + v, 0) / incomeAmounts.length;
        dayIncome += avgIncome / 3; // Divide by 3 months of history
      }

      runningBalance += dayIncome - dayExpense;

      let event: string | undefined;
      for (const r of recurring || []) {
        const nextDue = new Date(r.next_due_date);
        if (nextDue.getDate() === dayOfMonth) {
          event = r.merchant || "Recurring payment";
          break;
        }
      }

      forecast.push({
        date: dateStr,
        projected_balance: Math.round(runningBalance * 100) / 100,
        income: Math.round(dayIncome * 100) / 100,
        expenses: Math.round(dayExpense * 100) / 100,
        event,
      });
    }

    // Generate AI insights
    const thirtyDayBalance = forecast[29]?.projected_balance || runningBalance;
    const ninetyDayBalance = forecast[forecast.length - 1]?.projected_balance || runningBalance;
    const projectedSavings = thirtyDayBalance - currentBalance;
    const lowBalanceDay = forecast.find(f => f.projected_balance < 500);

    const insights: string[] = [];
    if (lowBalanceDay) {
      insights.push(`You may fall below $500 in about ${forecast.indexOf(lowBalanceDay)} days.`);
    }
    if (projectedSavings > 0) {
      insights.push(`You are projected to save $${Math.round(projectedSavings)} this month.`);
    } else {
      insights.push(`You are projected to spend $${Math.round(Math.abs(projectedSavings))} more than you earn this month.`);
    }
    insights.push(`Expected monthly income: $${Math.round(monthlyIncome)}. Expected monthly expenses: $${Math.round(monthlyExpenses)}.`);

    return new Response(JSON.stringify({
      forecast: forecast.filter((_, i) => i % (forecast_days > 30 ? 3 : 1) === 0 || i === forecast.length - 1),
      current_balance: currentBalance,
      thirty_day_balance: thirtyDayBalance,
      ninety_day_balance: ninetyDayBalance,
      monthly_income: Math.round(monthlyIncome * 100) / 100,
      monthly_expenses: Math.round(monthlyExpenses * 100) / 100,
      projected_monthly_savings: Math.round(projectedSavings * 100) / 100,
      insights,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cash-flow-forecast error:", e);
    return new Response(JSON.stringify({ error: "An unexpected error occurred." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
