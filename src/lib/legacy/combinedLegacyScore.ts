// Combined Legacy Score™ — one number that blends financial legacy strength
// with the health capital required to enjoy and steward it.
// Wealth 60% / Health 40%.

export type CombinedPillar = {
  key: string;
  label: string;
  weight: number; // points out of 100
  score: number | null; // 0..100, null when data is missing
  note: string;
};

export type CombinedLegacyScore = {
  score: number | null; // 0..100
  wealthScore: number | null; // 0..100
  healthScore: number | null; // 0..100
  band: { label: string; tone: 'rose' | 'amber' | 'teal' | 'emerald' };
  pillars: CombinedPillar[];
  alignment: 'health_ahead' | 'wealth_ahead' | 'balanced' | null;
  headline: string;
  weakest: CombinedPillar | null;
};

export type CombinedLegacyInputs = {
  /** Legacy Worth score, 0..1000. */
  legacyWorthScore: number | null;
  /** Retirement readiness factor score, 0..100. */
  retirementReadiness?: number | null;
  /** Healthy aging score from the longevity estimate, 0..100. */
  healthyAgingScore: number | null;
  /** 30-day habit completion, 0..100. */
  consistency30: number | null;
  /** Health-adjusted planning age and healthspan. */
  planningAge?: number | null;
  healthspanAge?: number | null;
  /** Age the portfolio is funded through (null = never runs out). */
  fundedThroughAge?: number | null;
  hasHealthData: boolean;
};

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

function bandFor(score: number): CombinedLegacyScore['band'] {
  if (score >= 80) return { label: 'Legacy Ready', tone: 'emerald' };
  if (score >= 60) return { label: 'Compounding', tone: 'teal' };
  if (score >= 40) return { label: 'Building', tone: 'amber' };
  return { label: 'Foundation', tone: 'rose' };
}

export function computeCombinedLegacyScore(i: CombinedLegacyInputs): CombinedLegacyScore {
  const wealthScore = i.legacyWorthScore != null ? clamp(i.legacyWorthScore / 10) : null;

  // Health capital: healthy aging 50, consistency 35, healthspan margin 15.
  const healthspanMargin =
    i.planningAge != null && i.healthspanAge != null
      ? clamp(100 - (i.planningAge - i.healthspanAge) * 16) // 6 frail yrs → ~4, 3 yrs → ~52
      : null;

  const healthParts: { score: number; weight: number }[] = [];
  if (i.healthyAgingScore != null) healthParts.push({ score: clamp(i.healthyAgingScore), weight: 50 });
  if (i.consistency30 != null) healthParts.push({ score: clamp(i.consistency30), weight: 35 });
  if (healthspanMargin != null) healthParts.push({ score: healthspanMargin, weight: 15 });

  const healthWeight = healthParts.reduce((s, p) => s + p.weight, 0);
  const healthScore =
    i.hasHealthData && healthWeight > 0
      ? Math.round(healthParts.reduce((s, p) => s + p.score * p.weight, 0) / healthWeight)
      : null;

  // Funding alignment: does the money last as long as the body?
  const fundingScore =
    i.planningAge != null
      ? i.fundedThroughAge == null
        ? 100
        : clamp(100 - Math.max(0, i.planningAge - i.fundedThroughAge) * 5)
      : null;

  const pillars: CombinedPillar[] = [
    {
      key: 'wealth',
      label: 'Financial Legacy',
      weight: 45,
      score: wealthScore,
      note: 'Legacy Worth across net worth, debt, estate and governance.',
    },
    {
      key: 'health',
      label: 'Health Capital',
      weight: 30,
      score: healthScore,
      note: 'Healthy aging, habit consistency and compressed frail years.',
    },
    {
      key: 'retirement',
      label: 'Retirement Readiness',
      weight: 10,
      score: i.retirementReadiness != null ? clamp(i.retirementReadiness) : null,
      note: 'Progress toward a fully funded retirement portfolio.',
    },
    {
      key: 'funding_alignment',
      label: 'Horizon Funding',
      weight: 15,
      score: fundingScore,
      note: 'Whether the plan funds your health-adjusted lifespan.',
    },
  ];

  const scored = pillars.filter((p) => p.score != null);
  const totalWeight = scored.reduce((s, p) => s + p.weight, 0);
  const score =
    totalWeight > 0
      ? Math.round(scored.reduce((s, p) => s + (p.score as number) * p.weight, 0) / totalWeight)
      : null;

  let alignment: CombinedLegacyScore['alignment'] = null;
  if (wealthScore != null && healthScore != null) {
    const gap = healthScore - wealthScore;
    alignment = gap > 12 ? 'health_ahead' : gap < -12 ? 'wealth_ahead' : 'balanced';
  }

  const weakest =
    scored.length > 0
      ? [...scored].sort((a, b) => (a.score as number) - (b.score as number))[0]
      : null;

  const headline = (() => {
    if (score == null) return 'Add financial and health data to unlock your Combined Legacy Score.';
    if (alignment === 'health_ahead')
      return 'Your health is compounding faster than your balance sheet — redirect cash flow to catch the money up.';
    if (alignment === 'wealth_ahead')
      return 'Your money is ahead of your health. Consistency is now the highest-return investment you can make.';
    if (alignment === 'balanced')
      return 'Health and wealth are compounding together — keep both streaks alive.';
    return 'Keep logging: both halves of the score improve with data.';
  })();

  return {
    score,
    wealthScore,
    healthScore,
    band: bandFor(score ?? 0),
    pillars,
    alignment,
    headline,
    weakest,
  };
}
