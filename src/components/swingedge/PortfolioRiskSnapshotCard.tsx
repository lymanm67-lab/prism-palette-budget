// Portfolio risk snapshot — the whole book read as one risk system.
//
// Three numbers always sit at the top, because a resting conditional order is not
// the same thing as a filled position:
//   Active risk | Pending risk | Maximum risk if everything triggers

import { useState } from 'react';
import { AlertTriangle, ChevronDown, Info, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  diversificationRead,
  type PortfolioRiskSnapshot,
  type RiskWarning,
} from '@/lib/swingedge/portfolioRiskSnapshot';

const money = (n: number) => `$${n.toFixed(2)}`;
const px = (n: number | null) => (n === null ? '—' : `$${n.toFixed(2)}`);

const SEVERITY_TONE: Record<RiskWarning['severity'], string> = {
  INFO: 'text-muted-foreground',
  CAUTION: 'text-prism-amber',
  CRITICAL: 'text-destructive',
};

function BigNumber({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: string;
}) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-2xl font-bold tabular-nums', tone)}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function Section({
  id,
  title,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  open: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border">
      <button
        type="button"
        onClick={() => onToggle(id)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <span className="text-sm font-semibold">{title}</span>
        <ChevronDown
          className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && <div className="border-t px-3 py-3">{children}</div>}
    </div>
  );
}

