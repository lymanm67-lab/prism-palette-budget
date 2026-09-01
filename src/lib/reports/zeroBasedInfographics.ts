// Infographic specs for the zero-based plan pages (Sessions 2/5/6).

import type { InfographicSpec } from '@/lib/reports/infographic';
import { monthLabel, type ForecastMonth } from '@/lib/budgeting/forecastEngine';
import type { RedirectFlow, RedirectTotals } from '@/lib/budgeting/redirects';
import type { BufferMonthResult } from '@/lib/budgeting/bufferLedger';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const money2 = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

/** 12/24/60-month forecast one-pager. */
export function forecastInfographic(args: {
  months: ForecastMonth[];
  horizon: number;
  debtStart: number;
  debtEnd: number;
  wealthContributed: number;
}): InfographicSpec {
  const { months, horizon, debtStart, debtEnd, wealthContributed } = args;
  const last = months[months.length - 1];

  const milestones = months
    .flatMap((m) => m.flags.map((f) => ({ month: m.month, ...f })))
    .slice(0, 14);

  const step = Math.max(1, Math.floor(months.length / 12));
  const sampled = months.filter((_, i) => i % step === 0 || i === months.length - 1);

  return {
    title: 'ZERO-BASED FORECAST',
    period: `${monthLabel(months[0].month)} – ${monthLabel(last.month)} · ${horizon} months`,
    tagline: 'Every dollar has a job. Freed cash gets redirected, never absorbed.',
    glanceTitle: 'At a glance',
    glance: [
      { label: 'Debt today', value: money(debtStart), tone: 'red' },
      { label: `Debt in ${horizon} mo`, value: money(debtEnd), tone: 'green' },
      { label: 'Debt eliminated', value: money(Math.max(0, debtStart - debtEnd)), tone: 'green' },
      { label: 'Wealth contributed', value: money(wealthContributed), tone: 'blue' },
    ],
    kpis: [
      { title: 'Ending buffer', value: money(last.bufferEnding), tone: 'blue' },
      { title: 'Travel fund', value: money(last.travelFund), tone: 'orange' },
      { title: 'Build Wealth / mo', value: money2(last.buildWealthCombined), tone: 'green' },
      { title: 'Debt payments / mo', value: money2(last.eliminateDebt), tone: 'red' },
    ],
    trend: {
      title: 'Debt down, buffer up',
      points: sampled.map((m) => ({
        label: monthLabel(m.month).replace(' ', "'").slice(0, 6),
        primary: Math.round(m.debtBalances.reduce((s, d) => s + d.balance, 0)),
        secondary: Math.round(m.bufferEnding),
      })),
      primaryLabel: 'Total debt',
      secondaryLabel: 'Buffer',
    },
    tables: [
      {
        title: 'Allocation by month',
        tone: 'navy',
        width: '3.9in',
        columns: [
          { label: 'Month' },
          { label: 'Live', align: 'right' },
          { label: 'Wealth', align: 'right' },
          { label: 'Debt', align: 'right' },
        ],
        rows: sampled.map((m) => [
          monthLabel(m.month),
          money(m.live),
          money(m.buildWealthCombined),
          money(m.eliminateDebt),
        ]),
      },
      {
        title: 'Change flags',
        tone: 'orange',
        columns: [{ label: 'Month' }, { label: 'What changes' }],
        rows: milestones.map((f) => [monthLabel(f.month), f.detail]),
        emptyMessage: 'No scheduled changes in this window.',
      },
    ],
    commitment: {
      label: 'The rule',
      text: 'Freed cash flows to PSLF, the vacation snowball, the Travel Fund and Build Wealth — not into lifestyle.',
    },
    slogan: 'PrismMoney™',
    disclaimer: 'Projection only. Actual results depend on income, rates and spending.',
    zoom: 0.92,
    format: 'letter-portrait',
  };
}

/** Money Redirects one-pager. */
export function redirectsInfographic(flows: RedirectFlow[], totals: RedirectTotals): InfographicSpec {
  return {
    title: 'MONEY REDIRECTS',
    period: 'Freed cash flow map',
    tagline: 'Every ended payment already has a destination.',
    glanceTitle: 'Where freed cash goes',
    glance: [
      { label: 'Total freed', value: money2(totals.totalFreed), tone: 'navy' },
      { label: 'Eliminate Debt', value: money2(totals.toDebt), tone: 'red' },
      { label: 'Build Wealth', value: money2(totals.toWealth), tone: 'green' },
      { label: 'Enjoy / Travel', value: money2(totals.toEnjoy), tone: 'orange' },
      { label: 'Needs a job', value: money2(totals.needsJob), tone: 'grey' },
    ],
    donut: {
      title: 'Redirect allocation',
      totalLabel: 'Freed cash',
      slices: [
        { label: 'Eliminate Debt', value: totals.toDebt },
        { label: 'Build Wealth', value: totals.toWealth },
        { label: 'Enjoy / Travel', value: totals.toEnjoy },
        { label: 'Live', value: totals.toLive },
        { label: 'Business', value: totals.toBusiness },
        { label: 'Needs a job', value: totals.needsJob },
      ].filter((s) => s.value > 0),
    },
    tables: flows.map((f) => ({
      title: `${f.sourceLabel} — ${money2(f.sourceAmount)}`,
      tone: 'blue' as const,
      columns: [{ label: 'Target' }, { label: 'Amount', align: 'right' as const }, { label: 'Starts' }],
      rows: f.legs.map((l) => [l.targetLabel, money2(l.amount), monthLabel(l.startMonth)]),
      footerNote: f.unassigned > 0.01 ? `${money2(f.unassigned)} still needs a job` : 'Fully assigned',
      footerTone: f.unassigned > 0.01 ? ('orange' as const) : ('green' as const),
    })),
    slogan: 'PrismMoney™',
    zoom: 0.92,
  };
}

/** Buffer ledger one-pager. */
export function bufferInfographic(rolled: BufferMonthResult[]): InfographicSpec {
  const last = rolled[rolled.length - 1];
  return {
    title: 'CASH BUFFER LEDGER',
    period: rolled.length ? `${monthLabel(rolled[0].month)} – ${monthLabel(last.month)}` : '',
    tagline: 'Only the ending balance counts toward the month.',
    glance: last
      ? [
          { label: 'Ending balance', value: money2(last.endingBalance), tone: 'navy' },
          { label: 'Status', value: last.status.toUpperCase(), tone: last.status === 'healthy' ? 'green' : 'orange' },
        ]
      : [],
    tables: [
      {
        title: 'Buffer by month',
        tone: 'navy',
        columns: [
          { label: 'Month' },
          { label: 'Starting', align: 'right' },
          { label: 'Additions', align: 'right' },
          { label: 'Withdrawals', align: 'right' },
          { label: 'One-time', align: 'right' },
          { label: 'Ending', align: 'right' },
        ],
        rows: rolled.map((r) => [
          monthLabel(r.month),
          money2(r.startingBalance),
          money2(r.additions),
          money2(r.withdrawals),
          money2(r.oneTimeTotal),
          money2(r.endingBalance),
        ]),
        emptyMessage: 'No buffer months recorded.',
      },
    ],
    slogan: 'PrismMoney™',
    zoom: 0.95,
  };
}
