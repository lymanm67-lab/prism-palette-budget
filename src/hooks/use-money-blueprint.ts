import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import {
  type BlueprintState,
  emptyBlueprint,
  DEFAULT_FOUNDATION,
  DEFAULT_WEALTH_ENGINE,
  DEFAULT_FUTURE_FUND,
} from '@/lib/budgeting/moneyBlueprint';

const sb = supabase as any;

// Household salary figures already established elsewhere in the app.
export const KATERI_GROSS_ANNUAL = 113_000;
/** W-2 salary only — employer retirement contributions are based on this. */
export const LYMAN_SALARY_ANNUAL = 70_940.04; // $5,911.67/mo
/** Consulting / 1099 income: $1,925 per quarter. */
export const CONSULTING_QUARTERLY = 1_925;
export const CONSULTING_ANNUAL = CONSULTING_QUARTERLY * 4; // 7,700
export const LYMAN_GROSS_ANNUAL = LYMAN_SALARY_ANNUAL + CONSULTING_ANNUAL; // 78,640.04
export const HOUSEHOLD_GROSS_ANNUAL = LYMAN_GROSS_ANNUAL + KATERI_GROSS_ANNUAL;

const NET_RATIO = 0.76; // take-home estimate after taxes + pre-tax deferrals

/**
 * Retirement contributions come out of payroll, not from bank transactions, so the
 * 90-day transaction scan can never see them. These are the real per-month figures
 * from the IU paystub (07/2026) plus Kateri's OPERS deferral.
 */
export const PAYROLL_RETIREMENT = {
  lyman: {
    rothTDA: 85,
    roth457: 75,
    preTaxTDA: 100,
    preTax457: 75,
    hsa: 116.66,
  },
  kateri: {
    // OPERS member contribution: 10% of gross
    pension: Math.round(((KATERI_GROSS_ANNUAL / 12) * 0.1) * 100) / 100,
  },
};

const LYMAN_RETIREMENT_MONTHLY =
  PAYROLL_RETIREMENT.lyman.rothTDA +
  PAYROLL_RETIREMENT.lyman.roth457 +
  PAYROLL_RETIREMENT.lyman.preTaxTDA +
  PAYROLL_RETIREMENT.lyman.preTax457 +
  PAYROLL_RETIREMENT.lyman.hsa;
const KATERI_RETIREMENT_MONTHLY = PAYROLL_RETIREMENT.kateri.pension;

/** Employer non-elective retirement contribution (no match): 9% of Lyman's gross. */
export const LYMAN_EMPLOYER_RATE = 0.09;
const LYMAN_EMPLOYER_MONTHLY =
  Math.round(((LYMAN_SALARY_ANNUAL / 12) * LYMAN_EMPLOYER_RATE) * 100) / 100;

/** OPERS employer contribution: 14% of Kateri's gross. */
const KATERI_EMPLOYER_MONTHLY =
  Math.round(((KATERI_GROSS_ANNUAL / 12) * 0.14) * 100) / 100;


export function useMoneyBlueprint() {
  const { household } = useHousehold();
  return useQuery<{ id: string | null; state: BlueprintState }>({
    queryKey: ['spending_plan', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await sb
        .from('spending_plans')
        .select('*')
        .eq('household_id', household!.id)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      const row = data?.[0];
      if (!row) return { id: null, state: emptyBlueprint() };
      const base = emptyBlueprint();
      return {
        id: row.id,
        state: {
          name: row.name || base.name,
          balanceSheet: { ...base.balanceSheet, ...(row.balance_sheet || {}) },
          income: { ...base.income, ...(row.income || {}) },
          buckets: {
            foundation: row.buckets?.foundation?.length ? row.buckets.foundation : base.buckets.foundation,
            wealthEngine: row.buckets?.wealthEngine?.length ? row.buckets.wealthEngine : base.buckets.wealthEngine,
            futureFund: row.buckets?.futureFund?.length ? row.buckets.futureFund : base.buckets.futureFund,
          },
        },
      };
    },
  });
}

export function useSaveMoneyBlueprint() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, state }: { id: string | null; state: BlueprintState }) => {
      const payload = {
        household_id: household!.id,
        name: state.name,
        balance_sheet: state.balanceSheet,
        income: state.income,
        buckets: state.buckets,
      };
      if (id) {
        const { error } = await sb.from('spending_plans').update(payload).eq('id', id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await sb.from('spending_plans').insert(payload).select('id').single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spending_plan'] }),
  });
}

