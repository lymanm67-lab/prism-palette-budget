import PhasePlaceholder from '@/components/swingedge/PhasePlaceholder';
import { useTradingTitle } from '@/hooks/use-swingedge';

export default function Performance() {
  useTradingTitle('Performance Review');
  return (
    <PhasePlaceholder
      title="Performance Review"
      phase="Phase 4"
      purpose="Judge your process, not just your results — including whether you followed your own plans."
      howTo={[
        'Review this once a month, not every day. Short stretches are mostly noise.',
        'Look at the plan-discipline score first: how often you honoured your own stop and target.',
        'Then look at average reward-to-risk. Small losses and larger wins matter more than win rate.',
        'Open your top recorded mistakes and pick exactly one to work on next month.',
        'Click any number through to the journal entries behind it if it looks wrong.',
      ]}
      howToTips={[
        'Good discipline with a losing month is a better sign than a lucky month with broken rules.',
        'All figures come from simulated trades only.',
      ]}
      willInclude={[
        'Win rate, average reward-to-risk, expectancy and drawdown across your simulated trades.',
        'A plan-discipline score: how often you honoured your own stop and target.',
        'Your most common recorded mistakes, ranked.',
      ]}
      gate={[
        'Every number traces back to specific journal entries.',
        'Discipline is reported separately from profit.',
      ]}
    />
  );
}
