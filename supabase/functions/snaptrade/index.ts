import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SNAPTRADE_BASE = "https://api.snaptrade.com/api/v1";

function JSONstringifyOrder(obj: unknown): string {
  const allKeys: string[] = [];
  const seen: Record<string, null> = {};
  JSON.stringify(obj, function (key, value) {
    if (!(key in seen)) {
      allKeys.push(key);
      seen[key] = null;
    }
    return value;
  });
  allKeys.sort();
  return JSON.stringify(obj, allKeys);
}

function computeSignature(
  consumerKey: string,
  requestPath: string,
  requestQuery: string,
  requestData: unknown | null
): string {
  const sigObject = {
    content: requestData,
    path: requestPath,
    query: requestQuery,
  };
  const sigContent = JSONstringifyOrder(sigObject);
  return createHmac("sha256", consumerKey).update(sigContent).digest("base64");
}

async function snaptradeRequest(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  query?: Record<string, string>
) {
  const clientId = Deno.env.get("SNAPTRADE_CLIENT_ID")!;
  const consumerKey = Deno.env.get("SNAPTRADE_CONSUMER_KEY")!;
  const timestamp = Math.round(Date.now() / 1000).toString();

  // Build query string
  const qp = new URLSearchParams();
  qp.set("clientId", clientId);
  qp.set("timestamp", timestamp);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      qp.set(k, v);
    }
  }

  const requestPath = `/api/v1${path}`;
  const requestQuery = qp.toString();
  const requestData = body && (method === "POST" || method === "PUT") ? body : null;
  const signature = computeSignature(consumerKey, requestPath, requestQuery, requestData);

  const url = `${SNAPTRADE_BASE}${path}?${requestQuery}`;

  const opts: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      "Signature": signature,
    },
  };
  if (requestData) {
    opts.body = JSON.stringify(requestData);
  }

  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      `SnapTrade API error [${res.status}]: ${JSON.stringify(data)}`
    );
  }
  return data;
}

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

function getUserSupabase(authHeader: string) {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
}

async function getUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Not authenticated");
  const sb = getUserSupabase(authHeader);
  const {
    data: { user },
    error,
  } = await sb.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");
  return { user, sb, authHeader };
}

