// Freed Cash Engine — Phase 4 analytics.
//
// Everything here is derived from the sources / redirects / reviews already
// stored by phases 1-3. No new tables: history, vendor rollups, Keep Score,
// business ROI, opportunity cost and before/after are all computed views.

import {
  FreedCashRedirect,
  FreedCashReview,
  FreedCashSource,
  destinationLabel,
  monthlySavings,
} from '@/hooks/use-freed-cash';

const round2 = (n: number) => Math.round(n * 100) / 100;

/* ------------------------------------------------------------------ timeline */

export interface TimelineEvent {
  date: string;
  kind: 'effective' | 'verified' | 'reversed' | 'renewal' | 'resume' | 'redirect';
  title: string;
  detail: string;
  monthly: number;
}

export function buildTimeline(
  sources: FreedCashSource[],
  redirects: FreedCashRedirect[],
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const s of sources) {
    const m = round2(monthlySavings(s));
    if (s.effective_date) {
      events.push({
        date: s.effective_date,
        kind: 'effective',
        title: `${s.name} change took effect`,
        detail: s.vendor ? `Vendor: ${s.vendor}` : 'Recurring expense changed',
        monthly: m,
      });
    }
    if (s.verified_at) {
      events.push({
        date: s.verified_at.slice(0, 10),
        kind: 'verified',
        title: `${s.name} verified`,
        detail: s.verification_method
          ? `Confirmed via ${s.verification_method.replace(/_/g, ' ')}`
          : 'Savings confirmed',
        monthly: m,
      });
    }
    if (s.status === 'reversed') {
      events.push({
        date: (s.statement_checked_date || s.effective_date || '').slice(0, 10),
        kind: 'reversed',
        title: `${s.name} reversed`,
        detail: 'Savings removed — expense came back',
        monthly: -m,
      });
    }
    if (s.next_renewal_date) {
      events.push({
        date: s.next_renewal_date,
        kind: 'renewal',
        title: `${s.name} renews`,
        detail:
          s.renewal_amount != null
            ? `Renewal amount $${Number(s.renewal_amount).toFixed(2)}`
            : 'Renewal date on watch',
        monthly: 0,
      });
    }
    if (s.is_temporary && s.resume_date) {
      events.push({
        date: s.resume_date,
        kind: 'resume',
        title: `${s.name} pause ends`,
        detail: 'Savings stop unless the pause is extended',
        monthly: -m,
      });
    }
  }

  for (const r of redirects) {
    events.push({
      date: r.start_date,
      kind: 'redirect',
      title: `Redirect to ${destinationLabel(r.destination_type)}`,
      detail: r.destination_label || (r.confirmed_moved ? 'Confirmed moved' : 'Not yet confirmed'),
      monthly: round2(Number(r.monthly_amount)),
    });
  }

  return events.filter((e) => !!e.date).sort((a, b) => b.date.localeCompare(a.date));
}

/* -------------------------------------------------------------------- vendor */

export interface VendorRow {
  vendor: string;
  count: number;
  verifiedMonthly: number;
  pipelineMonthly: number;
  reversedMonthly: number;
  annualVerified: number;
  reversals: number;
  highRisk: number;
}

export function vendorRollup(sources: FreedCashSource[]): VendorRow[] {
  const map = new Map<string, VendorRow>();

  for (const s of sources) {
    const key = (s.vendor || s.name || 'Unknown').trim();
    const row =
      map.get(key) ??
      {
        vendor: key,
        count: 0,
        verifiedMonthly: 0,
        pipelineMonthly: 0,
        reversedMonthly: 0,
        annualVerified: 0,
        reversals: 0,
        highRisk: 0,
      };
    const m = monthlySavings(s);
    row.count += 1;
    if (s.status === 'verified') row.verifiedMonthly += m;
    else if (s.status === 'reversed') {
      row.reversedMonthly += m;
      row.reversals += 1;
    } else row.pipelineMonthly += m;
    if (s.reactivation_risk === 'high') row.highRisk += 1;
    row.annualVerified = row.verifiedMonthly * 12;
    map.set(key, row);
  }

  return [...map.values()]
    .map((r) => ({
      ...r,
      verifiedMonthly: round2(r.verifiedMonthly),
      pipelineMonthly: round2(r.pipelineMonthly),
      reversedMonthly: round2(r.reversedMonthly),
      annualVerified: round2(r.annualVerified),
    }))
    .sort((a, b) => b.verifiedMonthly - a.verifiedMonthly);
}

/* ---------------------------------------------------------------- keep score */

export interface KeepScoreRow {
  source: FreedCashSource;
  score: number;
  verdict: 'cut' | 'review' | 'keep';
  reasons: string[];
  monthlyCost: number;
  annualCost: number;
}

/**
 * Keep Score grades the expense that is STILL being paid (the new amount).
 * Lower score = weaker claim on the plan = better cut candidate.
 */
