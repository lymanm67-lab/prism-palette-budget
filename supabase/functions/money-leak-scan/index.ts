import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface LeakRow {
  household_id: string;
  leak_type: string;
  title: string;
  merchant?: string | null;
  source_id?: string | null;
  source_type?: string | null;
  monthly_cost: number;
  annual_cost: number;
  three_year_cost: number;
  risk_level: 'low' | 'medium' | 'high';
  recommended_fix?: string;
  suggested_redirect?: string;
  detail?: Record<string, unknown>;
}

const FEE_PATTERNS: Array<{ type: string; regex: RegExp; risk: 'low' | 'medium' | 'high'; title: string; fix: string }> = [
  { type: 'overdraft', regex: /overdraft|nsf|insufficient/i, risk: 'high', title: 'Overdraft fee', fix: 'Enable overdraft protection or shift due dates to after payday.' },
  { type: 'late_fee', regex: /late\s*fee|past\s*due/i, risk: 'high', title: 'Late fee', fix: 'Move this bill onto autopay and add a 3-day pre-pay reminder.' },
  { type: 'atm_fee', regex: /atm\s*fee|atm\s*surcharge|out[- ]of[- ]network/i, risk: 'low', title: 'ATM fee', fix: 'Use in-network ATMs or cash-back at checkout.' },
  { type: 'interest_charge', regex: /interest\s*charge|finance\s*charge|purchase\s*interest/i, risk: 'high', title: 'Interest charge', fix: 'Pay statement balance in full; consider a payoff sprint.' },
];

