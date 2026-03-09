import { useMemo } from 'react';
import { useTransactions } from './use-finance-data';
import { subMonths, format, parseISO, startOfMonth } from 'date-fns';

export interface SpendingAnomaly {
  merchant: string;
  currentAmount: number;
  averageAmount: number;
  percentageIncrease: number;
  transactionId: string;
  date: string;
}

/**
 * Detects spending anomalies by comparing current month spending
 * per merchant against a rolling 3-month average.
 */
export function useSpendingAnomalies(threshold = 0.5) {
  const { data: transactions } = useTransactions();

  return useMemo(() => {
    if (!transactions || transactions.length === 0) return [];

    const now = new Date();
    const currentMonthStart = format(startOfMonth(now), 'yyyy-MM-dd');
    const threeMonthsAgo = format(startOfMonth(subMonths(now, 3)), 'yyyy-MM-dd');

    // Group transactions by merchant and calculate averages
    const merchantHistory = new Map<string, { amounts: number[]; months: Set<string> }>();
    const currentMonthTxns: Array<{ merchant: string; amount: number; id: string; date: string }> = [];

    for (const txn of transactions) {
      if (txn.amount >= 0 || !txn.merchant) continue; // Only expenses
      
      const merchant = txn.merchant.toLowerCase().trim();
      const txnMonth = txn.date.substring(0, 7);
      const isCurrentMonth = txn.date >= currentMonthStart;
      const isInWindow = txn.date >= threeMonthsAgo && txn.date < currentMonthStart;

      if (isCurrentMonth) {
        currentMonthTxns.push({
          merchant,
          amount: Math.abs(txn.amount),
          id: txn.id,
          date: txn.date,
        });
      } else if (isInWindow) {
        if (!merchantHistory.has(merchant)) {
          merchantHistory.set(merchant, { amounts: [], months: new Set() });
        }
        const history = merchantHistory.get(merchant)!;
        history.amounts.push(Math.abs(txn.amount));
        history.months.add(txnMonth);
      }
    }

    // Aggregate current month by merchant
    const currentMonthByMerchant = new Map<string, { total: number; txns: typeof currentMonthTxns }>();
    for (const txn of currentMonthTxns) {
      if (!currentMonthByMerchant.has(txn.merchant)) {
        currentMonthByMerchant.set(txn.merchant, { total: 0, txns: [] });
      }
      const entry = currentMonthByMerchant.get(txn.merchant)!;
      entry.total += txn.amount;
      entry.txns.push(txn);
    }

    // Detect anomalies
    const anomalies: SpendingAnomaly[] = [];

    for (const [merchant, current] of currentMonthByMerchant) {
      const history = merchantHistory.get(merchant);
      if (!history || history.months.size < 2) continue; // Need at least 2 months of history

      const monthlyAverage = history.amounts.reduce((a, b) => a + b, 0) / history.months.size;
      if (monthlyAverage < 10) continue; // Ignore very small amounts

      const percentageIncrease = (current.total - monthlyAverage) / monthlyAverage;

      if (percentageIncrease > threshold) {
        // Find the largest transaction for this merchant
        const largestTxn = current.txns.reduce((a, b) => a.amount > b.amount ? a : b);
        
        anomalies.push({
          merchant: current.txns[0].merchant,
          currentAmount: current.total,
          averageAmount: monthlyAverage,
          percentageIncrease,
          transactionId: largestTxn.id,
          date: largestTxn.date,
        });
      }
    }

    // Sort by percentage increase descending
    return anomalies.sort((a, b) => b.percentageIncrease - a.percentageIncrease);
  }, [transactions, threshold]);
}
