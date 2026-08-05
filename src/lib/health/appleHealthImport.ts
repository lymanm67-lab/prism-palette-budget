// Apple Health "Export All Health Data" parser.
// Works entirely in the browser: reads export.xml (or the .zip that contains it)
// and rolls HealthKit records up into one row per calendar day so they can be
// merged into health_daily_logs / health_vitals.
//
// Pacer, Fitbit, Garmin and Apple Watch all write into Apple Health, so their
// steps/distance/sleep flow through this same file.

import { unzipSync, strFromU8 } from 'fflate';

export type ImportedDay = {
  log_date: string;
  steps?: number;
  miles?: number;
  active_minutes?: number;
  weight?: number;
  sleep_hours?: number;
  resting_heart_rate?: number;
  protein_g?: number;
  water_oz?: number;
};

export type ParseSummary = {
  days: ImportedDay[];
  recordCount: number;
  firstDate?: string;
  lastDate?: string;
  types: string[];
};

const TYPE_MAP: Record<string, keyof ImportedDay> = {
  HKQuantityTypeIdentifierStepCount: 'steps',
  HKQuantityTypeIdentifierDistanceWalkingRunning: 'miles',
  HKQuantityTypeIdentifierAppleExerciseTime: 'active_minutes',
  HKQuantityTypeIdentifierBodyMass: 'weight',
  HKCategoryTypeIdentifierSleepAnalysis: 'sleep_hours',
  HKQuantityTypeIdentifierRestingHeartRate: 'resting_heart_rate',
  HKQuantityTypeIdentifierDietaryProtein: 'protein_g',
  HKQuantityTypeIdentifierDietaryWater: 'water_oz',
};

// Fields that accumulate across the day vs. fields we average / take latest of.
const SUM_FIELDS = new Set<keyof ImportedDay>([
  'steps',
  'miles',
  'active_minutes',
  'sleep_hours',
  'protein_g',
  'water_oz',
]);

function toISODate(raw: string): string | null {
  // Apple format: "2026-07-14 06:31:02 -0400"
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function convert(field: keyof ImportedDay, value: number, unit: string): number {
  const u = unit.toLowerCase();
  switch (field) {
    case 'miles':
      if (u === 'km') return value * 0.621371;
      if (u === 'm') return value * 0.000621371;
      return value; // mi
    case 'weight':
      if (u === 'kg') return value * 2.20462;
      if (u === 'st') return value * 14;
      return value; // lb
    case 'water_oz':
      if (u === 'ml') return value * 0.033814;
      if (u === 'l') return value * 33.814;
      return value; // fl_oz_us
    case 'active_minutes':
      if (u === 'sec' || u === 's') return value / 60;
      if (u === 'hr' || u === 'h') return value * 60;
      return value; // min
    default:
      return value;
  }
}

const RECORD_RE = /<Record\b[^>]*\/?>/g;
const ATTR_RE = /(\w+)="([^"]*)"/g;

/** Extracts export.xml from a File that may be either the xml or the export zip. */
export async function readAppleHealthFile(file: File): Promise<string> {
  const isZip = file.name.toLowerCase().endsWith('.zip');
  if (!isZip) return await file.text();

  const buf = new Uint8Array(await file.arrayBuffer());
  const files = unzipSync(buf, {
    filter: (f) => /export\.xml$/i.test(f.name) && !/__MACOSX/.test(f.name),
  });
  const key = Object.keys(files).find((k) => /export\.xml$/i.test(k));
  if (!key) {
    throw new Error(
      'No export.xml found in that zip. Use the "Export All Health Data" file from the Health app.',
    );
  }
  return strFromU8(files[key]);
}

export function parseAppleHealthXml(xml: string): ParseSummary {
  const buckets = new Map<
    string,
    Partial<Record<keyof ImportedDay, { total: number; last: number; count: number }>>
  >();
  const typesSeen = new Set<string>();
  let recordCount = 0;

  const matches = xml.match(RECORD_RE) ?? [];
  for (const tag of matches) {
    ATTR_RE.lastIndex = 0;
    const attrs: Record<string, string> = {};
    let a: RegExpExecArray | null;
    while ((a = ATTR_RE.exec(tag))) attrs[a[1]] = a[2];

    const field = TYPE_MAP[attrs.type];
    if (!field) continue;

    const date = toISODate(attrs.startDate ?? attrs.creationDate ?? '');
    if (!date) continue;

    let value: number;
    if (field === 'sleep_hours') {
      // Sleep records carry a state value, not a number: derive duration.
      if (!attrs.startDate || !attrs.endDate) continue;
      if (/Awake/i.test(attrs.value ?? '')) continue;
      const ms =
        new Date(attrs.endDate.replace(' ', 'T').replace(/ ([+-]\d{4})$/, '$1')).getTime() -
        new Date(attrs.startDate.replace(' ', 'T').replace(/ ([+-]\d{4})$/, '$1')).getTime();
      if (!Number.isFinite(ms) || ms <= 0) continue;
      value = ms / 3_600_000;
    } else {
      value = Number(attrs.value);
      if (!Number.isFinite(value)) continue;
      value = convert(field, value, attrs.unit ?? '');
    }

    typesSeen.add(attrs.type);
    recordCount += 1;

    const day = buckets.get(date) ?? {};
    const slot = day[field] ?? { total: 0, last: 0, count: 0 };
    slot.total += value;
    slot.last = value;
    slot.count += 1;
    day[field] = slot;
    buckets.set(date, day);
  }

  const days: ImportedDay[] = [...buckets.entries()]
    .map(([log_date, fields]) => {
      const row: ImportedDay = { log_date };
      (Object.keys(fields) as (keyof ImportedDay)[]).forEach((f) => {
        const slot = fields[f]!;
        const raw = SUM_FIELDS.has(f) ? slot.total : slot.last;
        (row as any)[f] = f === 'steps' ? Math.round(raw) : Math.round(raw * 100) / 100;
      });
      return row;
    })
    .sort((x, y) => (x.log_date < y.log_date ? 1 : -1));

  return {
    days,
    recordCount,
    firstDate: days.length ? days[days.length - 1].log_date : undefined,
    lastDate: days.length ? days[0].log_date : undefined,
    types: [...typesSeen].sort(),
  };
}

export const LAST_IMPORT_KEY = 'prism.health.appleHealth.lastImport';

export type LastImport = { at: string; days: number; from?: string; to?: string };

export function readLastImport(): LastImport | null {
  try {
    const raw = localStorage.getItem(LAST_IMPORT_KEY);
    return raw ? (JSON.parse(raw) as LastImport) : null;
  } catch {
    return null;
  }
}

export function writeLastImport(info: LastImport) {
  try {
    localStorage.setItem(LAST_IMPORT_KEY, JSON.stringify(info));
  } catch {
    /* storage unavailable — non-fatal */
  }
}
