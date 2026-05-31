export interface LoanType {
  id: string;
  name: string;
  shortName: string;
  minDownPct: number;
  minFico: number;
  bestFor: string;
  pros: string[];
  cons: string[];
  notes: string;
  risk: 'low' | 'medium' | 'high';
}

export const LOAN_TYPES: LoanType[] = [
  {
    id: 'conventional',
    name: 'Conventional Loan',
    shortName: 'Conventional',
    minDownPct: 3,
    minFico: 620,
    bestFor: 'Buyers with solid credit and 5–20% down.',
    pros: ['Best rates with 740+ FICO', 'PMI drops off at 20% equity', 'No upfront mortgage insurance'],
    cons: ['PMI required under 20% down', 'Stricter DTI limits (45%)'],
    notes: 'The standard U.S. loan. Backed by Fannie Mae / Freddie Mac.',
    risk: 'low',
  },
  {
    id: 'fha',
    name: 'FHA Loan',
    shortName: 'FHA',
    minDownPct: 3.5,
    minFico: 580,
    bestFor: 'First-time buyers, lower credit, smaller down payment.',
    pros: ['Just 3.5% down with 580+ FICO', 'Flexible DTI (up to 50%)', 'Gift funds allowed'],
    cons: ['MIP for the life of the loan (unless refinanced)', 'Property must meet FHA standards', 'Loan limits by county'],
    notes: 'Insured by the Federal Housing Administration.',
    risk: 'low',
  },
  {
    id: 'va',
    name: 'VA Loan',
    shortName: 'VA',
    minDownPct: 0,
    minFico: 580,
    bestFor: 'Eligible veterans, active duty, and surviving spouses.',
    pros: ['0% down', 'No PMI ever', 'Competitive rates'],
    cons: ['Funding fee (waivable for disabled vets)', 'Eligibility required', 'Primary residence only'],
    notes: 'Guaranteed by the Department of Veterans Affairs.',
    risk: 'low',
  },
  {
    id: 'usda',
    name: 'USDA Loan',
    shortName: 'USDA',
    minDownPct: 0,
    minFico: 640,
    bestFor: 'Rural & some suburban buyers under income limits.',
    pros: ['0% down', 'Low guarantee fee', 'Below-market rates'],
    cons: ['Geographic restrictions (rural areas)', 'Income caps', 'Primary residence only'],
    notes: 'Backed by the U.S. Department of Agriculture.',
    risk: 'low',
  },
  {
    id: 'jumbo',
    name: 'Jumbo Loan',
    shortName: 'Jumbo',
    minDownPct: 10,
    minFico: 700,
    bestFor: 'High-cost areas; loan exceeds conforming limits.',
    pros: ['Larger loan amounts', 'Often no PMI with 20% down'],
    cons: ['Stricter credit and reserves', 'Higher rates'],
    notes: 'For loans above the conforming limit (~$766k, more in high-cost counties).',
    risk: 'medium',
  },
  {
    id: 'owner-financed',
    name: 'Owner Financing',
    shortName: 'Owner-Financed',
    minDownPct: 10,
    minFico: 0,
    bestFor: 'Buyers who can\'t qualify for a traditional mortgage.',
    pros: ['Flexible terms negotiated with seller', 'No bank approval', 'Faster close'],
    cons: ['Often higher interest rate', 'Balloon payment common', 'Seller can foreclose quickly', 'Title issues possible'],
    notes: 'Seller acts as the lender. Always use an attorney and record the deed.',
    risk: 'high',
  },
  {
    id: 'land-contract',
    name: 'Land Contract',
    shortName: 'Land Contract',
    minDownPct: 5,
    minFico: 0,
    bestFor: 'Buyers willing to wait for the deed in exchange for easier entry.',
    pros: ['Low entry barrier', 'Negotiable terms'],
    cons: ['Seller holds title until paid in full', 'Few legal protections in many states', 'You can lose all payments on default'],
    notes: 'Risky in most states. Have an attorney review.',
    risk: 'high',
  },
  {
    id: 'rent-to-own',
    name: 'Rent-to-Own',
    shortName: 'Rent-to-Own',
    minDownPct: 1,
    minFico: 0,
    bestFor: 'Buyers improving credit who want to lock in a future price.',
    pros: ['Time to build credit/savings', 'Locked purchase price', 'Rent credits toward down payment'],
    cons: ['Above-market rent', 'Non-refundable option fee', 'Forfeit everything if you don\'t buy', 'Scam-prone'],
    notes: 'Read every line. Make sure rent credits are documented.',
    risk: 'high',
  },
];
