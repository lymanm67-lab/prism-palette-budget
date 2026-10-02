import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import AnimatedNumber from '@/components/AnimatedNumber';
import { Button } from '@/components/ui/button';
import type { PaycheckDeployment } from '@/hooks/use-paycheck-deploy';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';

const WEALTH_RE = /roth|457|tda|403|401|hsa|health savings|retire|employer match|brokerage|ira/i;

/** Wealth-building payroll lines from the budget for the paycheck's month. */
function usePayrollWealth(payDate: string) {
  const { household } = useHousehold();
  const month = `${payDate.slice(0, 7)}-01`;
  return useQuery({
    queryKey: ['payroll_wealth_lines', household?.id, month],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('planned_amount, categories!inner(name, category_groups!inner(expense_type))')
        .eq('household_id', household!.id)
        .eq('month', month)
        .gt('planned_amount', 0);
      if (error) throw error;
      return (data || [])
        .filter((b: any) => b.categories?.category_groups?.expense_type === 'payroll_deduction' && WEALTH_RE.test(b.categories?.name || ''))
        .map((b: any) => ({ label: b.categories.name as string, value: Number(b.planned_amount), employer: /employer/i.test(b.categories.name) }));
    },
  });
}

/** Business operating costs from the budget (business debt payments stay under Debt Freedom). */
function useBusinessCosts(payDate: string) {
  const { household } = useHousehold();
  const month = `${payDate.slice(0, 7)}-01`;
  return useQuery({
    queryKey: ['business_costs_tree', household?.id, month],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('planned_amount, categories!inner(name, category_groups!inner(name, expense_type))')
        .eq('household_id', household!.id)
        .eq('month', month)
        .gt('planned_amount', 0);
      if (error) throw error;
      return (data || [])
        .filter((b: any) => {
          const g = b.categories?.category_groups;
          return /^business/i.test(g?.name || '') && !/debt|loan/i.test(g?.name || '') && g?.expense_type !== 'income';
        })
        .map((b: any) => ({ label: b.categories.name as string, value: Number(b.planned_amount) }))
        .sort((a, b) => b.value - a.value);
    },
  });
}

/** Real debts with their minimum payments, biggest first. Budget lines for the
 *  paycheck's month win when they name the same debt (e.g. a reduced payment). */
