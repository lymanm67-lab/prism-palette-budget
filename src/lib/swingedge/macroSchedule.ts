// SwingEdge — built-in US macro schedule.
//
// Data integrity rule: nothing here claims to be an official calendar. Two US
// releases follow a published cadence that can be derived (the employment
// report lands on the first Friday of a month, CPI in the middle of it), so
// those dates are produced as ESTIMATES and labelled that way. Anything with an
// irregular schedule — FOMC decisions, unscheduled announcements — is not
// guessed at here; it must come from a verified provider or manual entry.

import {
  macroToEvent,
  type CalendarEvent,
  type MacroRelease,
} from './eventCalendar';

const DAY_MS = 86_400_000;

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** First Friday of the given month (UTC). */
function firstFriday(year: number, month: number): Date {
  const d = new Date(Date.UTC(year, month, 1));
  while (d.getUTCDay() !== 5) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

/**
 * Mid-month CPI slot. The release is published between the 10th and 15th; we
 * take the 13th as the centre of that band and label the date estimated.
 */
function cpiSlot(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 13));
}

export const MACRO_ESTIMATE_NOTE =
  'This date is derived from the published release cadence, not from an official calendar feed. Confirm it before it matters to a trade.';

/**
 * Derives the estimated macro releases between two dates. Titles carry the
 * "estimated date" wording so no screen can present these as confirmed.
 */
export function derivedMacroReleases(fromIso: string, toIso: string): MacroRelease[] {
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);
  if (Number.isNaN(from) || Number.isNaN(to) || to < from) return [];

  const out: MacroRelease[] = [];
  const start = new Date(from);
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));

  while (cursor.getTime() <= to + 31 * DAY_MS) {
    const y = cursor.getUTCFullYear();
    const m = cursor.getUTCMonth();

    const jobs = firstFriday(y, m);
    const cpi = cpiSlot(y, m);

    for (const [date, event] of [
      [jobs, 'US employment report (estimated date)'],
      [cpi, 'US consumer price index (estimated date)'],
    ] as const) {
      const t = date.getTime();
      if (t >= from && t <= to) {
        out.push({
          event,
          releaseDate: iso(date),
          releaseTime: '08:30',
          timeZone: 'America/New_York',
          importance: 'HIGH',
          previousValue: null,
          expectedValue: null,
          actualValue: null,
        });
      }
    }
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return out.sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
}

/**
 * Converts derived releases into calendar events. They are marked
 * PENDING_VERIFICATION with an AGGREGATOR-grade source, so the event engine
 * treats them as unconfirmed rather than as facts.
 */
export function derivedMacroEvents(fromIso: string, toIso: string): CalendarEvent[] {
  return derivedMacroReleases(fromIso, toIso).map((r, i) => {
    const ev = macroToEvent(r, `macro-derived-${r.releaseDate}-${i}`);
    return {
      ...ev,
      verification: 'PENDING_VERIFICATION',
      quality: {
        ...ev.quality,
        source: 'Built-in release cadence',
        sourceType: 'AGGREGATOR',
        confidence: 'MODERATE',
      },
      note: MACRO_ESTIMATE_NOTE,
    };
  });
}