export function keepScore(sources: FreedCashSource[]): KeepScoreRow[] {
  return sources
    .map((s) => {
      const monthlyCost = round2(
        Number(s.new_amount) *
          (s.billing_frequency === 'annual'
            ? 1 / 12
            : s.billing_frequency === 'semiannual'
              ? 1 / 6
              : s.billing_frequency === 'quarterly'
                ? 1 / 3
                : s.billing_frequency === 'weekly'
                  ? 4.33
                  : s.billing_frequency === 'biweekly'
                    ? 2.1667
                    : 1),
      );
      const reasons: string[] = [];
      let score = 50;

      if (s.classification === 'essential') {
        score += 30;
        reasons.push('Classified essential');
      } else {
        score -= 15;
        reasons.push('Classified optional');
      }

      if (s.entity_scope === 'business') {
        score += 10;
        reasons.push('Business expense — judge on ROI');
      }

      if (monthlyCost >= 100) {
        score -= 20;
        reasons.push('Costs $100+/mo — high bar to justify');
      } else if (monthlyCost >= 25) {
        score -= 8;
        reasons.push('Mid-size recurring cost');
      }

      if (s.reactivation_risk === 'high') {
        score -= 10;
        reasons.push('High reactivation risk');
      }

      if (s.status === 'reversed') {
        score -= 15;
        reasons.push('Savings already reversed once');
      }

      if (s.status === 'verified') {
        score += 10;
        reasons.push('Savings verified on a statement');
      }

      score = Math.max(0, Math.min(100, score));
      const verdict: KeepScoreRow['verdict'] = score < 40 ? 'cut' : score < 65 ? 'review' : 'keep';

      return { source: s, score, verdict, reasons, monthlyCost, annualCost: round2(monthlyCost * 12) };
    })
    .sort((a, b) => a.score - b.score);
}

/* --------------------------------------------------------------- business ROI */

export interface BusinessRoiRow {
  source: FreedCashSource;
  monthlyCost: number;
  annualCost: number;
  verdict: string;
}

export function businessRoi(rows: KeepScoreRow[]): BusinessRoiRow[] {
  return rows
    .filter((r) => r.source.entity_scope === 'business')
    .map((r) => ({
      source: r.source,
      monthlyCost: r.monthlyCost,
      annualCost: r.annualCost,
      verdict:
        r.monthlyCost <= 0
          ? 'Fully eliminated — no ongoing cost'
          : r.verdict === 'cut'
            ? 'Must prove it earns more than it costs, or cut'
            : r.verdict === 'review'
              ? 'Re-justify at the next review'
              : 'Earning its place',
    }))
    .sort((a, b) => b.monthlyCost - a.monthlyCost);
}

/* ----------------------------------------------------------- opportunity cost */

export interface OpportunityProjection {
  years: number;
  contributed: number;
  value: number;
  growth: number;
}

/** Future value of redirecting `monthly` at an annual return, compounded monthly. */
export function opportunityCost(
  monthly: number,
  annualReturnPct = 7,
  horizons: number[] = [1, 5, 10, 20, 25],
): OpportunityProjection[] {
  const r = annualReturnPct / 100 / 12;
  return horizons.map((years) => {
    const n = years * 12;
    const value = r === 0 ? monthly * n : monthly * ((Math.pow(1 + r, n) - 1) / r);
    const contributed = monthly * n;
    return {
      years,
      contributed: round2(contributed),
      value: round2(value),
      growth: round2(value - contributed),
    };
  });
}

/* ------------------------------------------------------------- before / after */

export interface BeforeAfter {
  beforeMonthly: number;
  afterMonthly: number;
  savedMonthly: number;
  savedAnnual: number;
  reductionPct: number;
  verifiedShare: number;
}

export function beforeAfter(sources: FreedCashSource[]): BeforeAfter {
  const perMonth = (amount: number, freq: string) =>
    amount *
    (freq === 'annual'
      ? 1 / 12
      : freq === 'semiannual'
        ? 1 / 6
        : freq === 'quarterly'
          ? 1 / 3
          : freq === 'weekly'
            ? 4.33
            : freq === 'biweekly'
              ? 2.1667
              : 1);

  const live = sources.filter((s) => s.status !== 'reversed');
  const beforeMonthly = live.reduce((s, x) => s + perMonth(Number(x.original_amount), x.billing_frequency), 0);
  const afterMonthly = live.reduce(
    (s, x) => s + perMonth(Number(x.new_amount) + Number(x.added_fees), x.billing_frequency),
    0,
  );
  const savedMonthly = Math.max(0, beforeMonthly - afterMonthly);
  const verified = live
    .filter((s) => s.status === 'verified')
    .reduce((s, x) => s + monthlySavings(x), 0);

  return {
    beforeMonthly: round2(beforeMonthly),
    afterMonthly: round2(afterMonthly),
    savedMonthly: round2(savedMonthly),
    savedAnnual: round2(savedMonthly * 12),
    reductionPct: beforeMonthly > 0 ? round2((savedMonthly / beforeMonthly) * 100) : 0,
    verifiedShare: savedMonthly > 0 ? round2((verified / savedMonthly) * 100) : 0,
  };
}

/* ------------------------------------------------------------ recurring creep */

export interface CreepPoint {
  month: string;
  verifiedMonthly: number;
  redirectedMonthly: number;
  captureRate: number;
}

export function creepTrend(reviews: FreedCashReview[]): CreepPoint[] {
  return [...reviews]
    .sort((a, b) => a.review_month.localeCompare(b.review_month))
    .map((r) => ({
      month: r.review_month.slice(0, 7),
      verifiedMonthly: Number(r.verified_monthly),
      redirectedMonthly: Number(r.redirected_monthly),
      captureRate: Number(r.capture_rate),
    }));
}
