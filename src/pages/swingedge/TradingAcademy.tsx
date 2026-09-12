import PhasePlaceholder from '@/components/swingedge/PhasePlaceholder';
import { useTradingTitle } from '@/hooks/use-swingedge';

export default function TradingAcademy() {
  useTradingTitle('Trading Academy');
  return (
    <PhasePlaceholder
      title="Trading Academy"
      phase="Phase 4"
      purpose="Learn the ideas behind every number this app shows you, in original plain-language lessons."
      howTo={[
        'Work through the lessons in order the first time — later ones assume the earlier ones.',
        'Read the worked example on each lesson using the demo data before moving on.',
        'After each lesson, open the matching screen and find that idea in your own numbers.',
        'Read the closing note on what the idea ignores. Every method has a blind spot.',
        'Come back to position sizing and risk of ruin more than once. They matter most.',
      ]}
      howToTips={[
        'Your progress is saved, so you can stop mid-way and pick it up later.',
        'Lessons are education only, not investment advice.',
      ]}
      willInclude={[
        'Short lessons on trend, setups, entries, stops, targets, position sizing and risk of ruin.',
        'A worked example for each lesson using the same demo data as the rest of the app.',
        'Progress tracking so you can pick up where you stopped.',
      ]}
      gate={[
        'All lesson content is original and written for this app.',
        'Each lesson ends with the risk that the idea ignores.',
      ]}
    />
  );
}
