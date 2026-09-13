// SwingEdge AI Mentor — advises on a trade and critiques rule-following.
//
// It only ever reads facts the app already measured (bias, event risk,
// readiness, portfolio heat, plan levels) plus the deterministic discipline
// report computed in the app. It never invents prices, dates or fundamentals.

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface RequestBody {
  scope?: 'TRADE' | 'REVIEW';
  page?: string;
  symbol?: string | null;
  /** Measured facts about the setup / plan. Already computed, treat as facts. */
  context?: Record<string, unknown> | null;
  /** Deterministic discipline report from the app. */
  discipline?: Record<string, unknown> | null;
  /** Past mentor verdicts so it can call out repeat offences. */
  history?: Record<string, unknown>[] | null;
  question?: string | null;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const clip = (v: unknown, max = 6000) => JSON.stringify(v ?? {}).slice(0, max);

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

  const scope = body.scope === 'REVIEW' ? 'REVIEW' : 'TRADE';
  const symbol = (body.symbol ?? '').toString().trim().toUpperCase();
  if (scope === 'TRADE' && !symbol) return json({ error: 'A symbol is required.' }, 400);

  const job =
    scope === 'TRADE'
      ? `Job: judge whether taking THIS trade right now would follow the owner's own rules, or whether emotion is driving it.
- Weigh the measured facts against the rules: price structure first, indicators supporting only; risk sized to the plan; reward:risk of at least 2; readiness score respected; event/earnings calls respected; portfolio heat inside its limit; no chasing after an extended run.
- Name every rule this setup would break, and every one it satisfies.
- Look at the discipline report and the past verdicts: if this trade repeats a habit the owner has already been warned about, say so directly and name the habit.
- Decide: "follow_plan" (the setup respects the rules), "caution" (it can be taken but something needs tightening first) or "stand_down" (taking it would break the rules).`
      : `Job: review the owner's recorded trading behaviour and critique it as a mentor.
- Work only from the discipline report and the recorded history given below. Do not recompute numbers and do not invent trades.
- Call out emotional patterns the data supports: revenge sizing after losses, chasing, oversizing, overtrading, moving stops, ignoring wait/review calls, cutting winners early, holding losers.
- Praise what is genuinely being done well, but do not soften a real problem.
- Decide: "follow_plan" (behaviour is on plan), "caution" (drift showing) or "stand_down" (stop trading and fix this first).`;

  const prompt = `You are the SwingEdge AI Mentor inside a personal swing-trading practice app. The owner trades long-only paper trades while training. You are a strict but calm mentor: your purpose is to keep the owner obeying the rules they set for themselves and to catch emotional trading early. You never place trades, never promise returns, never give financial advice, and you always put risk first.

Screen: ${body.page ?? 'unknown'}
Scope: ${scope}
${symbol ? `Symbol: ${symbol}` : ''}
Measured facts from the app (already computed, treat as facts): ${clip(body.context)}
Discipline report computed by the app (facts, do not recompute): ${clip(body.discipline, 5000)}
Past mentor verdicts, newest first: ${clip(body.history, 3000)}
Owner's question: ${body.question?.toString().slice(0, 500) || 'none'}

${job}

Hard rules for you:
- Never invent prices, earnings dates, indicator values, fundamentals or trades. If something needed is missing, say what is missing.
- Where the data is too thin to judge, say so plainly rather than guessing.
- Speak in plain English, second person, no hype, no jargon dumps. Short sentences.
- "emotional_flags" must each name the emotion or bias AND the evidence in the data.
- "discipline_note" is one sentence on how today's behaviour compares to the recorded record.
- "next_action" is a single concrete step to take right now.

Respond with JSON only:
{"verdict":"follow_plan|caution|stand_down","headline":"","rules_kept":[""],"rule_breaks":[{"rule":"","what_happened":"","fix":""}],"emotional_flags":[{"pattern":"","evidence":"","counter_move":""}],"repeat_offences":[""],"doing_well":[""],"discipline_note":"","next_action":"","note":""}`;

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
      if (res.status === 429) return json({ error: 'The mentor is busy. Try again in a moment.' }, 429);
      if (res.status === 402)
        return json({ error: 'AI credits are exhausted. Add credits to keep using the mentor.' }, 402);
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
    if (!match) return json({ error: 'The mentor returned nothing usable. Try again.' }, 502);

    return json(JSON.parse(match[0]));
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
