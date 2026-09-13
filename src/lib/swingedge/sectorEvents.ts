// SwingEdge — Sector and global event risk.
//
// One policy shock can hit several open positions at once (NVDA, AMD, SMH, QQQ
// all answer to the same semiconductor news), so event risk is never assessed
// one ticker at a time.

import {
  isActionable,
  needsVerificationReview,
  SEVERITY_RANK,
  type CalendarEvent,
  type EventSeverity,
} from './eventCalendar';

export type SectorRisk = EventSeverity;

export interface SectorRiskRead {
  sector: string;
  risk: SectorRisk;
  events: CalendarEvent[];
  unverifiedHighOrSevere: boolean;
  detail: string;
}

const HIGHEST = (list: EventSeverity[]): EventSeverity =>
  list.reduce<EventSeverity>((acc, s) => (SEVERITY_RANK[s] > SEVERITY_RANK[acc] ? s : acc), 'LOW');

/** Global sector risk for one sector, from verified live events only. */
export function sectorRisk(sector: string, events: CalendarEvent[]): SectorRiskRead {
  const mine = events.filter((e) => e.sectors.some((s) => s.toLowerCase() === sector.toLowerCase()));
  const actionable = mine.filter(isActionable);
  const pending = mine.filter(needsVerificationReview);
  const risk = actionable.length ? HIGHEST(actionable.map((e) => e.severity)) : 'LOW';

  const detail = actionable.length
    ? `${actionable.length} verified event${actionable.length === 1 ? '' : 's'} currently affecting ${sector}: ${actionable
        .map((e) => e.title)
        .join('; ')}.`
    : pending.length
      ? `No verified events, but ${pending.length} unverified report${pending.length === 1 ? '' : 's'} could be significant for ${sector}.`
      : `No known events currently affecting ${sector}.`;

  return { sector, risk, events: mine, unverifiedHighOrSevere: pending.length > 0, detail };
}

export interface SectorRiskMap {
  bySector: Record<string, SectorRiskRead>;
  worst: SectorRisk;
}

export function sectorRiskMap(sectors: string[], events: CalendarEvent[]): SectorRiskMap {
  const bySector: Record<string, SectorRiskRead> = {};
  sectors.forEach((s) => {
    bySector[s] = sectorRisk(s, events);
  });
  const worst = HIGHEST(Object.values(bySector).map((r) => r.risk));
  return { bySector, worst };
}

// ---------------------------------------------------------------------------
// Event-concentrated exposure
// ---------------------------------------------------------------------------

export interface ExposurePosition {
  symbol: string;
  sector?: string | null;
  /** Risk still on the table for this position, in currency. */
  openRisk: number;
}

export interface EventExposureCluster {
  eventId: string;
  eventTitle: string;
  severity: EventSeverity;
  symbols: string[];
  combinedRisk: number;
  combinedRiskPctOfCapital: number | null;
  concentrated: boolean;
  detail: string;
}

export interface EventExposureResult {
  clusters: EventExposureCluster[];
  concentrated: boolean;
  worstCluster: EventExposureCluster | null;
  warnings: string[];
}

/**
 * Groups open positions by the events that could move them together. Two or more
 * positions answering to one event is EVENT-CONCENTRATED EXPOSURE.
 */
export function eventConcentratedExposure(input: {
  positions: ExposurePosition[];
  events: CalendarEvent[];
  tradingCapital?: number | null;
  /** Combined risk above this share of capital is called out. */
  maxClusterRiskPct?: number;
}): EventExposureResult {
  const maxPct = input.maxClusterRiskPct ?? 3;
  const clusters: EventExposureCluster[] = [];

  input.events.filter(isActionable).forEach((ev) => {
    const hit = input.positions.filter(
      (p) =>
        ev.symbols.some((s) => s.toUpperCase() === p.symbol.toUpperCase()) ||
        (p.sector ? ev.sectors.some((s) => s.toLowerCase() === (p.sector as string).toLowerCase()) : false),
    );
    if (hit.length < 2) return;
    const combinedRisk = hit.reduce((s, p) => s + Math.max(0, p.openRisk), 0);
    const pct =
      input.tradingCapital && input.tradingCapital > 0
        ? Math.round((combinedRisk / input.tradingCapital) * 1000) / 10
        : null;
    const concentrated = SEVERITY_RANK[ev.severity] >= SEVERITY_RANK.HIGH || (pct !== null && pct > maxPct);
    clusters.push({
      eventId: ev.id,
      eventTitle: ev.title,
      severity: ev.severity,
      symbols: hit.map((p) => p.symbol),
      combinedRisk: Math.round(combinedRisk * 100) / 100,
      combinedRiskPctOfCapital: pct,
      concentrated,
      detail: `${hit.map((p) => p.symbol).join(', ')} could all respond to ${ev.title}${
        pct !== null ? `, putting ${pct}% of capital behind one piece of news` : ''
      }.`,
    });
  });

  clusters.sort((a, b) => b.combinedRisk - a.combinedRisk);
  const concentrated = clusters.some((c) => c.concentrated);

  return {
    clusters,
    concentrated,
    worstCluster: clusters[0] ?? null,
    warnings: concentrated
      ? clusters.filter((c) => c.concentrated).map((c) => `EVENT-CONCENTRATED EXPOSURE: ${c.detail}`)
      : [],
  };
}
