import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const { merchant, amount, date, household_id } = await req.json();
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

    // Check categorization rules first
    if (merchant) {
      const pattern = merchant.toLowerCase().trim();
      const { data: rule } = await adminClient
        .from("categorization_rules")
        .select("category_id")
        .eq("household_id", household_id)
        .eq("merchant_pattern", pattern)
        .limit(1)
        .single();

      if (rule) {
        const { data: cat } = await adminClient
          .from("categories")
          .select("id, name, color")
          .eq("id", rule.category_id)
          .single();
        if (cat) {
          return new Response(JSON.stringify({ suggestion: cat, source: "rule" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Fetch categories for AI
    const { data: categories } = await adminClient
      .from("categories")
      .select("id, name, color, category_groups(name)")
      .eq("household_id", household_id);

    if (!categories?.length) {
      return new Response(JSON.stringify({ suggestion: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const categoryList = categories.map(c => ({
      id: c.id, name: c.name, group: (c as any).category_groups?.name || "Other",
    }));

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You categorize financial transactions. Return the single best matching category." },
          {
            role: "user",
            content: `Categorize this transaction:\nMerchant: "${merchant || 'Unknown'}"\nAmount: ${amount || 0}\nDate: ${date || 'unknown'}\n\nAvailable categories:\n${categoryList.map(c => `- ${c.name} (Group: ${c.group}) [ID: ${c.id}]`).join("\n")}`,
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_category",
            description: "Suggest the best category for a transaction",
            parameters: {
              type: "object",
              properties: {
                category_id: { type: "string", description: "The ID of the best matching category" },
                confidence: { type: "string", enum: ["high", "medium", "low"] },
              },
              required: ["category_id", "confidence"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "suggest_category" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ suggestion: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ suggestion: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const matchedCat = categories.find(c => c.id === parsed.category_id);

    if (!matchedCat) {
      return new Response(JSON.stringify({ suggestion: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      suggestion: { id: matchedCat.id, name: matchedCat.name, color: matchedCat.color },
      confidence: parsed.confidence || "medium",
      source: "ai",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-category error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
