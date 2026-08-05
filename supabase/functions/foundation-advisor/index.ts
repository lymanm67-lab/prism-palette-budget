import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SYSTEM = `You are the Chief Philanthropy Advisor to the Dr. Lyman A. Montgomery Family Foundation.

You have 25 years of experience running private family foundations: formation, IRS compliance,
endowment investment policy, governance, grantmaking, donor stewardship, impact measurement, and
multi-generational succession. You are direct, specific, and numerate.

Rules:
- Ground every observation in the numbers provided. Quote the figures.
- Prioritize ruthlessly: name the ONE thing that matters most this quarter.
- Flag private-foundation-specific risks: 5% minimum distribution shortfalls, self-dealing with
  disqualified persons, excise tax on net investment income, jeopardizing investments, taxable
  expenditures, missing expenditure responsibility, unsigned conflict policies, board with no
  independent voices, missed 990-PF or state charitable registration filings.
- Always separate: (1) what is strong, (2) the gaps, (3) a prioritized 90-day action list with owners,
  (4) risks and pitfalls, (5) tax and legal issues to raise with the CPA and attorney.
- Never give legal, tax, accounting, or investment advice. Frame everything as educational planning
  and name the professional who must confirm it.
- Use markdown with short headings and tight bullets. No preamble.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const key = Deno.env.get('LOVABLE_API_KEY');
    if (!key) {
      return new Response(JSON.stringify({ error: 'AI is not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const snapshot = body?.snapshot;
    const question = typeof body?.question === 'string' ? body.question.slice(0, 2000) : '';
    if (!snapshot || typeof snapshot !== 'object') {
      return new Response(JSON.stringify({ error: 'A foundation snapshot is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `Foundation snapshot (JSON):\n${JSON.stringify(snapshot).slice(0, 24000)}\n\n${
      question
        ? `The board's question: ${question}`
        : 'Give a full advisory review: strengths, gaps, a prioritized 90-day action list, risks and pitfalls, and tax/legal items for the CPA and attorney.'
    }`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/responses', {
      method: 'POST',
      headers: { 'Lovable-API-Key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-5.6-sol',
        stream: true,
        input: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      const status = res.status === 429 || res.status === 402 ? res.status : 500;
      const message =
        res.status === 429
          ? 'AI rate limit reached — try again in a moment.'
          : res.status === 402
            ? 'AI credits exhausted. Add credits in workspace settings to continue.'
            : 'The advisor could not be reached.';
      console.error('foundation-advisor gateway error', res.status, detail.slice(0, 500));
      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Consume the stream server-side and return the finished narrative.
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let text = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const evt = JSON.parse(payload);
          if (evt.type === 'response.output_text.delta' && typeof evt.delta === 'string') text += evt.delta;
        } catch {
          // ignore partial frames
        }
      }
    }

    return new Response(JSON.stringify({ analysis: text.trim() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('foundation-advisor error', e);
    return new Response(JSON.stringify({ error: 'Unexpected error generating the advisory review' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
