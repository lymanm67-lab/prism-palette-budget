import { useMemo } from 'react';
import { useAccounts } from './use-finance-data';
import { useCreditAccounts } from './use-credit-accounts';
import { useSafeToSpend } from './use-safe-to-spend';

export interface HomeBuyingMetric {
  label: string;
  value: string;
  pct: number;
  color: string;
  raw: number;
}

/**
 * Derives the 4 readiness hero metrics from real household data:
 * - Down Payment: sum of savings/cash account balances vs $50k target
 * - Credit: inverse of revolving utilization (lower util = higher score proxy)
 * - DTI: monthly debt obligations / monthly income (lower is better, target <36%)
 * - Emergency Fund: months of obligations covered by liquid savings (target 6mo)
 */
export function useHomeBuyingMetrics() {
  const { data: accounts } = useAccounts();
  const { accounts: creditAccounts } = useCreditAccounts();
  const sts = useSafeToSpend('personal');

  return useMemo<HomeBuyingMetric[]>(() => {
    // Down Payment — savings + checking surplus
    const savings = (accounts || [])
      .filter((a: any) => {
        const t = (a.account_type || '').toLowerCase();
        const st = (a.account_subtype || '').toLowerCase();
        return t === 'depository' || t === 'savings' || st.includes('saving') || st.includes('checking') || st.includes('money');
      })
      .reduce((s: number, a: any) => s + Number(a.current_balance ?? a.balance ?? 0), 0);
    const dpTarget = 50000;
    const dpPct = Math.min(100, (savings / dpTarget) * 100);

    // Credit — revolving utilization → score proxy
    const revolving = (creditAccounts || []).filter(
      (a) => (a.account_type || '').toLowerCase().includes('revolv') || (a.credit_limit ?? 0) > 0
    );
    const totalLimit = revolving.reduce((s, a) => s + Number(a.credit_limit || 0), 0);
    const totalBal = revolving.reduce((s, a) => s + Number(a.balance || 0), 0);
    const util = totalLimit > 0 ? (totalBal / totalLimit) * 100 : 0;
    // Score proxy: 850 if 0% util, 550 at 100%+ util
    const scoreProxy = totalLimit > 0 ? Math.max(550, Math.round(850 - util * 3)) : 0;
    const creditPct = totalLimit > 0 ? Math.min(100, ((scoreProxy - 550) / 300) * 100) : 0;

    // DTI — obligations / income
    const income = sts.monthlyIncome || 0;
    const obligations = sts.monthlyObligations || 0;
    const dti = income > 0 ? (obligations / income) * 100 : 0;
    // Score 100% at 0% DTI, 0% at 50%+ DTI
    const dtiPct = income > 0 ? Math.max(0, Math.min(100, 100 - dti * 2)) : 0;

    // Emergency Fund — months covered
    const monthsCovered = obligations > 0 ? savings / obligations : 0;
    const efPct = Math.min(100, (monthsCovered / 6) * 100);

    return [
      {
        label: 'Down Payment',
        value: savings > 0 ? `$${Math.round(savings / 1000)}k` : '—',
        pct: dpPct,
        color: 'prism-teal',
        raw: savings,
      },
      {
        label: 'Credit',
        value: scoreProxy > 0 ? `${scoreProxy}` : '—',
        pct: creditPct,
        color: 'prism-amber',
        raw: scoreProxy,
      },
      {
        label: 'DTI',
        value: income > 0 ? `${Math.round(dti)}%` : '—',
        pct: dtiPct,
        color: 'prism-indigo',
        raw: dti,
      },
      {
        label: 'Emergency Fund',
        value: obligations > 0 ? `${monthsCovered.toFixed(1)}mo` : '—',
        pct: efPct,
        color: 'prism-orange',
        raw: monthsCovered,
      },
    ];
  }, [accounts, creditAccounts, sts.monthlyIncome, sts.monthlyObligations]);
}
