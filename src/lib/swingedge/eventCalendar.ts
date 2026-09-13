// SwingEdge — Event calendar types, states and providers.
//
// Absolute rule: SwingEdge NEVER invents an event, a date, an expected value or
// an actual value. An unknown is shown as unknown.
//
// Three event sources feed one calendar:
//   EARNINGS  — company reports, from the fundamentals provider
//   MACRO     — FOMC, CPI, PPI, jobs, GDP, retail sales, confidence
//   GLOBAL    — geopolitical, policy and sector-wide events proposed by a scan
//
// Every event carries a verification state, a lifecycle status, a session, and
// source quality. A pending event with potentially severe impact is never
// allowed to sit inert behind a GO.

export type EventKind = 'EARNINGS' | 'MACRO' | 'SECTOR' | 'GLOBAL';

export type EventSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';

export const SEVERITY_RANK: Record<EventSeverity, number> = { LOW: 1, MODERATE: 2, HIGH: 3, SEVERE: 4 };

/** Verification state. PENDING never changes direction on its own. */
export type EventVerification = 'PENDING_VERIFICATION' | 'VERIFIED' | 'DISMISSED';

/** Lifecycle status. Events must not stay active for ever. */
export type EventStatus = 'UPCOMING' | 'ACTIVE' | 'RESOLVED' | 'CANCELLED' | 'STALE';

export type MarketSession = 'BEFORE_OPEN' | 'MARKET_HOURS' | 'AFTER_CLOSE' | 'OVERNIGHT' | 'UNKNOWN';

export const SESSION_LABEL: Record<MarketSession, string> = {
  BEFORE_OPEN: 'Before market open',
  MARKET_HOURS: 'During market hours',
  AFTER_CLOSE: 'After market close',
  OVERNIGHT: 'Overnight',
  UNKNOWN: 'Time unknown',
};

export const SESSION_EXPLANATION: Record<MarketSession, string> = {
  BEFORE_OPEN: 'This event lands before the session opens, so the first price you can trade may already have moved.',
  MARKET_HOURS: 'This event lands while the market is open, so price can move sharply during the session.',
  AFTER_CLOSE: 'This event occurs after the regular trading session and may create overnight gap risk.',
  OVERNIGHT: 'This event happens while the market is closed, so the reaction shows up as a gap on the next open.',
  UNKNOWN: 'The time of day is not known, so treat this as possible gap risk either side of the session.',
};

export type SourceConfidence = 'HIGH' | 'MODERATE' | 'LOW' | 'UNVERIFIED';

export type SourceType =
  | 'COMPANY_FILING'
  | 'OFFICIAL_CALENDAR'
  | 'ESTABLISHED_REPORTING'
  | 'AGGREGATOR'
  | 'SOCIAL_MEDIA'
  | 'RUMOUR'
  | 'MANUAL_ENTRY'
  | 'UNKNOWN';

/** A rumour and a company filing are never treated as equivalent evidence. */
export const SOURCE_TYPE_CONFIDENCE: Record<SourceType, SourceConfidence> = {
  COMPANY_FILING: 'HIGH',
  OFFICIAL_CALENDAR: 'HIGH',
  ESTABLISHED_REPORTING: 'MODERATE',
  AGGREGATOR: 'MODERATE',
  SOCIAL_MEDIA: 'LOW',
  RUMOUR: 'LOW',
  MANUAL_ENTRY: 'MODERATE',
  UNKNOWN: 'UNVERIFIED',
};

export interface EventSourceQuality {
  source: string | null;
  sourceType: SourceType;
  publishedAt: string | null;
  lastVerifiedAt: string | null;
  independentSources: number | null;
  confidence: SourceConfidence;
}

