/** Role-grouped gain/loss reporting for the Five Investment Roles. */
import { ROLES, positionValue, type InvestmentRole, type PositionLike } from './roles';

export interface GainLossPosition {
  id: string;
  ticker: string;
  name: string | null;
  role: InvestmentRole;
  account_type: string;
  shares: number;
  currentPrice: number | null;
  currentValue: number;
  costBasis: number;
  basisMissing: boolean;
  gain: number;
  gainPct: number | null;
  dividendsYtd: number;
  lotCount: number;
}

export interface GainLossRoleGroup {
  role: InvestmentRole;
  positions: GainLossPosition[];
  currentValue: number;
  costBasis: number;
  gain: number;
  gainPct: number | null;
  dividendsYtd: number;
  basisMissingCount: number;
}

export interface GainLossReport {
  groups: GainLossRoleGroup[];
  totals: {
    currentValue: number;
    costBasis: number;
    gain: number;
    gainPct: number | null;
    dividendsYtd: number;
    basisMissingCount: number;
    positionCount: number;
  };
}

export interface GainLossInputPosition extends Omit<PositionLike, 'cost_basis'> {
  id: string;
  ticker: string;
  name?: string | null;
  role: string;
  account_type: string;
  shares: number;
  current_price?: number | null;
  cost_basis?: number | null;
  dividend_income_ytd?: number | null;
}

/**
 * Builds the report. `dividendsByPosition` and `lotCounts` are optional overlays
 * from recorded dividend payments and imported lots.
 */
export function buildGainLossReport(
  positions: GainLossInputPosition[],
  dividendsByPosition: Record<string, number> = {},
  lotCounts: Record<string, number> = {},
): GainLossReport {
  const rows: GainLossPosition[] = positions.map((p) => {
    const currentValue = positionValue(p);
    const costBasis = Number(p.cost_basis ?? 0);
    const basisMissing = !(costBasis > 0);
    const gain = basisMissing ? 0 : currentValue - costBasis;
    const key = p.ticker.toUpperCase();
    return {
      id: p.id,
      ticker: p.ticker,
      name: p.name ?? null,
      role: p.role as InvestmentRole,
      account_type: p.account_type,
      shares: Number(p.shares ?? 0),
      currentPrice: p.current_price ?? null,
      currentValue,
      costBasis,
      basisMissing,
      gain,
      gainPct: basisMissing ? null : (gain / costBasis) * 100,
      dividendsYtd: dividendsByPosition[p.id] ?? Number(p.dividend_income_ytd ?? 0),
      lotCount: lotCounts[p.id] ?? lotCounts[key] ?? 0,
    };
  });

  const groups: GainLossRoleGroup[] = ROLES.map((role) => {
    const list = rows.filter((r) => r.role === role).sort((a, b) => b.currentValue - a.currentValue);
    const currentValue = list.reduce((s, r) => s + r.currentValue, 0);
    const costBasis = list.reduce((s, r) => s + r.costBasis, 0);
    const gain = list.reduce((s, r) => s + r.gain, 0);
    return {
      role,
      positions: list,
      currentValue,
      costBasis,
      gain,
      gainPct: costBasis > 0 ? (gain / costBasis) * 100 : null,
      dividendsYtd: list.reduce((s, r) => s + r.dividendsYtd, 0),
      basisMissingCount: list.filter((r) => r.basisMissing).length,
    };
  });

  const currentValue = groups.reduce((s, g) => s + g.currentValue, 0);
  const costBasis = groups.reduce((s, g) => s + g.costBasis, 0);
  const gain = groups.reduce((s, g) => s + g.gain, 0);

  return {
    groups,
    totals: {
      currentValue,
      costBasis,
      gain,
      gainPct: costBasis > 0 ? (gain / costBasis) * 100 : null,
      dividendsYtd: groups.reduce((s, g) => s + g.dividendsYtd, 0),
      basisMissingCount: groups.reduce((s, g) => s + g.basisMissingCount, 0),
      positionCount: rows.length,
    },
  };
}

/** CSV export of the report, grouped by role with subtotal rows. */
export function gainLossCsv(report: GainLossReport): string {
  const head = ['Role', 'Ticker', 'Name', 'Account', 'Shares', 'Cost basis', 'Current value', 'Gain/loss', 'Gain/loss %', 'Dividends YTD'];
  const lines = [head.join(',')];
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  report.groups.forEach((g) => {
    g.positions.forEach((p) =>
      lines.push(
        [
          g.role,
          p.ticker,
          esc(p.name),
          p.account_type,
          p.shares,
          p.basisMissing ? '' : p.costBasis.toFixed(2),
          p.currentValue.toFixed(2),
          p.basisMissing ? '' : p.gain.toFixed(2),
          p.gainPct == null ? '' : p.gainPct.toFixed(2),
          p.dividendsYtd.toFixed(2),
        ].join(','),
      ),
    );
    if (g.positions.length > 0) {
      lines.push(
        [
          g.role,
          'SUBTOTAL',
          '',
          '',
          '',
          g.costBasis.toFixed(2),
          g.currentValue.toFixed(2),
          g.gain.toFixed(2),
          g.gainPct == null ? '' : g.gainPct.toFixed(2),
          g.dividendsYtd.toFixed(2),
        ].join(','),
      );
    }
  });
  const t = report.totals;
  lines.push(
    ['TOTAL', '', '', '', '', t.costBasis.toFixed(2), t.currentValue.toFixed(2), t.gain.toFixed(2), t.gainPct == null ? '' : t.gainPct.toFixed(2), t.dividendsYtd.toFixed(2)].join(','),
  );
  return lines.join('\n');
}
