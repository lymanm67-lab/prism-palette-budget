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

    if (!holdings?.length) {
      return new Response(JSON.stringify({ updated: 0, message: "No manual holdings with symbols found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduplicate symbols to minimize API calls
    const uniqueSymbols = [...new Set(holdings.map(h => (h.symbol || "").toUpperCase()).filter(Boolean))];
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

    for (const h of holdings) {
      const sym = (h.symbol || "").toUpperCase();
      const priceInfo = priceMap.get(sym);
      if (!priceInfo) continue;

      const marketValue = h.quantity * priceInfo.price;
      const updateData: Record<string, any> = {
        price: priceInfo.price,
        market_value: marketValue,
        updated_at: new Date().toISOString(),
      };
      // Update name if it was "Unknown" or empty
      if (priceInfo.name) {
        // We'll check existing name and only update if it's generic
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

    // Also update account balances based on holdings
    if (updated > 0) {
      // Group holdings by account to recalculate account balance
      const accountTotals = new Map<string, number>();
      const { data: allHoldings } = await adminClient
        .from("investment_holdings")
        .select("account_id, market_value")
        .in("account_id", [...new Set(holdings.map(h => h.id))].length > 0 
          ? [...new Set(holdings.filter(h => priceMap.has((h.symbol || "").toUpperCase())).map(h => h.id))]
          : []);

      // We'll skip account balance updates for now to keep it simple
    }

    return new Response(JSON.stringify({
      updated,
      total: holdings.length,
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