export interface CalendarEvent {
  id: string;
  kind: EventKind;
  title: string;
  /** When the event itself happens. ISO. */
  eventTime: string | null;
  eventDate: string;
  timeZone: string | null;
  session: MarketSession;
  severity: EventSeverity;
  verification: EventVerification;
  status: EventStatus;
  symbols: string[];
  sectors: string[];
  region: string | null;
  detectedAt: string | null;
  eventStart: string | null;
  eventEnd: string | null;
  reviewBy: string | null;
  resolvedAt: string | null;
  quality: EventSourceQuality;
  importance?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  previousValue?: string | null;
  expectedValue?: string | null;
  actualValue?: string | null;
  note?: string | null;
}

/** Grades source confidence, upgrading only when several independent sources agree. */
export function gradeSource(input: {
  sourceType: SourceType;
  independentSources?: number | null;
  lastVerifiedAt?: string | null;
}): SourceConfidence {
  const base = SOURCE_TYPE_CONFIDENCE[input.sourceType] ?? 'UNVERIFIED';
  const n = input.independentSources ?? 0;
  if (base === 'LOW' && n >= 3) return 'MODERATE';
  if (base === 'MODERATE' && n >= 3 && input.lastVerifiedAt) return 'HIGH';
  return base;
}

const DAY_MS = 86_400_000;

/** Whole trading-day-agnostic day count from today to a date. Negative means past. */
export function daysUntil(dateIso: string, now = new Date()): number | null {
  const t = Date.parse(dateIso);
  if (Number.isNaN(t)) return null;
  const a = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const d = new Date(t);
  const b = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((b - a) / DAY_MS);
}

/**
 * Derives session from a normalised event time. Times are interpreted in US
 * eastern market hours (09:30 to 16:00) after the caller has normalised them.
 */
export function sessionFromEasternTime(hhmm: string | null): MarketSession {
  if (!hhmm) return 'UNKNOWN';
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return 'UNKNOWN';
  const mins = Number(m[1]) * 60 + Number(m[2]);
  if (mins < 4 * 60) return 'OVERNIGHT';
  if (mins < 9 * 60 + 30) return 'BEFORE_OPEN';
  if (mins <= 16 * 60) return 'MARKET_HOURS';
  if (mins <= 20 * 60) return 'AFTER_CLOSE';
  return 'OVERNIGHT';
}

export interface StatusOptions {
  now?: Date;
  /** Days after which an unresolved event is treated as stale. */
  freshnessDays?: number;
}

/**
 * Recomputes lifecycle status so a sector is never left HIGH because an old
 * event was never cleared.
 */
export function deriveStatus(ev: CalendarEvent, opts: StatusOptions = {}): EventStatus {
  const now = opts.now ?? new Date();
  const freshnessDays = opts.freshnessDays ?? 7;
  if (ev.status === 'CANCELLED') return 'CANCELLED';
  if (ev.resolvedAt) return 'RESOLVED';

  const start = ev.eventStart ?? ev.eventTime ?? ev.eventDate;
  const end = ev.eventEnd;
  const startDays = daysUntil(start, now);
  const endDays = end ? daysUntil(end, now) : null;

  if (startDays !== null && startDays > 0) {
    if (ev.reviewBy) {
      const reviewDays = daysUntil(ev.reviewBy, now);
      if (reviewDays !== null && reviewDays < 0) return 'STALE';
    }
    return 'UPCOMING';
  }
  if (endDays !== null) return endDays >= 0 ? 'ACTIVE' : 'RESOLVED';
  if (startDays !== null && startDays >= -freshnessDays) return 'ACTIVE';
  return 'STALE';
}

/** Applies derived status to a list, so stale and resolved events stop scoring. */
export function refreshStatuses(events: CalendarEvent[], opts: StatusOptions = {}): CalendarEvent[] {
  return events.map((ev) => ({ ...ev, status: deriveStatus(ev, opts) }));
}

/** An event only moves a signal when it is verified and still live. */
export function isActionable(ev: CalendarEvent): boolean {
  if (ev.verification !== 'VERIFIED') return false;
  return ev.status === 'UPCOMING' || ev.status === 'ACTIVE';
}

/**
 * A pending event that could be HIGH or SEVERE cannot be ignored: it does not
 * change direction, but it does force a REVIEW until verified or dismissed.
 */
