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
    // Allow both cron (with CRON_SECRET) and authenticated user calls
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedCronSecret = Deno.env.get("CRON_SECRET");
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    let householdFilter: string | null = null;

    if (cronSecret && cronSecret === expectedCronSecret) {
      // Cron job — scan all households
      householdFilter = null;
    } else if (authHeader) {
      // User-initiated — scope to their household
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: authError } = await userClient.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const body = await req.json().catch(() => ({}));
      householdFilter = body.household_id || null;
      if (householdFilter) {
        const { data: isMember } = await adminClient.rpc("is_household_member", {
          _user_id: user.id, _household_id: householdFilter,
        });
        if (!isMember) {
          return new Response(JSON.stringify({ error: "Not a household member" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } else {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get canceled subscriptions
    let canceledQuery = adminClient
      .from("subscriptions")
      .select("id, household_id, merchant, normalized_merchant, average_amount, cancellation_confirmed_at")
      .eq("is_cancelled", true);

    if (householdFilter) {
      canceledQuery = canceledQuery.eq("household_id", householdFilter);
    }

    const { data: canceledSubs } = await canceledQuery;
    if (!canceledSubs?.length) {
      return new Response(JSON.stringify({ checked: 0, alerts: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by household
    const byHousehold = new Map<string, typeof canceledSubs>();
    for (const sub of canceledSubs) {
      const list = byHousehold.get(sub.household_id) || [];
      list.push(sub);
      byHousehold.set(sub.household_id, list);
    }

    let totalAlerts = 0;

    for (const [hhId, subs] of byHousehold) {
      // Get transactions from the last 45 days for this household
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 45);
      const cutoffDate = cutoff.toISOString().split("T")[0];

      const { data: recentTxns } = await adminClient
        .from("transactions")
        .select("merchant, normalized_merchant, amount, date")
        .eq("household_id", hhId)
        .gte("date", cutoffDate)
        .lt("amount", 0);

      if (!recentTxns?.length) continue;

      for (const sub of subs) {
        const cancelDate = sub.cancellation_confirmed_at
          ? sub.cancellation_confirmed_at.split("T")[0]
          : null;

        const merchantLower = (sub.normalized_merchant || sub.merchant || "").toLowerCase().trim();
        if (!merchantLower) continue;

        // Find transactions matching this merchant AFTER cancellation
        const matches = recentTxns.filter(t => {
          const txMerchant = (t.normalized_merchant || t.merchant || "").toLowerCase().trim();
          const isMatch = txMerchant === merchantLower ||
            txMerchant.includes(merchantLower) ||
            merchantLower.includes(txMerchant);
          // Only flag if transaction is after cancellation date
          if (cancelDate && t.date < cancelDate) return false;
          return isMatch;
        });

        if (matches.length > 0) {
          const totalCharged = matches.reduce((sum, t) => sum + Math.abs(t.amount), 0);
          const latestDate = matches.sort((a, b) => b.date.localeCompare(a.date))[0].date;

          // Check if we already created an alert for this subscription recently (within 7 days)
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          const { data: existingAlerts } = await adminClient
            .from("financial_insights")
            .select("id")
            .eq("household_id", hhId)
            .eq("insight_type", "subscription_still_charged")
            .gte("created_at", sevenDaysAgo.toISOString())
            .like("message", `%${sub.merchant}%`)
            .limit(1);

          if (existingAlerts?.length) continue; // Already alerted recently

          await adminClient.from("financial_insights").insert({
            household_id: hhId,
            insight_type: "subscription_still_charged",
            severity: "warning",
            message: `⚠️ "${sub.merchant}" was marked as canceled but a charge of $${totalCharged.toFixed(2)} appeared on ${latestDate}. You may still be getting billed.`,
            metadata: {
              subscription_id: sub.id,
              merchant: sub.merchant,
              amount_charged: totalCharged,
              latest_charge_date: latestDate,
              num_charges: matches.length,
            },
            is_read: false,
          });

          // Also update the subscription status to flag it
          await adminClient
            .from("subscriptions")
            .update({ cancellation_status: "still_active" })
            .eq("id", sub.id);

          totalAlerts++;
        }
      }
    }

    return new Response(JSON.stringify({
      checked: canceledSubs.length,
      alerts: totalAlerts,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-canceled-charges error:", e);
    return new Response(JSON.stringify({ error: "An unexpected error occurred." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
