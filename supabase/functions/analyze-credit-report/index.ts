import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert credit analyst. Analyze the provided credit accounts and produce a detailed credit health report.

You MUST return a JSON object using tool calling with these sections:

1. "score_estimate" — An estimated VantageScore 3.0 range (object with "low", "high", "label" like "Fair", "Good", etc.)

2. "issues" — Array of objects, each with:
   - "severity": "critical" | "warning" | "info"
   - "title": Short issue title
   - "description": Detailed explanation
   - "action": Recommended next step
   - "accounts": Array of account names affected

3. "strengths" — Array of strings listing positive factors

4. "recommendations" — Array of objects with "priority" (1-5, 1=highest), "action" string, and "impact" string describing expected score impact

5. "summary" — A 2-3 sentence plain-English overview of the credit profile

Look for these specific issues:
- Accounts in collections, charge-offs, or derogatory status
- High credit utilization (>30% on revolving accounts)
- Missing payment history or late payments
- Very new accounts (thin credit file)
- Accounts that may have reporting errors (e.g. closed accounts showing balances, missing credit limits on revolving accounts)
- Duplicate accounts across bureaus that may indicate errors
- Authorized user accounts that may not be helping
- Accounts with remarks codes indicating disputes or other issues
- Inconsistencies between bureaus for the same account`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  try {
    const { household_id } = await req.json();
    if (!household_id) {
      return new Response(JSON.stringify({ error: "household_id is required" }), { status: 400, headers: corsHeaders });
    }

    // Fetch all credit accounts for this household
    const { data: accounts, error: dbError } = await supabase
      .from("credit_accounts")
      .select("*")
      .eq("household_id", household_id);

    if (dbError) throw dbError;
    if (!accounts || accounts.length === 0) {
      return new Response(JSON.stringify({ error: "No credit accounts found. Import a credit report first." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    // Build a compact summary of accounts for the AI
    const accountSummary = accounts.map(a => ({
      bureau: a.bureau,
      name: a.account_name,
      number: a.account_number,
      type: a.account_type,
      status: a.account_status,
      balance: a.balance,
      credit_limit: a.credit_limit,
      monthly_payment: a.monthly_payment,
      high_balance: a.high_balance,
      date_opened: a.date_opened,
      date_closed: a.date_closed,
      payment_history: a.payment_history,
      responsibility: a.responsibility,
      remarks_codes: a.remarks_codes,
      terms: a.terms,
    }));

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Analyze these ${accounts.length} credit accounts across bureaus and identify all issues, errors, and provide score insights:\n\n${JSON.stringify(accountSummary, null, 2)}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "credit_analysis",
              description: "Return structured credit analysis results",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "2-3 sentence overview" },
                  score_estimate: {
                    type: "object",
                    properties: {
                      low: { type: "number" },
                      high: { type: "number" },
                      label: { type: "string" },
                    },
                    required: ["low", "high", "label"],
                  },
                  issues: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        severity: { type: "string", enum: ["critical", "warning", "info"] },
                        title: { type: "string" },
                        description: { type: "string" },
                        action: { type: "string" },
                        accounts: { type: "array", items: { type: "string" } },
                      },
                      required: ["severity", "title", "description", "action", "accounts"],
                    },
                  },
                  strengths: { type: "array", items: { type: "string" } },
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        priority: { type: "number" },
                        action: { type: "string" },
                        impact: { type: "string" },
                      },
                      required: ["priority", "action", "impact"],
                    },
                  },
                },
                required: ["summary", "score_estimate", "issues", "strengths", "recommendations"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "credit_analysis" } },
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      throw new Error(`AI API failed [${aiResponse.status}]: ${errText}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    let analysis;
    if (toolCall?.function?.arguments) {
      analysis = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try parsing content directly
      let content = aiData.choices?.[0]?.message?.content || "{}";
      content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysis = JSON.parse(content);
    }

    return new Response(JSON.stringify({ analysis, account_count: accounts.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-credit-report error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
