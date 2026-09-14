// Builds the spoken script for the Stock Analyzer from numbers that were
// already computed on the page. Nothing is invented here: a section with no
// recorded value is simply left out, and unavailable items say so plainly.

export interface NarrationInput {
  symbol: string;
  assetType: 'ETF' | 'STOCK' | string;
  price: number | null;
  trend: string | null;
  setup: string | null;
  rsi: number | null;
  rsiState: string | null;
  atr: number | null;
  support: number | null;
  resistance: number | null;
  estimatedStop: number | null;
  estimatedTarget: number | null;
  relativeVolume: number | null;
  developing: boolean;
  biasDirection: string | null;
  biasConfidence: string | null;
  eventScore: number | null;
  eventBand: string | null;
  readinessScore: number | null;
  readinessVerdict: string | null;
  readinessHardGates: string[];
  mtfLabel: string | null;
}

const money = (n: number) => `$${n.toFixed(2)}`;

// Ticker symbols are spoken letter by letter ("SCHD" -> "S C H D").
const speakSymbol = (symbol: string) => symbol.split('').join(' ');

export function buildAnalysisNarration(input: NarrationInput): string {
  const parts: string[] = [];

  parts.push(
    `Chart reading for ${speakSymbol(input.symbol)}, ${input.assetType === 'ETF' ? 'a fund' : 'a company'}.`,
  );

  if (input.price !== null) {
    parts.push(
      `The last price is ${money(input.price)}${input.developing ? ", with today's candle still forming." : '.'}`,
    );
  }

  if (input.trend) {
    const trendLine =
      input.trend === 'UP'
        ? 'The daily trend is up, with price holding above its moving averages.'
        : input.trend === 'DOWN'
          ? 'The daily trend is down, with price below its moving averages.'
          : 'The daily trend is sideways, without a clear direction.';
    parts.push(trendLine);
  }

  if (input.setup) {
    parts.push(
      input.setup === 'NONE'
        ? 'There is no pullback or breakout setup on the daily chart right now.'
        : `The current setup is a ${input.setup.toLowerCase()}.`,
    );
  }

  if (input.rsi !== null) {
    parts.push(
      `Momentum, measured by the fourteen-period RSI, is ${Math.round(input.rsi)}, which reads as ${(input.rsiState ?? 'neutral').toLowerCase()}.`,
    );
  }

  if (input.atr !== null) {
    parts.push(`The average true range is ${money(input.atr)}, the yardstick used for stop distance.`);
  }

  if (input.support !== null && input.resistance !== null) {
    parts.push(`Support sits near ${money(input.support)} and resistance near ${money(input.resistance)}.`);
  } else if (input.support !== null) {
    parts.push(`Support sits near ${money(input.support)}.`);
  }

  if (input.estimatedStop !== null && input.estimatedTarget !== null) {
    parts.push(
      `The estimated stop is ${money(input.estimatedStop)} and the estimated target is ${money(input.estimatedTarget)}.`,
    );
  }

  if (input.relativeVolume !== null) {
    parts.push(
      input.relativeVolume >= 1.5
        ? 'Volume is running well above average, which supports the move.'
        : input.relativeVolume < 0.7
          ? 'Volume is lighter than average, so confirmation is weaker.'
          : 'Volume is about average.',
    );
  }

  if (input.biasDirection && input.biasConfidence && input.biasConfidence !== 'INSUFFICIENT_DATA') {
    parts.push(
      `Looking at matching past episodes, the directional bias is ${input.biasDirection.toLowerCase()} with ${input.biasConfidence.toLowerCase()} confidence.`,
    );
  } else {
    parts.push('There is not enough matching history for a directional bias reading.');
  }

  if (input.eventScore !== null && input.eventBand) {
    parts.push(`Event risk scores ${input.eventScore} out of one hundred, in the ${input.eventBand.toLowerCase()} band.`);
  }

  if (input.mtfLabel) {
    parts.push(`Across weekly, daily, four-hour and one-hour charts, the multi-timeframe reading is ${input.mtfLabel.toLowerCase().replace(/_/g, ' ')}.`);
  }

  if (input.readinessScore !== null && input.readinessVerdict) {
    parts.push(`Overall trade readiness is ${input.readinessScore} out of one hundred. The verdict is ${input.readinessVerdict}.`);
  }

  if (input.readinessHardGates.length > 0) {
    parts.push(`There ${input.readinessHardGates.length === 1 ? 'is one hard gate' : `are ${input.readinessHardGates.length} hard gates`} blocking a green light: ${input.readinessHardGates.join('. ')}.`);
  }

  parts.push(
    'Remember, this is a reading of conditions, not a recommendation to trade. Set your entry, stop and target in the Trade Planner before acting.',
  );

  return parts.join(' ');
}
