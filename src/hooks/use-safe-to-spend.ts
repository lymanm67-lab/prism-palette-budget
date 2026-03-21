import { useMemo } from 'react';
import { useAccounts, useTransactions } from '@/hooks/use-finance-data';
import { useRecurringTransactions } from '@/hooks/use-recurring';
import { useModeSettings, type FinancialMode, MODE_CONFIG } from '@/hooks/use-financial-mode';
import { useSubscriptions } from '@/hooks/use-subscriptions';

export interface SafeToSpendResult {
  daily: number;
  weekly: number;
  monthly: number;
  totalAvailableCash: number;
  monthlyIncome: number;
  monthlyObligations: number;
  monthlySubscriptions: number;
  bufferPercent: number;
  mode: FinancialMode;
  isLoading: boolean;
}

export function useSafeToSpend(): SafeToSpendResult {
  const { data: accounts } = useAccounts();
  const { data: transactions } = useTransactions();
  const { data: recurring } = useRecurringTransactions();
  const { data: subscriptions } = useSubscriptions();
  const { data: modeSettings } = useModeSettings();

  return useMemo(() => {
    const mode: FinancialMode = (modeSettings?.current_mode as FinancialMode) || 'guardrail';
    const bufferPercent = modeSettings?.buffer_percent ?? MODE_CONFIG[mode].bufferDefault;

    // Total available cash (checking + savings)
    const totalAvailableCash = (accounts || [])
      .filter(a => a.is_active && (a.account_type === 'checking' || a.account_type === 'savings') && a.balance > 0)
      .reduce((s, a) => s + a.balance, 0);

    // Monthly income from this month's transactions
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthTxns = (transactions || []).filter(t => t.date.startsWith(monthPrefix));
    const monthlyIncome = monthTxns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);

    // Monthly obligations from recurring transactions (bills)
    const monthlyObligations = (recurring || [])
      .filter((r: any) => r.is_active && r.amount < 0)
      .reduce((s: number, r: any) => {
        const amt = Math.abs(r.amount);
        const freq = r.frequency;
        if (freq === 'weekly') return s + amt * 4.33;
        if (freq === 'biweekly') return s + amt * 2.17;
        if (freq === 'quarterly') return s + amt / 3;
        if (freq === 'yearly') return s + amt / 12;
        return s + amt; // monthly
      }, 0);

    // Monthly subscriptions
    const monthlySubscriptions = (subscriptions || [])
      .filter((sub: any) => sub.is_active && !sub.is_cancelled)
      .reduce((s: number, sub: any) => {
        const amt = Math.abs(sub.average_amount || 0);
        if (sub.frequency === 'yearly' || sub.frequency === 'annual') return s + amt / 12;
        if (sub.frequency === 'quarterly') return s + amt / 3;
        return s + amt;
      }, 0);

    // Already spent this month
    const monthlySpent = monthTxns
      .filter(t => t.amount < 0 && !t.is_transfer)
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    // Base monthly safe-to-spend: income - obligations - subscriptions - already spent
    const baseMonthlySafe = monthlyIncome - monthlyObligations - monthlySubscriptions - monthlySpent;
    
    // Apply buffer
    const bufferMultiplier = 1 - (bufferPercent / 100);
    const monthlySafe = Math.max(0, baseMonthlySafe * bufferMultiplier);

    // Days remaining in month
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - now.getDate() + 1;

    const dailySafe = daysRemaining > 0 ? monthlySafe / daysRemaining : 0;
    const weeksRemaining = Math.max(1, daysRemaining / 7);
    const weeklySafe = monthlySafe / weeksRemaining;

    return {
      daily: Math.round(dailySafe * 100) / 100,
      weekly: Math.round(weeklySafe * 100) / 100,
      monthly: Math.round(monthlySafe * 100) / 100,
      totalAvailableCash,
      monthlyIncome,
      monthlyObligations,
      monthlySubscriptions,
      bufferPercent,
      mode,
      isLoading: !accounts,
    };
  }, [accounts, transactions, recurring, subscriptions, modeSettings]);
}
