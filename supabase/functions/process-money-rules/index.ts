import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Validate CRON_SECRET (set in supabase secrets)
  const cronSecret = Deno.env.get('CRON_SECRET');
  const authHeader = req.headers.get('authorization') || '';
  if (cronSecret && !authHeader.includes(cronSecret)) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const today = new Date().toISOString().slice(0, 10);

  // Fetch active rules with trigger_date <= today and not yet executed
  const { data: rules, error: rulesErr } = await supabase
    .from('investment_money_rules')
    .select('id, household_id, name, trigger_type, trigger_date')
    .eq('is_active', true)
    .eq('trigger_type', 'date')
    .lte('trigger_date', today);

  if (rulesErr) {
    return new Response(JSON.stringify({ error: rulesErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  let executed = 0;
  const errors: string[] = [];

  for (const rule of rules ?? []) {
    // Check if already executed
    const { data: existing } = await supabase
      .from('investment_rule_executions')
      .select('id')
      .eq('rule_id', rule.id)
      .limit(1)
      .maybeSingle();

    if (existing) continue;

    const { error: insErr } = await supabase.from('investment_rule_executions').insert({
      household_id: rule.household_id,
      rule_id: rule.id,
      status: 'executed',
      notes: `Auto-fired rule: ${rule.name}`,
    });

    if (insErr) {
      errors.push(`${rule.id}: ${insErr.message}`);
      continue;
    }
    executed++;
  }

  return new Response(
    JSON.stringify({ scanned: rules?.length ?? 0, executed, errors, ran_at: new Date().toISOString() }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
