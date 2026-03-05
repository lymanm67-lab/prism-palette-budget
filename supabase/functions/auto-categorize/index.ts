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

    // Auth check
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader! } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { transaction_ids, household_id } = await req.json();
    if (!transaction_ids?.length || !household_id) {
      return new Response(JSON.stringify({ error: "Missing transaction_ids or household_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify membership
    const { data: isMember } = await adminClient.rpc("is_household_member", {
      _user_id: user.id, _household_id: household_id,
    });
    if (!isMember) {
      return new Response(JSON.stringify({ error: "Not a household member" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch uncategorized transactions
    const { data: transactions } = await adminClient
      .from("transactions")
      .select("id, merchant, amount, date")
      .in("id", transaction_ids)
      .eq("household_id", household_id);

    if (!transactions?.length) {
      return new Response(JSON.stringify({ categorized: 0, results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch categories
    const { data: categories } = await adminClient
      .from("categories")
      .select("id, name, category_groups(name)")
      .eq("household_id", household_id);

    // Fetch existing rules
    const { data: rules } = await adminClient
      .from("categorization_rules")
      .select("merchant_pattern, category_id")
      .eq("household_id", household_id);

    const ruleMap = new Map((rules || []).map(r => [r.merchant_pattern.toLowerCase(), r.category_id]));

    // First pass: apply existing rules
    const ruleMatched: { id: string; category_id: string }[] = [];
    const needsAI: typeof transactions = [];

    for (const txn of transactions) {
      const merchant = (txn.merchant || "").toLowerCase().trim();
      if (merchant && ruleMap.has(merchant)) {
        ruleMatched.push({ id: txn.id, category_id: ruleMap.get(merchant)! });
      } else {
        needsAI.push(txn);
      }
    }

    // Apply rule matches
    for (const match of ruleMatched) {
      await adminClient.from("transactions").update({ category_id: match.category_id }).eq("id", match.id);
      // Increment match count
      const pattern = transactions.find(t => t.id === match.id)?.merchant?.toLowerCase().trim();
      if (pattern) {
        await adminClient.from("categorization_rules")
          .update({ match_count: (rules?.find(r => r.merchant_pattern.toLowerCase() === pattern)?.match_count || 0) + 1 } as any)
          .eq("household_id", household_id)
          .eq("merchant_pattern", pattern);
      }
    }

    // Second pass: AI categorization for unmatched
    let aiResults: { id: string; category_id: string; merchant: string; category_name: string }[] = [];

    if (needsAI.length > 0 && categories?.length) {
      const categoryList = categories.map(c => ({
        id: c.id,
        name: c.name,
        group: (c as any).category_groups?.name || "Uncategorized",
      }));

      const prompt = `You are a financial transaction categorizer. Given a list of transactions and available categories, assign the most appropriate category to each transaction.

Available categories:
${categoryList.map(c => `- ${c.name} (Group: ${c.group}) [ID: ${c.id}]`).join("\n")}

Transactions to categorize:
${needsAI.map(t => `- ID: ${t.id} | Merchant: "${t.merchant || 'Unknown'}" | Amount: ${t.amount} | Date: ${t.date}`).join("\n")}

For each transaction, return the category ID that best matches. Consider the merchant name, amount (negative = expense, positive = income), and common spending patterns.`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You categorize financial transactions accurately. Return structured data only." },
            { role: "user", content: prompt },
          ],
          tools: [{
            type: "function",
            function: {
              name: "categorize_transactions",
              description: "Assign categories to transactions",
              parameters: {
                type: "object",
                properties: {
                  assignments: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        transaction_id: { type: "string" },
                        category_id: { type: "string" },
                      },
                      required: ["transaction_id", "category_id"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["assignments"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "categorize_transactions" } },
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
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.error("AI error:", status, await aiResponse.text());
        // Return partial results from rule matching
        return new Response(JSON.stringify({
          categorized: ruleMatched.length,
          ai_failed: true,
          results: ruleMatched.map(m => ({ ...m, source: "rule" })),
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) {
        const parsed = JSON.parse(toolCall.function.arguments);
        const validCatIds = new Set(categories.map(c => c.id));

        for (const assignment of (parsed.assignments || [])) {
          if (!validCatIds.has(assignment.category_id)) continue;
          const txn = needsAI.find(t => t.id === assignment.transaction_id);
          if (!txn) continue;

          // Update transaction
          await adminClient.from("transactions")
            .update({ category_id: assignment.category_id })
            .eq("id", assignment.transaction_id);

          // Save rule for future
          const merchant = (txn.merchant || "").trim();
          if (merchant) {
            await adminClient.from("categorization_rules").upsert({
              household_id,
              merchant_pattern: merchant.toLowerCase(),
              category_id: assignment.category_id,
              is_ai_generated: true,
              match_count: 1,
            }, { onConflict: "household_id,merchant_pattern" });
          }

          const catName = categories.find(c => c.id === assignment.category_id)?.name || "Unknown";
          aiResults.push({
            id: assignment.transaction_id,
            category_id: assignment.category_id,
            merchant: txn.merchant || "Unknown",
            category_name: catName,
          });
        }
      }
    }

    const totalCategorized = ruleMatched.length + aiResults.length;

    return new Response(JSON.stringify({
      categorized: totalCategorized,
      rule_matched: ruleMatched.length,
      ai_categorized: aiResults.length,
      results: [
        ...ruleMatched.map(m => ({ ...m, source: "rule" })),
        ...aiResults.map(r => ({ ...r, source: "ai" })),
      ],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auto-categorize error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
