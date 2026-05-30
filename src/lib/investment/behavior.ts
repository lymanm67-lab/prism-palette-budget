// V8 — Behavior & accountability helpers (client-side only)

export type ReviewCadence = 'monthly' | 'quarterly' | 'biannual' | 'annual';

export function nextReviewDate(last: Date, cadence: ReviewCadence): Date {
  const d = new Date(last);
  const map: Record<ReviewCadence, number> = { monthly: 1, quarterly: 3, biannual: 6, annual: 12 };
  d.setMonth(d.getMonth() + map[cadence]);
  return d;
}

export function reviewChecklist(): string[] {
  return [
    'Confirm contributions still on track',
    'Rebalance allocation to glide path',
    'Verify beneficiary designations',
    'Update Social Security & pension estimates',
    'Review tax-loss harvesting opportunities',
    'Check spending vs withdrawal guardrails',
    'Update legacy documents if life events occurred',
  ];
}

export type CoachExplanation = { title: string; plain: string; why: string };

export function coachExplain(topic:
  | 'contribution' | 'roth' | 'glide_path' | 'ss_delay' | 'monte_carlo' | 'rmd' | 'swr'
): CoachExplanation {
  const lib: Record<string, CoachExplanation> = {
    contribution: {
      title: 'Why this contribution amount?',
      plain: 'Your monthly contribution is sized to hit your target by retirement age, assuming a steady return.',
      why: 'Consistency beats timing. Small monthly deposits compound dramatically over decades.',
    },
    roth: {
      title: 'Roth vs Traditional, explained',
      plain: 'Roth = pay tax now, withdraw tax-free later. Traditional = deduct now, pay tax later.',
      why: 'Pick Roth if you expect higher taxes in retirement; Traditional if you expect lower taxes.',
    },
    glide_path: {
      title: 'What is a glide path?',
      plain: 'Your stock/bond mix shifts gradually to bonds as you age — riskier early, safer later.',
      why: 'Reduces sequence-of-returns risk when you no longer have decades to recover.',
    },
    ss_delay: {
      title: 'Should I delay Social Security?',
      plain: 'Each year you delay past 67 adds ~8% to your benefit, up to age 70.',
      why: 'If you expect to live past ~80, delaying typically wins on lifetime payout.',
    },
    monte_carlo: {
      title: 'What does Monte Carlo show?',
      plain: 'It runs 1,000 simulations with varying returns to estimate the odds your plan survives.',
      why: 'Markets are not steady. A single average return hides real-world volatility.',
    },
    rmd: {
      title: 'Required Minimum Distributions',
      plain: 'Starting age 73, the IRS forces withdrawals from Traditional accounts.',
      why: 'Plan for the tax hit — Roth conversions before 73 can soften it.',
    },
    swr: {
      title: 'Safe Withdrawal Rate',
      plain: 'The 4% rule says you can withdraw 4% of your starting balance, adjusted for inflation.',
      why: 'Guyton-Klinger guardrails adapt withdrawals to market conditions — safer than rigid 4%.',
    },
  };
  return lib[topic];
}

export type SharePermission = 'view' | 'comment' | 'edit';
export function permissionLabel(p: SharePermission): string {
  return { view: 'View only', comment: 'View & comment', edit: 'Full edit' }[p];
}
