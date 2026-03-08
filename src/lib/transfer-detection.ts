// Shared transfer detection patterns and utility

export const TRANSFER_PATTERNS: RegExp[] = [
  /transfer/i, /xfer/i, /zelle/i, /venmo/i, /paypal.*transfer/i,
  /cash\s*app/i, /wire/i, /ach/i, /direct\s*dep/i, /autopay/i,
  /credit\s*card\s*payment/i, /internal/i, /between\s*accounts/i,
  /payment\s*-?\s*thank/i, /online\s*payment/i,
];

export function isTransferMerchant(merchant: string): boolean {
  if (!merchant) return false;
  return TRANSFER_PATTERNS.some(p => p.test(merchant));
}
