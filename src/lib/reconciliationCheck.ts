/**
 * Pre-export reconciliation check.
 *
 * Scans a month of transactions for the three classification mistakes that
 * silently corrupt printed budget and spending reports:
 *
 *   1. income booked as spending (positive amount sitting in an expense category)
 *   2. spending booked as income (negative amount sitting in an income category)
 *   3. internal money movement not flagged as a transfer (double counting)
 *
 * Every finding carries a concrete, one-click fix so the numbers are corrected
 * before the report is printed or exported.
 */

export type FixKind =
  | 'mark_transfer'
  | 'unmark_transfer'
  | 'recategorize_income'
  | 'review_only';

export interface RecTxn {
  id: string;
  date: string;
  merchant: string | null;
  description?: string | null;
  amount: number;
  is_transfer: boolean | null;
  account_id?: string | null;
  category_id: string | null;
  categoryName?: string | null;
  groupName?: string | null;
  budgetType?: string | null;
}

export interface RecFinding {
  id: string;
  txnId: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  suggestion: string;
  fix: FixKind;
  txn: RecTxn;
  /** Extra transaction implicated by the finding (transfer pairs). */
  pairedTxnId?: string;
}

const TRANSFER_HINTS = [
  'transfer',
  'xfer',
  'to savings',
  'from savings',
  'online banking transfer',
  'internal transfer',
  'payment thank you',
  'autopay payment',
  'card payment',
  'move money',
  'zelle to self',
];

const REFUND_HINTS = ['refund', 'reversal', 'return', 'credit adj', 'chargeback', 'rebate'];

const isIncomeGroup = (g?: string | null) => /income|salary|payroll|revenue|consult/i.test(g || '');
const isDeductionGroup = (g?: string | null) => /pre[\s-]?tax|deduction|withhold/i.test(g || '');

const label = (t: RecTxn) => t.merchant || t.description || 'Untitled transaction';
const norm = (t: RecTxn) => `${t.merchant ?? ''} ${t.description ?? ''}`.toLowerCase();

export function runReconciliationCheck(txns: RecTxn[]): RecFinding[] {
  const findings: RecFinding[] = [];
  const seen = new Set<string>();

  const push = (f: RecFinding) => {
    if (seen.has(f.txnId)) return;
    seen.add(f.txnId);
    findings.push(f);
  };

  // 1. Transfer pairs: equal and opposite amounts within 4 days, neither flagged.
  const unflagged = txns.filter((t) => !t.is_transfer);
  const byAbs = new Map<string, RecTxn[]>();
  for (const t of unflagged) {
    const key = Math.abs(Number(t.amount) || 0).toFixed(2);
    byAbs.set(key, [...(byAbs.get(key) ?? []), t]);
  }
  const pairedIds = new Set<string>();
  for (const [, group] of byAbs) {
    const outs = group.filter((t) => Number(t.amount) < 0);
    const ins = group.filter((t) => Number(t.amount) > 0);
    for (const out of outs) {
      const match = ins.find((i) => {
        if (pairedIds.has(i.id) || pairedIds.has(out.id)) return false;
        if (i.account_id && out.account_id && i.account_id === out.account_id) return false;
        const days =
          Math.abs(new Date(i.date).getTime() - new Date(out.date).getTime()) / 86_400_000;
        return days <= 4;
      });
      if (!match) continue;
      pairedIds.add(match.id);
      pairedIds.add(out.id);
      push({
        id: `pair-${out.id}`,
        txnId: out.id,
        pairedTxnId: match.id,
        severity: 'high',
        title: 'Possible internal transfer counted twice',
        detail: `${label(out)} (${out.date}) is mirrored by ${label(match)} (${match.date}) for the same amount in a different account.`,
        suggestion: 'Flag both sides as a transfer so the money is not counted as income and spending.',
        fix: 'mark_transfer',
        txn: out,
      });
    }
  }

  for (const t of txns) {
    const amount = Number(t.amount) || 0;
    const text = norm(t);

    // 2. Transfer wording but still counted in spending/income.
    if (!t.is_transfer && TRANSFER_HINTS.some((h) => text.includes(h))) {
      push({
        id: `hint-${t.id}`,
        txnId: t.id,
        severity: 'high',
        title: 'Looks like a transfer but counts as spending',
        detail: `${label(t)} (${t.date}) reads like money moved between your own accounts.`,
        suggestion: 'Mark as transfer to remove it from spending totals.',
        fix: 'mark_transfer',
        txn: t,
      });
      continue;
    }

    // 3. Positive amount in an expense category = income or refund misfiled.
    if (amount > 0 && !t.is_transfer && !isIncomeGroup(t.groupName)) {
      const refundish = REFUND_HINTS.some((h) => text.includes(h));
      // Uncategorized rows carry no signal about intent, so never auto-rewrite them.
      const uncategorized = !t.category_id || !t.groupName;
      push({
        id: `pos-${t.id}`,
        txnId: t.id,
        severity: refundish || uncategorized ? 'low' : 'medium',
        title: refundish
          ? 'Refund sitting in a spending category'
          : uncategorized
            ? 'Deposit with no category'
            : 'Income filed as spending',
        detail: `${label(t)} (${t.date}) is a deposit of ${amount.toFixed(2)} but sits in ${t.categoryName ?? 'an expense category'}${t.groupName ? ` (${t.groupName})` : ''}.`,
        suggestion: refundish
          ? 'Keep the category so the refund offsets that category, or mark it as a transfer if it was a reimbursement between your accounts.'
          : uncategorized
            ? 'Review it and pick an income, refund or transfer category — it is not safe to reclassify automatically.'
            : 'Move it to an income category so it stops reducing your reported spending.',
        fix: refundish || uncategorized ? 'review_only' : 'recategorize_income',
        txn: t,
      });
      continue;
    }


    // 4. Negative amount in an income category = expense misfiled as income.
    if (amount < 0 && !t.is_transfer && isIncomeGroup(t.groupName) && !isDeductionGroup(t.groupName)) {
      push({
        id: `neg-${t.id}`,
        txnId: t.id,
        severity: 'high',
        title: 'Spending filed under income',
        detail: `${label(t)} (${t.date}) is a withdrawal of ${Math.abs(amount).toFixed(2)} but sits in the income group ${t.groupName}.`,
        suggestion: 'Recategorize to the matching expense category, or mark as transfer if it was a paycheck routed to another account.',
        fix: 'review_only',
        txn: t,
      });
      continue;
    }

    // 5. Real income flagged as a transfer = income understated.
    if (t.is_transfer && amount > 0 && isIncomeGroup(t.groupName) && !isDeductionGroup(t.groupName)) {
      push({
        id: `flag-${t.id}`,
        txnId: t.id,
        severity: 'medium',
        title: 'Income hidden by a transfer flag',
        detail: `${label(t)} (${t.date}) is in ${t.groupName} but flagged as a transfer, so it is missing from income totals.`,
        suggestion: 'Remove the transfer flag so it counts as income.',
        fix: 'unmark_transfer',
        txn: t,
      });
    }
  }

  const rank = { high: 0, medium: 1, low: 2 } as const;
  return findings.sort((a, b) => rank[a.severity] - rank[b.severity] || a.txn.date.localeCompare(b.txn.date));
}

export const isAutoFixable = (f: RecFinding) => f.fix !== 'review_only';
