import PhasePlaceholder from '@/components/swingedge/PhasePlaceholder';
import { useTradingTitle } from '@/hooks/use-swingedge';

export default function TradeJournal() {
  useTradingTitle('Trade Journal');
  return (
    <PhasePlaceholder
      title="Trade Journal"
      phase="Phase 4"
      purpose="Write down what you did and why, so the next decision is better than the last one."
      howTo={[
        'Let the entries create themselves — every simulated trade you open or close writes one.',
        'Add your notes the same day, while you still remember what you were thinking.',
        'Answer two questions on every entry: did I follow my plan, and what would I do differently?',
        'Tag the mistake if there was one, so repeats become obvious.',
        'Read back through the last ten entries before you plan your next trade.',
      ]}
      howToTips={[
        'The entries you least want to write are the ones worth the most.',
        'Your journal is private to your household.',
      ]}
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
