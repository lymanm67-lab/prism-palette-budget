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

    // Get last 90 days of transactions
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const startDate = ninetyDaysAgo.toISOString().split("T")[0];

    const { data: transactions } = await adminClient
      .from("transactions")
      .select("amount, category_id, categories(name)")
      .eq("household_id", household_id)
      .gte("date", startDate)
      .lt("amount", 0);

    const { data: categories } = await adminClient
      .from("categories")
      .select("id, name, group_id, category_groups(name, expense_type)")
      .eq("household_id", household_id);

    if (!transactions?.length || !categories?.length) {
      return new Response(JSON.stringify({
        suggestions: [],
        message: "Not enough transaction history to generate budget suggestions. Add more transactions first.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Aggregate spending by category over 90 days
    const categorySpend = new Map<string, { total: number; name: string; categoryId: string }>();
    for (const t of transactions) {
      const catId = t.category_id || "uncategorized";
      const catName = (t as any).categories?.name || "Uncategorized";
      const existing = categorySpend.get(catId) || { total: 0, name: catName, categoryId: catId };
      existing.total += Math.abs(t.amount);
      categorySpend.set(catId, existing);
    }

    // Convert to monthly averages and create suggestions
    const suggestions = Array.from(categorySpend.values())
      .filter(c => c.categoryId !== "uncategorized")
      .map(c => ({
        category_id: c.categoryId,
        category_name: c.name,
        monthly_average: Math.round((c.total / 3) * 100) / 100,
        suggested_budget: Math.round(Math.ceil((c.total / 3) / 10) * 10 * 100) / 100, // Round up to nearest $10
        ninety_day_total: Math.round(c.total * 100) / 100,
      }))
      .sort((a, b) => b.monthly_average - a.monthly_average);

    const totalMonthly = suggestions.reduce((s, sg) => s + sg.monthly_average, 0);
    const totalSuggested = suggestions.reduce((s, sg) => s + sg.suggested_budget, 0);

    return new Response(JSON.stringify({
      suggestions,
      total_monthly_average: Math.round(totalMonthly * 100) / 100,
      total_suggested_budget: Math.round(totalSuggested * 100) / 100,
      analysis_period_days: 90,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("smart-budget error:", e);
    return new Response(JSON.stringify({ error: "An unexpected error occurred." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