export function needsVerificationReview(ev: CalendarEvent): boolean {
  return (
    ev.verification === 'PENDING_VERIFICATION' &&
    SEVERITY_RANK[ev.severity] >= SEVERITY_RANK.HIGH &&
    (ev.status === 'UPCOMING' || ev.status === 'ACTIVE')
  );
}

// ---------------------------------------------------------------------------
// Macro calendar provider abstraction
// ---------------------------------------------------------------------------

export type MacroSourceState = 'PROVIDER' | 'CACHED' | 'MANUAL' | 'UNAVAILABLE';

export interface MacroRelease {
  event: string;
  releaseDate: string;
  releaseTime: string | null;
  timeZone: string | null;
  importance: 'LOW' | 'MEDIUM' | 'HIGH';
  previousValue?: string | null;
  expectedValue?: string | null;
  actualValue?: string | null;
}

export interface MacroCalendarResult {
  state: MacroSourceState;
  releases: MacroRelease[];
  asOf: string | null;
  message: string;
}

export interface MacroCalendarProvider {
  readonly id: string;
  fetchReleases(fromIso: string, toIso: string): Promise<MacroRelease[]>;
}

/**
 * Preferred flow: verified provider, then cached schedule, then a manual
 * override, then an explicit unavailable state. Values are never invented at any
 * step — a missing expected or actual value stays missing.
 */
export async function loadMacroCalendar(input: {
  provider?: MacroCalendarProvider | null;
  cached?: { releases: MacroRelease[]; asOf: string } | null;
  manual?: MacroRelease[] | null;
  fromIso: string;
  toIso: string;
}): Promise<MacroCalendarResult> {
  if (input.provider) {
    try {
      const releases = await input.provider.fetchReleases(input.fromIso, input.toIso);
      if (releases.length) {
        return {
          state: 'PROVIDER',
          releases,
          asOf: new Date().toISOString(),
          message: `Macro schedule loaded from ${input.provider.id}.`,
        };
      }
    } catch {
      // fall through to the cache
    }
  }
  if (input.cached?.releases.length) {
    return {
      state: 'CACHED',
      releases: input.cached.releases,
      asOf: input.cached.asOf,
      message: 'Showing the last saved macro schedule. It may be out of date.',
    };
  }
  if (input.manual?.length) {
    return {
      state: 'MANUAL',
      releases: input.manual,
      asOf: null,
      message: 'Showing the macro dates you entered yourself.',
    };
  }
  return {
    state: 'UNAVAILABLE',
    releases: [],
    asOf: null,
    message: 'No macro schedule is available, so macro event risk cannot be assessed. Nothing has been assumed.',
  };
}

export function macroToEvent(r: MacroRelease, id: string): CalendarEvent {
  const session = sessionFromEasternTime(r.releaseTime);
  return {
    id,
    kind: 'MACRO',
    title: r.event,
    eventTime: r.releaseTime ? `${r.releaseDate}T${r.releaseTime}` : null,
    eventDate: r.releaseDate,
    timeZone: r.timeZone,
    session,
    severity: r.importance === 'HIGH' ? 'HIGH' : r.importance === 'MEDIUM' ? 'MODERATE' : 'LOW',
    verification: 'VERIFIED',
    status: 'UPCOMING',
    symbols: [],
    sectors: [],
    region: 'US',
    detectedAt: null,
    eventStart: r.releaseDate,
    eventEnd: r.releaseDate,
    reviewBy: null,
    resolvedAt: r.actualValue ? r.releaseDate : null,
    quality: {
      source: 'Macro calendar',
      sourceType: 'OFFICIAL_CALENDAR',
      publishedAt: null,
      lastVerifiedAt: null,
      independentSources: null,
      confidence: 'HIGH',
    },
    importance: r.importance,
    previousValue: r.previousValue ?? null,
    expectedValue: r.expectedValue ?? null,
    actualValue: r.actualValue ?? null,
  };
}