function useDebtMinimums(payDate: string) {
  const { household } = useHousehold();
  const month = `${payDate.slice(0, 7)}-01`;
  return useQuery({
    queryKey: ['debt_minimums_tree', household?.id, month],
    enabled: !!household,
    queryFn: async () => {
      const [{ data: items, error: e1 }, { data: lines, error: e2 }] = await Promise.all([
        supabase
          .from('debt_items')
          .select('name, minimum_payment, balance, deferred_until, debt_plans!inner(household_id)')
          .eq('debt_plans.household_id', household!.id)
          .gt('minimum_payment', 0)
          .gt('balance', 0),
        supabase
          .from('budgets')
          .select('planned_amount, categories!inner(name)')
          .eq('household_id', household!.id)
          .eq('month', month)
          .gt('planned_amount', 0),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const budgetByKey = new Map<string, number>();
      for (const b of lines || []) {
        const key = String((b as any).categories?.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (key) budgetByKey.set(key, (budgetByKey.get(key) || 0) + Number((b as any).planned_amount));
      }
      const seen = new Set<string>();
      return (items || [])
        .filter((d: any) => !d.deferred_until || d.deferred_until <= payDate) // not started yet (e.g. student loan)
        .map((d: any) => {
          const key = String(d.name).toLowerCase().replace(/[^a-z0-9]/g, '');
          const token = key.replace(/(settlement|loan|studentloan|premiumbalanceowed)$/i, '').slice(0, 8);
          const acct = String(d.name).match(/\d{4}/)?.[0];
          let value = Number(d.minimum_payment);
          // Only use a budget override for distinctive names (e.g. BetrLink), never for
          // numbered/generic loans like "Vacation Loan 3006" — those keep their own minimum.
          const GENERIC = /^(vacation|personal|student|auto|car|business)/;
          if (!acct && token.length >= 6 && !GENERIC.test(token)) {
            let sum = 0;
            for (const [bk, bv] of budgetByKey) if (bk.includes(token)) sum += bv; // e.g. BetrLink personal + business
            if (sum > 0) value = sum;
          }
          // Dedupe key: loan number if present, else the normalized name.
          return { label: d.name as string, value, key: acct ? `acct${acct}` : key };
        })
        .filter(d => {
          if (seen.has(d.key)) return false;
          seen.add(d.key);
          return true;
        })
        .sort((a, b) => b.value - a.value);
    },
  });
}

/** Merchants of bills you've turned off (cancelled / paid off). */
function useInactiveBills() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['inactive_bills_tree', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .select('merchant')
        .eq('household_id', household!.id)
        .eq('is_active', false);
      if (error) throw error;
      return new Set((data || []).map((r: any) => String(r.merchant || '').toLowerCase().replace(/[^a-z0-9]/g, '')));
    },
  });
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

type Leaf = { label: string; value: number };

const num = (d: PaycheckDeployment, k: string) => Number((d as any)[k] || 0);

/** Bills branch: biggest bills by name, the rest grouped as "Other bills". */
function billLeaves(d: PaycheckDeployment, ctx?: { all?: boolean; inactive?: Set<string> }): Leaf[] {
  const DEBT_BILL_RE = /betr\s*link|settlement|loan|nelnet|sba\b/i;
  const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  // Hide bills you've since cancelled or paid off, even if this plan was saved before.
  const all = [...(Array.isArray(d.bills_breakdown) ? d.bills_breakdown : [])]
    .filter(b => !ctx?.inactive?.has(norm(b.merchant)))
    .map(b => ({ label: b.merchant, value: Number(b.amount || 0) }));
  const debtInBills = all.filter(b => DEBT_BILL_RE.test(b.label || '')).reduce((s, b) => s + b.value, 0);
  const items = all.filter(b => !DEBT_BILL_RE.test(b.label || '')).sort((a, b) => b.value - a.value);
  const k = ctx?.all ? items.length : 3;
  const top = items.slice(0, k);
  const rest = items.slice(k).reduce((s, b) => s + b.value, 0);
  const listed = top.reduce((s, b) => s + b.value, 0);
  const removed = (Array.isArray(d.bills_breakdown) ? d.bills_breakdown : [])
    .filter(b => ctx?.inactive?.has(norm(b.merchant))).reduce((s, b) => s + Number(b.amount || 0), 0);
  const unlisted = Math.max(0, num(d, 'bills_amount') - removed - debtInBills - listed - rest);
  const out = [...top];
  if (rest + unlisted > 0.5) out.push({ label: items.length > k ? `${items.length - k} other bills` : 'Other bills', value: rest + unlisted });
  return out;
}

// The five Cash Flow Pillars, each with its own side branches.
const PILLARS: { label: string; color: string; leaves: (d: PaycheckDeployment, ctx?: { debts: Leaf[]; all?: boolean; inactive?: Set<string> }) => Leaf[] }[] = [
  { label: 'Bills & Essentials', color: 'var(--prism-sky)', leaves: billLeaves },
  {
    label: 'Debt Freedom', color: 'var(--prism-rose)',
    leaves: (d, ctx) => {
      const debts = ctx?.debts || [];
      const k = ctx?.all ? debts.length : 3;
      const top = debts.slice(0, k);
      const rest = debts.slice(k).reduce((s, x) => s + x.value, 0);
      const listed = top.reduce((s, x) => s + x.value, 0);
      const unlisted = Math.max(0, num(d, 'min_debt_amount') - listed - rest);
      const out = [...top];
      if (rest + unlisted > 0.5) out.push({ label: debts.length > k ? `${debts.length - k} other debts` : 'Other minimums', value: rest + unlisted });
      if (out.length === 0) out.push({ label: 'Minimum payments', value: num(d, 'min_debt_amount') });
      const extra = num(d, 'extra_debt_amount');
      if (extra > 0) out.push({ label: 'Extra payoff', value: extra });
      return out;
    },
  },
  {
    label: 'Savings & Buffer', color: 'var(--prism-teal)',
    leaves: d => [{ label: 'Savings goals', value: num(d, 'savings_amount') }, { label: 'Smart Buffer', value: num(d, 'buffer_amount') }],
  },
  {
    label: 'Wealth & Investing', color: 'var(--prism-lime)',
    leaves: d => [{ label: 'Investing goals', value: num(d, 'investment_amount') }],
  },
  { label: 'Business Expenses', color: 'var(--prism-orange)', leaves: () => [] },
  {
    label: 'Guilt-Free Spend', color: 'var(--prism-amber)',
    leaves: d => {
      const v = num(d, 'safe_to_spend_amount');
      const perWeek = d.frequency === 'monthly' ? v / 4.33 : d.frequency === 'semi_monthly' ? v / 2.17 : d.frequency === 'weekly' ? v : v / 2;
      return [{ label: 'Safe to spend', value: v }, { label: 'About per week', value: perWeek }];
    },
  },
];

export default function PaycheckSplitAnimation({ deployment, compact = false }: { deployment: PaycheckDeployment; compact?: boolean }) {
  const [run, setRun] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const reduce = useReducedMotion();
  const net = Number(deployment.net_amount) || 0;
  const { data: payrollWealth } = usePayrollWealth(deployment.pay_date);
  const { data: debts } = useDebtMinimums(deployment.pay_date);
  const { data: inactive } = useInactiveBills();
  const { data: businessCosts } = useBusinessCosts(deployment.pay_date);
  if (net <= 0) return null;

  const pillars = PILLARS.map(p => {
    let leaves = p.leaves(deployment, { debts: debts || [], all: showAll, inactive });
    let value = p.label === 'Guilt-Free Spend' ? leaves[0].value : leaves.reduce((s, l) => s + l.value, 0);
    let extra = 0;
    if (p.label === 'Business Expenses') {
      const items = businessCosts || [];
      const k = showAll ? items.length : 3;
      const rest = items.slice(k).reduce((s, x) => s + x.value, 0);
      leaves = [...items.slice(0, k), ...(rest > 0.5 ? [{ label: `${items.length - k} other bills`, value: rest }] : [])];
      if (leaves.length === 0) leaves = [{ label: 'No business costs budgeted', value: 0 }];
      const total = items.reduce((s, x) => s + x.value, 0);
      return { ...p, leaves, value: total, takeHome: total };
    }
    if (p.label === 'Wealth & Investing' && payrollWealth?.length) {
      // Payroll lines come out before take-home; employer money is shown but never counted as yours.
      const own = payrollWealth.filter(l => !l.employer);
      const emp = payrollWealth.filter(l => l.employer);
      leaves = [
        ...(leaves[0].value > 0 ? [{ label: 'From take-home', value: leaves[0].value }] : []),
        ...own.map(l => ({ label: `${l.label} (payroll)`, value: l.value })),
        ...emp.map(l => ({ label: `${l.label} (employer, extra)`, value: l.value })),
      ];
      extra = own.reduce((s, l) => s + l.value, 0);
    }
    return { ...p, leaves, value: value + extra, takeHome: value };
  });
  const n = pillars.length;
  const W = 1000, H = compact ? 110 : 150, topY = 6, botY = H - 4;
  const xs = pillars.map((_, i) => ((i + 0.5) / n) * W);
  const maxV = Math.max(1, ...pillars.map(p => p.value));
  const d = (s: number) => (reduce ? 0 : s);
  const trunkEnd = topY + (botY - topY) * 0.35;

  return (
    <div className="relative rounded-lg border border-border/40 bg-background/40 p-3 overflow-hidden" key={run}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Paycheck money tree</span>
        <div className="flex items-center gap-1">
          {!compact && (
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => setShowAll(s => !s)}>
              <span>{showAll ? 'Show fewer' : 'Show all bills & debts'}</span>
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => setRun(r => r + 1)}>
            <span className="flex items-center gap-1"><RotateCcw className="h-3 w-3" /> Replay</span>
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className={compact ? '' : 'min-w-[640px]'}>
          {/* Root: the paycheck */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [0.5, 1.12, 1], opacity: 1 }}
            transition={{ duration: d(0.7), ease: 'easeOut' }}
            className="relative mx-auto w-fit rounded-full border border-prism-teal/50 bg-prism-teal/10 px-5 py-1.5 shadow-[0_0_28px_hsl(var(--prism-teal)/0.4)]"
          >
            {!reduce && (
              <motion.span
                className="absolute inset-0 rounded-full border border-prism-teal/50"
                initial={{ scale: 1, opacity: 0.7 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
              />
            )}
            <AnimatedNumber from={0} duration={reduce ? 0 : 900} value={net} formatFn={fmt} className="font-mono text-lg font-bold text-prism-teal" />
          </motion.div>

          {/* Trunk + five main branches */}
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full !bg-transparent" preserveAspectRatio="none" style={{ height: compact ? 70 : 100 }}>
            <motion.path
              d={`M ${W / 2} ${topY} L ${W / 2} ${trunkEnd}`}
              stroke="hsl(var(--prism-teal))" strokeWidth={14} strokeLinecap="round" fill="none"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: d(0.35), delay: d(0.3) }}
            />
            {pillars.map((p, i) => {
              const path = `M ${W / 2} ${trunkEnd} C ${W / 2} ${(trunkEnd + botY) / 2}, ${xs[i]} ${(trunkEnd + botY) / 2}, ${xs[i]} ${botY}`;
              const w = 3 + (p.value / maxV) * (compact ? 8 : 12);
              return (
                <g key={p.label}>
                  <path d={path} fill="none" stroke={`hsl(${p.color} / 0.12)`} strokeWidth={w} strokeLinecap="round" />
                  <motion.path
                    d={path} fill="none" stroke={`hsl(${p.color})`} strokeWidth={w} strokeLinecap="round"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                    transition={{ duration: d(0.8), delay: d(0.6 + i * 0.1), ease: 'easeInOut' }}
                  />
                  {!reduce && p.value > 0 && [0, 0.8, 1.6].map(off => (
                    <circle key={off} r={4} fill={`hsl(${p.color})`} opacity={0.9}>
                      <animateMotion dur="2.4s" begin={`${1.4 + i * 0.1 + off}s`} repeatCount="indefinite" path={path} />
                    </circle>
                  ))}
                </g>
              );
            })}
          </svg>

          {/* Pillars with side branches */}
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
            {pillars.map((p, i) => {
              const pct = Math.round((p.takeHome / net) * 100);
              const base = 1.2 + i * 0.1;
              return (
                <div key={p.label} className="flex flex-col items-stretch">
                  <motion.div
                    initial={{ y: 14, opacity: 0, scale: 0.85 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 16, delay: d(base) }}
                    className="rounded-md border-2 bg-card/70 px-1.5 py-1.5 text-center"
                    style={{ borderColor: `hsl(${p.color} / 0.55)`, boxShadow: `0 0 18px hsl(${p.color} / 0.18)` }}
                  >
                    <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-bold leading-tight">{p.label}</div>
                    <div className="font-mono text-xs sm:text-sm font-bold" style={{ color: `hsl(${p.color})` }}>
                      <AnimatedNumber from={0} value={p.value} duration={reduce ? 0 : 900} formatFn={fmt} />
                    </div>
                    {!compact && <div className="text-[9px] text-muted-foreground">{pct}% of take-home{p.value > p.takeHome ? ' + payroll' : ''}</div>}
                  </motion.div>

                  {!compact && p.leaves.length > 0 && (
                    <div className="relative mt-1 ml-3 pl-0">
                      {/* Stem */}
                      <motion.div
                        className="absolute left-0 top-0 w-[2px] rounded-full origin-top"
                        style={{ background: `hsl(${p.color} / 0.7)`, height: 'calc(100% - 12px)' }}
                        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                        transition={{ duration: d(0.5), delay: d(base + 0.35) }}
                      />
                      <div className="space-y-1.5 pt-1.5">
                        {p.leaves.map((l, j) => {
                          const delay = d(base + 0.5 + j * 0.15);
                          return (
                            <div key={l.label + j} className="relative flex items-center">
                              {/* Twig */}
                              <motion.div
                                className="h-[2px] w-3 shrink-0 origin-left"
                                style={{ background: `hsl(${p.color} / 0.7)` }}
                                initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                                transition={{ duration: d(0.25), delay }}
                              />
                              <motion.div
                                initial={{ opacity: 0, x: -6, scale: 0.9 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: d(Number(delay) + 0.15) }}
                                className={`min-w-0 flex-1 rounded border bg-background/60 px-1.5 py-1 ${/other (bills|debts)/i.test(l.label) ? 'cursor-pointer hover:bg-muted/40 underline decoration-dotted' : ''}`}
                                style={{ borderColor: `hsl(${p.color} / 0.3)` }}
                                onClick={/other (bills|debts)/i.test(l.label) ? () => setShowAll(true) : undefined}
                                role={/other (bills|debts)/i.test(l.label) ? 'button' : undefined}
                                title={/other (bills|debts)/i.test(l.label) ? 'Tap to show each one' : undefined}
                              >
                                <div className="truncate text-[9px] sm:text-[10px] text-muted-foreground leading-tight" title={l.label}>{l.label}</div>
                                <div className="font-mono text-[10px] sm:text-[11px] font-semibold" style={{ color: `hsl(${p.color})` }}>
                                  <AnimatedNumber from={0} value={l.value} duration={reduce ? 0 : 700} formatFn={fmt} />
                                </div>
                              </motion.div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
