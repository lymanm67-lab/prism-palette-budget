import PhasePlaceholder from '@/components/swingedge/PhasePlaceholder';
import { useTradingTitle } from '@/hooks/use-swingedge';

export default function Performance() {
  useTradingTitle('Performance Review');
  return (
    <PhasePlaceholder
      title="Performance Review"
      phase="Phase 4"
      purpose="Judge your process, not just your results — including whether you followed your own plans."
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
