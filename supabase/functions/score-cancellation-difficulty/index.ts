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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Get active subscriptions that haven't been scored yet or need re-scoring
    const { data: subscriptions } = await adminClient
      .from("subscriptions")
      .select("id, merchant, frequency, average_amount, cancellation_difficulty")
      .eq("household_id", household_id)
      .eq("is_cancelled", false);

    if (!subscriptions?.length) {
      return new Response(JSON.stringify({ scored: 0, results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const merchantList = subscriptions.map(s => s.merchant).join(", ");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a subscription cancellation difficulty analyst. For each merchant/service, assess how difficult it is to cancel based on your knowledge of their cancellation processes. Consider factors like:
- Whether they offer online self-service cancellation
- Whether they require phone calls or chat
- Whether they have retention teams that make it hard to cancel
- Whether they have long hold times or complicated processes
- Whether they have cancellation fees or lock-in periods

Rate each as: "easy" (online self-service, straightforward), "moderate" (requires chat/email, some friction), or "hard" (phone required, retention tactics, complex process).

You MUST respond using the score_merchants tool.`,
          },
          {
            role: "user",
            content: `Score cancellation difficulty for these subscription merchants: ${merchantList}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "score_merchants",
              description: "Return cancellation difficulty scores for each merchant",
              parameters: {
                type: "object",
                properties: {
                  scores: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        merchant: { type: "string", description: "The merchant name" },
                        difficulty: { type: "string", enum: ["easy", "moderate", "hard"] },
                        reason: { type: "string", description: "Brief explanation of why this rating" },
                      },
                      required: ["merchant", "difficulty", "reason"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["scores"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "score_merchants" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: "AI scoring failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    
    // Extract tool call result
    let scores: { merchant: string; difficulty: string; reason: string }[] = [];
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        scores = parsed.scores || [];
      } catch {
        console.error("Failed to parse AI response");
      }
    }

    // Match scores to subscriptions and update
    const results: { id: string; merchant: string; difficulty: string; reason: string }[] = [];

    for (const sub of subscriptions) {
      const merchantLower = sub.merchant.toLowerCase().trim();
      const match = scores.find(s => 
        s.merchant.toLowerCase().trim() === merchantLower ||
        merchantLower.includes(s.merchant.toLowerCase().trim()) ||
        s.merchant.toLowerCase().trim().includes(merchantLower)
      );

      if (match) {
        const difficulty = ["easy", "moderate", "hard"].includes(match.difficulty) ? match.difficulty : "easy";
        await adminClient
          .from("subscriptions")
          .update({ 
            cancellation_difficulty: difficulty,
            cancellation_notes: match.reason,
          })
          .eq("id", sub.id);

        results.push({ id: sub.id, merchant: sub.merchant, difficulty, reason: match.reason });
      }
    }

    return new Response(JSON.stringify({ scored: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("score-cancellation-difficulty error:", e);
    return new Response(JSON.stringify({ error: "An unexpected error occurred." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
