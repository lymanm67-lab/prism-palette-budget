// SwingEdge Analyzer — position sizing and risk math.
// Pure functions. These numbers govern the Phase 3 acceptance gate.

export interface RiskInputs {
  tradingCapital: number;
  riskPerTradePct: number;
  entry: number;
  stop: number;
  target: number;
}

export interface RiskResult {
  riskDollars: number;
  riskPerShare: number;
  shares: number;
  positionValue: number;
  maxPlannedLoss: number;
  potentialGain: number;
  rewardRisk: number;
  valid: boolean;
  problems: string[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Long-only sizing. Shares are floored so the planned loss can never exceed the
 * risk budget.
 *
 * Reference case: $5,000 account, 1% risk, entry 44.50, stop 42.50, target 48.50
 * -> risk $50, risk/share $2, 25 shares, position $1,112.50, max loss $50,
 * potential gain $100, reward:risk 2.
 */
export function calculatePosition(input: RiskInputs): RiskResult {
  const problems: string[] = [];
  const { tradingCapital, riskPerTradePct, entry, stop, target } = input;

  if (!(tradingCapital > 0)) problems.push('Trading capital must be greater than zero.');
  if (!(riskPerTradePct > 0)) problems.push('Risk per trade must be greater than zero.');
  if (!(entry > 0)) problems.push('Entry price must be greater than zero.');
  if (!(stop > 0)) problems.push('Stop price must be greater than zero.');
  if (stop >= entry) problems.push('For a long trade the stop must sit below the entry.');
  if (target <= entry) problems.push('For a long trade the target must sit above the entry.');

  const riskDollars = round2((tradingCapital * riskPerTradePct) / 100);
  const riskPerShare = round2(entry - stop);

  if (problems.length || riskPerShare <= 0) {
    return {
      riskDollars,
      riskPerShare: Math.max(0, riskPerShare),
      shares: 0,
      positionValue: 0,
      maxPlannedLoss: 0,
      potentialGain: 0,
      rewardRisk: 0,
      valid: false,
      problems,
    };
  }

  const shares = Math.floor(riskDollars / riskPerShare);
  const positionValue = round2(shares * entry);
  const maxPlannedLoss = round2(shares * riskPerShare);
  const potentialGain = round2(shares * (target - entry));
  const rewardRisk = round2((target - entry) / riskPerShare);

  if (shares < 1) problems.push('Risk budget is too small for even one share at this stop distance.');

  return {
    riskDollars,
    riskPerShare,
    shares,
    positionValue,
    maxPlannedLoss,
    potentialGain,
    rewardRisk,
    valid: shares >= 1,
    problems,
  };
}

export interface PortfolioRiskInputs {
  tradingCapital: number;
  maxPortfolioRiskPct: number;
  openRisk: number;
}

export interface PortfolioRiskResult {
  maxPortfolioRisk: number;
  openRisk: number;
  riskRemaining: number;
  overLimit: boolean;
}

export function portfolioRisk(input: PortfolioRiskInputs): PortfolioRiskResult {
  const maxPortfolioRisk = round2((input.tradingCapital * input.maxPortfolioRiskPct) / 100);
  const openRisk = round2(input.openRisk);
  const riskRemaining = round2(maxPortfolioRisk - openRisk);
  return { maxPortfolioRisk, openRisk, riskRemaining, overLimit: riskRemaining < 0 };
}

/** Estimated levels for scanner rows. Clearly an estimate, never a plan. */
export interface EstimatedLevels {
  estimatedEntry: number;
  estimatedStop: number;
  estimatedTarget: number;
  projectedRewardRisk: number;
}

export function estimateLevels(
  price: number,
  atrValue: number | null,
  support: number | null,
): EstimatedLevels | null {
  if (!(price > 0)) return null;
  const a = atrValue && atrValue > 0 ? atrValue : price * 0.02;
  const stopFromAtr = price - a * 1.5;
  const stopFromSupport = support && support < price ? support - a * 0.25 : stopFromAtr;
  const estimatedStop = round2(Math.min(stopFromAtr, stopFromSupport));
  const risk = price - estimatedStop;
  if (risk <= 0) return null;
  return {
    estimatedEntry: round2(price),
    estimatedStop,
    estimatedTarget: round2(price + risk * 2),
    projectedRewardRisk: 2,
  };
}
