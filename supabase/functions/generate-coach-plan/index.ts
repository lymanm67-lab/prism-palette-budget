import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { plan_id } = await req.json();
    if (!plan_id) {
      return new Response(JSON.stringify({ error: 'plan_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: plan, error: planErr } = await supabase
      .from('coach_plans')
      .select('*')
      .eq('id', plan_id)
      .maybeSingle();
    if (planErr || !plan) {
      return new Response(JSON.stringify({ error: 'Plan not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const systemPrompt = `You are a personal money coach. The user just completed a 12-step questionnaire tied to their Money Coach cards. Each answer key (1-12) maps to a card:
1=What happened, 2=Why it happened, 3=Recovery plan, 4=Prevention rules,
5=Purchase Guard, 6=Money Leaks, 7=Safe-to-Spend buffer, 8=Adaptive Buffer,
9=Paycheck Deployment, 10=Bill Timing, 11=Wealth Redirector, 12=Operating Mode.
Produce a concrete, encouraging plan in their own context. Be specific. No filler.`;

    const userPrompt = `Here are the user's answers as JSON:\n${JSON.stringify(plan.answers, null, 2)}\n\nReturn a structured plan via the build_plan tool.`;

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'build_plan',
            description: 'Return a personalized Money Coach plan',
            parameters: {
              type: 'object',
              properties: {
                summary: { type: 'string', description: '2-3 sentence personalized summary' },
                top_priorities: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '3-5 highest-impact priorities right now',
                },
                thirty_day: { type: 'array', items: { type: 'string' }, description: 'Actions for the next 30 days' },
                sixty_day: { type: 'array', items: { type: 'string' }, description: 'Actions for days 31-60' },
                ninety_day: { type: 'array', items: { type: 'string' }, description: 'Actions for days 61-90' },
                per_card: {
                  type: 'object',
                  description: 'Recommendation per card number (keys "1" through "12")',
                  additionalProperties: {
                    type: 'object',
                    properties: {
                      headline: { type: 'string' },
                      recommendation: { type: 'string' },
                    },
                    required: ['headline', 'recommendation'],
                  },
                },
              },
              required: ['summary', 'top_priorities', 'thirty_day', 'sixty_day', 'ninety_day', 'per_card'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'build_plan' } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited, try again shortly.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Add credits in Settings.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const t = await aiResp.text();
      console.error('AI error', aiResp.status, t);
      throw new Error('AI gateway error');
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    const generated = toolCall?.function?.arguments ? JSON.parse(toolCall.function.arguments) : null;
    if (!generated) throw new Error('No structured plan returned');

    const { error: upErr } = await supabase
      .from('coach_plans')
      .update({
        generated_plan: generated,
        generated_at: new Date().toISOString(),
        status: 'completed',
      })
      .eq('id', plan_id);
    if (upErr) throw upErr;

    return new Response(JSON.stringify({ plan: generated }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('generate-coach-plan error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
