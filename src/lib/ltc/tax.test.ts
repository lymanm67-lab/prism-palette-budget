import { describe, it, expect } from 'vitest';
import {
  LTC_AGE_LIMITS_2025,
  LTC_PER_DIEM_LIMIT_2025,
  ltcPremiumLimitForAge,
  estimatePremiumDeduction,
  compareHsaVsCash,
  assessBenefitTaxability,
  NW_TAX_DEFAULTS,
  IRS_LIMIT_CITATIONS,
  MUST_CONFIRM_WITH_CPA,
} from './tax';
import { NW } from './nationwide';

describe('IRS age-based eligible premium limits', () => {
  it('maps ages onto the published bands', () => {
    expect(ltcPremiumLimitForAge(38).limit).toBe(480);
    expect(ltcPremiumLimitForAge(45).limit).toBe(900);
    expect(ltcPremiumLimitForAge(59).limit).toBe(1800);
    expect(ltcPremiumLimitForAge(65).limit).toBe(4810);
    expect(ltcPremiumLimitForAge(88).limit).toBe(6020);
  });

  it('has non-overlapping, ascending bands', () => {
    for (let i = 1; i < LTC_AGE_LIMITS_2025.length; i++) {
      expect(LTC_AGE_LIMITS_2025[i].minAge).toBe(LTC_AGE_LIMITS_2025[i - 1].maxAge + 1);
      expect(LTC_AGE_LIMITS_2025[i].limit).toBeGreaterThan(LTC_AGE_LIMITS_2025[i - 1].limit);
    }
  });
});

describe('premium deduction estimator', () => {
  it('returns no deduction when the household takes the standard deduction', () => {
    const r = estimatePremiumDeduction(NW_TAX_DEFAULTS);
    expect(r.path).toBe('none');
    expect(r.deductibleAmount).toBe(0);
    expect(r.estimatedTaxSavings).toBe(0);
  });

  it('caps counted premium at the sum of the age-band limits', () => {
    const r = estimatePremiumDeduction({
      ...NW_TAX_DEFAULTS,
      ages: [59, 57],
      annualPremium: 20_000,
      itemizes: true,
      agi: 50_000,
    });
    expect(r.eligiblePremiumCap).toBe(3600);
    expect(r.countablePremium).toBe(3600);
  });

  it('applies the 7.5% AGI floor on the Schedule A path', () => {
    const r = estimatePremiumDeduction({
      ...NW_TAX_DEFAULTS,
      itemizes: true,
      agi: 40_000,
      otherMedicalExpenses: 6_000,
    });
    expect(r.agiFloor).toBe(3000);
    // full premium is under the $3,600 combined cap
    expect(r.totalMedicalExpenses).toBeCloseTo(NW.annualPremium + 6000, 2);
    expect(r.deductibleAmount).toBeCloseTo(NW.annualPremium + 6000 - 3000, 2);
    expect(r.path).toBe('schedule-a');
  });

  it('skips the AGI floor on the self-employed path', () => {
    const r = estimatePremiumDeduction({
      ...NW_TAX_DEFAULTS,
      selfEmployedHealthPlan: true,
      agi: 400_000,
    });
    expect(r.path).toBe('self-employed');
    expect(r.agiFloor).toBe(0);
    expect(r.deductibleAmount).toBeCloseTo(NW.annualPremium, 2);
  });

  it('never deducts premium already paid with pre-tax HSA dollars', () => {
    const r = estimatePremiumDeduction({
      ...NW_TAX_DEFAULTS,
      itemizes: true,
      agi: 10_000,
      otherMedicalExpenses: 0,
      premiumPaidFromHsa: NW.annualPremium,
    });
    expect(r.hsaExcludedPremium).toBeCloseTo(NW.annualPremium, 2);
    expect(r.countablePremium).toBe(0);
    expect(r.deductibleAmount).toBe(0);
  });
});

describe('HSA vs cash premium funding', () => {
  const base = {
    annualPremium: NW.annualPremium,
    years: 10,
    hsaBalance: 40_000,
    hsaReturnPct: 6,
    marginalRate: 0.22,
    ages: [59, 57],
    agi: 112_000,
    filingStatus: 'mfj' as const,
    otherMedicalExpenses: 4_000,
    itemizes: false,
  };

  it('limits the HSA-eligible premium to the age-based cap', () => {
    const r = compareHsaVsCash(base);
    expect(r.eligiblePremiumPerYear).toBeCloseTo(NW.annualPremium, 2); // under $3,600 cap
    const capped = compareHsaVsCash({ ...base, annualPremium: 12_000 });
    expect(capped.eligiblePremiumPerYear).toBe(3600);
  });

  it('leaves a lower HSA balance on the HSA path and books the forgone growth', () => {
    const r = compareHsaVsCash(base);
    expect(r.hsaPath.hsaEndingBalance).toBeLessThan(r.cashPath.hsaEndingBalance);
    expect(r.hsaPath.forgoneGrowth).toBeGreaterThan(0);
    expect(r.cashPath.forgoneGrowth).toBe(0);
  });

  it('prefers the HSA when no premium deduction is available', () => {
    const r = compareHsaVsCash(base);
    expect(r.cashPath.taxBenefit).toBe(0);
    expect(r.winner).toBe('hsa');
  });
});

describe('benefit taxability', () => {
  const base = {
    monthlyBenefit: 2000,
    monthlyQualifiedCost: 6000,
    chronicallyIllCertified: true,
    planOfCareOnFile: true,
    taxQualifiedContract: true,
  };

  it('excludes the full benefit when costs exceed it', () => {
    const r = assessBenefitTaxability(base);
    expect(r.status).toBe('likely-excluded');
    expect(r.potentiallyTaxable).toBe(0);
  });

  it('uses the per-diem allowance as a floor for the exclusion', () => {
    const r = assessBenefitTaxability({ ...base, monthlyQualifiedCost: 0 });
    expect(r.monthlyPerDiemAllowance).toBe(LTC_PER_DIEM_LIMIT_2025 * 30);
    expect(r.excludableAmount).toBe(LTC_PER_DIEM_LIMIT_2025 * 30);
    expect(r.status).toBe('likely-excluded');
  });

  it('flags the excess above both tests as potentially taxable', () => {
    const r = assessBenefitTaxability({
      ...base,
      monthlyBenefit: 20_000,
      monthlyQualifiedCost: 1_000,
    });
    expect(r.status).toBe('partially-taxable');
    expect(r.potentiallyTaxable).toBe(20_000 - LTC_PER_DIEM_LIMIT_2025 * 30);
  });

  it('demands review when a qualification test fails', () => {
    const r = assessBenefitTaxability({ ...base, chronicallyIllCertified: false });
    expect(r.status).toBe('needs-review');
    expect(r.tests.some((t) => !t.passed)).toBe(true);
  });
});

describe('documentation panel', () => {
  it('cites an authority for every limit', () => {
    for (const c of IRS_LIMIT_CITATIONS) {
      expect(c.authority.length).toBeGreaterThan(3);
      expect(c.detail.length).toBeGreaterThan(10);
    }
    expect(MUST_CONFIRM_WITH_CPA.length).toBeGreaterThanOrEqual(5);
  });
});
