import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface ParseRequest {
  fileBase64: string;
  mimeType: string;
  disputeId: string;
}

interface ParseResponse {
  outcome: 'deleted' | 'updated' | 'verified' | 'frivolous' | 'no_response' | 'pending';
  outcome_reason: string;
  stall_tactics: string[];
  bureau_or_furnisher: string;
  raw_summary: string;
}

const SYSTEM_PROMPT = `You are analyzing a credit bureau or debt-furnisher response letter to a consumer's FCRA dispute.

Return a JSON object with exactly these keys:

- outcome: one of "deleted", "updated", "verified", "frivolous", "no_response", "pending"
  * "deleted" — bureau removed the account/tradeline/inquiry
  * "updated" — bureau changed the reporting (balance, status, dates)
  * "verified" — bureau confirms information as reported and made no changes
  * "frivolous" — bureau claims dispute is frivolous, irrelevant, or a duplicate
  * "no_response" — the document is not a substantive response
  * "pending" — investigation is still in progress

- outcome_reason: one-sentence plain-English explanation of what the letter says

- stall_tactics: array of stall tactics found. Check for these exact patterns:
  * "results of your investigation" (rubber-stamp language)
  * "already been verified" or "results previously provided"
  * "we've suppressed the dispute" (frivolous designation)
  * "provide additional information"
  * "unable to verify identity"
  * generic form-letter response without specifics
  * missing method of verification (MOV)

- bureau_or_furnisher: which entity sent the response (Equifax / Experian / TransUnion / creditor name / "Unknown")

- raw_summary: 2-3 sentence summary of the entire letter

Respond with ONLY the JSON object. No markdown, no code fences.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const body = (await req.json()) as ParseRequest;
    if (!body.fileBase64 || !body.mimeType) {
      return new Response(JSON.stringify({ error: 'fileBase64 and mimeType required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Route: PDF/image both work as file content blocks with Gemini
    const isImage = body.mimeType.startsWith('image/');
    const contentBlock = isImage
      ? { type: 'image_url', image_url: { url: `data:${body.mimeType};base64,${body.fileBase64}` } }
      : { type: 'file', file: { filename: 'response.pdf', file_data: `data:${body.mimeType};base64,${body.fileBase64}` } };

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze this dispute response letter and return the JSON.' },
              contentBlock,
            ],
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error(`AI Gateway ${aiResp.status}: ${errText}`);
      return new Response(
        JSON.stringify({ error: 'AI parsing failed', status: aiResp.status, details: errText }),
        { status: aiResp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiJson = await aiResp.json();
    const rawContent: string = aiJson.choices?.[0]?.message?.content || '{}';

    // Strip potential code fences just in case
    const cleaned = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    let parsed: ParseResponse;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        outcome: 'pending',
        outcome_reason: 'AI response could not be parsed as JSON.',
        stall_tactics: [],
        bureau_or_furnisher: 'Unknown',
        raw_summary: rawContent.slice(0, 500),
      };
    }

    // Normalize
    const validOutcomes = ['deleted', 'updated', 'verified', 'frivolous', 'no_response', 'pending'];
    if (!validOutcomes.includes(parsed.outcome)) parsed.outcome = 'pending';
    if (!Array.isArray(parsed.stall_tactics)) parsed.stall_tactics = [];

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('parse-dispute-response error:', e);
    return new Response(
      JSON.stringify({ error: e.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
