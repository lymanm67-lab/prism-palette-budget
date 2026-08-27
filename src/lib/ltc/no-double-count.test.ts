import { describe, it, expect } from 'vitest';
import {
  contractValue,
  applyBenefitAsWithdrawalOffset,
  FORBIDDEN_BUCKETS,
  NET_WORTH_BUCKET,
  DOUBLE_COUNT_RULES,
} from './safeguards';
import {
  NW,
  nwBenefitLadder,
  runStressTest,
  DEFAULT_STRESS,
  sharedPool,
  POOL_SCENARIO_LABEL,
  surrenderValueAtYear,
  NW_SURRENDER_VALUES,
  STRESS_CLAIM_AGES,
  type PoolScenario,
} from './nationwide';

/* ------------------------------------------------------------------------ */
/* Contract value: only surrender value may ever touch net worth            */
/* ------------------------------------------------------------------------ */

describe('contract value safeguards', () => {
  it('adds nothing to net worth while the toggle is off', () => {
    const cv = contractValue({ includeSurrenderValueInNetWorth: false }, 2031);
    expect(cv.includedInNetWorth).toBe(0);
    expect(cv.surrenderValue).toBeGreaterThan(0);
  });

  it('adds only the surrender value when the toggle is on', () => {
    const cv = contractValue({ includeSurrenderValueInNetWorth: true }, 2031);
    expect(cv.includedInNetWorth).toBe(cv.surrenderValue);
    expect(cv.includedInNetWorth).toBeLessThan(NW.initialSpecifiedAmount);
    expect(cv.includedInNetWorth).toBeLessThan(NW.initialTotalBenefit);
  });

  it('reports the LTC pool and death benefits as explicitly excluded', () => {
    const cv = contractValue({ includeSurrenderValueInNetWorth: true });
    const labels = cv.excluded.map((e) => e.label);
    expect(labels).toContain('Future LTC benefit pool');
    expect(labels).toContain('Life insurance death benefit');
    expect(labels).toContain('Guaranteed minimum death benefit');
    for (const e of cv.excluded) expect(e.reason.length).toBeGreaterThan(10);
  });

  it('only ever uses the insurance bucket, never a liquid-asset bucket', () => {
    const cv = contractValue({ includeSurrenderValueInNetWorth: true });
    expect(cv.bucket).toBe(NET_WORTH_BUCKET);
    expect(FORBIDDEN_BUCKETS).not.toContain(cv.bucket as never);
  });

  it('never lets the included amount exceed the illustrated surrender value for that year', () => {
    for (let year = 1; year <= 40; year++) {
      const cy = 2026 + year - 1;
      const cv = contractValue({ includeSurrenderValueInNetWorth: true }, cy);
      expect(cv.includedInNetWorth).toBeLessThanOrEqual(surrenderValueAtYear(year).value + 0.01);
    }
  });
});

/* ------------------------------------------------------------------------ */
/* Benefits reduce withdrawals — they never inflate a portfolio             */
/* ------------------------------------------------------------------------ */

describe('benefit-as-withdrawal-offset', () => {
  it('can only lower a portfolio balance', () => {
    const r = applyBenefitAsWithdrawalOffset({
      careCost: 90_000,
      insuranceBenefitPaid: 72_000,
      portfolioBalance: 181_505,
    });
    expect(r.portfolioAfter).toBeLessThanOrEqual(181_505);
    expect(r.withdrawalRequired).toBe(18_000);
    expect(r.withdrawalsAvoided).toBe(72_000);
  });

  it('never credits benefits beyond the actual care cost', () => {
    const r = applyBenefitAsWithdrawalOffset({
      careCost: 10_000,
      insuranceBenefitPaid: 500_000,
      portfolioBalance: 50_000,
    });
    expect(r.withdrawalsAvoided).toBe(10_000);
    expect(r.withdrawalRequired).toBe(0);
    // Excess benefit is never added to the portfolio — the balance is untouched.
    expect(r.portfolioAfter).toBe(50_000);
  });

  it('holds across a grid of care costs and benefits', () => {
    for (const careCost of [0, 5_000, 60_000, 400_000]) {
      for (const benefit of [0, 25_000, 155_245, 334_800]) {
        const r = applyBenefitAsWithdrawalOffset({ careCost, insuranceBenefitPaid: benefit, portfolioBalance: 100_000 });
        expect(r.portfolioAfter).toBeLessThanOrEqual(100_000);
        expect(r.withdrawalsAvoided).toBeLessThanOrEqual(careCost);
      }
    }
  });
});

