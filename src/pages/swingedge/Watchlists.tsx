import PhasePlaceholder from '@/components/swingedge/PhasePlaceholder';
import { useTradingTitle } from '@/hooks/use-swingedge';

export default function Watchlists() {
  useTradingTitle('Watchlists');
  return (
    <PhasePlaceholder
      title="Watchlists"
      phase="Phase 2"
      purpose="Keep short lists of names you actually follow, so scanning stays cheap and focused."
      willInclude={[
        'Create, rename and delete your own lists; add or remove symbols with a search box.',
        'Each list can be used directly as a scan list.',
        'A note field per symbol for why it is on the list and what you are waiting for.',
      ]}
      gate={[
        'Lists are private to your household.',
        'Adding a symbol never triggers a burst of price requests.',
      ]}
    />
  );
}
