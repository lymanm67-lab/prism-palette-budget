import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(message: string, status = 400) {
  return json({ error: message }, status);
}

// Allowed tables and their queryable columns for safety
const ALLOWED_TABLES = [
  "accounts",
  "budgets",
  "categories",
  "category_groups",
  "transactions",
  "recurring_transactions",
  "subscriptions",
  "financial_goals",
  "financial_insights",
  "debt_plans",
  "debt_items",
  "business_profiles",
  "profiles",
  "subcategories",
  "categorization_rules",
  "merchant_normalizations",
  "transaction_splits",
  "homebuyer_checklist",
  "roadmap_progress",
] as const;

type AllowedTable = (typeof ALLOWED_TABLES)[number];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // --- Auth ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return err("Missing or invalid Authorization header", 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return err("Unauthorized", 401);
  }
  const userId = claimsData.claims.sub as string;

  // --- Parse route ---
  const url = new URL(req.url);
  // Path: /api/v1/{resource}  or  /api/v1/{resource}/{id}
  const pathParts = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
  // Edge function is mounted at /api, so paths are: api / v1 / resource / [id]
  // But Supabase mounts at function name, so actual path segments after function name:
  const version = pathParts[0]; // "v1"
  const resource = pathParts[1] as AllowedTable | undefined;
  const resourceId = pathParts[2];

  if (version !== "v1") {
    return err("Use /v1/{resource} path format", 404);
  }

  if (!resource || !ALLOWED_TABLES.includes(resource)) {
    return json({
      message: "Prism Budget API v1",
      endpoints: ALLOWED_TABLES.map((t) => `/v1/${t}`),
      docs: "Pass Bearer token from your auth session. All data is scoped by RLS.",
    });
  }

  const method = req.method;

  try {
    // --- GET (list or single) ---
    if (method === "GET") {
      let query = supabase.from(resource).select(
        url.searchParams.get("select") || "*"
      );

      // Filters from query params
      const filters = ["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "is"];
      for (const [key, value] of url.searchParams.entries()) {
        if (key === "select" || key === "order" || key === "limit" || key === "offset") continue;
        // Check for filter operators: column.eq=value
        const dotIdx = key.lastIndexOf(".");
        if (dotIdx > 0) {
          const col = key.substring(0, dotIdx);
          const op = key.substring(dotIdx + 1);
          if (filters.includes(op)) {
            query = (query as any).filter(col, op, value);
          }
        }
      }

      if (resourceId) {
        query = query.eq("id", resourceId).single();
      }

      // Ordering
      const order = url.searchParams.get("order");
      if (order) {
        const [col, dir] = order.split(".");
        query = query.order(col, { ascending: dir !== "desc" });
      }

      // Pagination
      const limit = parseInt(url.searchParams.get("limit") || "50");
      const offset = parseInt(url.searchParams.get("offset") || "0");
      if (!resourceId) {
        query = query.range(offset, offset + limit - 1);
      }

      const { data, error: queryError } = await query;
      if (queryError) return err(queryError.message, 400);
      return json({ data });
    }

    // --- POST (create) ---
    if (method === "POST") {
      const body = await req.json();
      const { data, error: insertError } = await supabase
        .from(resource)
        .insert(body)
        .select();
      if (insertError) return err(insertError.message, 400);
      return json({ data }, 201);
    }

    // --- PATCH / PUT (update) ---
    if (method === "PATCH" || method === "PUT") {
      if (!resourceId) return err("Resource ID required for update", 400);
      const body = await req.json();
      const { data, error: updateError } = await supabase
        .from(resource)
        .update(body)
        .eq("id", resourceId)
        .select();
      if (updateError) return err(updateError.message, 400);
      return json({ data });
    }

    // --- DELETE ---
    if (method === "DELETE") {
      if (!resourceId) return err("Resource ID required for delete", 400);
      const { error: deleteError } = await supabase
        .from(resource)
        .delete()
        .eq("id", resourceId);
      if (deleteError) return err(deleteError.message, 400);
      return json({ success: true });
    }

    return err("Method not allowed", 405);
  } catch (e) {
    console.error("API error:", e);
    return err("Internal server error", 500);
  }
});
