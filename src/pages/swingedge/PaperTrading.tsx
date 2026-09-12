import PhasePlaceholder from '@/components/swingedge/PhasePlaceholder';
import { useTradingTitle } from '@/hooks/use-swingedge';

export default function PaperTrading() {
  useTradingTitle('Paper Trading');
  return (
    <PhasePlaceholder
      title="Paper Trading"
      phase="Phase 3"
      purpose="Practise the whole trade — open, manage, exit — with no real money and no orders sent anywhere."
      howTo={[
        'Open a simulated position from a saved plan rather than typing a new idea here.',
        'Check the open risk total after opening it. That is what you would lose if every stop were hit.',
        'Each day, look at distance to stop and distance to target instead of the profit figure alone.',
        'When you exit — full or partial — record the reason. "Stop hit" and "changed my mind" are very different lessons.',
        'Review the journal entry that is created for you when the trade closes.',
      ]}
      howToTips={[
        'Nothing here places a real order. It is practice only.',
        'Moving a stop further away is the most common way practice accounts lose money. Record it when you do it.',
      ]}
      willInclude={[
        'Open a simulated long position straight from a saved plan.',
        'Track open profit or loss, distance to stop and distance to target.',
        'Record partial exits, stop moves and the final close with a reason.',
        'Running total of open risk across all simulated positions.',
      ]}
      gate={[
        'No screen can place, route or transmit a real order.',
        'Closing a trade writes a journal entry automatically.',
        'Open risk shown here matches the risk envelope on the dashboard.',
      ]}
    />
  );
}
