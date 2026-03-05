import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    let { messages: rawMessages, mode } = body;

    // Validate mode against allowlist
    const validModes = ['chat', 'overview', 'walkthrough', 'scenarios', 'tools', 'pitfalls'];
    if (!validModes.includes(mode)) mode = 'chat';

    // Sanitize messages: strip system role, limit count and length
    const MAX_MESSAGES = 20;
    const MAX_MESSAGE_LENGTH = 2000;
    const messages = (Array.isArray(rawMessages) ? rawMessages : [])
      .filter((m: any) => m && typeof m.role === 'string' && m.role !== 'system' && typeof m.content === 'string')
      .slice(-MAX_MESSAGES)
      .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, MAX_MESSAGE_LENGTH) }));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompts: Record<string, string> = {
      chat: `You are an expert AI Tax Assistant specializing in business tax deductions for small business owners who run multiple businesses. You provide clear, actionable guidance on:

- Common business tax deductions (home office, vehicle, equipment, travel, meals, insurance, retirement contributions, etc.)
- Scenarios with real-world examples showing how deductions apply
- Pitfalls and red flags to avoid (mixing personal/business expenses, inadequate documentation, hobby loss rules, etc.)
- Multi-business considerations (allocating shared expenses, separate vs consolidated accounting, entity structure implications)
- Record-keeping best practices

IMPORTANT: Always include a disclaimer that you provide general educational information only, not personalized tax advice. Recommend consulting a CPA or tax professional for specific situations.

Format responses with clear headings, bullet points, and practical examples. When discussing dollar amounts, use realistic figures.`,

      overview: `You are an AI Tax Assistant creating a comprehensive TTS-friendly overview of business tax deductions. Structure your response as a clear, spoken narrative (no markdown, no bullet symbols, no special characters) covering:

1. Introduction to business tax deductions and why they matter
2. The most valuable deductions for small business owners
3. Key differences when running multiple businesses
4. Top 5 pitfalls that trigger IRS scrutiny
5. Essential record-keeping habits

Keep it conversational, clear, and under 800 words. Use natural pauses with commas and periods. Say "number one" instead of "1." and avoid abbreviations. This will be read aloud.`,

      walkthrough: `You are an AI Tax Assistant creating a step-by-step TTS-friendly walkthrough for claiming business tax deductions. Structure as a spoken guide (no markdown, no bullet symbols, no special characters):

1. Step one: Categorize your business expenses properly
2. Step two: Separate personal from business spending
3. Step three: Calculate home office deductions (simplified vs actual)
4. Step four: Track vehicle expenses (standard mileage vs actual)
5. Step five: Document meals and entertainment correctly
6. Step six: Handle multi-business expense allocation
7. Step seven: Prepare for common audit triggers
8. Step eight: Organize records for tax filing

Use natural conversational language. Say "step one" instead of "Step 1:". Avoid abbreviations. Keep under 1000 words. This will be read aloud.`,

      scenarios: `You are an expert AI Tax Assistant. The user wants detailed real-world tax scenarios and examples. Provide 5-7 detailed, realistic scenarios covering:

- A freelancer running an LLC with a home office and vehicle deductions
- An owner of multiple LLCs allocating shared expenses (rent, utilities, internet)
- A side-business owner with a W-2 job navigating dual deductions
- A business owner who made equipment purchases under Section 179
- A joint venture partner splitting expenses and reporting obligations
- A business owner claiming travel and meal deductions across multiple businesses
- A real estate investor with rental properties and active business income

For each scenario:
1. Describe the situation concretely with names, dollar amounts, and business types
2. Show exact deduction calculations
3. Highlight what they can and cannot deduct
4. Mention the relevant IRS form or schedule

Use markdown formatting with ## headings, **bold** for key terms, and numbered steps.`,

      tools: `You are an expert AI Tax Assistant. The user wants to know about tax tools, software, and resources. Provide a comprehensive guide covering:

## Accounting & Bookkeeping Tools
- QuickBooks, Xero, FreshBooks, Wave — compare features and pricing for multi-business owners
- Best practices for chart of accounts setup across multiple businesses

## Tax Preparation Software
- TurboTax, H&R Block, TaxAct — which tier is needed for business returns
- When to use professional software vs hiring a CPA

## Expense Tracking Tools
- Receipt scanning apps (Expensify, Dext, Shoeboxed)
- Mileage tracking apps (MileIQ, Everlance, TripLog)
- How to integrate with accounting software

## IRS Resources & Forms
- Key IRS publications every business owner should bookmark
- Essential tax forms (Schedule C, Form 8829, Form 4562, etc.)
- IRS Free File and other free resources

## Record-Keeping Systems
- Digital vs paper records — IRS requirements
- How long to keep different types of records
- Cloud backup best practices

Use markdown formatting with clear headings and practical recommendations.`,

      pitfalls: `You are an expert AI Tax Assistant. The user wants to know about tax pitfalls, red flags, and mistakes to avoid. Provide a comprehensive, detailed guide covering:

## Top IRS Audit Triggers for Small Businesses
- Disproportionate deductions relative to income
- Round numbers on every line item
- Excessive home office deductions
- Large charitable contributions relative to income
- Unreported income (1099 mismatches)

## Common Deduction Mistakes
- Mixing personal and business expenses on the same card/account
- Deducting 100% of a mixed-use asset (car, phone, home)
- Failing to meet the "ordinary and necessary" test
- Claiming hobby losses as business losses (hobby loss rules under IRC §183)
- Missing the de minimis safe harbor election

## Multi-Business Pitfalls
- Failing to maintain separate books for each entity
- Incorrect expense allocation across businesses
- Self-dealing between related entities
- Commingling funds between businesses
- Ignoring reasonable compensation rules for S-Corps

## Documentation Failures
- No contemporaneous mileage log
- Missing receipts for expenses over $75
- Inadequate home office documentation
- No written accountable plan for employee reimbursements

## Penalty Traps
- Estimated tax payment penalties (safe harbor rules)
- Late filing vs late payment penalties
- Accuracy-related penalties (20% of underpayment)
- Substantial understatement penalty

For each pitfall: explain what goes wrong, the potential consequences (penalties, audit risk), and exactly how to avoid it. Use real dollar amounts and percentages. Include IRS code references where applicable.

Use markdown formatting with ## headings, **bold** for critical warnings, and ⚠️ emoji for high-risk items.`,
    };

    const systemContent = systemPrompts[mode] || systemPrompts.chat;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemContent },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("tax-assistant error:", e);
    return new Response(JSON.stringify({ error: "An unexpected error occurred. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
