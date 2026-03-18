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

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader! } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { household_id } = await req.json();
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

    // Get last 6 months of transactions
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const startDate = sixMonthsAgo.toISOString().split("T")[0];

    const { data: transactions } = await adminClient
      .from("transactions")
      .select("id, merchant, normalized_merchant, amount, date, category_id")
      .eq("household_id", household_id)
      .gte("date", startDate)
      .lt("amount", 0)
      .order("date", { ascending: true });

    if (!transactions?.length) {
      return new Response(JSON.stringify({ subscriptions: [], detected: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by normalized_merchant or merchant
    const merchantGroups = new Map<string, { amounts: number[]; dates: string[]; categoryId: string | null }>();

    for (const t of transactions) {
      const key = (t.normalized_merchant || t.merchant || "").toLowerCase().trim();
      if (!key) continue;
      const group = merchantGroups.get(key) || { amounts: [], dates: [], categoryId: null };
      group.amounts.push(Math.abs(t.amount));
      group.dates.push(t.date);
      if (t.category_id) group.categoryId = t.category_id;
      merchantGroups.set(key, group);
    }

    // Detect recurring patterns
    const detected: {
      merchant: string;
      frequency: string;
      average_amount: number;
      last_charge_date: string;
      next_expected_date: string;
      category_id: string | null;
    }[] = [];

    for (const [merchant, group] of merchantGroups) {
      if (group.dates.length < 2) continue;

      // Calculate intervals between charges
      const sortedDates = group.dates.sort();
      const intervals: number[] = [];
      for (let i = 1; i < sortedDates.length; i++) {
        const diff = (new Date(sortedDates[i]).getTime() - new Date(sortedDates[i - 1]).getTime()) / (1000 * 60 * 60 * 24);
        intervals.push(diff);
      }

      const avgInterval = intervals.reduce((s, v) => s + v, 0) / intervals.length;
      const stdDev = Math.sqrt(intervals.reduce((s, v) => s + (v - avgInterval) ** 2, 0) / intervals.length);

      // Only consider consistent intervals (low variance)
      if (stdDev > avgInterval * 0.4) continue;

      let frequency: string;
      if (avgInterval >= 5 && avgInterval <= 9) frequency = "weekly";
      else if (avgInterval >= 12 && avgInterval <= 18) frequency = "biweekly";
      else if (avgInterval >= 25 && avgInterval <= 45) frequency = "monthly";
      else if (avgInterval >= 80 && avgInterval <= 110) frequency = "quarterly";
      else if (avgInterval >= 340 && avgInterval <= 400) frequency = "yearly";
      else continue;

      const avgAmount = group.amounts.reduce((s, v) => s + v, 0) / group.amounts.length;
      const lastDate = sortedDates[sortedDates.length - 1];

      // Estimate next charge
      const nextDate = new Date(lastDate);
      if (frequency === "weekly") nextDate.setDate(nextDate.getDate() + 7);
      else if (frequency === "biweekly") nextDate.setDate(nextDate.getDate() + 14);
      else if (frequency === "monthly") nextDate.setMonth(nextDate.getMonth() + 1);
      else if (frequency === "quarterly") nextDate.setMonth(nextDate.getMonth() + 3);
      else nextDate.setFullYear(nextDate.getFullYear() + 1);

      // Use original case merchant name from first transaction
      const originalMerchant = transactions.find(
        t => (t.normalized_merchant || t.merchant || "").toLowerCase().trim() === merchant
      )?.normalized_merchant || transactions.find(
        t => (t.merchant || "").toLowerCase().trim() === merchant
      )?.merchant || merchant;

      detected.push({
        merchant: originalMerchant,
        frequency,
        average_amount: Math.round(avgAmount * 100) / 100,
        last_charge_date: lastDate,
        next_expected_date: nextDate.toISOString().split("T")[0],
        category_id: group.categoryId,
      });
    }

    // Upsert subscriptions
    for (const sub of detected) {
      try {
        await adminClient.from("subscriptions").upsert({
          household_id,
          merchant: sub.merchant,
          normalized_merchant: sub.merchant,
          frequency: sub.frequency,
          average_amount: sub.average_amount,
          last_charge_date: sub.last_charge_date,
          next_expected_date: sub.next_expected_date,
          category_id: sub.category_id,
          is_active: true,
        }, { onConflict: "household_id,merchant" });
      } catch {
        // ignore upsert errors
      }
    }

    return new Response(JSON.stringify({
      detected: detected.length,
      subscriptions: detected,
      total_monthly: detected
        .filter(s => s.frequency === "monthly")
        .reduce((sum, s) => sum + s.average_amount, 0),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("detect-subscriptions error:", e);
    return new Response(JSON.stringify({ error: "An unexpected error occurred." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