// Route: POST /register-user
async function registerUser(req: Request) {
  const { user } = await getUser(req);
  const userId = user.id;
  const admin = getSupabaseAdmin();

  // Check DB for existing credentials first
  const { data: existing } = await admin
    .from("snaptrade_connections")
    .select("snaptrade_user_id, snaptrade_user_secret")
    .eq("snaptrade_user_id", userId)
    .limit(1);

  if (existing && existing.length > 0) {
    return new Response(
      JSON.stringify({
        snaptrade_user_id: existing[0].snaptrade_user_id,
        snaptrade_user_secret: existing[0].snaptrade_user_secret,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const data = await snaptradeRequest("POST", "/snapTrade/registerUser", {
      userId,
    });

    return new Response(
      JSON.stringify({
        snaptrade_user_id: data.userId,
        snaptrade_user_secret: data.userSecret,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    // Personal key limit (1012): can only register one user.
    // Reuse the already-registered user by listing users.
    if (message.includes("1012") || message.includes("Personal keys")) {
      try {
        const users = await snaptradeRequest("GET", "/snapTrade/listUsers");
        if (Array.isArray(users) && users.length > 0) {
          const existingUserId = users[0];
          // Delete the old user and re-register with current userId
          try {
            await snaptradeRequest("DELETE", "/snapTrade/deleteUser", undefined, { userId: existingUserId });
          } catch (_) { /* ignore */ }
          const data = await snaptradeRequest("POST", "/snapTrade/registerUser", { userId });
          return new Response(
            JSON.stringify({ snaptrade_user_id: data.userId, snaptrade_user_secret: data.userSecret }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (_inner) { /* fall through */ }
    }

    // If user already exists in SnapTrade but not in our DB (1010), delete and re-register
    if (message.includes("already exist") || message.includes("1010")) {
      try {
        await snaptradeRequest("DELETE", "/snapTrade/deleteUser", undefined, { userId });
      } catch (_) { /* ignore delete errors */ }

      const data = await snaptradeRequest("POST", "/snapTrade/registerUser", { userId });
      return new Response(
        JSON.stringify({ snaptrade_user_id: data.userId, snaptrade_user_secret: data.userSecret }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    throw err;
  }
}

// Route: POST /create-redirect
async function createRedirect(req: Request) {
  const { user } = await getUser(req);
  const { snaptrade_user_id, snaptrade_user_secret, broker } = await req.json();

  const body: Record<string, unknown> = {
    userId: snaptrade_user_id,
    userSecret: snaptrade_user_secret,
  };
  if (broker) body.broker = broker;

  const data = await snaptradeRequest(
    "POST",
    "/snapTrade/login",
    body,
    { userId: snaptrade_user_id, userSecret: snaptrade_user_secret }
  );

  return new Response(
    JSON.stringify({ redirect_url: data.redirectURI || data.loginLink }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Route: POST /sync-accounts
async function syncAccounts(req: Request) {
  const { user, sb } = await getUser(req);
  const { household_id, snaptrade_user_id, snaptrade_user_secret, connection_id } =
    await req.json();

  const admin = getSupabaseAdmin();

  // 1. Fetch accounts from SnapTrade
  const accounts = await snaptradeRequest(
    "GET",
    "/accounts",
    undefined,
    { userId: snaptrade_user_id, userSecret: snaptrade_user_secret }
  );

  let accountsSynced = 0;
  let holdingsSynced = 0;

  for (const acct of accounts) {
    // Upsert account
    const { data: existingAcct } = await admin
      .from("accounts")
      .select("id")
      .eq("household_id", household_id)
      .eq("provider_account_id", acct.id || acct.brokerage_account_id)
      .eq("provider_type", "snaptrade")
      .maybeSingle();

    const accountData = {
      household_id,
      name: acct.name || acct.number?.toString() || "Investment Account",
      account_type: "investment" as const,
      balance: acct.balance?.total?.amount || acct.cash || 0,
      institution: acct.institution_name || acct.brokerage?.name || null,
      provider_type: "snaptrade",
      provider_account_id: acct.id || acct.brokerage_account_id,
      is_active: true,
      last_synced_at: new Date().toISOString(),
    };

    let accountId: string;

    if (existingAcct) {
      await admin
        .from("accounts")
        .update(accountData)
        .eq("id", existingAcct.id);
      accountId = existingAcct.id;
    } else {
      const { data: newAcct, error } = await admin
        .from("accounts")
        .insert(accountData)
        .select("id")
        .single();
      if (error) {
        console.error("Error creating account:", error);
        continue;
      }
      accountId = newAcct.id;
    }
    accountsSynced++;

    // 2. Fetch holdings for this account
    try {
      const holdingsPath = `/accounts/${acct.id || acct.brokerage_account_id}/holdings`;
      const holdings = await snaptradeRequest(
        "GET",
        holdingsPath,
        undefined,
        { userId: snaptrade_user_id, userSecret: snaptrade_user_secret }
      );

      const positions = holdings?.positions || holdings || [];

      // Get existing holdings to preserve manual cost_basis
      const { data: existingHoldings } = await admin
        .from("investment_holdings")
        .select("id, provider_holding_id, cost_basis, symbol")
        .eq("account_id", accountId)
        .eq("household_id", household_id);

      const existingMap = new Map<string, { id: string; cost_basis: number | null }>();
      for (const eh of (existingHoldings || [])) {
        const key = eh.provider_holding_id || eh.symbol;
        if (key) existingMap.set(key, { id: eh.id, cost_basis: eh.cost_basis });
      }

      const seenIds = new Set<string>();

      for (const pos of positions) {
        console.log("Raw position data:", JSON.stringify(pos).substring(0, 500));

        // Extract clean symbol string — handle deeply nested SnapTrade structures
        const symObj = pos.symbol || {};
        const rawSymbol = symObj.symbol?.symbol || symObj.symbol || symObj.raw_symbol || 
          pos.ticker || pos.symbol_id ||
          (typeof pos.symbol === 'string' ? pos.symbol : null);
        const cleanSymbol = (typeof rawSymbol === 'string' && rawSymbol.length < 20) ? rawSymbol : 
          (typeof rawSymbol === 'object' && rawSymbol?.symbol ? String(rawSymbol.symbol) : null);

        // Extract clean name string
        const rawName = symObj.description || symObj.name || pos.security_name || 
          pos.description || (typeof pos.name === 'string' ? pos.name : null);
        const cleanName = typeof rawName === 'string' ? rawName : (cleanSymbol || 'Unknown');

        console.log(`Extracted symbol: ${cleanSymbol}, name: ${cleanName}`);

        const providerId = pos.id || symObj.id || null;
        const providerIdStr = typeof providerId === 'object' ? JSON.stringify(providerId) : String(providerId || '');
        const lookupKey = providerIdStr || cleanSymbol;

        // Compute cost basis from provider, fall back to existing manual entry
        const existingEntry = lookupKey ? existingMap.get(lookupKey) : null;
        let costBasis: number | null = null;
        if (pos.average_purchase_price && (pos.units || pos.quantity)) {
          costBasis = pos.average_purchase_price * (pos.units || pos.quantity || 0);
        } else if (existingEntry?.cost_basis != null) {
          costBasis = existingEntry.cost_basis; // Preserve manual entry
        }

        const holdingData = {
          account_id: accountId,
          household_id,
          symbol: cleanSymbol,
          name: cleanName,
          quantity: pos.units || pos.quantity || 0,
          price: pos.price || pos.symbol?.trade?.last_trade_price || 0,
          market_value:
            pos.units && pos.price
              ? pos.units * pos.price
              : pos.market_value || 0,
          cost_basis: costBasis,
          holding_type:
            pos.symbol?.type?.code?.toLowerCase() || "equity",
          provider_holding_id: providerIdStr || null,
          currency:
            pos.symbol?.currency?.code || pos.currency || "USD",
          updated_at: new Date().toISOString(),
        };

        if (existingEntry) {
          await admin.from("investment_holdings").update(holdingData).eq("id", existingEntry.id);
          seenIds.add(existingEntry.id);
        } else {
          const { data: inserted } = await admin.from("investment_holdings").insert(holdingData).select("id").single();
          if (inserted) seenIds.add(inserted.id);
        }
        holdingsSynced++;
      }

      // Remove holdings no longer in provider (but not manually added ones without provider_holding_id)
      for (const eh of (existingHoldings || [])) {
        if (!seenIds.has(eh.id) && eh.provider_holding_id) {
          await admin.from("investment_holdings").delete().eq("id", eh.id);
        }
      }
    } catch (e) {
      console.error("Error syncing holdings for account:", acct.id, e);
    }
  }

  // Update connection status
  if (connection_id) {
    await admin
      .from("snaptrade_connections")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", connection_id);
  }

  return new Response(
    JSON.stringify({ accounts_synced: accountsSynced, holdings_synced: holdingsSynced }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Route: POST /list-authorizations
async function listAuthorizations(req: Request) {
  await getUser(req);
  const { snaptrade_user_id, snaptrade_user_secret } = await req.json();

  const data = await snaptradeRequest(
    "GET",
    "/authorizations",
    undefined,
    { userId: snaptrade_user_id, userSecret: snaptrade_user_secret }
  );

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Route: DELETE /revoke
async function revokeConnection(req: Request) {
  const { user } = await getUser(req);
  const { snaptrade_user_id, snaptrade_user_secret, authorization_id, connection_id } =
    await req.json();

  const admin = getSupabaseAdmin();

  try {
    await snaptradeRequest(
      "DELETE",
      `/authorizations/${authorization_id}`,
      undefined,
      { userId: snaptrade_user_id, userSecret: snaptrade_user_secret }
    );
  } catch (e) {
    console.error("Error revoking SnapTrade authorization:", e);
  }

  // Mark connection as revoked
  if (connection_id) {
    await admin
      .from("snaptrade_connections")
      .update({ status: "revoked" })
      .eq("id", connection_id);
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    switch (path) {
      case "register-user":
        return await registerUser(req);
      case "create-redirect":
        return await createRedirect(req);
      case "sync-accounts":
        return await syncAccounts(req);
      case "list-authorizations":
        return await listAuthorizations(req);
      case "revoke":
        return await revokeConnection(req);
      default:
        return new Response(JSON.stringify({ error: "Unknown route" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err) {
    console.error("SnapTrade function error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