/* ------------------------------------------------------------------------ */
/* Projection paths and chart datasets                                     */
/* ------------------------------------------------------------------------ */

describe('projection datasets never double-count', () => {
  it('benefit ladder keeps monthly and total benefit internally consistent', () => {
    const rows = nwBenefitLadder();
    for (const r of rows) {
      expect(r.monthlyBenefit).toBeGreaterThan(0);
      expect(r.totalBenefit).toBeGreaterThanOrEqual(r.monthlyBenefit);
      // The shared pool is never inflated beyond 72 full payments per insured
      // for the two insureds on the contract.
      expect(r.totalBenefit).toBeLessThanOrEqual(r.monthlyBenefit * NW.maxFullPayments * 2 + 1);
    }
  });


  it('shared pool usage never exceeds the pool for any scenario', () => {
    const scenarios = Object.keys(POOL_SCENARIO_LABEL) as PoolScenario[];
    for (const s of scenarios) {
      for (const age of [59, 70, 85, 95]) {
        const r = sharedPool(s, age);
        const used = (r as any).lyman?.used ?? 0;
        const used2 = (r as any).kateri?.used ?? 0;
        const pool = (r as any).poolTotal ?? (r as any).total ?? 0;
        if (pool > 0) expect(used + used2).toBeLessThanOrEqual(pool + 1);
      }
    }
  });

  it('stress test never pays insurance beyond the pool or the care cost', () => {
    for (const claimAge of STRESS_CLAIM_AGES) {
      for (const careYears of [1, 3, 6]) {
        const r = runStressTest({ ...DEFAULT_STRESS, claimAge, careYears, hsaBalance: 12_000 });
        expect(r.insurancePaid).toBeLessThanOrEqual(r.poolAtClaim + 1);
        expect(r.insurancePaid).toBeLessThanOrEqual(r.totalCareCost + 1);
        expect(r.totalGap).toBeCloseTo(Math.max(0, r.totalCareCost - r.insurancePaid), 2);
        // Assets protected is exactly what insurance paid — never grossed up.
        expect(r.portfolioAssetsProtected).toBe(r.insurancePaid);
      }
    }
  });

  it('stress waterfall layers sum to the gap and never exceed available assets', () => {
    const r = runStressTest({ ...DEFAULT_STRESS, hsaBalance: 20_000 });
    const funded = r.layers.filter((l) => l.key !== 'insurance').reduce((s, l) => s + l.applied, 0);
    expect(funded + r.uncoveredGap).toBeCloseTo(r.totalGap, 2);
    const hsa = r.layers.find((l) => l.key === 'hsa')!;
    expect(hsa.applied).toBeLessThanOrEqual(r.hsaAtClaim + 0.01);
    const retirement = r.layers.find((l) => l.key === 'retirement')!;
    expect(retirement.applied).toBeLessThanOrEqual(r.inputs.retirementAssets);
  });

  it('death benefit and surrender value never appear in the same total', () => {
    const cv = contractValue({ includeSurrenderValueInNetWorth: true });
    const deathLines = cv.excluded.filter((e) => /death/i.test(e.label));
    expect(deathLines.length).toBe(2);
    const total = cv.includedInNetWorth;
    expect(total).toBe(cv.surrenderValue);
    expect(total).not.toBe(cv.surrenderValue + deathLines[0].amount);
  });
});

/* ------------------------------------------------------------------------ */
/* Snapshots — lock the numbers so silent drift fails CI                    */
/* ------------------------------------------------------------------------ */

describe('snapshots', () => {
  it('surrender value ladder', () => {
    expect(NW_SURRENDER_VALUES).toMatchSnapshot();
  });

  it('benefit ladder', () => {
    expect(nwBenefitLadder()).toMatchSnapshot();
  });

  it('contract value with the toggle off', () => {
    expect(contractValue({ includeSurrenderValueInNetWorth: false }, 2026)).toMatchSnapshot();
  });

  it('contract value with the toggle on', () => {
    expect(contractValue({ includeSurrenderValueInNetWorth: true }, 2036)).toMatchSnapshot();
  });

  it('default stress test result', () => {
    expect(runStressTest(DEFAULT_STRESS)).toMatchSnapshot();
  });

  it('double-count rules of record', () => {
    expect(DOUBLE_COUNT_RULES).toMatchSnapshot();
  });
});
