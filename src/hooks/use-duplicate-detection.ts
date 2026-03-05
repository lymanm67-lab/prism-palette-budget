import { useMemo } from 'react';
import { useTransactions } from '@/hooks/use-finance-data';

interface TransactionFingerprint {
  date: string;
  amount: number;
  merchant: string;
}

/**
 * Creates a fingerprint key for matching potential duplicates.
 * Matches on date + amount + normalized merchant name.
 */
function makeKey(date: string, amount: number, merchant: string): string {
  const normalizedMerchant = (merchant || '').toLowerCase().trim().replace(/\s+/g, ' ');
  // Round amount to 2 decimal places to avoid floating point issues
  const roundedAmount = Math.round(amount * 100);
  return `${date}|${roundedAmount}|${normalizedMerchant}`;
}

/**
 * Hook that builds a set of existing transaction fingerprints
 * and exposes a function to check if a given transaction is a potential duplicate.
 */
export function useDuplicateDetection() {
  const { data: transactions } = useTransactions();

  const existingKeys = useMemo(() => {
    const keys = new Set<string>();
    if (!transactions) return keys;
    for (const t of transactions) {
      keys.add(makeKey(t.date, t.amount, t.merchant || ''));
    }
    return keys;
  }, [transactions]);

  /**
   * Check if a transaction looks like a duplicate of an existing one.
   */
  const isDuplicate = (date: string, amount: number, merchant: string): boolean => {
    return existingKeys.has(makeKey(date, amount, merchant));
  };

  /**
   * Check a batch of parsed rows and return which indices are potential duplicates.
   * Also detects intra-batch duplicates (same row appearing multiple times in the CSV).
   */
  const findDuplicates = (rows: TransactionFingerprint[]): Set<number> => {
    const dupes = new Set<number>();
    const batchSeen = new Map<string, number>();

    for (let i = 0; i < rows.length; i++) {
      const key = makeKey(rows[i].date, rows[i].amount, rows[i].merchant);

      // Check against existing transactions
      if (existingKeys.has(key)) {
        dupes.add(i);
        continue;
      }

      // Check for intra-batch duplicates
      if (batchSeen.has(key)) {
        dupes.add(i);
      } else {
        batchSeen.set(key, i);
      }
    }

    return dupes;
  };

  return { isDuplicate, findDuplicates };
}