export default function PortfolioRiskSnapshotCard({
  snapshot,
  candidateSymbol,
  candidateSector,
  candidateRisk,
}: {
  snapshot: PortfolioRiskSnapshot;
  /** When set, the panel also answers "does this trade add anything?" */
  candidateSymbol?: string;
  candidateSector?: string | null;
  candidateRisk?: number | null;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setOpen((s) => ({ ...s, [id]: !s[id] }));

  const { limits } = snapshot;
  const maxTone =
    snapshot.maxRisk > limits.portfolioHighRisk
      ? 'text-destructive'
      : snapshot.maxRisk > limits.portfolioFlag
        ? 'text-prism-amber'
        : undefined;

  const diversification = candidateSymbol
    ? diversificationRead(
        { symbol: candidateSymbol, sector: candidateSector ?? null, risk: candidateRisk ?? null },
        snapshot,
      )
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          Portfolio risk snapshot
          {snapshot.warnings.some((w) => w.severity === 'CRITICAL') && (
            <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">
              Needs attention
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {snapshot.trades.length === 0 && (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-sm">
            <p className="text-muted-foreground">
              No orders recorded here yet, so these numbers read zero. Paste your Thinkorswim order rows to fill them in.
            </p>
            <a href="/swingedge/orders" className="text-prism-teal font-semibold text-xs mt-1 inline-block">
              Enter my Thinkorswim orders →
            </a>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <BigNumber
            label="Active risk"
            value={money(snapshot.activeRisk)}
            hint="Filled positions — money already exposed."
          />
          <BigNumber
            label="Pending risk"
            value={money(snapshot.pendingRisk)}
            hint="Resting conditional and working orders that have not triggered."
          />
          <BigNumber
            label="Max if everything triggers"
            value={money(snapshot.maxRisk)}
            hint={`Review level ${money(limits.portfolioFlag)} · high risk ${money(limits.portfolioHighRisk)}.`}
            tone={maxTone}
          />
        </div>

        {diversification && (
          <div className="rounded-md border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Does {candidateSymbol?.toUpperCase()} add diversification?
            </p>
            <p className={cn('mt-1 text-sm', diversification.overThemeLimit && 'text-destructive')}>
              {diversification.verdict}
            </p>
          </div>
        )}

        <Section id="themes" title="Theme risk" open={!!open.themes} onToggle={toggle}>
          {snapshot.themes.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No positions or resting orders recorded yet.
            </p>
          ) : (
            <div className="space-y-1.5">
              {snapshot.themes.map((t) => (
                <div key={t.theme} className="flex items-baseline justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    {t.label}
                    <span className="ml-1 text-[11px]">({t.symbols.join(', ')})</span>
                  </span>
                  <span
                    className={cn(
                      'text-sm font-medium tabular-nums',
                      t.overLimit && 'text-destructive',
                    )}
                  >
                    {money(t.max)} · {t.pctOfMax.toFixed(0)}%
                  </span>
                </div>
              ))}
              <p className="pt-1 text-xs text-muted-foreground">
                Theme limit {money(limits.themeRisk)}. Funds inside one theme hold similar companies
                or answer to the same drivers, so they read as one bet.
              </p>
            </div>
          )}
        </Section>

        <Section id="review" title="Trade review" open={!!open.review} onToggle={toggle}>
          {snapshot.rows.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing open or waiting.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-1 pr-2">Ticker</th>
                    <th className="py-1 pr-2">Entry</th>
                    <th className="py-1 pr-2">Stop</th>
                    <th className="py-1 pr-2">Target</th>
                    <th className="py-1 pr-2">Shares</th>
                    <th className="py-1 pr-2">Risk</th>
                    <th className="py-1 pr-2">Reward</th>
                    <th className="py-1 pr-2">R:R</th>
                    <th className="py-1 pr-2">Theme</th>
                    <th className="py-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.rows.map((r) => (
                    <tr key={r.id} className="border-t border-border/60">
                      <td className="py-1.5 pr-2 font-semibold">{r.symbol}</td>
                      <td className="py-1.5 pr-2 tabular-nums">{px(r.entry)}</td>
                      <td className="py-1.5 pr-2 tabular-nums">{px(r.stop)}</td>
                      <td className="py-1.5 pr-2 tabular-nums">{px(r.target)}</td>
                      <td className="py-1.5 pr-2 tabular-nums">{r.shares ?? '—'}</td>
                      <td className="py-1.5 pr-2 tabular-nums">{px(r.riskDollars)}</td>
                      <td className="py-1.5 pr-2 tabular-nums">{px(r.rewardDollars)}</td>
                      <td className="py-1.5 pr-2 tabular-nums">
                        {r.rewardRisk === null ? '—' : `${r.rewardRisk.toFixed(2)}:1`}
                      </td>
                      <td className="py-1.5 pr-2">{r.themeLabel}</td>
                      <td className="py-1.5">
                        <Badge variant="outline" className="text-[10px]">
                          {r.statusLabel}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="pt-2 text-xs text-muted-foreground">
                Largest single trade{' '}
                {snapshot.largestTradeRisk
                  ? `${snapshot.largestTradeRisk.symbol} ${money(snapshot.largestTradeRisk.risk)}`
                  : 'not available yet'}{' '}
                · largest theme{' '}
                {snapshot.largestThemeRisk
                  ? `${snapshot.largestThemeRisk.label} ${money(snapshot.largestThemeRisk.risk)}`
                  : 'not available yet'}
                .
              </p>
            </div>
          )}
        </Section>

        <Section
          id="warnings"
          title={`Warnings (${snapshot.warnings.length})`}
          open={!!open.warnings}
          onToggle={toggle}
        >
          {snapshot.warnings.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nothing is above a limit right now.
            </p>
          ) : (
            <div className="space-y-2">
              {snapshot.warnings.map((w, i) => (
                <div key={`${w.title}-${i}`} className="flex gap-2">
                  {w.severity === 'CRITICAL' ? (
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  ) : w.severity === 'CAUTION' ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-prism-amber" />
                  ) : (
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <div>
                    <p className={cn('text-xs font-semibold', SEVERITY_TONE[w.severity])}>
                      {w.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{w.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <div className="rounded-md border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Next action
          </p>
          <ol className="mt-1 list-decimal space-y-1 pl-4">
            {snapshot.nextActions.map((a) => (
              <li key={a} className="text-sm">
                {a}
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-muted-foreground">
            Passing technical conditions is not a reason to buy. Risk and overlap come first.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
