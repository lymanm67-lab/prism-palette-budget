import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { household_id, category_id, category_name, month, overage_amount, budget_amount, spent_amount, recent_history } = await req.json();

    if (!household_id || !category_name || !month || overage_amount == null) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: userData } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Pattern detection from recent history (array of {month, over: boolean})
    const history: Array<{ month: string; over: boolean }> = recent_history || [];
    const overCount6mo = history.slice(-6).filter(h => h.over).length;
    const overCount3mo = history.slice(-3).filter(h => h.over).length;
    let pattern_type: 'outlier' | 'developing' | 'repeated' = 'outlier';
    if (overCount6mo >= 3) pattern_type = 'repeated';
    else if (overCount3mo >= 2) pattern_type = 'developing';

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY missing');

    const systemPrompt = `You are Prism Money Coach. You generate supportive, non-judgmental recovery plans when a spending category goes over budget. Never say "you failed" or use shame language. Use phrases like "trending above plan" and "next play". Keep each step short and concrete. Always return 4 plan options: fast (catch up this month), balanced (split across 2 months), system (change a recurring rule), wealth (redirect savings if applicable).`;

    const userPrompt = `Category "${category_name}" went over budget for ${month}.
Budget: $${budget_amount ?? 'unknown'}
Spent: $${spent_amount ?? 'unknown'}
Overage: $${overage_amount}
Pattern: ${pattern_type} (${overCount6mo}/6 months over)

Generate 4 recovery plan options. For each: title (max 6 words), summary (1 short sentence), 3 concrete steps, target_amount to recover.

Also generate ONE prevention_rule (1 sentence, system-level change to avoid this next month).`;

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'return_recovery_plans',
            description: 'Return 4 recovery plan options and a prevention rule',
            parameters: {
              type: 'object',
              properties: {
                plans: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      plan_type: { type: 'string', enum: ['fast','balanced','system','wealth'] },
                      title: { type: 'string' },
                      summary: { type: 'string' },
                      target_amount: { type: 'number' },
                      steps: { type: 'array', items: { type: 'string' } },
                    },
                    required: ['plan_type','title','summary','target_amount','steps'],
                    additionalProperties: false,
                  },
                },
                prevention_rule: { type: 'string' },
              },
              required: ['plans','prevention_rule'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'return_recovery_plans' } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, try again shortly.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Add funds to continue.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const t = await resp.text();
      console.error('Gateway error', resp.status, t);
      throw new Error('AI gateway error');
    }

    const ai = await resp.json();
    const toolCall = ai.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error('No tool call returned');
    const parsed = JSON.parse(toolCall.function.arguments);

    // Insert all plans
    const rows = parsed.plans.map((p: any) => ({
      household_id,
      category_id: category_id || null,
      category_name,
      month,
      plan_type: p.plan_type,
      target_amount: p.target_amount,
      overage_amount,
      pattern_type,
      title: p.title,
      summary: p.summary,
      steps: p.steps,
      prevention_rule: parsed.prevention_rule,
      status: 'suggested',
    }));

    const { data: inserted, error: insErr } = await supabase
      .from('recovery_plans')
      .insert(rows)
      .select();

    if (insErr) throw insErr;

    return new Response(JSON.stringify({ plans: inserted, prevention_rule: parsed.prevention_rule, pattern_type }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('recovery-plan-builder error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
