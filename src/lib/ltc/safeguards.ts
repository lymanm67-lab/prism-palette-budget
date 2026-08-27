// ---------------------------------------------------------------------------
// LTC double-count safeguards.
//
// Single source of truth for what may and may not enter household net worth,
// projections and charts. LTC insurance is a RISK TRANSFER, not an asset: the
// only figure that may ever appear in a wealth total is the policy's net
// surrender value, and only under the explicit "Insurance and Contract Values"
// bucket when the household turns the toggle on.
// ---------------------------------------------------------------------------

import { policyYearFor, surrenderValueAtYear, NW } from './nationwide';

export const NET_WORTH_BUCKET = 'Insurance and Contract Values';

/** Buckets the surrender value must never be folded into. */
export const FORBIDDEN_BUCKETS = ['Cash', 'Emergency Fund', 'HSA', 'Retirement Accounts'] as const;

export const DOUBLE_COUNT_RULES = [
  'LTC benefits are not investment assets.',
  'Future LTC benefits are never added to household net worth.',
  'Death benefits are never added to current household net worth.',
  'Surrender value may be shown separately as an insurance contract value.',
  'HSA assets stay separate from insurance benefits.',
  'LTC benefits reduce what the household must withdraw from the HSA or retirement assets during a modeled care event — they are never added on top of those balances.',
] as const;

export interface SurrenderValueToggle {
  /** "Include Insurance Surrender Value in Expanded Net Worth" — default OFF. */
  includeSurrenderValueInNetWorth: boolean;
}

export const DEFAULT_SURRENDER_TOGGLE: SurrenderValueToggle = {
  includeSurrenderValueInNetWorth: false,
};

export interface ContractValue {
  bucket: typeof NET_WORTH_BUCKET;
  policyYear: number;
  surrenderValue: number;
  illustrated: boolean;
  /** Amount actually added to net worth (0 unless the toggle is on). */
  includedInNetWorth: number;
  excluded: { label: string; amount: number; reason: string }[];
  note: string;
}

/**
 * The ONLY sanctioned way to surface Nationwide policy value inside a wealth
 * total. Future LTC benefits and the death benefit are returned as explicitly
 * excluded lines so screens can show *why* they are absent.
 */
export function contractValue(
  toggle: SurrenderValueToggle = DEFAULT_SURRENDER_TOGGLE,
  calendarYear = new Date().getFullYear(),
): ContractValue {
  const policyYear = policyYearFor(calendarYear);
  const { value, illustrated } = surrenderValueAtYear(policyYear);
  return {
    bucket: NET_WORTH_BUCKET,
    policyYear,
    surrenderValue: value,
    illustrated,
    includedInNetWorth: toggle.includeSurrenderValueInNetWorth ? value : 0,
    excluded: [
      {
        label: 'Future LTC benefit pool',
        amount: NW.initialTotalBenefit,
        reason: 'Risk transfer, not an owned asset. Only reduces future withdrawals.',
      },
      {
        label: 'Life insurance death benefit',
        amount: NW.initialSpecifiedAmount,
        reason: 'Payable to beneficiaries at death — not current household net worth.',
      },
      {
        label: 'Guaranteed minimum death benefit',
        amount: NW.guaranteedMinimumDeathBenefit,
        reason: 'Contingent contract value, excluded from current totals.',
      },
    ],
    note: 'Surrender value is reported under Insurance and Contract Values only. It is never added to Cash, Emergency Fund, HSA or Retirement Accounts.',
  };
}

/**
 * Applies LTC insurance to a modeled care event WITHOUT inflating assets:
 * the benefit reduces the withdrawal requirement, it is never added to the
 * portfolio balance.
 */
export function applyBenefitAsWithdrawalOffset(opts: {
  careCost: number;
  insuranceBenefitPaid: number;
  portfolioBalance: number;
}) {
  const offset = Math.max(0, Math.min(opts.insuranceBenefitPaid, opts.careCost));
  const withdrawalRequired = Math.max(0, opts.careCost - offset);
  return {
    withdrawalRequired,
    withdrawalsAvoided: offset,
    // Balance can only fall — never rise — because of an LTC benefit.
    portfolioAfter: Math.max(0, opts.portfolioBalance - withdrawalRequired),
    assetsProtected: Math.min(offset, opts.portfolioBalance),
  };
}
