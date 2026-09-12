import PhasePlaceholder from '@/components/swingedge/PhasePlaceholder';
import { useTradingTitle } from '@/hooks/use-swingedge';

export default function Backtester() {
  useTradingTitle('Historical Testing');
  return (
    <PhasePlaceholder
      title="Historical Testing"
      phase="Phase 4"
      purpose="See how a set of rules would have behaved over past data, with the limits of that exercise stated plainly."
      howTo={[
        'Pick one symbol and a date range that covers both a rising and a falling market, not just a good stretch.',
        'Choose the rules you want to test and run it.',
        'Read the largest drawdown before the win rate — that is the pain you would have had to sit through.',
        'Click into individual simulated trades to see where the rules worked and where they did not.',
        'Change one rule at a time and re-run, so you know what caused the difference.',
      ]}
      howToTips={[
        'Past behaviour does not predict future results. This is a study exercise, not a forecast.',
        'A high win rate with a huge drawdown is usually a worse plan than a lower win rate with small losses.',
      ]}
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
