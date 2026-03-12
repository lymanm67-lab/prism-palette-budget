import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const { report_text, bureau } = await req.json();
    if (!report_text || !bureau) {
      return new Response(JSON.stringify({ error: "report_text and bureau are required" }), { status: 400, headers: corsHeaders });
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a credit report parser. Extract ALL credit accounts from the report text into structured JSON.

Return a JSON array of accounts with these fields:
- account_name (string, creditor name)
- account_number (string or null, last 4 digits only)
- account_type (string: "Revolving", "Installment", "Mortgage", "Collection", "Other")
- account_status (string: "Open", "Closed", "Paid", "Collection", "Charge-Off", "Foreclosure", "Repossession", "Frozen")
- balance (number)
- credit_limit (number or null)
- monthly_payment (number or null)
- high_balance (number or null)
- date_opened (string YYYY-MM-DD or null)
- date_closed (string YYYY-MM-DD or null)
- date_of_first_delinquency (string YYYY-MM-DD or null)
- payment_history (string, e.g. "CCCCCCCC30CCCC" or null)
- responsibility (string: "Individual", "Joint", "Authorized User", or null)
- remarks_codes (string or null)
- terms (string or null)
- notes (string or null, any additional info)

Return ONLY valid JSON array, no markdown or explanation.`
          },
          {
            role: "user",
            content: `Parse this ${bureau} credit report and extract all accounts:\n\n${report_text.slice(0, 30000)}`
          }
        ],
        temperature: 0.1,
        max_tokens: 8000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI API failed [${aiResponse.status}]: ${errText}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "[]";
    
    // Strip markdown code fences if present
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    const accounts = JSON.parse(content);

    return new Response(JSON.stringify({ accounts, count: accounts.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-credit-report error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