/** Maps a "<group> <category>" label to a blueprint row key. Order matters. */
const ROW_MATCHERS: { key: string; test: (label: string) => boolean }[] = [
  { key: 'rent', test: (l) => /housing/.test(l) && /rent|mortgage|hoa|property tax/.test(l) },
  { key: 'utilities', test: (l) => /utilit|electric|water|gas bill|internet|cable|trash|sewer/.test(l) },
  { key: 'phone', test: (l) => /phone|mobile|cell/.test(l) },
  { key: 'insurance', test: (l) => /personal insurance|term life|auto insurance|home insurance|renters|medical plan|dental|vision/.test(l) },
  { key: 'transportation', test: (l) => /transportation|fuel|gas station|auto|car payment|parking|transit|rideshare|uber|lyft/.test(l) },
  { key: 'debt', test: (l) => /personal debt repayment|credit card|student loan|loan payment/.test(l) },
  { key: 'groceries', test: (l) => /grocer/.test(l) },
  { key: 'clothes', test: (l) => /cloth|apparel|shoes/.test(l) },
  { key: 'subscriptions', test: (l) => /personal subscriptions|streaming|membership|gym/.test(l) },
];

/** Actual household rent (confirmed by Lyman). */
const RENT_MONTHLY = 1100;

/** Starting April 2027 Kateri covers the utilities bill in full. */
export const KATERI_UTILITIES_MONTHLY = 377;
export const KATERI_UTILITIES_START = new Date(2027, 3, 1);
const kateriPaysUtilities = () => new Date() >= KATERI_UTILITIES_START;

const WEALTH_MATCHERS: { key: string; test: (l: string) => boolean }[] = [
  { key: 'postTaxRetirement', test: (l) => /roth|ira|retirement|401|457|hsa/.test(l) },
  { key: 'stocks', test: (l) => /invest|brokerage|stock|crypto/.test(l) },
];

const FUTURE_MATCHERS: { key: string; test: (l: string) => boolean }[] = [
  { key: 'vacations', test: (l) => /vacation|travel|hotel|flight/.test(l) },
  { key: 'gifts', test: (l) => /gift|charit|donation|tithe/.test(l) },
  { key: 'emergency', test: (l) => /emergency|savings goal|sinking/.test(l) },
];

/** Business / owner-side activity is excluded — the blueprint is the personal household plan. */
const BUSINESS_RE = /business|app development|marketing & media|equity|owner draw|payroll & pre tax|assets|focused driven/;

const monthlyAvg = (total: number) => Math.round((total / 3) * 100) / 100;

