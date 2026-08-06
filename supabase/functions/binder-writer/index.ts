import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SYSTEM = `You are the senior documents counsel and executive writer for a U.S. private family foundation.

You draft board-ready governance, formation, financial, IRS 501(c)(3), operations, compliance, and
legacy documents. Your writing is precise, formal, numbered where appropriate, and specific to the
foundation's own records — never generic filler.

Rules:
- Write the document body ONLY. No preamble, no commentary, no markdown code fences.
- Use plain text with clear section headings and numbered clauses (1., 1.1) where a policy or
  charter requires them. Keep paragraphs tight.
- Ground names, dollar figures, dates, board members, pillars, and programs in the supplied records.
  Where a required fact is missing, insert a clearly bracketed placeholder like [BOARD CHAIR NAME].
- Reference the governing authority when relevant (Ohio Revised Code Chapter 1702, IRC 501(c)(3),
  509(a), 4940-4945, 4942 minimum distribution, Form 990-PF, Form 1023).
- Never state legal, tax, or investment advice as settled — add a closing line directing review by
  the foundation's attorney and CPA before adoption.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const key = Deno.env.get('LOVABLE_API_KEY');
    if (!key) return json({ error: 'AI is not configured' }, 500);

    const b = await req.json().catch(() => ({}));
    const title = typeof b?.title === 'string' ? b.title.slice(0, 300) : '';
    if (!title) return json({ error: 'A document title is required' }, 400);

    const mode = b?.mode === 'polish' ? 'polish' : 'draft';
    const docCode = typeof b?.doc_code === 'string' ? b.doc_code.slice(0, 40) : '';
    const section = typeof b?.section === 'string' ? b.section.slice(0, 80) : '';
    const purpose = typeof b?.purpose === 'string' ? b.purpose.slice(0, 1000) : '';
    const org = typeof b?.org === 'string' ? b.org.slice(0, 200) : 'the Foundation';
    const currentBody = typeof b?.body === 'string' ? b.body.slice(0, 20000) : '';
    const instructions = typeof b?.instructions === 'string' ? b.instructions.slice(0, 2000) : '';
    const snapshot = b?.snapshot && typeof b.snapshot === 'object' ? b.snapshot : null;

    const prompt = `Foundation: ${org}
Binder section: ${section || 'unspecified'}
Document code: ${docCode || 'unassigned'}
Document title: ${title}
Stated purpose: ${purpose || 'not stated'}

${snapshot ? `Live foundation records (JSON):\n${JSON.stringify(snapshot).slice(0, 20000)}\n` : ''}
${currentBody ? `Existing draft to ${mode === 'polish' ? 'rewrite and elevate' : 'use as raw material'}:\n${currentBody}\n` : ''}
${instructions ? `Additional instructions from the board: ${instructions}\n` : ''}
Produce the complete, adoption-ready body of this document.`;

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
      console.error('binder-writer gateway error', res.status, detail.slice(0, 500));
      if (res.status === 429) return json({ error: 'AI rate limit reached — try again in a moment.' }, 429);
      if (res.status === 402) return json({ error: 'AI credits exhausted. Add credits in workspace settings.' }, 402);
      return json({ error: 'The document writer could not be reached.' }, 500);
    }

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

    const body = text.trim();
    if (!body) return json({ error: 'The writer returned no text — try again.' }, 502);
    return json({ body });
  } catch (e) {
    console.error('binder-writer error', e);
    return json({ error: 'Unexpected error writing the document' }, 500);
  }
});
