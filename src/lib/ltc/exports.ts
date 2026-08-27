// ---------------------------------------------------------------------------
// LTC export datasets — pure builders shared by CSV and PDF export.
//
// Every dataset here obeys the double-count safeguards: LTC benefit pools and
// death benefits are reported as coverage figures, never as assets, and the
// only asset line that can appear is the policy's net surrender value.
// ---------------------------------------------------------------------------

import {
  NW,
  NW_CARRIER,
  NW_PRODUCT,
  NW_SURRENDER_VALUES,
  nwBenefitLadder,
  runStressTest,
  DEFAULT_STRESS,
  STRESS_CLAIM_AGES,
  type StressInputs,
} from './nationwide';
import { contractValue } from './safeguards';
import {
  estimatePremiumDeduction,
  compareHsaVsCash,
  assessBenefitTaxability,
  NW_TAX_DEFAULTS,
  LTC_AGE_LIMITS_2025,
  type PremiumDeductionInputs,
  type HsaFundingInputs,
  type BenefitTaxInputs,
} from './tax';

export interface ExportTable {
  key: string;
  title: string;
  headers: string[];
  rows: (string | number)[][];
}

const n2 = (n: number) => Math.round(n * 100) / 100;

export function policySummaryTable(): ExportTable {
  return {
    key: 'policy',
    title: 'Nationwide CareMatters Together — Plan of Record',
    headers: ['Item', 'Value'],
    rows: [
      ['Carrier', NW_CARRIER],
      ['Product', NW_PRODUCT],
      ['Combined monthly premium', n2(NW.monthlyPremium)],
      ['Annual premium', n2(NW.annualPremium)],
      ['Initial monthly benefit (each insured)', NW.monthlyBenefitEach],
      ['Maximum full monthly payments', NW.maxFullPayments],
      ['Initial total LTC benefit (shared pool)', NW.initialTotalBenefit],
      ['Inflation protection', `${NW.inflationPct}% compound for life`],
      ['Elimination period', `${NW.eliminationDays} days`],
      ['Initial specified amount (death benefit)', NW.initialSpecifiedAmount],
      ['Guaranteed minimum death benefit', NW.guaranteedMinimumDeathBenefit],
    ],
  };
}

export function benefitLadderTable(): ExportTable {
  return {
    key: 'benefit-ladder',
    title: 'Inflation-Protected Benefit Ladder',
    headers: ['Older insured age', 'Monthly benefit (each)', 'Total LTC benefits', 'Source'],
    rows: nwBenefitLadder().map((r) => [
      r.age,
      Math.round(r.monthlyBenefit),
      Math.round(r.totalBenefit),
      r.label,
    ]),
  };
}

export function surrenderValueTable(): ExportTable {
  const cv = contractValue({ includeSurrenderValueInNetWorth: true });
  return {
    key: 'surrender',
    title: 'Illustrated Net Surrender Value (Insurance and Contract Values bucket only)',
    headers: ['Policy year', 'Net surrender value'],
    rows: [
      ...NW_SURRENDER_VALUES.map((p) => [p.year, p.value] as (string | number)[]),
      ['Excluded from net worth', cv.excluded.map((e) => e.label).join('; ')],
    ],
  };
}

export function stressTestTable(inputs: StressInputs = DEFAULT_STRESS): ExportTable {
  const r = runStressTest(inputs);
  return {
    key: 'stress',
    title: `Stress Test — claim at age ${inputs.claimAge}, ${inputs.careYears} years at $${inputs.monthlyCareCost}/mo`,
    headers: ['Line', 'Amount'],
    rows: [
      ['Total care cost', n2(r.totalCareCost)],
      ['Monthly benefit at claim', n2(r.monthlyBenefit)],
      ['Coverage of monthly cost (%)', n2(r.coveragePct)],
      ['Shared pool at claim', n2(r.poolAtClaim)],
      ['Insurance paid (cash indemnity)', n2(r.insurancePaid)],
      ['Elimination-period cost', n2(r.eliminationCost)],
      ['Retroactive first payment', n2(r.retroactiveFirstPayment)],
      ['Total gap after insurance', n2(r.totalGap)],
      ...r.layers
        .filter((l) => l.key !== 'insurance')
        .map((l) => [`Funded by ${l.label}`, n2(l.applied)] as (string | number)[]),
      ['Uncovered gap', n2(r.uncoveredGap)],
      ['Portfolio assets protected (equals insurance paid)', n2(r.portfolioAssetsProtected)],
    ],
  };
}

export function stressGridTable(base: StressInputs = DEFAULT_STRESS): ExportTable {
  const rows: (string | number)[][] = [];
  for (const claimAge of STRESS_CLAIM_AGES) {
    for (const careYears of [1, 2, 3, 4, 5, 6]) {
      const r = runStressTest({ ...base, claimAge, careYears });
      rows.push([
        claimAge,
        careYears,
        n2(r.totalCareCost),
        n2(r.insurancePaid),
        n2(r.totalGap),
        n2(r.uncoveredGap),
        n2(r.coveragePct),
      ]);
    }
  }
  return {
    key: 'stress-grid',
    title: 'Stress Test Grid — claim age by care duration',
    headers: [
      'Claim age',
      'Care years',
      'Total care cost',
      'Insurance paid',
      'Gap after insurance',
      'Uncovered gap',
      'Monthly coverage (%)',
    ],
    rows,
  };
}

