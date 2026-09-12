import PhasePlaceholder from '@/components/swingedge/PhasePlaceholder';
import { useTradingTitle } from '@/hooks/use-swingedge';

export default function PaperTrading() {
  useTradingTitle('Paper Trading');
  return (
    <PhasePlaceholder
      title="Paper Trading"
      phase="Phase 3"
      purpose="Practise the whole trade — open, manage, exit — with no real money and no orders sent anywhere."
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
