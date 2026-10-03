import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import type { PaycheckDeployment } from '@/hooks/use-paycheck-deploy';

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

/** Personal share of split bills (rent, Verizon, auto insurance, utilities) from the budget's Personal/Business lines. */
const SPLIT_RULES: { re: RegExp; key: RegExp }[] = [
  { re: /clarke|\brent\b/i, key: /^rent$/i },
  { re: /verizon/i, key: /verizon/i },
  { re: /geico|progressive|auto ins/i, key: /auto insurance/i },
  { re: /liberty|renters|rent ins/i, key: /home\/renters insurance/i },
  { re: /firstenergy|enbridge|ohio edison|clearview|utilit|gas\b|electric/i, key: /^utilities/i },
];
function usePersonalShares(payDate: string) {
  const { household } = useHousehold();
  const month = `${payDate.slice(0, 7)}-01`;
  return useQuery({
    queryKey: ['personal_shares_tree', household?.id, month],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('planned_amount, categories!inner(name, category_groups!inner(name))')
        .eq('household_id', household!.id)
        .eq('month', month)
        .gt('planned_amount', 0);
      if (error) throw error;
      return SPLIT_RULES.map(r => {
        let pers = 0, biz = 0;
        for (const b of data || []) {
          const name = String((b as any).categories?.name || '');
          if (!r.key.test(name)) continue;
          const isBiz = /^business/i.test((b as any).categories?.category_groups?.name || '');
          if (isBiz) biz += Number((b as any).planned_amount); else pers += Number((b as any).planned_amount);
        }
        return { re: r.re, share: pers + biz > 0 && biz > 0 ? pers / (pers + biz) : 1 };
      });
    },
  });
}

