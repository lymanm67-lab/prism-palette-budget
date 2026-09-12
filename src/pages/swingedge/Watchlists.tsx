import PhasePlaceholder from '@/components/swingedge/PhasePlaceholder';
import { useTradingTitle } from '@/hooks/use-swingedge';

export default function Watchlists() {
  useTradingTitle('Watchlists');
  return (
    <PhasePlaceholder
      title="Watchlists"
      phase="Phase 2"
      purpose="Keep short lists of names you actually follow, so scanning stays cheap and focused."
      howTo={[
        'Create a list with a purpose in its name, for example "Pullbacks I am waiting on" or "Core ETFs".',
        'Add symbols one at a time with the search box. Keep each list short — ten to twenty names is plenty.',
        'Write a note on each symbol saying what you are waiting for, such as "wait for a pullback to the 50-day".',
        'Use the list as your scan list in the Market Scanner instead of scanning everything.',
        'Remove names you have stopped following, so your lists reflect what you actually watch.',
      ]}
      howToTips={[
        'Shorter lists cost less data allowance and give you fewer, better decisions.',
        'Your lists are private to your household.',
      ]}
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
