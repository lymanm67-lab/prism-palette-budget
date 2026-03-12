import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { subscriptions, recurring } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if ((!subscriptions || subscriptions.length === 0) && (!recurring || recurring.length === 0)) {
      return new Response(JSON.stringify({ error: "No bills or subscriptions to analyze" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const billsSummary = [
      ...(subscriptions || []).map((s: any) => `Subscription: ${s.merchant}, $${s.average_amount}/mo, frequency: ${s.frequency}, active: ${s.is_active}`),
      ...(recurring || []).map((r: any) => `Recurring bill: ${r.merchant || 'Unknown'}, $${Math.abs(r.amount)}, frequency: ${r.frequency}, active: ${r.is_active}`),
    ].join("\n");

    const systemPrompt = `You are an expert bill negotiation advisor. Analyze the user's recurring bills and subscriptions to find savings opportunities.

For each bill, evaluate:
1. Is this service commonly negotiable? (cable, internet, insurance, phone plans)
2. Are there known cheaper alternatives?
3. Is the user paying above market rate?
4. Can they bundle services for discounts?
5. Are there unused subscriptions they could cancel?

Return your analysis using this exact tool schema. Be specific with dollar amounts and actionable steps.
Prioritize by potential savings amount (highest first).
Include a total_potential_monthly_savings number.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here are my current recurring bills and subscriptions:\n\n${billsSummary}\n\nAnalyze each for savings opportunities.` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "bill_negotiation_analysis",
              description: "Return structured bill negotiation recommendations",
              parameters: {
                type: "object",
                properties: {
                  total_potential_monthly_savings: { type: "number", description: "Total estimated monthly savings in dollars" },
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        merchant: { type: "string" },
                        current_cost: { type: "number" },
                        potential_savings: { type: "number", description: "Monthly savings potential in dollars" },
                        difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                        action_type: { type: "string", enum: ["negotiate", "switch", "cancel", "downgrade", "bundle"] },
                        recommendation: { type: "string", description: "Specific actionable recommendation" },
                        negotiation_script: { type: "string", description: "What to say when calling to negotiate, if applicable" },
                        alternatives: {
                          type: "array",
                          items: { type: "string" },
                          description: "Alternative services or plans"
                        },
                      },
                      required: ["merchant", "current_cost", "potential_savings", "difficulty", "action_type", "recommendation"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["total_potential_monthly_savings", "recommendations"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "bill_negotiation_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI analysis failed");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No analysis returned");

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("bill-negotiation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
