// SwingEdge — chart display modes.
//
// Display only. A mode changes which lines are drawn on the chart; it never
// changes the analysis, the levels or any score.

export type ChartMode = 'LEARNING' | 'TRADER' | 'EXECUTION';
export type PriceScaleSide = 'LEFT' | 'RIGHT';

export interface ChartModeConfig {
  label: string;
  description: string;
  movingAverages: boolean;
  trendLines: boolean;
  levels: boolean;
  directionStrip: boolean;
}

export const CHART_MODES: Record<ChartMode, ChartModeConfig> = {
  LEARNING: {
    label: 'Learning',
    description: 'Everything labelled — averages, trend lines, levels and the direction strip.',
    movingAverages: true,
    trendLines: true,
    levels: true,
    directionStrip: true,
  },
  TRADER: {
    label: 'Trader',
    description: 'Candles, the two averages and your levels. No extra lines.',
    movingAverages: true,
    trendLines: false,
    levels: true,
    directionStrip: false,
  },
  EXECUTION: {
    label: 'Execution',
    description: 'Price and the entry, stop and target only — the cleanest view before an order.',
    movingAverages: false,
    trendLines: false,
    levels: true,
    directionStrip: false,
  },
};

export const CHART_MODE_ORDER: ChartMode[] = ['LEARNING', 'TRADER', 'EXECUTION'];

const KEY = 'swingedge-chart-prefs';

export interface ChartPrefs {
  mode: ChartMode;
  scaleSide: PriceScaleSide;
}

export const DEFAULT_CHART_PREFS: ChartPrefs = { mode: 'TRADER', scaleSide: 'RIGHT' };

export function loadChartPrefs(): ChartPrefs {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_CHART_PREFS;
    const parsed = JSON.parse(raw) as Partial<ChartPrefs>;
    return {
      mode: parsed.mode && parsed.mode in CHART_MODES ? parsed.mode : DEFAULT_CHART_PREFS.mode,
      scaleSide: parsed.scaleSide === 'LEFT' ? 'LEFT' : 'RIGHT',
    };
  } catch {
    return DEFAULT_CHART_PREFS;
  }
}

export function saveChartPrefs(prefs: ChartPrefs) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* private mode — session only */
  }
}
