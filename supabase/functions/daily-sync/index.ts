import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify cron secret — required, no fallback
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("Authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all active SnapTrade connections
    const { data: connections, error } = await admin
      .from("snaptrade_connections")
      .select("*")
      .eq("status", "active");

    if (error) throw error;
    if (!connections?.length) {
      return new Response(
        JSON.stringify({ message: "No active connections to sync", synced: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    let totalSynced = 0;
    const errors: string[] = [];

    for (const conn of connections) {
      try {
        const res = await fetch(
          `${supabaseUrl}/functions/v1/snaptrade/sync-accounts`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              household_id: conn.household_id,
              snaptrade_user_id: conn.snaptrade_user_id,
              snaptrade_user_secret: conn.snaptrade_user_secret,
              connection_id: conn.id,
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          totalSynced += data.accounts_synced || 0;
        } else {
          const errData = await res.json();
          errors.push(`Connection ${conn.id}: ${errData.error || res.status}`);

          // Mark stale if repeated failures
          await admin
            .from("snaptrade_connections")
            .update({ status: "error", updated_at: new Date().toISOString() })
            .eq("id", conn.id);
        }
      } catch (e) {
        errors.push(`Connection ${conn.id}: ${e instanceof Error ? e.message : "Unknown"}`);
      }
    }

    // Also sync Plaid accounts for all households with plaid items
    try {
      const { data: plaidItems } = await admin
        .from("plaid_items")
        .select("household_id")
        .eq("status", "active");

      const householdIds = [...new Set((plaidItems || []).map(p => p.household_id))];

      for (const hhId of householdIds) {
        try {
          await fetch(`${supabaseUrl}/functions/v1/plaid/sync-transactions`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ household_id: hhId }),
          });
        } catch (e) {
          console.error("Plaid sync error for household:", hhId, e);
        }
      }
    } catch (e) {
      console.error("Plaid daily sync error:", e);
    }

    return new Response(
      JSON.stringify({
        synced: totalSynced,
        connections_processed: connections.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Daily sync error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
