// Mortgage-specific FICO scores (the models lenders actually pull on a tri-merge).
// Equifax = FICO 5, TransUnion = FICO 4, Experian = FICO 2.
// The qualifying score is the MIDDLE of the three.

export const MORTGAGE_FICO_KEY = 'prism.mortgageFicoScores.v1';

export type MortgageFico = {
  Equifax?: number;      // FICO 5
  TransUnion?: number;   // FICO 4
  Experian?: number;     // FICO 2
  asOf?: string;
  source?: string;
};

// Seeded from the user's myFICO 3-bureau report (7/17/2026).
export const DEFAULT_MORTGAGE_FICO: MortgageFico = {
  Equifax: 673,
  TransUnion: 557,
  Experian: 583,
  asOf: '2026-07-17',
  source: 'myFICO 3-Bureau Report',
};

export const BUREAU_MODEL: Record<string, string> = {
  Equifax: 'FICO 5',
  TransUnion: 'FICO 4',
  Experian: 'FICO 2',
};

export function loadMortgageFico(): MortgageFico {
  try {
    const raw = localStorage.getItem(MORTGAGE_FICO_KEY);
    if (!raw) return DEFAULT_MORTGAGE_FICO;
    return { ...DEFAULT_MORTGAGE_FICO, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_MORTGAGE_FICO;
  }
}

export function saveMortgageFico(s: MortgageFico) {
  try { localStorage.setItem(MORTGAGE_FICO_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

/** Middle score of the three bureaus — what lenders qualify you on. */
export function qualifyingFico(s: MortgageFico): number | null {
  const vals = [s.Equifax, s.TransUnion, s.Experian].filter(
    (v): v is number => typeof v === 'number' && v > 0
  ).sort((a, b) => a - b);
  if (vals.length === 0) return null;
  if (vals.length === 3) return vals[1];
  return vals[0]; // conservative: lowest available
}

/** Loan programs realistically available at a given qualifying score. */
export function eligiblePrograms(score: number): { program: string; ok: boolean; note: string }[] {
  return [
    { program: 'Conventional', ok: score >= 620, note: '620 minimum; best pricing 740+' },
    { program: 'FHA (3.5% down)', ok: score >= 580, note: '580+ for 3.5% down; 500–579 needs 10% down' },
    { program: 'VA', ok: score >= 580, note: 'No official minimum; lender overlays typically 580–620' },
    { program: 'USDA', ok: score >= 640, note: 'Most lenders want 640+ for automated underwriting' },
  ];
}
