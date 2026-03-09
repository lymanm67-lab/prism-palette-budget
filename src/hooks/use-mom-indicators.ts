import { useMemo } from 'react';
import { useTransactions } from './use-finance-data';
import { subMonths, format, startOfMonth, endOfMonth } from 'date-fns';

export interface MoMIndicator {
  currentValue: number;
  previousValue: number;
  change: number;
  percentageChange: number;
  direction: 'up' | 'down' | 'unchanged';
}

export interface MoMIndicators {
  income: MoMIndicator;
  expenses: MoMIndicator;
  netSavings: MoMIndicator;
  transactionCount: MoMIndicator;
}

/**
 * Calculates month-over-month changes for key financial metrics
 */
export function useMoMIndicators(): MoMIndicators | null {
  const { data: transactions } = useTransactions();

  return useMemo(() => {
    if (!transactions || transactions.length === 0) return null;

    const now = new Date();
    const currentMonthStart = format(startOfMonth(now), 'yyyy-MM-dd');
    const currentMonthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
    const prevMonthStart = format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');
    const prevMonthEnd = format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');

    // Calculate metrics for current month
    const currentTxns = transactions.filter(t => t.date >= currentMonthStart && t.date <= currentMonthEnd);
    const currentIncome = currentTxns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const currentExpenses = Math.abs(currentTxns.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0));
    const currentNet = currentIncome - currentExpenses;
    const currentCount = currentTxns.length;

    // Calculate metrics for previous month
    const prevTxns = transactions.filter(t => t.date >= prevMonthStart && t.date <= prevMonthEnd);
    const prevIncome = prevTxns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const prevExpenses = Math.abs(prevTxns.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0));
    const prevNet = prevIncome - prevExpenses;
    const prevCount = prevTxns.length;

    const calcIndicator = (current: number, previous: number, invertDirection = false): MoMIndicator => {
      const change = current - previous;
      const percentageChange = previous !== 0 ? (change / previous) * 100 : (current > 0 ? 100 : 0);
      let direction: 'up' | 'down' | 'unchanged' = 'unchanged';
      if (change > 0) direction = invertDirection ? 'down' : 'up';
      if (change < 0) direction = invertDirection ? 'up' : 'down';
      
      return {
        currentValue: current,
        previousValue: previous,
        change,
        percentageChange,
        direction,
      };
    };

    return {
      income: calcIndicator(currentIncome, prevIncome),
      expenses: calcIndicator(currentExpenses, prevExpenses, true), // Higher expenses = bad
      netSavings: calcIndicator(currentNet, prevNet),
      transactionCount: calcIndicator(currentCount, prevCount),
    };
  }, [transactions]);
}
