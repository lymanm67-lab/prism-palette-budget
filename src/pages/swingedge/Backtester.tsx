import PhasePlaceholder from '@/components/swingedge/PhasePlaceholder';
import { useTradingTitle } from '@/hooks/use-swingedge';

export default function Backtester() {
  useTradingTitle('Historical Testing');
  return (
    <PhasePlaceholder
      title="Historical Testing"
      phase="Phase 4"
      purpose="See how a set of rules would have behaved over past data, with the limits of that exercise stated plainly."
      willInclude={[
        'Pick a symbol, a date range and the rules to test, then review every simulated trade.',
        'Win rate, average win, average loss, largest drawdown and reward-to-risk summary.',
        'A permanent note that past behaviour does not predict future results.',
      ]}
      gate={[
        'Results are reproducible: the same inputs always produce the same trades.',
        'No result is ever presented as a prediction or a signal.',
      ]}
    />
  );
}
