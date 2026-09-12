import PhasePlaceholder from '@/components/swingedge/PhasePlaceholder';
import { useTradingTitle } from '@/hooks/use-swingedge';

export default function StockAnalyzer() {
  useTradingTitle('Stock Analyzer');
  return (
    <PhasePlaceholder
      title="Stock Analyzer"
      phase="Phase 2"
      purpose="Understand one name properly: its trend, its setup, where it would be proven wrong, and whether it qualifies today."
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
