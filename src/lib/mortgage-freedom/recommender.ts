// Rules-based winner across the 4 strategies.
import type { StrategyResult } from './simulators';

export interface Recommendation {
  winner: StrategyResult['strategy'];
  label: string;
  confidence: number;      // 0-100
  reasoning: string;
  runnerUp: StrategyResult['strategy'];
}

const LABELS: Record<StrategyResult['strategy'], string> = {
  'traditional': 'Traditional Mortgage',
  'extra-principal': 'Extra Principal Payments',
  'heloc-accel': 'HELOC Acceleration',
  'first-lien-heloc': 'First-Lien HELOC',
};

export function recommend(
  strategies: {
    traditional: StrategyResult;
    extraPrincipal: StrategyResult;
    helocAccel: StrategyResult;
    firstLien: StrategyResult;
  },
  ctx: { mortgageRate: number; helocRate: number; monthlySurplus: number; creditScore: number; emergencyMonths: number }
): Recommendation {
  const list = [
    strategies.traditional,
    strategies.extraPrincipal,
    strategies.helocAccel,
    strategies.firstLien,
  ];

  // Score each: heavy weight on interest saved & years saved, minus risk penalty
  const scored = list.map(s => {
    const savingsScore = Math.min(1, s.interestSaved / 100_000) * 40;
    const speedScore = Math.min(1, s.yearsSaved / 15) * 30;
    const riskPenalty = (s.riskScore / 100) * 25;
    const cashflowBonus = (s.cashFlowScore / 100) * 15;
    // Discipline gates
    let gate = 0;
    if (s.strategy === 'heloc-accel' || s.strategy === 'first-lien-heloc') {
      if (ctx.creditScore && ctx.creditScore < 680) gate -= 30;
      if (ctx.emergencyMonths < 3) gate -= 20;
      if (ctx.helocRate > ctx.mortgageRate + 2) gate -= 15;
      if (ctx.monthlySurplus < 500) gate -= 20;
    }
    if (s.strategy === 'extra-principal' && ctx.monthlySurplus < 100) gate -= 25;
    return { s, total: savingsScore + speedScore + cashflowBonus - riskPenalty + gate };
  }).sort((a, b) => b.total - a.total);

  const winner = scored[0].s;
  const runnerUp = scored[1].s;
  const gap = scored[0].total - scored[1].total;
  const confidence = Math.min(98, Math.max(55, 65 + gap * 0.8));

  const reasoning = buildReasoning(winner, runnerUp, ctx);

  return {
    winner: winner.strategy,
    label: LABELS[winner.strategy],
    confidence: Math.round(confidence),
    reasoning,
    runnerUp: runnerUp.strategy,
  };
}

function buildReasoning(
  w: StrategyResult,
  r: StrategyResult,
  ctx: { mortgageRate: number; helocRate: number; monthlySurplus: number; creditScore: number; emergencyMonths: number }
): string {
  if (w.strategy === 'extra-principal') {
    return `Your mortgage rate (${ctx.mortgageRate.toFixed(2)}%) is fixed and predictable. Redirecting your $${ctx.monthlySurplus.toFixed(0)}/mo surplus to principal saves ~$${w.interestSaved.toLocaleString(undefined, { maximumFractionDigits: 0 })} in interest and cuts ~${w.yearsSaved.toFixed(1)} years — with no variable-rate risk.`;
  }
  if (w.strategy === 'heloc-accel') {
    return `Your HELOC rate (${ctx.helocRate.toFixed(2)}%) and disciplined cash flow make the chunking strategy work: it removes ~${w.yearsSaved.toFixed(1)} years from payoff and saves ~$${w.interestSaved.toLocaleString(undefined, { maximumFractionDigits: 0 })}. Beats ${LABELS[r.strategy]} by ${((w.interestSaved - r.interestSaved) / 1000).toFixed(1)}k in interest.`;
  }
  if (w.strategy === 'first-lien-heloc') {
    return `An all-in-one first-lien HELOC parks every dollar of income against principal daily. With ${ctx.emergencyMonths.toFixed(1)} months of reserves and FICO ${ctx.creditScore}, you can absorb rate swings while cutting ~${w.yearsSaved.toFixed(1)} years off payoff.`;
  }
  return `Your current rate and cash flow make staying the course optimal — accelerating doesn't beat holding the fixed rate meaningfully.`;
}
