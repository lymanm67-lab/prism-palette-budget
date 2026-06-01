// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface ParsedDebt {
  creditor: string;
  balance: number;
  apr: number;
  minimum_payment: number;
  statement_date: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();
    if (!image || typeof image !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing image (base64 data URL).' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `You are extracting structured data from a credit card or loan statement image.
Return ONLY a single JSON object with these keys (no markdown, no commentary):
{
  "creditor": string,            // Card or lender name, e.g. "Chase Sapphire" or "Sallie Mae"
  "balance": number,             // Current balance / new balance owed (positive number)
  "apr": number,                 // Purchase APR as a percent number, e.g. 22.99
  "minimum_payment": number,     // Minimum payment due (positive number)
  "statement_date": string|null  // Statement closing date as YYYY-MM-DD, or null if unclear
}
If a field cannot be found, use 0 (or null for statement_date). Never invent values.`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: image } },
            ],
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error('Lovable AI error', aiRes.status, t);
      return new Response(JSON.stringify({ error: 'AI request failed', detail: t }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiJson = await aiRes.json();
    const raw: string = aiJson?.choices?.[0]?.message?.content ?? '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return new Response(JSON.stringify({ error: 'Could not parse statement.', raw }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let parsed: ParsedDebt;
    try {
      const j = JSON.parse(match[0]);
      parsed = {
        creditor: String(j.creditor || '').trim() || 'Unknown creditor',
        balance: Number(j.balance) || 0,
        apr: Number(j.apr) || 0,
        minimum_payment: Number(j.minimum_payment) || 0,
        statement_date: j.statement_date || null,
      };
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON from AI', raw }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('scan-debt-statement error', err);
    return new Response(JSON.stringify({ error: err?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
