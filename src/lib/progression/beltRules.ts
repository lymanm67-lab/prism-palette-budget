/**
 * Martial Arts Progression — belt earning rules.
 * White → Grandmaster (10 belts).
 */

export type Belt =
  | 'white' | 'yellow' | 'orange' | 'green' | 'blue'
  | 'purple' | 'brown' | 'black' | 'master' | 'grandmaster';

export const BELT_ORDER: Belt[] = [
  'white', 'yellow', 'orange', 'green', 'blue',
  'purple', 'brown', 'black', 'master', 'grandmaster',
];

export const BELT_META: Record<Belt, { label: string; color: string; description: string }> = {
  white:       { label: 'White Belt',       color: '#F3F4F6', description: 'Beginning the journey.' },
  yellow:      { label: 'Yellow Belt',      color: '#FCD34D', description: 'Emergency fund started.' },
  orange:      { label: 'Orange Belt',      color: '#FB923C', description: 'Emergency fund at 3 months and high-interest debt gone.' },
  green:       { label: 'Green Belt',       color: '#4ADE80', description: 'Employer match maxed and Roth contributions active.' },
  blue:        { label: 'Blue Belt',        color: '#60A5FA', description: 'Net worth positive and Legacy Worth 400+.' },
  purple:      { label: 'Purple Belt',      color: '#A78BFA', description: 'Financial Independence ≥ 25%.' },
  brown:       { label: 'Brown Belt',       color: '#A16207', description: 'FI ≥ 50% and estate checklist 80%+ complete.' },
  black:       { label: 'Black Belt',       color: '#111827', description: 'Financial Freedom achieved (FI 100%).' },
  master:      { label: 'Master',           color: '#DC2626', description: 'Legacy Worth 800+, trust funded, constitution complete.' },
  grandmaster: { label: 'Grandmaster',      color: '#FACC15', description: '3+ generations supported in 100-year simulator.' },
};

export interface BeltInputs {
  emergencyFundStarted: boolean;
  emergencyMonths: number;
  highInterestDebtZero: boolean;
  employerMatchMaxed: boolean;
  rothActive: boolean;
  netWorth: number;
  legacyWorth: number;
  fiPercentage: number; // 0..1
  estateChecklistPct: number; // 0..1
  trustFunded: boolean;
  constitutionPublished: boolean;
  generationsSupportedInSim: number;
}

export function computeBelt(i: BeltInputs): Belt {
  if (i.generationsSupportedInSim >= 3 && i.legacyWorth >= 800) return 'grandmaster';
  if (i.legacyWorth >= 800 && i.trustFunded && i.constitutionPublished) return 'master';
  if (i.fiPercentage >= 1) return 'black';
  if (i.fiPercentage >= 0.5 && i.estateChecklistPct >= 0.8) return 'brown';
  if (i.fiPercentage >= 0.25) return 'purple';
  if (i.netWorth > 0 && i.legacyWorth >= 400) return 'blue';
  if (i.employerMatchMaxed && i.rothActive) return 'green';
  if (i.emergencyMonths >= 3 && i.highInterestDebtZero) return 'orange';
  if (i.emergencyFundStarted) return 'yellow';
  return 'white';
}

