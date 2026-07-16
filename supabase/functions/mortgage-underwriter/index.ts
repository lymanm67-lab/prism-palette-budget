// Mortgage Approval Intelligence — AI Underwriter explainer
// Uses Lovable AI Gateway. Educational tool, not a loan approval.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const key = Deno.env.get('LOVABLE_API_KEY');
    if (!key) {
      return new Response(JSON.stringify({ error: 'Missing LOVABLE_API_KEY' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const body = await req.json();
    const { profile } = body ?? {};
    if (!profile) {
      return new Response(JSON.stringify({ error: 'profile required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are an experienced mortgage underwriter and financial educator.
You analyze applications the way real bank/credit union/broker underwriters do, using conventional, FHA, VA, and USDA guideline conventions as reference points.
You must be honest, specific, and educational. You are NOT issuing a loan approval — this is an educational planning tool.
Return a compact JSON object only, no prose outside JSON, with this exact shape:
{
  "decision": "Approved" | "Approved with Conditions" | "Manual Underwriting" | "High Risk" | "Likely Declined",
  "confidence": 0-100 integer,
  "summary": "2-3 sentence plain-English explanation of the decision",
  "strengths": ["short bullet", ...],   // up to 5
  "concerns": ["short bullet", ...],    // up to 5
  "improvements": ["actionable step with expected impact", ...], // top 5 ordered by impact
  "best_loan_product": "e.g. 30-Year Conventional, FHA 30-Year, VA 30-Year, 15-Year Fixed, HELOC",
  "should_wait": true | false,
  "wait_reason": "string or empty"
}
Base every judgement on the numbers provided. Reference DTI, LTV, reserves, credit tier, and employment stability explicitly.`;

    const userPrompt = `Applicant profile (JSON):\n${JSON.stringify(profile, null, 2)}\n\nAnalyze and return JSON only.`;

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Lovable-API-Key': key,
      },
      body: JSON.stringify({
        model: 'google/gemini-3.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      const status = resp.status === 402 || resp.status === 429 ? resp.status : 502;
      return new Response(JSON.stringify({ error: 'AI gateway error', status: resp.status, detail: text.slice(0, 500) }), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content ?? '{}';
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { parsed = { error: 'parse_failed', raw }; }

    return new Response(JSON.stringify({ result: parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
