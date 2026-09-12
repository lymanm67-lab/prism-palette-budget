import PhasePlaceholder from '@/components/swingedge/PhasePlaceholder';
import { useTradingTitle } from '@/hooks/use-swingedge';

export default function MarketScanner() {
  useTradingTitle('Market Scanner');
  return (
    <PhasePlaceholder
      title="Market Scanner"
      phase="Phase 2"
      purpose="Narrow a small, deliberate list of liquid names down to the few worth studying today — never a whole-market sweep."
      willInclude={[
        'Runs against one of three lists only: a built-in curated list of about 25 liquid stocks and ETFs, one of your watchlists, or a list you saved.',
        'Reuses stored prices wherever they are still fresh, and queues anything that needs new data so your daily data allowance is never blown in one click.',
        'Ranks results and shows an estimated entry, stop, target and reward-to-risk beside every setup, clearly marked as an estimate.',
        'Each row carries one of four statuses: QUALIFIES, WATCH, NOT READY, or DOES NOT QUALIFY.',
      ]}
      gate={[
        'A scan of the curated list never exceeds the configured per-minute allowance.',
        'Every row shows its estimated risk next to its setup.',
        'Estimated numbers are visually distinct from planned numbers.',
      ]}
    />
  );
}
