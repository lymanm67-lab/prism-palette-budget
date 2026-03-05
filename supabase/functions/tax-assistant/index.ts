import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, mode } = await req.json();
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
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
