import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { image, filename } = await req.json();
    if (!image) throw new Error("No image provided");

    // Detect whether the data URL is a PDF vs image so we send the right content block
    const isPdf = typeof image === "string" && image.startsWith("data:application/pdf");
    const userContent = isPdf
      ? [
          { type: "text", text: "Extract all payroll information from this paycheck stub." },
          { type: "file", file: { filename: filename || "paystub.pdf", file_data: image } },
        ]
      : [
          { type: "text", text: "Extract all payroll information from this paycheck stub." },
          { type: "image_url", image_url: { url: image } },
        ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Lovable-API-Key": LOVABLE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a paycheck stub parser. Extract all payroll details from the document. Focus on:
- Gross pay (total earnings before deductions)
- Net pay (take-home pay after all deductions)
- All individual deductions with their names and amounts (federal tax, state tax, Social Security, Medicare, 401k, health insurance, dental, vision, HSA, FSA, life insurance, disability, union dues, garnishments, etc.)
- Pay frequency (weekly, biweekly, semi-monthly, monthly)
- Employer name
- Pay period dates

Return the data using the extract_paystub tool. For each deduction, use a clear short name. Amounts should be positive numbers representing per-pay-period amounts. If you cannot read a field, use null.`,
          },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_paystub",
              description: "Extract structured paycheck stub data",
              parameters: {
                type: "object",
                properties: {
                  employer_name: { type: "string", description: "Employer/company name" },
                  pay_frequency: { type: "string", enum: ["weekly", "biweekly", "semi_monthly", "monthly"], description: "How often the employee is paid" },
                  pay_period_start: { type: "string", description: "Pay period start date YYYY-MM-DD" },
                  pay_period_end: { type: "string", description: "Pay period end date YYYY-MM-DD" },
                  gross_pay: { type: "number", description: "Total gross pay for this period" },
                  net_pay: { type: "number", description: "Net/take-home pay for this period" },
                  deductions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Deduction name (e.g. Federal Tax, State Tax, 401k, Health Insurance)" },
                        amount: { type: "number", description: "Deduction amount for this pay period" },
                        category: {
                          type: "string",
                          enum: ["federal_tax", "state_tax", "local_tax", "social_security", "medicare", "retirement_401k", "retirement_other", "health_insurance", "dental_insurance", "vision_insurance", "life_insurance", "disability_insurance", "hsa", "fsa", "union_dues", "garnishment", "other"],
                          description: "Category of the deduction",
                        },
                        is_pretax: { type: "boolean", description: "Whether this is a pre-tax deduction" },
                      },
                      required: ["name", "amount", "category"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["gross_pay", "net_pay", "deductions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_paystub" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
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
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error ${response.status}: ${errText.slice(0, 300)}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in response:", JSON.stringify(data).slice(0, 500));
      throw new Error("AI could not extract paystub data — try a clearer image or the original PDF");
    }

    const extracted = JSON.parse(toolCall.function.arguments);

    // Calculate monthly amounts based on pay frequency
    const multiplier = extracted.pay_frequency === "weekly" ? 52 / 12
      : extracted.pay_frequency === "biweekly" ? 26 / 12
      : extracted.pay_frequency === "semi_monthly" ? 2
      : 1;

    const monthlyData = {
      ...extracted,
      monthly_gross_pay: Math.round((extracted.gross_pay * multiplier) * 100) / 100,
      monthly_net_pay: Math.round((extracted.net_pay * multiplier) * 100) / 100,
      deductions: extracted.deductions.map((d: any) => ({
        ...d,
        monthly_amount: Math.round((d.amount * multiplier) * 100) / 100,
      })),
    };

    return new Response(JSON.stringify(monthlyData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-paystub error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "An unexpected error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
