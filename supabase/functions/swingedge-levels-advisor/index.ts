import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface Levels {
  entry?: number | null;
  stop?: number | null;
  target?: number | null;
  rewardRisk?: number | null;
}

interface RequestBody {
  symbol?: string | null;
  page?: string;
  price?: number | null;
  rules?: Levels | null;
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

  const rules = body.rules ?? null;
  const rulesText = rules
    ? `Entry ${rules.entry ?? 'n/a'}, stop ${rules.stop ?? 'n/a'}, target ${rules.target ?? 'n/a'}, reward:risk ${
        rules.rewardRisk ?? 'n/a'
      }`
    : 'The app has no rules-engine levels for this symbol yet.';

  const prompt = `You are the SwingEdge trading assistant inside a personal swing-trading practice app. The owner trades long-only paper trades while training. You never place trades, never promise returns, and you always keep risk first.

Symbol: ${symbol}
Screen the owner is on: ${body.page ?? 'unknown'}
Last price: ${body.price ?? 'unknown'}
Levels the app's own rules engine produced: ${rulesText}
Measured context from the app (already computed, treat as facts): ${JSON.stringify(body.context ?? {}).slice(0, 6000)}
Owner's question: ${body.question?.toString().slice(0, 500) || 'none'}

Do BOTH jobs:
1. Explain the rules-engine levels above in plain English — where the stop comes from, why the target sits where it does, and what would make those levels wrong. If the app has no levels, say so plainly.
2. Propose your OWN entry, stop and target from the measured context, as an independent second read. Long-only: stop below entry, target above entry. Base them on structure and volatility present in the context, never on invented data. If the context is too thin, set the numbers to null and say what data is missing instead of guessing.

Then compare the two reads honestly and say which you'd act on and why. If nothing here is tradeable, say "no trade" and explain what to wait for.

Rules:
- Never invent prices, earnings dates, fundamentals or indicator values that are not in the context.
- Reward:risk under 2 should be called out as a reason to pass.
- Instructional tone, plain English, no hype, no guarantees.

Respond with JSON only:
{"rules_explanation":"","ai_levels":{"entry":null,"stop":null,"target":null,"reward_risk":null,"basis":""},"agreement":"agree|differ|no_trade","comparison":"","risks":[""],"checks":[""],"note":""}`;

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
      if (res.status === 429) return json({ error: 'The AI assistant is busy. Try again in a moment.' }, 429);
      if (res.status === 402)
        return json({ error: 'AI credits are exhausted. Add credits to keep using the assistant.' }, 402);
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

    const parsed = JSON.parse(match[0]);
    return json(parsed);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
