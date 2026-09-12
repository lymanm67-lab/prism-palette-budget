import PhasePlaceholder from '@/components/swingedge/PhasePlaceholder';
import { useTradingTitle } from '@/hooks/use-swingedge';

export default function MarketScanner() {
  useTradingTitle('Market Scanner');
  return (
    <PhasePlaceholder
      title="Market Scanner"
      phase="Phase 2"
      purpose="Narrow a small, deliberate list of liquid names down to the few worth studying today — never a whole-market sweep."
      howTo={[
        'Check the Trading Dashboard first. If the overall market is weak, expect fewer names to qualify and take fewer of them.',
        'Choose which list to scan: the built-in list of about 25 liquid names, one of your own watchlists, or a list you saved.',
        'Run the scan and sort by status. Start with the QUALIFIES rows and ignore DOES NOT QUALIFY.',
        'Read the estimated entry, stop, target and reward-to-risk on each row. Treat them as rough numbers, not decisions.',
        'Open the two or three most interesting names in the Stock Analyzer instead of acting straight from the list.',
      ]}
      howToTips={[
        'A scan uses part of your per-minute data allowance, so scan once and study the results rather than re-running it.',
        'WATCH means the setup is forming but not ready. Put those on a watchlist rather than forcing a trade.',
      ]}
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
