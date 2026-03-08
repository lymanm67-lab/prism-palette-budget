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

    // Fetch normalization rules (global + household-specific)
    const { data: rules } = await adminClient
      .from("merchant_normalizations")
      .select("raw_pattern, normalized_name")
      .or(`is_global.eq.true,household_id.eq.${household_id}`);

    const ruleMap = new Map<string, string>();
    for (const r of rules || []) {
      ruleMap.set(r.raw_pattern.toLowerCase(), r.normalized_name);
    }

    // Get transactions without normalized_merchant
    const { data: transactions } = await adminClient
      .from("transactions")
      .select("id, merchant")
      .eq("household_id", household_id)
      .is("normalized_merchant", null)
      .not("merchant", "is", null);

    if (!transactions?.length) {
      return new Response(JSON.stringify({ normalized: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let count = 0;
    for (const txn of transactions) {
      const merchant = (txn.merchant || "").toLowerCase().trim();
      if (!merchant) continue;

      // Find best matching rule (substring match)
      let normalized: string | null = null;
      for (const [pattern, name] of ruleMap) {
        if (merchant.includes(pattern)) {
          normalized = name;
          break;
        }
      }

      if (normalized) {
        await adminClient.from("transactions")
          .update({ normalized_merchant: normalized })
          .eq("id", txn.id);
        count++;
      }
    }

    return new Response(JSON.stringify({ normalized: count, total: transactions.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("normalize-merchants error:", e);
    return new Response(JSON.stringify({ error: "An unexpected error occurred." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