/** Merchants of bills you've turned off (cancelled / paid off). */
export function useInactiveBills() {
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

type Leaf = { label: string; value: number };
export type PaycheckPillar = { label: string; color: string; value: number; takeHome: number; leaves: Leaf[] };
export type PaycheckBillItem = {
  id: string;
  label: string;
  value: number;
  businessValue: number;
  dueDate: string;
};

const num = (d: PaycheckDeployment, k: string) => Number((d as any)[k] || 0);

/** Bills branch: biggest bills by name, the rest grouped as "Other bills".
 *  Returns the leaves plus the full personal-share-adjusted non-debt bill list. */
function billBranch(d: PaycheckDeployment, ctx: { all?: boolean; inactive?: Set<string>; shares?: { re: RegExp; share: number }[] }) {
  const DEBT_BILL_RE = /betr\s*link|settlement|loan|nelnet|sba\b/i;
  const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  // Hide bills you've since cancelled or paid off, even if this plan was saved before.
  const all = [...(Array.isArray(d.bills_breakdown) ? d.bills_breakdown : [])]
    .filter(b => !ctx.inactive?.has(norm(b.merchant)))
    .map(b => {
      const full = Number(b.amount || 0);
      const sh = ctx.shares?.find(x => x.re.test(b.merchant || ''))?.share ?? 1;
      return {
        id: String(b.id || `${b.merchant}-${b.due_date}`),
        label: sh < 1 ? `${b.merchant} (personal ${Math.round(sh * 100)}%)` : b.merchant,
        name: String(b.merchant || 'Bill'),
        value: full * sh,
        bizPart: full * (1 - sh),
        dueDate: String(b.due_date || ''),
      };
    });
  const bizParts = all.reduce((s, b) => s + b.bizPart, 0);
  const debtInBills = all.filter(b => DEBT_BILL_RE.test(b.label || '')).reduce((s, b) => s + b.value, 0);
  const items = all.filter(b => !DEBT_BILL_RE.test(b.label || '')).sort((a, b) => b.value - a.value);
  const k = ctx.all ? items.length : 3;
  const top = items.slice(0, k);
  const rest = items.slice(k).reduce((s, b) => s + b.value, 0);
  const listed = top.reduce((s, b) => s + b.value, 0);
  const removed = (Array.isArray(d.bills_breakdown) ? d.bills_breakdown : [])
    .filter(b => ctx.inactive?.has(norm(b.merchant))).reduce((s, b) => s + Number(b.amount || 0), 0);
  const unlisted = Math.max(0, num(d, 'bills_amount') - removed - bizParts - debtInBills - listed - rest);
  const out: Leaf[] = top.map(({ label, value }) => ({ label, value }));
  if (rest + unlisted > 0.5) out.push({ label: items.length > k ? `${items.length - k} other bills` : 'Other bills', value: rest + unlisted });
  const billItems: PaycheckBillItem[] = items.map(({ id, name, value, bizPart, dueDate }) => ({
    id,
    label: name,
    value,
    businessValue: bizPart,
    dueDate,
  }));
  return { leaves: out, total: out.reduce((s, l) => s + l.value, 0), billItems };
}

const PILLAR_DEFS: { label: string; color: string; }[] = [
  { label: 'Bills & Essentials', color: 'var(--prism-sky)' },
  { label: 'Debt Freedom', color: 'var(--prism-rose)' },
  { label: 'Savings & Buffer', color: 'var(--prism-teal)' },
  { label: 'Wealth & Investing', color: 'var(--prism-lime)' },
  { label: 'Business Expenses', color: 'var(--prism-orange)' },
  { label: 'Guilt-Free Spend', color: 'var(--prism-amber)' },
];

export interface PaycheckTree {
  net: number;
  pillars: PaycheckPillar[];
  /** bills + debt + business */
  expTotal: number;
  /** every active, personal-share-adjusted, non-debt bill — for the bar chart */
  billItems: PaycheckBillItem[];
}

/** Derives the six money areas for a paycheck exactly as the money tree shows them:
 *  live budget/debt data, cancelled bills removed, personal/business split applied,
 *  and guilt-free spending carved out of Savings & Buffer. */
export function usePaycheckTree(deployment: PaycheckDeployment, opts?: { all?: boolean }): PaycheckTree {
  const net = Number(deployment.net_amount) || 0;
  const { data: payrollWealth } = usePayrollWealth(deployment.pay_date);
  const { data: debts } = useDebtMinimums(deployment.pay_date);
  const { data: inactive } = useInactiveBills();
  const { data: businessCosts } = useBusinessCosts(deployment.pay_date);
  const { data: shares } = usePersonalShares(deployment.pay_date);
  if (net <= 0) return { net, pillars: [], expTotal: 0, billItems: [] };

  const billsBranch = billBranch(deployment, { all: opts?.all, inactive, shares });
  const debtLeaves: Leaf[] = (() => {
    const list = debts || [];
    const k = opts?.all ? list.length : 3;
    const top = list.slice(0, k);
    const rest = list.slice(k).reduce((s, x) => s + x.value, 0);
    const listed = top.reduce((s, x) => s + x.value, 0);
    const unlisted = Math.max(0, num(deployment, 'min_debt_amount') - listed - rest);
    const out = [...top.map(({ label, value }) => ({ label, value }))];
    if (rest + unlisted > 0.5) out.push({ label: list.length > k ? `${list.length - k} other debts` : 'Other minimums', value: rest + unlisted });
    if (out.length === 0) out.push({ label: 'Minimum payments', value: num(deployment, 'min_debt_amount') });
    const extra = num(deployment, 'extra_debt_amount');
    if (extra > 0) out.push({ label: 'Extra payoff', value: extra });
    return out;
  })();

  let pillars: PaycheckPillar[] = [
    { ...PILLAR_DEFS[0], value: billsBranch.total, takeHome: billsBranch.total, leaves: billsBranch.leaves },
    { ...PILLAR_DEFS[1], value: debtLeaves.reduce((s, l) => s + l.value, 0), takeHome: debtLeaves.reduce((s, l) => s + l.value, 0), leaves: debtLeaves },
    {
      ...PILLAR_DEFS[2],
      value: num(deployment, 'savings_amount') + num(deployment, 'buffer_amount'),
      takeHome: num(deployment, 'savings_amount') + num(deployment, 'buffer_amount'),
      leaves: [{ label: 'Savings goals', value: num(deployment, 'savings_amount') }, { label: 'Smart Buffer', value: num(deployment, 'buffer_amount') }],
    },
    { ...PILLAR_DEFS[3], value: num(deployment, 'investment_amount'), takeHome: num(deployment, 'investment_amount'), leaves: [{ label: 'Investing goals', value: num(deployment, 'investment_amount') }] },
    { ...PILLAR_DEFS[4], value: 0, takeHome: 0, leaves: [] },
    {
      ...PILLAR_DEFS[5],
      value: num(deployment, 'safe_to_spend_amount'),
      takeHome: num(deployment, 'safe_to_spend_amount'),
      leaves: (() => {
        const v = num(deployment, 'safe_to_spend_amount');
        const perWeek = deployment.frequency === 'monthly' ? v / 4.33 : deployment.frequency === 'semi_monthly' ? v / 2.17 : deployment.frequency === 'weekly' ? v : v / 2;
        return [{ label: 'Safe to spend', value: v }, { label: 'About per week', value: perWeek }];
      })(),
    },
  ];

  // Business expenses pillar from the budget (never counted inside Bills).
  {
    const items = businessCosts || [];
    const k = opts?.all ? items.length : 3;
    const rest = items.slice(k).reduce((s, x) => s + x.value, 0);
    const leaves = [...items.slice(0, k).map(x => ({ label: x.label, value: x.value })), ...(rest > 0.5 ? [{ label: `${items.length - k} other bills`, value: rest }] : [])];
    const total = items.reduce((s, x) => s + x.value, 0);
    const p = pillars.find(p => p.label === 'Business Expenses')!;
    p.leaves = leaves.length ? leaves : [{ label: 'No business costs budgeted', value: 0 }];
    p.value = total; p.takeHome = total;
  }

  // Wealth & Investing: payroll lines come out before take-home; employer money is shown but never counted as yours.
  if (payrollWealth?.length) {
    const own = payrollWealth.filter(l => !l.employer);
    const emp = payrollWealth.filter(l => l.employer);
    const p = pillars.find(p => p.label === 'Wealth & Investing')!;
    p.leaves = [
      ...(p.leaves[0].value > 0 ? [{ label: 'From take-home', value: p.leaves[0].value }] : []),
      ...own.map(l => ({ label: `${l.label} (payroll)`, value: l.value })),
      ...emp.map(l => ({ label: `${l.label} (employer, extra)`, value: l.value })),
    ];
    p.value = p.takeHome + own.reduce((s, l) => s + l.value, 0);
  }

  // Guilt-free spending gets a fixed share of take-home first; it comes out of Savings & Buffer (buffer first).
  const GUILT_FREE_PCT = 0.10;
  {
    const gf = pillars.find(p => p.label === 'Guilt-Free Spend')!;
    const sv = pillars.find(p => p.label === 'Savings & Buffer')!;
    const target = Math.round(net * GUILT_FREE_PCT * 100) / 100;
    let need = Math.max(0, target - gf.takeHome);
    const buf = sv.leaves.find(l => l.label === 'Smart Buffer');
    const sav = sv.leaves.find(l => l.label === 'Savings goals');
    for (const l of [buf, sav]) { if (!l || need <= 0) continue; const take = Math.min(l.value, need); l.value -= take; need -= take; }
    const moved = Math.max(0, target - gf.takeHome) - need;
    if (moved > 0) {
      sv.value -= moved; sv.takeHome -= moved;
      gf.value += moved; gf.takeHome += moved;
      const perWeek = deployment.frequency === 'monthly' ? gf.takeHome / 4.33 : deployment.frequency === 'semi_monthly' ? gf.takeHome / 2.17 : deployment.frequency === 'weekly' ? gf.takeHome : gf.takeHome / 2;
      gf.leaves = [{ label: `Safe to spend (${Math.round(GUILT_FREE_PCT * 100)}% of pay)`, value: gf.takeHome }, { label: 'About per week', value: perWeek }];
    }
  }

  const expTotal = pillars.filter(p => /Bills|Debt|Business/.test(p.label)).reduce((s, p) => s + p.takeHome, 0);
  return { net, pillars, expTotal, billItems: billsBranch.billItems };
}
