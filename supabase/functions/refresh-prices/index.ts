import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Fetches the current price for a ticker symbol from Yahoo Finance.
 * Returns null if lookup fails.
 */
async function fetchPrice(symbol: string): Promise<{ price: number; name?: string } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) {
      console.warn(`Yahoo Finance returned ${res.status} for ${symbol}`);
      await res.text(); // consume body
      return null;
    }
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;

    const price = meta.regularMarketPrice ?? meta.previousClose ?? null;
    if (price == null) return null;

    return { price, name: meta.shortName || meta.longName || undefined };
  } catch (e) {
    console.error(`Failed to fetch price for ${symbol}:`, e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    let householdId: string | null = null;

    // Check if this is a cron call (no auth header) or a user call
    const authHeader = req.headers.get("Authorization");
    const cronSecret = req.headers.get("x-cron-secret");

    if (cronSecret === Deno.env.get("CRON_SECRET")) {
      // Cron call — refresh all households
      householdId = null;
    } else if (authHeader) {
      // User call — verify auth and get household
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: authError } = await userClient.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json().catch(() => ({}));
      householdId = body.household_id || null;

      if (householdId) {
        const adminClient = createClient(supabaseUrl, serviceRoleKey);
        const { data: isMember } = await adminClient.rpc("is_household_member", {
          _user_id: user.id, _household_id: householdId,
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

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get manually added holdings (no provider_holding_id) that have a symbol
    let query = adminClient
      .from("investment_holdings")
      .select("id, symbol, quantity, household_id")
      .is("provider_holding_id", null)
      .not("symbol", "is", null);

    if (householdId) {
      query = query.eq("household_id", householdId);
    }

    const { data: holdings, error: hErr } = await query;
    if (hErr) throw hErr;

    // Also fetch watchlist items
    let wlQuery = adminClient
      .from("investment_watchlist")
      .select("id, symbol, household_id, target_price, alert_sent")
      .not("symbol", "is", null);

    if (householdId) {
      wlQuery = wlQuery.eq("household_id", householdId);
    }

    const { data: watchlistItems, error: wlErr } = await wlQuery;
    if (wlErr) throw wlErr;

    // Collect all unique symbols from both holdings and watchlist
    const holdingSymbols = (holdings || []).map(h => (h.symbol || "").toUpperCase()).filter(Boolean);
    const watchlistSymbols = (watchlistItems || []).map(w => (w.symbol || "").toUpperCase()).filter(Boolean);
    const uniqueSymbols = [...new Set([...holdingSymbols, ...watchlistSymbols])];

    if (!uniqueSymbols.length) {
      return new Response(JSON.stringify({ updated: 0, watchlist_updated: 0, message: "No symbols to refresh" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Fetching prices for ${uniqueSymbols.length} symbols:`, uniqueSymbols);

    // Fetch all prices (with a small delay between to avoid rate limiting)
    const priceMap = new Map<string, { price: number; name?: string }>();
    for (const sym of uniqueSymbols) {
      const result = await fetchPrice(sym);
      if (result) priceMap.set(sym, result);
      // Small delay to be kind to Yahoo Finance
      await new Promise(r => setTimeout(r, 200));
    }

    console.log(`Got prices for ${priceMap.size}/${uniqueSymbols.length} symbols`);

    // Update holdings
    let updated = 0;
    const errors: string[] = [];

    for (const h of (holdings || [])) {
      const sym = (h.symbol || "").toUpperCase();
      const priceInfo = priceMap.get(sym);
      if (!priceInfo) continue;

      const marketValue = h.quantity * priceInfo.price;
      const updateData: Record<string, any> = {
        price: priceInfo.price,
        market_value: marketValue,
        updated_at: new Date().toISOString(),
      };
      if (priceInfo.name) {
        updateData.name = priceInfo.name;
      }

      const { error: uErr } = await adminClient
        .from("investment_holdings")
        .update(updateData)
        .eq("id", h.id);

      if (uErr) {
        errors.push(`${sym}: ${uErr.message}`);
      } else {
        updated++;
      }
    }

    // Update watchlist items with current prices and check for price alerts
    let watchlistUpdated = 0;
    let alertsTriggered = 0;
    const now = new Date().toISOString();

    for (const w of (watchlistItems || [])) {
      const sym = (w.symbol || "").toUpperCase();
      const priceInfo = priceMap.get(sym);
      if (!priceInfo) continue;

      const hitTarget = w.target_price != null && priceInfo.price <= w.target_price;

      const updateData: Record<string, any> = {
        current_price: priceInfo.price,
        price_updated_at: now,
        updated_at: now,
      };
      if (priceInfo.name) {
        updateData.name = priceInfo.name;
      }

      // If price crossed below target and we haven't alerted yet, trigger alert
      if (hitTarget && !w.alert_sent) {
        updateData.alert_sent = true;

        // Insert financial insight as notification
        await adminClient.from("financial_insights").insert({
          household_id: w.household_id,
          insight_type: "investment",
          severity: "success",
          message: `🎯 ${sym} hit your target! Current price ${priceInfo.price.toFixed(2)} is at or below your target of ${w.target_price.toFixed(2)}.`,
          metadata: {
            type: "watchlist_alert",
            symbol: sym,
            current_price: priceInfo.price,
            target_price: w.target_price,
            watchlist_id: w.id,
          },
        });
        alertsTriggered++;
      }

      // If price went back above target, reset alert so it can fire again
      if (!hitTarget && w.alert_sent) {
        updateData.alert_sent = false;
      }

      const { error: uErr } = await adminClient
        .from("investment_watchlist")
        .update(updateData)
        .eq("id", w.id);

      if (uErr) {
        errors.push(`watchlist ${sym}: ${uErr.message}`);
      } else {
        watchlistUpdated++;
      }
    }

    // Also update account balances based on holdings
    if (updated > 0) {
      const accountTotals = new Map<string, number>();
      const { data: allHoldings } = await adminClient
        .from("investment_holdings")
        .select("account_id, market_value")
        .in("account_id", [...new Set((holdings || []).filter(h => priceMap.has((h.symbol || "").toUpperCase())).map(h => h.id))].length > 0 
          ? [...new Set((holdings || []).filter(h => priceMap.has((h.symbol || "").toUpperCase())).map(h => h.id))]
          : []);
    }

    return new Response(JSON.stringify({
      updated,
      watchlist_updated: watchlistUpdated,
      total: (holdings || []).length,
      symbols_found: priceMap.size,
      symbols_total: uniqueSymbols.length,
      errors: errors.length > 0 ? errors : undefined,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("refresh-prices error:", e);
    return new Response(JSON.stringify({ error: "An unexpected error occurred." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
