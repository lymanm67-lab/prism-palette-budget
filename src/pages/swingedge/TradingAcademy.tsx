import PhasePlaceholder from '@/components/swingedge/PhasePlaceholder';
import { useTradingTitle } from '@/hooks/use-swingedge';

export default function TradingAcademy() {
  useTradingTitle('Trading Academy');
  return (
    <PhasePlaceholder
      title="Trading Academy"
      phase="Phase 4"
      purpose="Learn the ideas behind every number this app shows you, in original plain-language lessons."
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
