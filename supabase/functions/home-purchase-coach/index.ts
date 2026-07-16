import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

interface Req {
  project_id: string;
  section_key: string;
  month_index: number | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: Req = await req.json();
    if (!body?.project_id || !body?.section_key) {
      return new Response(JSON.stringify({ error: 'project_id and section_key required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Load project + supporting context
    const { data: project } = await supabase
      .from('hp_projects')
      .select('*')
      .eq('id', body.project_id)
      .single();
    if (!project) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [{ data: milestones }, { data: rules }, { data: risks }, { data: docs }] = await Promise.all([
      supabase.from('hp_milestones').select('*').eq('project_id', body.project_id).is('deleted_at', null).order('month_index'),
      supabase.from('hp_rules').select('*').eq('project_id', body.project_id).is('deleted_at', null),
      supabase.from('hp_risks').select('*').eq('project_id', body.project_id).is('deleted_at', null),
      supabase.from('hp_documents').select('*').eq('project_id', body.project_id).is('deleted_at', null),
    ]);

    // Financial snapshot (best effort — read what we can)
    const { data: accounts } = await supabase
      .from('accounts')
      .select('current_balance, balance, account_type, account_subtype')
      .eq('household_id', project.household_id)
      .is('deleted_at', null);
    const savings = (accounts || []).reduce((s: number, a: any) => {
      const t = (a.account_type || '').toLowerCase();
      const st = (a.account_subtype || '').toLowerCase();
      if (t === 'depository' || t === 'savings' || st.includes('saving') || st.includes('checking')) {
        return s + Number(a.current_balance ?? a.balance ?? 0);
      }
      return s;
    }, 0);

    const activeRules = (rules || []).filter((r: any) => r.is_active);
    const docsMissing = (docs || []).filter((d: any) => d.status === 'missing').length;
    const docsTotal = (docs || []).length;
    const activeRisks = (risks || []).filter((r: any) => r.status === 'open').length;

    const snapshot = {
      target_close_date: project.target_close_date,
      target_price: project.target_price,
      max_monthly_payment: project.max_monthly_payment,
      down_payment_target: project.down_payment_target,
      loan_type: project.loan_type_preference,
      savings: Math.round(savings),
      docs_missing: docsMissing,
      docs_total: docsTotal,
      open_risks: activeRisks,
      milestone: body.month_index !== null ? (milestones || []).find((m: any) => m.month_index === body.month_index) : null,
      active_rules: activeRules.map((r: any) => ({ label: r.label, value: r.value_numeric ?? r.value_text })),
    };

    const snapshotHash = await hashJson(snapshot);

    // Check cache
    const { data: cached } = await supabase
      .from('hp_coach_narratives')
      .select('*')
      .eq('project_id', body.project_id)
      .eq('section_key', body.section_key)
      .eq('snapshot_hash', snapshotHash)
      .maybeSingle();
    if (cached) {
      return new Response(JSON.stringify({ content_md: cached.content_md, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate via Lovable AI Gateway
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not set' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = buildSystemPrompt(body.section_key);
    const userPrompt = `Home purchase context (JSON):\n${JSON.stringify(snapshot, null, 2)}\n\nWrite the section now.`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error('AI gateway error', aiRes.status, errText);
      return new Response(JSON.stringify({ error: 'AI gateway failed', status: aiRes.status, details: errText }), {
        status: aiRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content || 'Unable to generate narrative.';

    // Cache result — delete any previous rows for this key, then insert
    let delQ = supabase
      .from('hp_coach_narratives')
      .delete()
      .eq('project_id', body.project_id)
      .eq('section_key', body.section_key);
    delQ = body.month_index === null ? delQ.is('month_index', null) : delQ.eq('month_index', body.month_index);
    await delQ;

    await supabase.from('hp_coach_narratives').insert({
      project_id: body.project_id,
      household_id: project.household_id,
      section_key: body.section_key,
      month_index: body.month_index,
      content_md: content,
      snapshot_hash: snapshotHash,
      generated_at: new Date().toISOString(),
    } as any);

    return new Response(JSON.stringify({ content_md: content, cached: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('home-purchase-coach error', e);
    return new Response(JSON.stringify({ error: e?.message || 'internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function hashJson(obj: any): Promise<string> {
  const str = JSON.stringify(obj);
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

function buildSystemPrompt(sectionKey: string): string {
  const base = `You are a Certified Financial Planner and mortgage advisor writing for a home-buying client using their Home Purchase Success Planner. Be concise, specific, and reference the user's actual numbers. Respect their personal rules — never suggest violating a stated rule. Format as Markdown with short headings and bullets. Never invent numbers not in the context.`;

  if (sectionKey.startsWith('month_') && sectionKey.endsWith('_narrative')) {
    return `${base}\n\nSection: Monthly Narrative. Write 4 short paragraphs: (1) Why this month matters, (2) What lenders evaluate here, (3) Common mistakes, (4) What success looks like. Keep total under 250 words.`;
  }
  if (sectionKey === 'decision_points') {
    return `${base}\n\nSection: Decision Points. Answer these questions using the client's numbers: Should I increase savings? Reduce debt? Wait? Apply now? Change loan type? Increase down payment? Reduce purchase price? For each: one recommendation + one-line why. Keep under 300 words total.`;
  }
  if (sectionKey === 'rules_review') {
    return `${base}\n\nSection: Rules Review. Check each active rule against the client's current numbers. Flag any at risk of being violated. Reinforce that the AI enforces these rules throughout the plan. Under 200 words.`;
  }
  if (sectionKey === 'executive_summary') {
    return `${base}\n\nSection: Executive Summary. Give an at-a-glance picture: readiness level, biggest risk, next best action. 3 short paragraphs, under 200 words.`;
  }
  if (sectionKey === 'mortgage_readiness') {
    return `${base}\n\nSection: Mortgage Readiness. Estimate approval probability (Low/Medium/High) with a one-line reason. List remaining requirements as bullets. Under 200 words.`;
  }
  if (sectionKey === 'final_dashboard') {
    return `${base}\n\nSection: Closing Readiness. Summarize whether the client is ready to close, what final steps remain, and a short congratulations tone if all rules and requirements are met. Under 200 words.`;
  }
  return `${base}\n\nWrite a concise, useful section based on the context. Under 250 words.`;
}
