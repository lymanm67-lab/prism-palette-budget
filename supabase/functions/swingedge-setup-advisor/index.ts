// SwingEdge Setup Advisor — reads already-measured facts and says which setup
// type (pullback, breakout or no clear setup) the chart is actually showing.
//
// It never invents prices, indicator values, earnings dates or fundamentals.
// When the measured context is too thin it says so instead of guessing.

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface RequestBody {
  symbol?: string | null;
  page?: string;
  price?: number | null;
  /** Setup the app's own rules engine detected, if any. */
  detected?: string | null;
  /** Setup currently chosen in the Planner. */
  chosen?: string | null;
  /** Already-measured facts (trend, ATR, levels, multi-timeframe, readiness). */
  context?: Record<string, unknown> | null;
  question?: string | null;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) return json({ error: 'AI is not configured for this project.' }, 500);

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const symbol = (body.symbol ?? '').toString().trim().toUpperCase();
  if (!symbol) return json({ error: 'A symbol is required.' }, 400);

  const prompt = `You are the SwingEdge trading assistant inside a personal swing-trading practice app. The owner trades long-only paper trades while training. You never place trades, never promise returns, and risk always comes first.

Symbol: ${symbol}
Screen: ${body.page ?? 'Trade Planner'}
Last price: ${body.price ?? 'unknown'}
Setup the app's rules engine detected: ${body.detected ?? 'none'}
Setup currently chosen in the Planner: ${body.chosen ?? 'none'}
Measured facts from the app (already computed, treat as facts): ${JSON.stringify(body.context ?? {}).slice(0, 6000)}
Owner's question: ${body.question?.toString().slice(0, 500) || 'none'}

Job: say which of three setup types the measured facts actually support, and teach the owner why.
- PULLBACK: an established uptrend that has pulled back into support, a rising moving average or a prior higher low, and is trying to resume. Entry is the resumption; invalidation is a close below that higher low.
- BREAKOUT: price pressing or clearing a well-defined resistance level or range top after building a base. Entry is the break or its retest; invalidation is falling back inside the range.
- NONE: no clean structure — choppy, sideways without a defined range, downtrend, extended run with no pullback, or too little data. NONE is a legitimate and common answer; never force a setup.

Rules for you:
- Judge only from the facts above. Never invent prices, indicator values, earnings dates or fundamentals. If a needed fact is missing, name what is missing.
- Price structure decides the setup. Indicators only support or weaken it.
- If the app's detected setup and your read differ, say so plainly and explain which structure fact makes the difference.
- Plain English, short sentences, instructional tone, no hype.
- "confidence" is about how complete the measured facts are, never the odds of the trade working.

Respond with JSON only:
{"recommended_setup":"PULLBACK|BREAKOUT|NONE","headline":"","why":"","pullback_read":"","breakout_read":"","agrees_with_app":true,"disagreement":"","what_to_wait_for":[""],"missing_data":[""],"confidence":"high|moderate|low","confidence_reason":"","note":""}`;

  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Lovable-API-Key': apiKey,
        'X-Lovable-AIG-SDK': 'fetch',
      },
      body: JSON.stringify({
        model: 'openai/gpt-6-astra',
        input: prompt,
        stream: true,
        reasoning: { effort: 'low', summary: 'auto' },
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      if (res.status === 429) return json({ error: 'The assistant is busy. Try again in a moment.' }, 429);
      if (res.status === 402)
        return json({ error: 'AI credits are exhausted. Add credits to keep using the assistant.' }, 402);
      if (res.status === 403)
        return json({ error: 'AI use is blocked for this workspace. An admin needs to enable it.' }, 403);
      return json({ error: `AI request failed (${res.status}): ${detail.slice(0, 300)}` }, res.status);
    }

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
        const raw = line.slice(5).trim();
        if (!raw || raw === '[DONE]') continue;
        try {
          const payload = JSON.parse(raw);
          if (payload.type === 'response.output_text.delta' && typeof payload.delta === 'string') {
            text += payload.delta;
          }
        } catch {
          // partial frame
        }
      }
    }

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return json({ error: 'The assistant returned nothing usable. Try again.' }, 502);

    return json(JSON.parse(match[0]));
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
