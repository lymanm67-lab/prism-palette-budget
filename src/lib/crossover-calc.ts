export interface CrossoverInputs {
  currentBalance: number;
  annualContribution: number;
  expectedReturn: number; // percent e.g. 8
  contributionIncrease: number; // percent e.g. 2.5
  milestones: number[];
  contributionTiming: 'end' | 'monthly';
}

export interface YearProjection {
  year: number;
  calendarYear: number;
  startBalance: number;
  contribution: number;
  growth: number;
  endBalance: number;
}

export interface MilestoneResult {
  target: number;
  yearsToGoal: number;
  calendarYear: number;
  projectedBalance: number;
}

export interface CrossoverSummary {
  crossoverPoint: number;
  currentAnnualGrowth: number;
  breakoutReturnNeeded: number;
  isPastCrossover: boolean;
}

export function computeSummary(inputs: CrossoverInputs): CrossoverSummary {
  const r = inputs.expectedReturn / 100;
  const crossoverPoint = r > 0 ? inputs.annualContribution / r : 0;
  const currentAnnualGrowth = inputs.currentBalance * r;
  const breakoutReturnNeeded = inputs.currentBalance > 0
    ? (inputs.annualContribution / inputs.currentBalance) * 100
    : 0;
  const isPastCrossover = inputs.currentBalance >= crossoverPoint;
  return { crossoverPoint, currentAnnualGrowth, breakoutReturnNeeded, isPastCrossover };
}

export function projectGrowth(inputs: CrossoverInputs, maxYears = 50): YearProjection[] {
  const r = inputs.expectedReturn / 100;
  const ci = inputs.contributionIncrease / 100;
  const projections: YearProjection[] = [];
  let balance = inputs.currentBalance;
  let contrib = inputs.annualContribution;
  const baseYear = new Date().getFullYear();

  for (let y = 1; y <= maxYears; y++) {
    const startBalance = balance;
    let growth: number;
    let yearContrib = contrib;

    if (inputs.contributionTiming === 'monthly') {
      // monthly approximation: contribute 1/12 each month, compound monthly
      const mr = r / 12;
      const mc = yearContrib / 12;
      let b = startBalance;
      for (let m = 0; m < 12; m++) {
        b = b * (1 + mr) + mc;
      }
      growth = b - startBalance - yearContrib;
      balance = b;
    } else {
      growth = startBalance * r;
      balance = startBalance * (1 + r) + yearContrib;
    }

    projections.push({
      year: y,
      calendarYear: baseYear + y,
      startBalance,
      contribution: yearContrib,
      growth,
      endBalance: balance,
    });

    contrib = contrib * (1 + ci);
  }

  return projections;
}

export function findMilestones(projections: YearProjection[], milestones: number[]): MilestoneResult[] {
  return milestones.map((target) => {
    // Linear interpolation for fractional year
    for (let i = 0; i < projections.length; i++) {
      const p = projections[i];
      if (p.endBalance >= target) {
        const prevBalance = i === 0 ? projections[0].startBalance : projections[i - 1].endBalance;
        const fraction = prevBalance >= target ? 0 : (target - prevBalance) / (p.endBalance - prevBalance);
        const yearsToGoal = Math.round((p.year - 1 + fraction) * 100) / 100;
        return {
          target,
          yearsToGoal,
          calendarYear: p.calendarYear,
          projectedBalance: Math.round(p.endBalance),
        };
      }
    }
    return { target, yearsToGoal: -1, calendarYear: -1, projectedBalance: -1 };
  });
}

export function projectWithRate(inputs: CrossoverInputs, ciOverride: number, maxYears = 50): YearProjection[] {
  return projectGrowth({ ...inputs, contributionIncrease: ciOverride }, maxYears);
}
