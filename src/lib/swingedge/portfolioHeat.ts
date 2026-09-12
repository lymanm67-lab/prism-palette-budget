// SwingEdge — Portfolio Heat, Sector Capital Exposure and Sector Heat.
//
// Core principles:
//   Portfolio heat measures RISK, not capital invested.
//   Open risk for a long = shares x max(0, current price - current stop), floored at 0.
//   A stop moved into profit reduces heat to zero and produces LOCKED PROFIT.
//   Heat can never be negative.
//   Sector CAPITAL EXPOSURE and sector HEAT are separate concepts, gated separately.

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface OpenPositionInput {
  id: string;
  symbol: string;
  /** Sector label. Unknown sectors are grouped under "Unclassified". */
  sector?: string | null;
  shares: number;
  entryPrice: number;
  /** Latest market price. Falls back to entry when no quote is available. */
  currentPrice?: number | null;
  /** Stop at the time the trade was opened. */
  originalStop: number;
  /** Stop in force right now (may have been trailed up). */
  currentStop?: number | null;
}

export interface PositionRisk {
  id: string;
  symbol: string;
  sector: string;
  shares: number;
  entryPrice: number;
  currentPrice: number;
  originalStop: number;
  currentStop: number;
  /** shares x (entry - original stop). What the trade risked at the outset. */
  originalRisk: number;
  /** shares x max(0, current price - current stop). Never negative. */
  currentRisk: number;
  /** shares x max(0, current stop - entry). Profit protected by the stop. */
  lockedProfit: number;
  /** shares x current price. Capital exposure, not risk. */
  positionValue: number;
  /** True when the stop sits at or above entry. */
  riskFree: boolean;
}

export function positionRisk(p: OpenPositionInput): PositionRisk {
  const shares = Math.max(0, Math.floor(p.shares));
  const entryPrice = round2(p.entryPrice);
  const currentPrice = round2(p.currentPrice && p.currentPrice > 0 ? p.currentPrice : entryPrice);
  const originalStop = round2(p.originalStop);
  const currentStop = round2(
    p.currentStop && p.currentStop > 0 ? p.currentStop : originalStop,
  );

  const originalRisk = round2(shares * Math.max(0, entryPrice - originalStop));
  const currentRisk = round2(shares * Math.max(0, currentPrice - currentStop));
  const lockedProfit = round2(shares * Math.max(0, currentStop - entryPrice));

  return {
    id: p.id,
    symbol: p.symbol.toUpperCase(),
    sector: (p.sector ?? '').trim() || 'Unclassified',
    shares,
    entryPrice,
    currentPrice,
    originalStop,
    currentStop,
    originalRisk,
    currentRisk,
    lockedProfit,
    positionValue: round2(shares * currentPrice),
    riskFree: currentStop >= entryPrice,
  };
}

export interface HeatLimits {
  tradingCapital: number;
  /** Default 5. Percent of trading capital allowed as combined open risk. */
  maxPortfolioHeatPct: number;
  /** Percent of trading capital allowed invested in one sector. */
  maxSectorCapitalExposurePct: number;
  /** Percent of trading capital allowed at risk in one sector. Default 2.5. */
  maxSectorHeatPct: number;
}

export const DEFAULT_HEAT_LIMITS: Omit<HeatLimits, 'tradingCapital'> = {
  maxPortfolioHeatPct: 5,
  maxSectorCapitalExposurePct: 25,
  maxSectorHeatPct: 2.5,
};

export interface SectorBreakdown {
  sector: string;
  /** Dollars invested in the sector. */
  capital: number;
  /** Sector capital as a percent of trading capital. */
  capitalExposurePct: number;
  /** Dollars currently at risk in the sector. */
  risk: number;
  /** Sector risk as a percent of trading capital. */
  heatPct: number;
  overCapitalLimit: boolean;
  overHeatLimit: boolean;
  symbols: string[];
}

export interface HeatSummary {
  tradingCapital: number;
  positions: PositionRisk[];
  /** Sum of current risk across open positions. Never negative. */
  openRisk: number;
  /** Sum of original risk, for comparison. */
  originalRisk: number;
  /** Sum of profit protected by stops. */
  lockedProfit: number;
  /** Dollar ceiling: capital x maxPortfolioHeatPct / 100. */
  maxHeatDollars: number;
  /** Open risk as a percent of trading capital. */
  heatPct: number;
  /** Dollars of risk still available for a new trade. Never negative. */
  riskAvailable: number;
  overHeatLimit: boolean;
  investedCapital: number;
  sectors: SectorBreakdown[];
  limits: HeatLimits;
}

export function summarizeHeat(
  positionsInput: OpenPositionInput[],
  limits: HeatLimits,
): HeatSummary {
  const capital = Math.max(0, limits.tradingCapital);
  const positions = positionsInput.map(positionRisk);

  const openRisk = round2(positions.reduce((s, p) => s + p.currentRisk, 0));
  const originalRisk = round2(positions.reduce((s, p) => s + p.originalRisk, 0));
  const lockedProfit = round2(positions.reduce((s, p) => s + p.lockedProfit, 0));
  const investedCapital = round2(positions.reduce((s, p) => s + p.positionValue, 0));

  const maxHeatDollars = round2((capital * limits.maxPortfolioHeatPct) / 100);
  const heatPct = capital > 0 ? round2((openRisk / capital) * 100) : 0;
  const riskAvailable = round2(Math.max(0, maxHeatDollars - openRisk));

  const bySector = new Map<string, PositionRisk[]>();
  for (const p of positions) {
    const list = bySector.get(p.sector) ?? [];
    list.push(p);
    bySector.set(p.sector, list);
  }

  const sectors: SectorBreakdown[] = [...bySector.entries()]
    .map(([sector, list]) => {
      const sectorCapital = round2(list.reduce((s, p) => s + p.positionValue, 0));
      const sectorRisk = round2(list.reduce((s, p) => s + p.currentRisk, 0));
      const capitalExposurePct = capital > 0 ? round2((sectorCapital / capital) * 100) : 0;
      const sectorHeatPct = capital > 0 ? round2((sectorRisk / capital) * 100) : 0;
      return {
        sector,
        capital: sectorCapital,
        capitalExposurePct,
        risk: sectorRisk,
        heatPct: sectorHeatPct,
        overCapitalLimit: capitalExposurePct > limits.maxSectorCapitalExposurePct,
        overHeatLimit: sectorHeatPct > limits.maxSectorHeatPct,
        symbols: list.map((p) => p.symbol),
      };
    })
    .sort((a, b) => b.risk - a.risk);

  return {
    tradingCapital: capital,
    positions,
    openRisk,
    originalRisk,
    lockedProfit,
    maxHeatDollars,
    heatPct,
    riskAvailable,
    overHeatLimit: openRisk > maxHeatDollars,
    investedCapital,
    sectors,
    limits,
  };
}

