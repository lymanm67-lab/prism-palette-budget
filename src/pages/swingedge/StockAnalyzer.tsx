import PhasePlaceholder from '@/components/swingedge/PhasePlaceholder';
import { useTradingTitle } from '@/hooks/use-swingedge';

export default function StockAnalyzer() {
  useTradingTitle('Stock Analyzer');
  return (
    <PhasePlaceholder
      title="Stock Analyzer"
      phase="Phase 2"
      purpose="Understand one name properly: its trend, its setup, where it would be proven wrong, and whether it qualifies today."
      howTo={[
        'Type a symbol, or arrive here by opening a row from the scanner.',
        'Look at the trend first. If price is below its longer average, most long setups are not worth the risk.',
        'Read the setup description and check the volume note — a move on weak volume is easy to reverse.',
        'Find the invalidation level: the price that says this idea is wrong. If you would not accept that loss, stop here.',
        'Read the reasons for and against the verdict, not just the verdict word.',
        'If you still like it, send it to the Trade Planner to set your own entry, stop and target.',
      ]}
      howToTips={[
        'The verdict is a summary of rules, not advice. You decide whether to act.',
        'If earnings are due within a couple of weeks, expect bigger surprise moves. "Earnings data unavailable" means your data plan does not include it.',
      ]}
      willInclude={[
        'Price chart with moving averages, plus trend, momentum, volume and volatility read in plain language.',
        'A written explanation of the current setup — breakout, pullback, or neither.',
        'The invalidation level: the price that would prove this idea wrong.',
        'A verdict of QUALIFIES, WATCH, NOT READY or DOES NOT QUALIFY, with the reasons listed for and against.',
        'Earnings timing when your data plan supports it, and a clear "Earnings data unavailable" note when it does not.',
      ]}
      gate={[
        'Every indicator value can be reproduced from the same candles by hand.',
        'No verdict is shown without both the reasons for it and the invalidation level.',
        'A missing optional data source never breaks the page.',
      ]}
    />
  );
}
