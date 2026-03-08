import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MX_BASE_URL = "https://api.mx.com";

async function mxFetch(path: string, method: string, body?: any) {
  const MX_CLIENT_ID = Deno.env.get("MX_CLIENT_ID")!;
  const MX_API_KEY = Deno.env.get("MX_API_KEY")!;
  const auth = btoa(`${MX_CLIENT_ID}:${MX_API_KEY}`);

  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/vnd.mx.api.v1+json",
      "Authorization": `Basic ${auth}`,
    },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${MX_BASE_URL}${path}`, options);
  const data = await res.json();
  if (!res.ok) {
    console.error(`MX API error [${res.status}] ${path}:`, JSON.stringify(data));
    throw new Error(`MX API error: ${res.status}`);
  }
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const MX_CLIENT_ID = Deno.env.get("MX_CLIENT_ID");
  const MX_API_KEY = Deno.env.get("MX_API_KEY");
  if (!MX_CLIENT_ID || !MX_API_KEY) {
    return new Response(JSON.stringify({ error: "MX credentials not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Authenticate user
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();

    // ========================
    // CREATE MX USER
    // ========================
    if (action === "create-user" && req.method === "POST") {
      const { household_id } = await req.json();

      const { data: isMember } = await adminClient.rpc("is_household_member", {
        _user_id: user.id, _household_id: household_id,
      });
      if (!isMember) {
        return new Response(JSON.stringify({ error: "Not a household member" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if MX user already exists for this user
      const { data: existingItems } = await adminClient
        .from("plaid_items")
        .select("id, plaid_item_id")
        .eq("household_id", household_id)
        .eq("provider_type", "mx")
        .limit(1);

      if (existingItems?.length) {
        // User already has an MX user, return their ID
        return new Response(JSON.stringify({ mx_user_guid: existingItems[0].plaid_item_id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create MX user
      const mxUser = await mxFetch("/users", "POST", {
        user: {
          id: `prism_${user.id}`,
          metadata: JSON.stringify({ household_id }),
        },
      });

      const mxUserGuid = mxUser.user.guid;

      // Store reference
      await adminClient.from("plaid_items").insert({
        household_id,
        plaid_item_id: mxUserGuid,
        plaid_access_token: "mx_managed",
        provider_type: "mx",
        institution_name: "MX",
        status: "active",
      });

      return new Response(JSON.stringify({ mx_user_guid: mxUserGuid }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========================
    // GET CONNECT WIDGET URL
    // ========================
    if (action === "connect-widget" && req.method === "POST") {
      const { mx_user_guid } = await req.json();
      if (!mx_user_guid) {
        return new Response(JSON.stringify({ error: "Missing mx_user_guid" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const widgetData = await mxFetch(`/users/${mx_user_guid}/connect_widget_url`, "POST", {
        widget_url: {
          widget_type: "connect_widget",
          mode: "aggregation",
          ui_message_version: 4,
          use_cases: ["PFM"],
        },
      });

      return new Response(JSON.stringify({
        widget_url: widgetData.widget_url.url,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========================
    // SYNC ACCOUNTS & TRANSACTIONS
    // ========================
    if (action === "sync" && req.method === "POST") {
      const { household_id, mx_user_guid } = await req.json();

      const { data: isMember } = await adminClient.rpc("is_household_member", {
        _user_id: user.id, _household_id: household_id,
      });
      if (!isMember) {
        return new Response(JSON.stringify({ error: "Not a household member" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch MX accounts
      const accountsData = await mxFetch(`/users/${mx_user_guid}/accounts`, "GET");
      const mxAccounts = accountsData.accounts || [];

      const typeMap: Record<string, string> = {
        CHECKING: "checking",
        SAVINGS: "savings",
        CREDIT_CARD: "credit",
        LOAN: "loan",
        INVESTMENT: "investment",
        MORTGAGE: "loan",
        LINE_OF_CREDIT: "credit",
      };

      // Upsert accounts
      let syncedAccounts = 0;
      const accountGuidMap = new Map<string, string>(); // mx_guid -> our_id

      for (const acc of mxAccounts) {
        // Check if account already exists
        const { data: existing } = await adminClient
          .from("accounts")
          .select("id")
          .eq("household_id", household_id)
          .eq("institution", `MX:${acc.guid}`)
          .limit(1);

        if (existing?.length) {
          // Update balance
          await adminClient.from("accounts").update({
            balance: acc.balance || 0,
            last_synced_at: new Date().toISOString(),
          }).eq("id", existing[0].id);
          accountGuidMap.set(acc.guid, existing[0].id);
        } else {
          // Insert new account
          const { data: newAcc } = await adminClient.from("accounts").insert({
            household_id,
            name: acc.name || acc.original_name || "MX Account",
            institution: `MX:${acc.guid}`,
            account_type: typeMap[acc.account_type] || "other",
            balance: acc.balance || 0,
            currency: acc.currency_code || "USD",
            last_synced_at: new Date().toISOString(),
          }).select("id").single();

          if (newAcc) accountGuidMap.set(acc.guid, newAcc.id);
          syncedAccounts++;
        }
      }

      // Fetch MX transactions (last 90 days)
      const endDate = new Date().toISOString().split("T")[0];
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      let page = 1;
      let totalTxnsSynced = 0;
      let hasMore = true;

      while (hasMore) {
        const txnData = await mxFetch(
          `/users/${mx_user_guid}/transactions?from_date=${startDate}&to_date=${endDate}&page=${page}&records_per_page=100`,
          "GET"
        );

        const mxTxns = txnData.transactions || [];
        if (mxTxns.length === 0) {
          hasMore = false;
          break;
        }

        for (const t of mxTxns) {
          const accountId = accountGuidMap.get(t.account_guid);
          if (!accountId) continue;

          // Deduplicate by provider_transaction_id
          const { data: exists } = await adminClient
            .from("transactions")
            .select("id")
            .eq("provider_transaction_id", t.guid)
            .limit(1);

          if (exists?.length) continue;

          await adminClient.from("transactions").insert({
            household_id,
            account_id: accountId,
            date: t.transacted_at?.split("T")[0] || t.date || endDate,
            merchant: t.merchant?.name || t.description || null,
            normalized_merchant: t.merchant?.name || null,
            amount: t.type === "DEBIT" ? -(t.amount || 0) : (t.amount || 0),
            notes: t.description || null,
            provider_transaction_id: t.guid,
          });
          totalTxnsSynced++;
        }

        if (txnData.pagination && page < txnData.pagination.total_pages) {
          page++;
        } else {
          hasMore = false;
        }
      }

      return new Response(JSON.stringify({
        success: true,
        accounts_synced: syncedAccounts,
        accounts_updated: mxAccounts.length - syncedAccounts,
        transactions_synced: totalTxnsSynced,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========================
    // LIST MEMBERS (connections)
    // ========================
    if (action === "members" && req.method === "POST") {
      const { mx_user_guid } = await req.json();
      const membersData = await mxFetch(`/users/${mx_user_guid}/members`, "GET");

      return new Response(JSON.stringify({
        members: (membersData.members || []).map((m: any) => ({
          guid: m.guid,
          name: m.name,
          institution_code: m.institution_code,
          connection_status: m.connection_status,
          aggregated_at: m.successfully_aggregated_at,
        })),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("MX error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