export function nextBeltRequirements(current: Belt, i: BeltInputs): string[] {
  const idx = BELT_ORDER.indexOf(current);
  const next = BELT_ORDER[idx + 1];
  if (!next) return ['You are at the top rank.'];

  const req: string[] = [];
  switch (next) {
    case 'yellow': req.push('Start your emergency fund'); break;
    case 'orange':
      if (i.emergencyMonths < 3) req.push(`Grow emergency fund to 3 months (currently ${i.emergencyMonths.toFixed(1)})`);
      if (!i.highInterestDebtZero) req.push('Pay off all high-interest debt (APR ≥ 8%)');
      break;
    case 'green':
      if (!i.employerMatchMaxed) req.push('Contribute enough to capture full employer match');
      if (!i.rothActive) req.push('Open a Roth account and contribute');
      break;
    case 'blue':
      if (i.netWorth <= 0) req.push('Reach positive net worth');
      if (i.legacyWorth < 400) req.push(`Grow Legacy Worth to 400+ (currently ${Math.round(i.legacyWorth)})`);
      break;
    case 'purple':
      if (i.fiPercentage < 0.25) req.push(`Reach 25% Financial Independence (currently ${(i.fiPercentage * 100).toFixed(0)}%)`);
      break;
    case 'brown':
      if (i.fiPercentage < 0.5) req.push(`Reach 50% Financial Independence (currently ${(i.fiPercentage * 100).toFixed(0)}%)`);
      if (i.estateChecklistPct < 0.8) req.push(`Complete 80% of estate checklist (currently ${(i.estateChecklistPct * 100).toFixed(0)}%)`);
      break;
    case 'black':
      if (i.fiPercentage < 1) req.push(`Reach 100% Financial Independence (currently ${(i.fiPercentage * 100).toFixed(0)}%)`);
      break;
    case 'master':
      if (i.legacyWorth < 800) req.push(`Grow Legacy Worth to 800+ (currently ${Math.round(i.legacyWorth)})`);
      if (!i.trustFunded) req.push('Fund the Family Legacy Trust');
      if (!i.constitutionPublished) req.push('Publish the Family Constitution');
      break;
    case 'grandmaster':
      if (i.generationsSupportedInSim < 3) req.push('Support 3+ generations in the 100-Year Simulator');
      break;
  }
  return req;
}

export const ESTATE_CHECKLIST_ITEMS: Array<{ key: string; label: string; category: string }> = [
  { key: 'will', label: 'Last Will & Testament', category: 'Core' },
  { key: 'revocable_trust', label: 'Revocable Living Trust', category: 'Core' },
  { key: 'poa_financial', label: 'Financial Power of Attorney', category: 'Core' },
  { key: 'poa_healthcare', label: 'Healthcare Power of Attorney', category: 'Core' },
  { key: 'healthcare_directive', label: 'Advance Healthcare Directive', category: 'Core' },
  { key: 'hipaa_release', label: 'HIPAA Release', category: 'Core' },
  { key: 'beneficiary_review', label: 'Beneficiary Review (all accounts)', category: 'Review' },
  { key: 'digital_asset_inventory', label: 'Digital Asset Inventory', category: 'Modern' },
  { key: 'letter_of_intent', label: 'Letter of Intent', category: 'Legacy' },
  { key: 'guardian_designation', label: 'Guardian Designation (minor children)', category: 'Family' },
  { key: 'funeral_wishes', label: 'Funeral & Burial Wishes', category: 'Legacy' },
  { key: 'life_insurance_review', label: 'Life Insurance Review', category: 'Protection' },
  { key: 'ilit', label: 'Irrevocable Life Insurance Trust (ILIT)', category: 'Advanced' },
  { key: 'umbrella_review', label: 'Umbrella Liability Review', category: 'Protection' },
  { key: 'business_succession', label: 'Business Succession Plan', category: 'Business' },
  { key: 'buy_sell_agreement', label: 'Buy-Sell Agreement', category: 'Business' },
  { key: 'family_meeting', label: 'Family Wealth Summit (annual)', category: 'Governance' },
  { key: 'tax_projection', label: 'Multi-Year Tax Projection', category: 'Tax' },
  { key: 'roth_conversion_plan', label: 'Roth Conversion Ladder Plan', category: 'Tax' },
  { key: 'charitable_plan', label: 'Charitable Giving Plan', category: 'Legacy' },
  { key: 'legacy_letter', label: 'Legacy Letter', category: 'Legacy' },
  { key: 'ethical_will', label: 'Ethical Will', category: 'Legacy' },
];
