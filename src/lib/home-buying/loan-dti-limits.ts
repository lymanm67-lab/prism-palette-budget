// Front-end (housing PITI) and back-end (all debt) DTI caps by loan program.
// Front-end = mortgage P&I + property tax + homeowner's insurance (+ HOA/PMI) / gross monthly income.
// Back-end  = front-end + all other monthly debts / gross monthly income.
// Values reflect common guideline maximums; individual lenders may go higher/lower.

export type LoanProgram = 'conventional' | 'fha' | 'va' | 'usda';

export interface DtiLimits {
  program: LoanProgram;
  label: string;
  frontEndPct: number;      // suggested cap (%)
  backEndPct: number;       // suggested cap (%)
  backEndStretchPct: number; // absolute stretch cap (%)
  notes: string;
}

export const LOAN_DTI_LIMITS: Record<LoanProgram, DtiLimits> = {
  conventional: {
    program: 'conventional',
    label: 'Conventional',
    frontEndPct: 28,
    backEndPct: 36,
    backEndStretchPct: 45,
    notes: 'Fannie/Freddie: 36% standard, up to 45–50% with strong credit & reserves.',
  },
  fha: {
    program: 'fha',
    label: 'FHA',
    frontEndPct: 31,
    backEndPct: 43,
    backEndStretchPct: 57,
    notes: 'FHA: 31% front-end / 43% back-end; up to 57% with compensating factors.',
  },
  va: {
    program: 'va',
    label: 'VA',
    frontEndPct: 28,
    backEndPct: 41,
    backEndStretchPct: 60,
    notes: 'VA: 41% guideline plus residual-income test; higher DTI allowed with strong residual.',
  },
  usda: {
    program: 'usda',
    label: 'USDA',
    frontEndPct: 29,
    backEndPct: 41,
    backEndStretchPct: 44,
    notes: 'USDA rural: 29% housing / 41% total; waivers to ~44% with strong credit.',
  },
};

export const LOAN_PROGRAM_OPTIONS: LoanProgram[] = ['conventional', 'fha', 'va', 'usda'];
