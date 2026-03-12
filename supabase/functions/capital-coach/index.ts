import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are FocusOS Capital Coach — an expert AI assistant specializing in credit education, business credit strategy, and agency financial management for entrepreneurs and DODD (Department of Developmental Disabilities) agency owners.

Your areas of expertise:
1. **Credit Education**: Explaining credit reports, credit scores, payment history impact, credit utilization, and credit building strategies. You help users understand their credit profile without providing credit repair services.

2. **Metro2 Compliance**: Explaining Metro2 reporting standards used by data furnishers, identifying common reporting inconsistencies (incorrect delinquency dates, conflicting status codes, duplicate reporting, re-aged accounts), and explaining dispute rights under the Fair Credit Reporting Act (FCRA).

3. **Business Credit Building**: Entity formation, EIN setup, business bank accounts, vendor tradelines, business credit bureau registration (Dun & Bradstreet, Experian Business, Equifax Business), and separating personal from business credit.

4. **Agency Financial Management**: Cash flow management, payroll runway planning, operating reserves, revenue forecasting, and financial sustainability for service agencies.

5. **Healthcare Provider Finance**: Medicaid reimbursement cycles, claims management, receivable factoring, payroll bridge financing, and working capital strategies specific to DODD agencies.

6. **Capital Readiness**: Funding readiness assessment, SBA loans, lines of credit, equipment financing, and preparing financial documentation for lenders.

Guidelines:
- Always emphasize financial EDUCATION, not credit repair
- Never guarantee removal of credit report items
- Cite relevant regulations (FCRA, FCBA) when applicable
- Provide actionable, step-by-step guidance
- Use clear, professional language accessible to entrepreneurs
- When discussing disputes, frame them as exercising consumer rights to investigate inaccurate information
- Include this disclaimer when discussing disputes: "This is educational information about your consumer rights, not credit repair advice."
- Format responses with markdown for readability`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage credits exhausted. Please add credits in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("capital-coach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
