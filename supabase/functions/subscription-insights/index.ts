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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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

    // Get subscriptions
    const { data: subscriptions } = await adminClient
      .from("subscriptions")
      .select("*")
      .eq("household_id", household_id)
      .eq("is_active", true)
      .eq("is_cancelled", false);

    if (!subscriptions?.length) {
      return new Response(JSON.stringify({ insights: [], recommendations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get recent transactions to check usage
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: recentTxns } = await adminClient
      .from("transactions")
      .select("merchant, normalized_merchant, amount, date")
      .eq("household_id", household_id)
      .gte("date", threeMonthsAgo.toISOString().split("T")[0])
      .lt("amount", 0);

    // Use AI to generate insights
    const totalMonthly = subscriptions
      .filter(s => s.frequency === "monthly")
      .reduce((sum, s) => sum + s.average_amount, 0);

    const subSummary = subscriptions.map(s => ({
      merchant: s.merchant,
      amount: s.average_amount,
      frequency: s.frequency,
      last_charge: s.last_charge_date,
    }));

    const prompt = `Analyze these subscriptions and provide savings recommendations.

Subscriptions (total monthly: $${totalMonthly.toFixed(2)}):
${subSummary.map(s => `- ${s.merchant}: $${s.amount}/${s.frequency} (last charge: ${s.last_charge})`).join("\n")}

Recent transaction count by merchant (last 3 months):
${Array.from(new Map(
  (recentTxns || []).reduce((acc, t) => {
    const key = (t.normalized_merchant || t.merchant || "").toLowerCase();
    acc.set(key, (acc.get(key) || 0) + 1);
    return acc;
  }, new Map<string, number>())
).entries()).map(([m, c]) => `- ${m}: ${c} charges`).join("\n")}

Provide actionable insights about:
1. Potential savings from cancellations
2. Duplicate or overlapping services (e.g., multiple streaming services)
3. Price increases compared to typical rates
4. Services that may be unused`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a financial advisor specializing in subscription optimization. Return structured data." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "provide_subscription_insights",
            description: "Return subscription analysis and recommendations",
            parameters: {
              type: "object",
              properties: {
                insights: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      message: { type: "string" },
                      severity: { type: "string", enum: ["info", "warning", "savings"] },
                      potential_savings: { type: "number" },
                    },
                    required: ["message", "severity"],
                    additionalProperties: false,
                  },
                },
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      merchant: { type: "string" },
                      action: { type: "string", enum: ["cancel", "downgrade", "review", "keep"] },
                      reason: { type: "string" },
                      estimated_savings: { type: "number" },
                    },
                    required: ["merchant", "action", "reason"],
                    additionalProperties: false,
                  },
                },
                total_potential_savings: { type: "number" },
              },
              required: ["insights", "recommendations", "total_potential_savings"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "provide_subscription_insights" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI error:", status);
      return new Response(JSON.stringify({ insights: [], recommendations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let result = { insights: [], recommendations: [], total_potential_savings: 0 };

    if (toolCall) {
      result = JSON.parse(toolCall.function.arguments);
    }

    return new Response(JSON.stringify({
      ...result,
      total_monthly_subscriptions: totalMonthly,
      subscription_count: subscriptions.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("subscription-insights error:", e);
    return new Response(JSON.stringify({ error: "An unexpected error occurred." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
