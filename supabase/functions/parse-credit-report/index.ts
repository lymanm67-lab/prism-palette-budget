import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a credit report parser. Extract ALL credit accounts from the report into structured JSON.

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

Return ONLY valid JSON array, no markdown or explanation.`;

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
    const body = await req.json();
    const { bureau, mode, report_text, images } = body;

    if (!bureau) {
      return new Response(JSON.stringify({ error: "bureau is required" }), { status: 400, headers: corsHeaders });
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    let messages: any[];

    if (mode === "ocr" && Array.isArray(images) && images.length > 0) {
      // Vision OCR mode — send page images to multimodal model
      const imageContent = images.map((img: string) => ({
        type: "image_url",
        image_url: { url: img },
      }));

      messages = [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: `These are scanned pages from a ${bureau} credit report. OCR and extract all credit accounts from these images.` },
            ...imageContent,
          ],
        },
      ];
    } else if (report_text) {
      // Text mode
      messages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Parse this ${bureau} credit report and extract all accounts:\n\n${report_text.slice(0, 30000)}` },
      ];
    } else {
      return new Response(JSON.stringify({ error: "report_text or images are required" }), { status: 400, headers: corsHeaders });
    }

    // Use gemini-2.5-flash for text, gemini-2.5-pro for vision/OCR (better at reading images)
    const model = mode === "ocr" ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash";

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.1,
        max_tokens: 8000,
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