function monthsBetween(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json().catch(() => ({}));
    const household_id: string | undefined = body.household_id;
    if (!household_id) {
      return new Response(JSON.stringify({ error: 'household_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Verify membership
    const { data: member } = await supabase
      .from('household_members')
      .select('id').eq('user_id', user.id).eq('household_id', household_id).maybeSingle();
    if (!member) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Pull data
    const now = new Date();
    const cutoff90 = new Date(now.getTime() - 90 * 86400_000).toISOString().slice(0, 10);
    const cutoff180 = new Date(now.getTime() - 180 * 86400_000).toISOString().slice(0, 10);

    const [subsRes, txnsRes, recurringRes] = await Promise.all([
      supabase.from('subscriptions').select('*').eq('household_id', household_id),
      supabase.from('transactions').select('id, date, amount, merchant, notes, category_id, is_transfer').eq('household_id', household_id).is('deleted_at', null).gte('date', cutoff180),
      supabase.from('recurring_transactions').select('id, merchant, amount, frequency, next_due_date, is_active').eq('household_id', household_id).eq('is_active', true),
    ]);

    const subs = subsRes.data || [];
    const txns = txnsRes.data || [];
    const recurring = recurringRes.data || [];

    const leaks: LeakRow[] = [];

    // 1) Zombie subscriptions (no charge > 60 days but still active)
    for (const s of subs) {
      if (!s.is_active || s.is_cancelled) continue;
      const last = s.last_charge_date ? new Date(s.last_charge_date) : null;
      const daysSince = last ? Math.floor((now.getTime() - last.getTime()) / 86400_000) : 999;
      const monthly = Math.abs(Number(s.average_amount || 0));
      if (monthly <= 0) continue;
      if (daysSince > 60) {
        leaks.push({
          household_id, leak_type: 'zombie_subscription',
          title: `${s.merchant} — idle ${daysSince}d`,
          merchant: s.merchant, source_id: s.id, source_type: 'subscription',
          monthly_cost: monthly, annual_cost: monthly * 12, three_year_cost: monthly * 36,
          risk_level: monthly > 25 ? 'high' : 'medium',
          recommended_fix: 'Cancel this subscription or confirm you still use it.',
          suggested_redirect: monthly >= 20 ? 'debt' : 'savings',
          detail: { days_since_charge: daysSince },
        });
      }
    }

    // 2) Duplicate subscriptions (same normalized merchant root or same amount in same loose category)
    const byRoot = new Map<string, typeof subs>();
    for (const s of subs) {
      if (!s.is_active) continue;
      const root = (s.normalized_merchant || s.merchant || '').toLowerCase().replace(/\s+(plus|premium|pro|basic|family|standard|hd|4k)\b.*/i, '').trim();
      if (!root) continue;
      const arr = byRoot.get(root) || [];
      arr.push(s);
      byRoot.set(root, arr);
    }
    for (const [root, arr] of byRoot) {
      if (arr.length < 2) continue;
      const monthly = arr.reduce((sum, x) => sum + Math.abs(Number(x.average_amount || 0)), 0);
      const minMonthly = Math.min(...arr.map(x => Math.abs(Number(x.average_amount || 0))));
      leaks.push({
        household_id, leak_type: 'duplicate_subscription',
        title: `Multiple ${root} plans (${arr.length})`,
        merchant: root, source_id: arr[0].id, source_type: 'subscription',
        monthly_cost: monthly - minMonthly,
        annual_cost: (monthly - minMonthly) * 12,
        three_year_cost: (monthly - minMonthly) * 36,
        risk_level: 'medium',
        recommended_fix: 'Consolidate onto one plan — share a family tier or pick the best one.',
        suggested_redirect: 'savings',
        detail: { plans: arr.map(x => ({ id: x.id, merchant: x.merchant, amount: x.average_amount })) },
      });
    }

    // 3) Forgotten trials (subscription charged once in last 60 days, low engagement signal)
    for (const s of subs) {
      if (!s.is_active || s.is_cancelled) continue;
      const last = s.last_charge_date ? new Date(s.last_charge_date) : null;
      if (!last) continue;
      const daysSince = Math.floor((now.getTime() - last.getTime()) / 86400_000);
      const merchantTxnCount = txns.filter(t => (t.merchant || '').toLowerCase() === (s.merchant || '').toLowerCase()).length;
      const monthly = Math.abs(Number(s.average_amount || 0));
      if (merchantTxnCount === 1 && daysSince > 25 && daysSince < 45 && monthly > 0) {
        leaks.push({
          household_id, leak_type: 'forgotten_trial',
          title: `${s.merchant} — likely trial just renewed`,
          merchant: s.merchant, source_id: s.id, source_type: 'subscription',
          monthly_cost: monthly, annual_cost: monthly * 12, three_year_cost: monthly * 36,
          risk_level: 'medium',
          recommended_fix: 'Cancel before the next renewal if you forgot you signed up.',
          suggested_redirect: 'savings',
          detail: { days_since_first_charge: daysSince },
        });
      }
    }

    // 4) Fee charges (overdraft, late, atm, interest)
    for (const t of txns) {
      if (t.is_transfer) continue;
      const text = `${t.merchant || ''} ${t.notes || ''}`;
      for (const p of FEE_PATTERNS) {
        if (p.regex.test(text)) {
          const amt = Math.abs(Number(t.amount));
          if (amt < 1) continue;
          leaks.push({
            household_id, leak_type: p.type,
            title: `${p.title} — ${t.merchant || 'bank'}`,
            merchant: t.merchant, source_id: t.id, source_type: 'transaction',
            monthly_cost: amt, annual_cost: amt * 12, three_year_cost: amt * 36,
            risk_level: p.risk,
            recommended_fix: p.fix,
            suggested_redirect: p.type === 'interest_charge' ? 'debt' : 'ef',
            detail: { date: t.date, amount: amt },
          });
          break;
        }
      }
    }

    // 5) Bill collisions (>=3 recurring items due within a 3-day window)
    const recurringDue = recurring
      .filter(r => r.next_due_date)
      .map(r => ({ ...r, d: new Date(r.next_due_date) }))
      .sort((a, b) => a.d.getTime() - b.d.getTime());

    for (let i = 0; i < recurringDue.length; i++) {
      const window: typeof recurringDue = [recurringDue[i]];
      for (let j = i + 1; j < recurringDue.length; j++) {
        if ((recurringDue[j].d.getTime() - recurringDue[i].d.getTime()) / 86400_000 <= 3) {
          window.push(recurringDue[j]);
        } else break;
      }
      if (window.length >= 3) {
        const total = window.reduce((s, x) => s + Math.abs(Number(x.amount || 0)), 0);
        leaks.push({
          household_id, leak_type: 'bill_collision',
          title: `${window.length} bills due within 3 days`,
          merchant: null, source_id: window[0].id, source_type: 'recurring',
          monthly_cost: 0, annual_cost: 0, three_year_cost: 0,
          risk_level: total > 500 ? 'high' : 'medium',
          recommended_fix: 'Shift one or two due dates to spread bills across paychecks.',
          suggested_redirect: 'none',
          detail: { bills: window.map(x => ({ merchant: x.merchant, due: x.next_due_date, amount: x.amount })), total },
        });
        i += window.length - 1;
      }
    }

    // 6) Subscription creep (subscription monthly count grew vs 90d ago) — simple proxy
    const recentSubs = subs.filter(s => s.is_active && !s.is_cancelled);
    if (recentSubs.length >= 8) {
      const totalMonthly = recentSubs.reduce((sum, s) => sum + Math.abs(Number(s.average_amount || 0)), 0);
      leaks.push({
        household_id, leak_type: 'subscription_creep',
        title: `${recentSubs.length} active subscriptions`,
        merchant: null, source_type: null,
        monthly_cost: Math.round(totalMonthly * 0.2 * 100) / 100, // assume 20% is trimmable
        annual_cost: Math.round(totalMonthly * 0.2 * 12 * 100) / 100,
        three_year_cost: Math.round(totalMonthly * 0.2 * 36 * 100) / 100,
        risk_level: recentSubs.length >= 15 ? 'high' : 'medium',
        recommended_fix: 'Audit subscriptions — keep 80% of the value, cut 20% of the cost.',
        suggested_redirect: 'roth',
        detail: { count: recentSubs.length, monthly_total: totalMonthly },
      });
    }

    // Replace existing OPEN leaks for this household with the fresh scan results
    await supabase.from('money_leaks').delete().eq('household_id', household_id).eq('status', 'open');
    if (leaks.length > 0) {
      const { error: insErr } = await supabase.from('money_leaks').insert(leaks);
      if (insErr) throw insErr;
    }

    return new Response(JSON.stringify({ ok: true, count: leaks.length, leaks_preview: leaks.slice(0, 10) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('money-leak-scan error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