/** Live figures used to seed / re-sync the blueprint. */
export function useBlueprintPrefill() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['blueprint_prefill', household?.id],
    enabled: !!household,
    staleTime: 60_000,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const sinceStr = since.toISOString().slice(0, 10);

      // 1) 90 days of real activity from Track Money
      const rows: any[] = [];
      for (let page = 0; page < 5; page++) {
        const { data, error } = await sb
          .from('transactions')
          .select('amount, is_transfer, categories(name, category_groups(name))')
          .eq('household_id', household!.id)
          .is('deleted_at', null)
          .gte('date', sinceStr)
          .range(page * 1000, page * 1000 + 999);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < 1000) break;
      }

      const spend = new Map<string, number>();
      const wealth = new Map<string, number>();
      const future = new Map<string, number>();
      let income = 0;

      for (const t of rows) {
        if (t.is_transfer) continue;
        const amount = Number(t.amount) || 0;
        const label = `${t.categories?.category_groups?.name || ''} ${t.categories?.name || ''}`.toLowerCase();
        if (BUSINESS_RE.test(label)) continue;

        if (amount > 0) {
          // Kateri's salary is not deposited into tracked accounts — her "wife contribution"
          // transfers are excluded here and her full net salary is added below instead.
          if (/wife contribution|kateri/.test(label)) continue;
          if (/income|salary|paycheck|deposit|reimburs/.test(label)) income += amount;
          continue;
        }


        const abs = Math.abs(amount);
        const w = WEALTH_MATCHERS.find((m) => m.test(label));
        if (w) { wealth.set(w.key, (wealth.get(w.key) || 0) + abs); continue; }
        const f = FUTURE_MATCHERS.find((m) => m.test(label));
        if (f) { future.set(f.key, (future.get(f.key) || 0) + abs); continue; }
        const hit = ROW_MATCHERS.find((m) => m.test(label));
        if (hit) spend.set(hit.key, (spend.get(hit.key) || 0) + abs);
      }

      // 2) Current-month budget targets override the 90-day average where they exist
      const monthStart = new Date();
      monthStart.setDate(1);
      const { data: budgets } = await sb
        .from('budgets')
        .select('planned_amount, categories(name, category_groups(name))')
        .eq('household_id', household!.id)
        .eq('month', monthStart.toISOString().slice(0, 10));

      const budgeted = new Map<string, number>();
      for (const b of budgets || []) {
        const label = `${(b as any).categories?.category_groups?.name || ''} ${(b as any).categories?.name || ''}`.toLowerCase();
        if (BUSINESS_RE.test(label)) continue;
        const hit = ROW_MATCHERS.find((m) => m.test(label));
        if (!hit) continue;
        budgeted.set(hit.key, (budgeted.get(hit.key) || 0) + (Number((b as any).planned_amount) || 0));
      }

      // Lyman's take-home comes from real deposits; Kateri's salary isn't deposited into
      // tracked accounts, so it's estimated from her gross and added to household net.
      const lymanNet = monthlyAvg(income) > 500
        ? monthlyAvg(income)
        : Math.round(((LYMAN_GROSS_ANNUAL / 12) * NET_RATIO) * 100) / 100;
      const kateriNet = Math.round(((KATERI_GROSS_ANNUAL / 12) * NET_RATIO) * 100) / 100;
      const netMonthly = Math.round((lymanNet + kateriNet) * 100) / 100;

      // Category owner split defaults to each spouse's share of take-home.
      const lymanShare = netMonthly > 0 ? lymanNet / netMonthly : 1;
      const withSplit = <T extends { amount: number }>(r: T) => {
        const lyman = Math.round((r.amount || 0) * lymanShare * 100) / 100;
        return { ...r, lyman, kateri: Math.round(((r.amount || 0) - lyman) * 100) / 100 };
      };

      const foundation = DEFAULT_FOUNDATION.map((r) => {
        // From April 2027 Kateri pays the utilities bill ($377/mo) entirely.
        if (r.key === 'utilities' && kateriPaysUtilities()) {
          return { ...r, lyman: 0, kateri: KATERI_UTILITIES_MONTHLY, amount: KATERI_UTILITIES_MONTHLY };
        }
        return withSplit({
          ...r,
          amount: r.key === 'rent'
            ? RENT_MONTHLY
            : budgeted.has(r.key) ? Math.round(budgeted.get(r.key)! * 100) / 100 : monthlyAvg(spend.get(r.key) || 0),
        });
      });

      return {
        foundation,
        wealthEngine: DEFAULT_WEALTH_ENGINE.map((r) => {
          const tracked = monthlyAvg(wealth.get(r.key) || 0);
          if (r.key === 'employerRetirement') {
            // Employer money (no match — straight non-elective contributions).
            return {
              ...r,
              lyman: LYMAN_EMPLOYER_MONTHLY,
              kateri: KATERI_EMPLOYER_MONTHLY,
              amount: Math.round((LYMAN_EMPLOYER_MONTHLY + KATERI_EMPLOYER_MONTHLY) * 100) / 100,
            };
          }
          if (r.key !== 'postTaxRetirement') return withSplit({ ...r, amount: tracked });
          // Payroll-deducted retirement never appears in bank transactions — use the
          // real paystub figures (and Kateri's OPERS) as the floor.
          const lyman = Math.max(tracked, LYMAN_RETIREMENT_MONTHLY);
          const kateri = KATERI_RETIREMENT_MONTHLY;
          return {
            ...r,
            lyman: Math.round(lyman * 100) / 100,
            kateri: Math.round(kateri * 100) / 100,
            amount: Math.round((lyman + kateri) * 100) / 100,
          };
        }),
        futureFund: DEFAULT_FUTURE_FUND.map((r) => withSplit({ ...r, amount: monthlyAvg(future.get(r.key) || 0) })),
        income: {
          grossMonthly: Math.round((HOUSEHOLD_GROSS_ANNUAL / 12) * 100) / 100,
          netMonthly,
          lymanNet,
          kateriNet,
        },
        source: {
          budgetedKeys: Array.from(budgeted.keys()),
          transactionCount: rows.length,
          lymanNet,
          kateriNet,
        },

      };
    },
  });
}

