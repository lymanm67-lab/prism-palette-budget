import PhasePlaceholder from '@/components/swingedge/PhasePlaceholder';
import { useTradingTitle } from '@/hooks/use-swingedge';

export default function TradeJournal() {
  useTradingTitle('Trade Journal');
  return (
    <PhasePlaceholder
      title="Trade Journal"
      phase="Phase 4"
      purpose="Write down what you did and why, so the next decision is better than the last one."
      willInclude={[
        'An entry created automatically whenever a simulated trade is opened or closed.',
        'Your own notes on the setup, how you felt, what you followed and what you broke.',
        'Tags for mistakes you want to stop repeating.',
      ]}
      gate={[
        'Every closed simulated trade has a matching journal entry.',
        'Entries are private to your household.',
      ]}
    />
  );
}
