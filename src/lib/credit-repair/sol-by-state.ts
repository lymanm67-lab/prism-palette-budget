// Statute of Limitations on debt collection (open/written contracts), years.
// Source: consumer-facing summaries; verify with a licensed attorney for your state.
// Written / Open are typical debt-collection SOLs. When both differ, we use the
// higher applicable value for credit-card / installment debt.

export interface SolEntry {
  state: string;
  code: string;
  written: number;   // written contracts
  open: number;      // open accounts (credit cards etc.)
  note?: string;
}

export const SOL_BY_STATE: SolEntry[] = [
  { state: 'Alabama', code: 'AL', written: 6, open: 3 },
  { state: 'Alaska', code: 'AK', written: 3, open: 3 },
  { state: 'Arizona', code: 'AZ', written: 6, open: 3 },
  { state: 'Arkansas', code: 'AR', written: 5, open: 3 },
  { state: 'California', code: 'CA', written: 4, open: 4 },
  { state: 'Colorado', code: 'CO', written: 6, open: 6 },
  { state: 'Connecticut', code: 'CT', written: 6, open: 6 },
  { state: 'Delaware', code: 'DE', written: 3, open: 3 },
  { state: 'District of Columbia', code: 'DC', written: 3, open: 3 },
  { state: 'Florida', code: 'FL', written: 5, open: 4 },
  { state: 'Georgia', code: 'GA', written: 6, open: 4 },
  { state: 'Hawaii', code: 'HI', written: 6, open: 6 },
  { state: 'Idaho', code: 'ID', written: 5, open: 4 },
  { state: 'Illinois', code: 'IL', written: 10, open: 5 },
  { state: 'Indiana', code: 'IN', written: 10, open: 6 },
  { state: 'Iowa', code: 'IA', written: 10, open: 5 },
  { state: 'Kansas', code: 'KS', written: 5, open: 3 },
  { state: 'Kentucky', code: 'KY', written: 10, open: 5 },
  { state: 'Louisiana', code: 'LA', written: 10, open: 3 },
  { state: 'Maine', code: 'ME', written: 6, open: 6 },
  { state: 'Maryland', code: 'MD', written: 3, open: 3 },
  { state: 'Massachusetts', code: 'MA', written: 6, open: 6 },
  { state: 'Michigan', code: 'MI', written: 6, open: 6 },
  { state: 'Minnesota', code: 'MN', written: 6, open: 6 },
  { state: 'Mississippi', code: 'MS', written: 3, open: 3 },
  { state: 'Missouri', code: 'MO', written: 10, open: 5 },
  { state: 'Montana', code: 'MT', written: 8, open: 5 },
  { state: 'Nebraska', code: 'NE', written: 5, open: 4 },
  { state: 'Nevada', code: 'NV', written: 6, open: 4 },
  { state: 'New Hampshire', code: 'NH', written: 3, open: 3 },
  { state: 'New Jersey', code: 'NJ', written: 6, open: 6 },
  { state: 'New Mexico', code: 'NM', written: 6, open: 4 },
  { state: 'New York', code: 'NY', written: 3, open: 3, note: 'Reduced from 6 to 3 (CPLR 214-i, 2022)' },
  { state: 'North Carolina', code: 'NC', written: 3, open: 3 },
  { state: 'North Dakota', code: 'ND', written: 6, open: 6 },
  { state: 'Ohio', code: 'OH', written: 6, open: 6, note: 'Reduced from 8 to 6 (2021)' },
  { state: 'Oklahoma', code: 'OK', written: 5, open: 3 },
  { state: 'Oregon', code: 'OR', written: 6, open: 6 },
  { state: 'Pennsylvania', code: 'PA', written: 4, open: 4 },
  { state: 'Rhode Island', code: 'RI', written: 10, open: 10 },
  { state: 'South Carolina', code: 'SC', written: 3, open: 3 },
  { state: 'South Dakota', code: 'SD', written: 6, open: 6 },
  { state: 'Tennessee', code: 'TN', written: 6, open: 6 },
  { state: 'Texas', code: 'TX', written: 4, open: 4 },
  { state: 'Utah', code: 'UT', written: 6, open: 4 },
  { state: 'Vermont', code: 'VT', written: 6, open: 6 },
  { state: 'Virginia', code: 'VA', written: 5, open: 3 },
  { state: 'Washington', code: 'WA', written: 6, open: 3 },
  { state: 'West Virginia', code: 'WV', written: 10, open: 5 },
  { state: 'Wisconsin', code: 'WI', written: 6, open: 6 },
  { state: 'Wyoming', code: 'WY', written: 10, open: 8 },
];

export function solYears(stateCode: string, kind: 'written' | 'open' = 'open'): number | null {
  const entry = SOL_BY_STATE.find(s => s.code === stateCode.toUpperCase());
  return entry ? entry[kind] : null;
}

export function solExpiryDate(firstDelinquencyISO: string, years: number): string {
  const d = new Date(firstDelinquencyISO);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}
