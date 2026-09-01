import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import InlineEditCell from '@/components/InlineEditCell';
import { useCurrency } from '@/hooks/use-currency';
import { usePurposeLedger } from '@/hooks/use-purpose-ledger';
import { useLayerAAssignments, type LayerAField } from '@/hooks/use-layer-a-assignments';
import { overallocationCauses } from '@/lib/budgeting/blueprint5010';
import type { MoneyPurposeSnapshot } from '@/hooks/use-money-purpose';
import { cn } from '@/lib/utils';
import { AlertTriangle, ArrowRight, CheckCircle2, HelpCircle, Layers } from 'lucide-react';

interface Props {
  snap: MoneyPurposeSnapshot;
  month: string;
}

/**
 * LAYER A — Total Cash Flow, zero-based.
 *
 * Take-home minus every job a dollar was given (Live, Enjoy, Build Wealth from
 * take-home, Eliminate Debt, Business, sinking funds, Buffer, one-time
 * expenses) must equal $0.00. Money parked in Buffer, a sinking fund, HSA or a
 * brokerage HAS a job — only genuinely unassigned dollars show as unassigned.
 */
const ASSIGN_TARGETS = [
  { label: 'Build Wealth', href: '/planning/investments' },
  { label: 'Debt snowball', href: '/debt-payoff' },
  { label: 'Vacation Fund', href: '/planning/travel-fund' },
  { label: 'HSA', href: '/planning/retirement' },
  { label: 'Buffer', href: '/planning/budget' },
];

export default function ZeroBasedCashPanel({ snap, month }: Props) {
  const { formatCurrency } = useCurrency();
  const r = snap.blueprint.reconciliation;
  const ledger = usePurposeLedger(month);

  const unidentified = ledger.excluded.find((e) => e.label === 'Unclassified');
  const causes = overallocationCauses(snap.blueprint.cards, r);
  const assigned = r.lines.reduce((s, l) => s + l.amount, 0);
  const balanced = Math.abs(r.unassigned) < 0.005;

  return (
    <div className="space-y-4">
      {/* Unassigned cash banner */}
      <Card
        className={cn(
          'border-2',
          balanced
            ? 'border-emerald-500/40 bg-emerald-500/5'
            : r.overallocated
              ? 'border-red-500/40 bg-red-500/5'
              : 'border-amber-500/50 bg-amber-500/5',
        )}
      >
        <CardContent className="space-y-3 p-4">
          {balanced ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="font-display text-base font-bold">UNASSIGNED CASH: {formatCurrency(0)}</p>
                <p className="text-xs text-muted-foreground">
                  Every dollar has a job this month. Money in Buffer, sinking funds, HSA and investments counts
                  as assigned — it does not need to be spent.
                </p>
              </div>
            </div>
          ) : r.overallocated ? (
            <>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="font-display text-base font-bold text-red-600 dark:text-red-400">
                    Budget Overallocated by {formatCurrency(Math.abs(r.unassigned))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    More was assigned than came in. These buckets are above their target:
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {causes.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    No single bucket is above target — the total simply exceeds take-home pay.
                  </span>
                ) : (
                  causes.map((c) => (
                    <Badge key={c.label} variant="outline" className="text-[10px]">
                      {c.label} +{formatCurrency(c.amount)}
                      {c.intentional ? ' · intentional' : ''}
                    </Badge>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="font-display text-base font-bold text-amber-600 dark:text-amber-400">
                    UNASSIGNED CASH: {formatCurrency(r.unassigned)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    You have {formatCurrency(r.unassigned)} left to assign. Give it a job — parking it counts.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ASSIGN_TARGETS.map((t) => (
                  <Button key={t.label} size="sm" variant="outline" className="h-7 text-[11px]" asChild>
                    <a href={t.href}>
                      {t.label}
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </a>
                  </Button>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Layer A statement */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-display flex items-center gap-2 text-sm">
            <Layers className="h-4 w-4 text-primary" />
            Layer A — Total Cash Flow
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Everything that affects available cash, including business money and reserves. This layer reconciles
            to $0 unassigned; the 45/10/25/20 scorecard measures personal money only.
          </p>
        </CardHeader>
        <CardContent className="space-y-1.5 text-xs">
          <div className="flex justify-between rounded bg-muted/40 px-2 py-1.5 font-medium">
            <span>Take-home income</span>
            <span className="tabular-nums">{formatCurrency(r.netIncome)}</span>
          </div>
          {r.lines.map((l) => (
            <div key={l.key} className="flex justify-between px-2 py-1">
              <span>− {l.label}</span>
              <span className="tabular-nums">{formatCurrency(l.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t px-2 py-1 text-muted-foreground">
            <span>Total assigned</span>
            <span className="tabular-nums">{formatCurrency(Math.round(assigned * 100) / 100)}</span>
          </div>
          <div
            className={cn(
              'flex justify-between rounded border px-2 py-2 font-semibold',
              balanced
                ? 'border-emerald-500/30 bg-emerald-500/10'
                : r.overallocated
                  ? 'border-red-500/30 bg-red-500/10'
                  : 'border-amber-500/30 bg-amber-500/10',
            )}
          >
            <span>Unassigned cash</span>
            <span className="tabular-nums">{formatCurrency(r.unassigned)}</span>
          </div>

          {(r.sinkingFunds === 0 || r.bufferAssignment === 0) && (
            <p className="flex gap-1.5 pt-1 text-[10px] text-muted-foreground">
              <HelpCircle className="mt-px h-3 w-3 shrink-0" />
              {r.sinkingFunds === 0 && 'Sinking fund contribution: Amount Needed. '}
              {r.bufferAssignment === 0 && 'Buffer assignment: Amount Needed. '}
              Nothing is invented here — untracked jobs stay at $0.00 until you set them.
            </p>
          )}

          {unidentified && unidentified.total > 0 && (
            <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                Unidentified Category Amount: {formatCurrency(unidentified.total)}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {unidentified.count} transaction{unidentified.count === 1 ? '' : 's'} have no Money Purpose yet, so
                they are not counted in any bucket. Categorize them and every subtotal will tie to its line items.
              </p>
              <Button size="sm" variant="outline" className="mt-2 h-7 text-[11px]" asChild>
                <a href="/transactions">Categorize now</a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