export type HeatGateStatus =
  | 'WITHIN_LIMITS'
  | 'HEAT_LIMIT_REACHED'
  | 'SECTOR_EXPOSURE_LIMIT_REACHED'
  | 'SECTOR_HEAT_LIMIT_REACHED';

export interface ProposedTrade {
  symbol: string;
  sector?: string | null;
  shares: number;
  entry: number;
  stop: number;
}

export interface HeatGateResult {
  status: HeatGateStatus;
  /** True when the trade may proceed on heat grounds. */
  allowed: boolean;
  /** Risk this trade would add. */
  addedRisk: number;
  /** Capital this trade would tie up. */
  addedCapital: number;
  projectedOpenRisk: number;
  projectedHeatPct: number;
  projectedSectorRisk: number;
  projectedSectorHeatPct: number;
  projectedSectorCapital: number;
  projectedSectorCapitalExposurePct: number;
  riskAvailableBefore: number;
  reasons: string[];
}

/**
 * Would this trade breach portfolio heat, sector heat or sector capital exposure?
 *
 * Reference case: $5,000 account at 5% heat = $250 combined open risk ceiling.
 * A trade taking total open risk above $250 returns HEAT_LIMIT_REACHED.
 */
export function checkTradeAgainstHeat(
  trade: ProposedTrade,
  summary: HeatSummary,
): HeatGateResult {
  const capital = summary.tradingCapital;
  const sector = (trade.sector ?? '').trim() || 'Unclassified';
  const shares = Math.max(0, Math.floor(trade.shares));
  const addedRisk = round2(shares * Math.max(0, trade.entry - trade.stop));
  const addedCapital = round2(shares * Math.max(0, trade.entry));

  const existing = summary.sectors.find((s) => s.sector === sector);
  const projectedOpenRisk = round2(summary.openRisk + addedRisk);
  const projectedSectorRisk = round2((existing?.risk ?? 0) + addedRisk);
  const projectedSectorCapital = round2((existing?.capital ?? 0) + addedCapital);

  const projectedHeatPct = capital > 0 ? round2((projectedOpenRisk / capital) * 100) : 0;
  const projectedSectorHeatPct = capital > 0 ? round2((projectedSectorRisk / capital) * 100) : 0;
  const projectedSectorCapitalExposurePct =
    capital > 0 ? round2((projectedSectorCapital / capital) * 100) : 0;

  const reasons: string[] = [];
  let status: HeatGateStatus = 'WITHIN_LIMITS';

  if (projectedOpenRisk > summary.maxHeatDollars) {
    status = 'HEAT_LIMIT_REACHED';
    reasons.push(
      `Combined open risk would reach $${projectedOpenRisk.toFixed(2)}, above the $${summary.maxHeatDollars.toFixed(2)} portfolio heat ceiling (${summary.limits.maxPortfolioHeatPct}% of $${capital.toFixed(2)}).`,
    );
  } else if (projectedSectorHeatPct > summary.limits.maxSectorHeatPct) {
    status = 'SECTOR_HEAT_LIMIT_REACHED';
    reasons.push(
      `${sector} risk would reach ${projectedSectorHeatPct.toFixed(2)}% of capital, above the ${summary.limits.maxSectorHeatPct}% sector heat limit.`,
    );
  } else if (projectedSectorCapitalExposurePct > summary.limits.maxSectorCapitalExposurePct) {
    status = 'SECTOR_EXPOSURE_LIMIT_REACHED';
    reasons.push(
      `${sector} would hold ${projectedSectorCapitalExposurePct.toFixed(2)}% of capital, above the ${summary.limits.maxSectorCapitalExposurePct}% sector exposure limit.`,
    );
  } else {
    reasons.push(
      `Adds $${addedRisk.toFixed(2)} of risk. Open risk becomes $${projectedOpenRisk.toFixed(2)} of the $${summary.maxHeatDollars.toFixed(2)} allowed.`,
    );
  }

  return {
    status,
    allowed: status === 'WITHIN_LIMITS',
    addedRisk,
    addedCapital,
    projectedOpenRisk,
    projectedHeatPct,
    projectedSectorRisk,
    projectedSectorHeatPct,
    projectedSectorCapital,
    projectedSectorCapitalExposurePct,
    riskAvailableBefore: summary.riskAvailable,
    reasons,
  };
}

/** Largest share count that still fits inside remaining portfolio heat. */
export function maxSharesWithinHeat(
  entry: number,
  stop: number,
  summary: HeatSummary,
): number {
  const perShare = entry - stop;
  if (!(perShare > 0)) return 0;
  return Math.max(0, Math.floor(summary.riskAvailable / perShare));
}
