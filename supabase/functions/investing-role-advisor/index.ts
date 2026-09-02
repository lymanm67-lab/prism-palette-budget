import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface RequestBody {
  role: string;
  purpose: string;
  currentHoldings: { ticker: string; name?: string | null; value?: number }[];
  slotsRemaining: number;
  accountTypes?: string[];
  notes?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'AI is not configured for this project.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!body.role || typeof body.role !== 'string') {
    return new Response(JSON.stringify({ error: 'role is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const slots = Math.max(0, Math.min(7, Number(body.slotsRemaining ?? 7)));
  const held = (body.currentHoldings ?? []).map((h) => h.ticker).join(', ') || 'none yet';

  const prompt = `You are an investment research assistant inside a personal finance app. You produce candidate ideas for review by the account owner. You never place trades and you never promise returns.

Investment role: ${body.role}
Role job: ${body.purpose}
Already held in this role: ${held}
Account types available: ${(body.accountTypes ?? ['taxable', 'roth_ira']).join(', ')}
Owner notes: ${body.notes ?? 'none'}

Suggest at most ${slots} candidate securities (ETFs or individual stocks) that fit this specific role's job. Rules:
- Never repeat a ticker already held in this role.
- A role holds no more than 7 securities total, so keep the list tight and prefer fewer, higher-quality ideas.
- State the security type honestly (etf, stock, mutual_fund, other) and say when it must be verified.
- Every idea needs a one-sentence thesis tied to the role's job, plus the main risk.
- For CATALYST ideas, name the identifiable development driving it.
- These are candidates for a 6-month review cycle, not timing calls.

Respond with JSON only: {"ideas":[{"ticker":"","name":"","security_type":"","thesis":"","main_risk":"","catalyst":"","fit_note":""}],"role_guidance":"","reevaluate_note":""}`;

  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Lovable-API-Key': apiKey,
        'X-Lovable-AIG-SDK': 'fetch',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5.6-sol',
        input: prompt,
        stream: true,
        reasoning: { effort: 'low', summary: 'auto' },
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return new Response(JSON.stringify({ error: `AI request failed (${res.status}): ${detail.slice(0, 500)}` }), {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Accumulate the SSE output text server-side; the client only needs the final JSON.
    const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    let text = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const payloadRaw = line.slice(5).trim();
        if (!payloadRaw || payloadRaw === '[DONE]') continue;
        try {
          const payload = JSON.parse(payloadRaw);
          if (payload.type === 'response.output_text.delta' && typeof payload.delta === 'string') {
            text += payload.delta;
          }
        } catch {
          // ignore partial frames
        }
      }
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: 'AI returned no usable recommendations. Try again.' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      ideas?: unknown[];
      role_guidance?: string;
      reevaluate_note?: string;
    };
    const ideas = (parsed.ideas ?? []).slice(0, slots);

    return new Response(JSON.stringify({ ...parsed, ideas }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
