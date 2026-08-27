// ---------------------------------------------------------------------------
// Read-only LTC tax report sharing.
//
// The whole report is derived from a handful of inputs, so a share link only
// needs to carry those inputs — nothing is written to the database and no
// household data leaves the report. The recipient gets a locked, read-only
// view (no editing controls) that can still export PDF and CSV.
// ---------------------------------------------------------------------------

import type { LtcExportOptions } from './exports';

export const LTC_SHARE_PATH = '/ltc/tax-report';
export const LTC_SHARE_PARAM = 'd';

function toBase64Url(s: string) {
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(s)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export interface LtcSharePayload extends LtcExportOptions {
  /** Payload version, so older links keep working. */
  v: 1;
  /** ISO date the link was generated. */
  createdAt: string;
  /** Optional label shown in the report header. */
  title?: string;
}

export function encodeLtcTaxShare(opts: LtcExportOptions, title?: string): string {
  const payload: LtcSharePayload = { v: 1, createdAt: new Date().toISOString(), title, ...opts };
  return toBase64Url(JSON.stringify(payload));
}

export function decodeLtcTaxShare(encoded: string | null): LtcSharePayload | null {
  if (!encoded) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(encoded));
    if (!parsed || parsed.v !== 1) return null;
    return parsed as LtcSharePayload;
  } catch {
    return null;
  }
}

/** Absolute URL for a locked, read-only LTC tax report. */
export function buildLtcTaxShareUrl(opts: LtcExportOptions, title?: string): string {
  return `${window.location.origin}${LTC_SHARE_PATH}?${LTC_SHARE_PARAM}=${encodeLtcTaxShare(opts, title)}`;
}
