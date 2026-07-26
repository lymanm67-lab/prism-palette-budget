/**
 * Liabilities can exist both as an `accounts` row (account_type credit/loan)
 * and as a `debt_items` row in a payoff plan. Counting both double-charges
 * net worth (e.g. Student Loans 107k + Nelnet- Student Loan 107k).
 * This matches debt_items against account liabilities by significant tokens.
 */
const GENERIC = new Set([
  'loan', 'loans', 'loann', 'card', 'cards', 'credit', 'bank', 'the', 'and',
  'company', 'llc', 'inc', 'account', 'debt', 'line', 'payment', 'plan', 'co',
]);

function tokens(name: string): Set<string> {
  return new Set(
    String(name || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 3 && !GENERIC.has(t) && !/^\d+$/.test(t))
  );
}

/**
 * Returns a filter predicate: true when the debt item is NOT already
 * represented by one of the given account-liability names.
 */
export function makeDebtDeduper(accountLiabilityNames: string[]) {
  const accountTokenSets = accountLiabilityNames.map(tokens);
  return (debtName: string) => {
    const t = tokens(debtName);
    if (t.size === 0) return true;
    return !accountTokenSets.some((acc) => {
      for (const tok of t) if (acc.has(tok)) return true;
      return false;
    });
  };
}
