// Merchant aliases — fixes common bank-feed misreads (e.g. "Movable Feast" is
// actually "Lovable", "AMZN MKTP" is Amazon, etc.). Used by the Cleanup hub.
export interface MerchantAlias {
  pattern: RegExp;
  canonical: string;       // display name to normalize to
  categoryName: string;    // category name (matched case-insensitively, household-scoped)
}

export const MERCHANT_ALIASES: MerchantAlias[] = [
  { pattern: /^movable\s+feast/i,       canonical: 'Lovable', categoryName: 'Lovable' },
  { pattern: /^lovable(\s+dover)?\b/i,  canonical: 'Lovable', categoryName: 'Lovable' },
];

// Transfer-like merchant patterns (Flow 1)
export const TRANSFER_PATTERNS: RegExp[] = [
  /^(to|from)\s+(checking|savings|credit|loan|card)/i,
  /\b(transfer|xfer|zelle to self)\b/i,
];

// Needs-review bucket classifiers (Flow 2)
export const SYSTEM_FEE_PATTERN = /interest credit|ach return|nsf fee|overdraft/i;

// Category-name normalization for duplicate budget merge (Flow 3)
export function normalizeCategoryName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,_/-]/g, ' ')
    .replace(/\bacc\b/g, 'accident')
    .replace(/\bins\b/g, 'insurance')
    .replace(/\bret\b/g, 'retirement')
    .replace(/\bhsa\b/g, 'health savings account')
    .replace(/\s+/g, ' ')
    .trim();
}
