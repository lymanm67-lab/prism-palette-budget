/**
 * Pure helpers for building and resolving site-content keys.
 * No component / react imports allowed in this file.
 */

export const KEY_SEPARATOR = '.';

/** Build a fully-qualified content key: `namespace.field` */
export const contentKey = (namespace: string, field: string): string =>
  `${namespace}${KEY_SEPARATOR}${field}`;

/** Split a fully-qualified key back into namespace + field. */
export const splitContentKey = (key: string): { namespace: string; field: string } => {
  const idx = key.indexOf(KEY_SEPARATOR);
  if (idx === -1) return { namespace: '', field: key };
  return { namespace: key.slice(0, idx), field: key.slice(idx + KEY_SEPARATOR.length) };
};

/** A value is "blank" when it is null/undefined or only whitespace. */
export const isBlankValue = (value: unknown): boolean =>
  value === null || value === undefined || (typeof value === 'string' && value.trim() === '');

export type ContentKind = 'text' | 'longtext' | 'image';

const IMAGE_KEY_PATTERN = /(image|logo|photo|poster|avatar|screenshot|banner|icon)/i;
const LONG_TEXT_THRESHOLD = 120;

/**
 * Auto-detect the editor kind for a field from its key and default value.
 * - keys matching image/logo/photo/poster -> image
 * - long default strings -> longtext
 * - everything else -> text
 */
export function detectContentKind(key: string, defaultValue?: string): ContentKind {
  if (IMAGE_KEY_PATTERN.test(key)) return 'image';
  if (typeof defaultValue === 'string') {
    if (defaultValue.length > LONG_TEXT_THRESHOLD || defaultValue.includes('\n')) return 'longtext';
  }
  return 'text';
}

/** Turn `hero.subheadline_text` into `Hero → Subheadline Text` style labels. */
export function humanizeKey(key: string): string {
  const { field } = splitContentKey(key);
  return field
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Overlay saved values on top of a defaults object for a single namespace.
 *
 * `overrides` is keyed by fully-qualified key (`namespace.field`). Blank saved
 * values are ignored so a field never renders empty — the default wins.
 */
export function mergeNamespace<T extends Record<string, string>>(
  namespace: string,
  defaults: T,
  overrides: Record<string, string | null | undefined> | undefined,
): T {
  if (!overrides) return { ...defaults };
  const out: Record<string, string> = { ...defaults };
  for (const field of Object.keys(defaults)) {
    const saved = overrides[contentKey(namespace, field)];
    if (!isBlankValue(saved)) out[field] = String(saved);
  }
  return out as T;
}

/** Resolve a single key against saved values, falling back to the default. */
export function resolveValue(
  key: string,
  fallback: string,
  overrides: Record<string, string | null | undefined> | undefined,
): string {
  const saved = overrides?.[key];
  return isBlankValue(saved) ? fallback : String(saved);
}