export function taxTables(opts?: {
  deduction?: PremiumDeductionInputs;
  hsa?: HsaFundingInputs;
  benefit?: BenefitTaxInputs;
}): ExportTable[] {
  const dIn = opts?.deduction ?? NW_TAX_DEFAULTS;
  const d = estimatePremiumDeduction(dIn);

  const hsaIn: HsaFundingInputs =
    opts?.hsa ?? {
      annualPremium: NW.annualPremium,
      years: 10,
      hsaBalance: 12_000,
      hsaReturnPct: 6,
      marginalRate: dIn.marginalRate,
      ages: dIn.ages,
      agi: dIn.agi,
      filingStatus: dIn.filingStatus,
      otherMedicalExpenses: dIn.otherMedicalExpenses,
      itemizes: dIn.itemizes,
    };
  const h = compareHsaVsCash(hsaIn);

  const bIn: BenefitTaxInputs =
    opts?.benefit ?? {
      monthlyBenefit: NW.monthlyBenefitEach,
      monthlyQualifiedCost: 2_100,
      daysInMonth: 30,
      chronicallyIllCertified: true,
      planOfCareOnFile: true,
      taxQualifiedContract: true,
    };
  const b = assessBenefitTaxability(bIn);

  return [
    {
      key: 'tax-deduction',
      title: 'Premium Deduction Estimate',
      headers: ['Item', 'Value'],
      rows: [
        ['Filing status', dIn.filingStatus],
        ['AGI', n2(dIn.agi)],
        ['Annual premium', n2(dIn.annualPremium)],
        ['IRS eligible premium cap', n2(d.eligiblePremiumCap)],
        ['Countable premium', n2(d.countablePremium)],
        ['Premium paid from HSA (never deducted)', n2(d.hsaExcludedPremium)],
        ['7.5% AGI floor', n2(d.agiFloor)],
        ['Total qualified medical expenses', n2(d.totalMedicalExpenses)],
        ['Estimated deduction', n2(d.deductibleAmount)],
        ['Estimated tax savings', n2(d.estimatedTaxSavings)],
        ['Deduction path', d.path],
        ...d.perInsured.map((p) => [`Age ${p.age} (${p.band}) counted premium`, n2(p.counted)] as (string | number)[]),
      ],
    },
    {
      key: 'tax-hsa',
      title: 'HSA vs Cash Premium Funding',
      headers: ['Item', 'HSA path', 'Cash path'],
      rows: [
        ['After-tax outlay (future value)', n2(h.hsaPath.afterTaxCost), n2(h.cashPath.afterTaxCost)],
        ['HSA balance at end of horizon', n2(h.hsaPath.hsaEndingBalance), n2(h.cashPath.hsaEndingBalance)],
        ['Tax benefit captured', n2(h.hsaPath.taxBenefit), n2(h.cashPath.taxBenefit)],
        ['Tax-free growth given up', n2(h.hsaPath.forgoneGrowth), n2(h.cashPath.forgoneGrowth)],
        ['HSA-eligible premium per year', n2(h.eligiblePremiumPerYear), ''],
        ['Winner', h.winner, ''],
        ['Advantage of HSA path', n2(h.advantageHsa), ''],
      ],
    },
    {
      key: 'tax-benefit',
      title: 'Benefit Taxability Assessment',
      headers: ['Item', 'Value'],
      rows: [
        ['Monthly benefit elected', n2(bIn.monthlyBenefit)],
        ['Monthly qualified care cost', n2(bIn.monthlyQualifiedCost)],
        ['Per-diem limit (per day)', n2(b.perDiemLimit)],
        ['Monthly per-diem allowance', n2(b.monthlyPerDiemAllowance)],
        ['Excludable amount', n2(b.excludableAmount)],
        ['Potentially taxable', n2(b.potentiallyTaxable)],
        ['Status', b.status],
        ...b.tests.map((t) => [t.label, t.passed ? 'Met' : 'Unmet'] as (string | number)[]),
      ],
    },
    {
      key: 'tax-limits',
      title: 'IRS Age-Based Eligible Premium Limits',
      headers: ['Attained age at year end', 'Eligible premium'],
      rows: LTC_AGE_LIMITS_2025.map((b2) => [b2.label, b2.limit]),
    },
  ];
}

/** Full export set used by both the CSV and PDF exporters. */
export function allLtcExportTables(opts?: {
  stress?: StressInputs;
  deduction?: PremiumDeductionInputs;
  hsa?: HsaFundingInputs;
  benefit?: BenefitTaxInputs;
}): ExportTable[] {
  return [
    policySummaryTable(),
    benefitLadderTable(),
    surrenderValueTable(),
    stressTestTable(opts?.stress),
    stressGridTable(opts?.stress),
    ...taxTables(opts),
  ];
}

/** Flattens every table into a single CSV-safe sheet with section headers. */
export function tablesToCsvRows(tables: ExportTable[]): { headers: string[]; rows: (string | number)[][] } {
  const width = Math.max(...tables.map((t) => t.headers.length));
  const pad = (r: (string | number)[]) => [...r, ...Array(Math.max(0, width - r.length)).fill('')];
  const rows: (string | number)[][] = [];
  tables.forEach((t, idx) => {
    if (idx > 0) rows.push(pad(['']));
    rows.push(pad([t.title]));
    rows.push(pad(t.headers));
    t.rows.forEach((r) => rows.push(pad(r)));
  });
  return { headers: pad(['Nationwide CareMatters Together — LTC Projections & Stress Tests']), rows };
}
