import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ChevronDown, ChevronRight, Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCurrency } from '@/hooks/use-currency';
import { useBudgetActual } from '@/hooks/use-budget-actual';
import { BUDGET_ACTUAL_PILLARS, overBudgetExpenseLines, type BudgetActualMode, type BudgetActualPillarKey } from '@/lib/budgeting/budgetActual';
import { Button } from '@/components/ui/button';

interface FixSuggestion {
  text: string;
  link?: { to: string; label: string };
}

/** Tailored ways to fix an over-budget category, based on its name and how far over it is. */
function suggestFixes(name: string, over: number, budgeted: number, fmt: (n: number) => string): FixSuggestion[] {
  const n = name.toLowerCase();
  const pctOver = budgeted > 0 ? over / budgeted : 1;
  const fixes: FixSuggestion[] = [];

  if (/subscri|netflix|sirius|spotify|hulu|stream|gym|member|audible|patreon|icloud|prime/.test(n)) {
    fixes.push({ text: 'Cancel, downgrade, or negotiate this recurring charge.', link: { to: '/subscriptions', label: 'Open Subscriptions' } });
  } else if (/dining|restaurant|fast food|coffee|takeout|grocer/.test(n)) {
    fixes.push({ text: 'Trim this discretionary spend — check the leak list for ideas.', link: { to: '/coach', label: 'Open Money Coach' } });
  } else if (/guilt|fun|entertain|hobby|shopping|cloth/.test(n)) {
    fixes.push({ text: `Pause new spending here for the rest of the month, or move ${fmt(over)} from next month's guilt-free plan.` });
  }

  if (pctOver <= 0.1 || over < 25) {
    fixes.push({ text: `Small overage — raise the planned amount by ${fmt(over)} so the budget matches reality.` });
  } else {
    fixes.push({ text: `Cover the ${fmt(over)} overage by redirecting from Guilt-Free spending or this month's Five-Bucket surplus.` });
  }
  return fixes.slice(0, 2);
}

const PILLAR_COLOR: Record<BudgetActualPillarKey, string> = Object.fromEntries(
  BUDGET_ACTUAL_PILLARS.map(def => [def.key, def.color])
) as Record<BudgetActualPillarKey, string>;

const PILLAR_LABEL: Record<BudgetActualPillarKey, string> = Object.fromEntries(
  BUDGET_ACTUAL_PILLARS.map(def => [def.key, def.label])
) as Record<BudgetActualPillarKey, string>;

interface Props {
  month: string; // YYYY-MM
  budgetType: 'personal' | 'business' | 'all';
}

export default function OverBudgetGlance({ month, budgetType }: Props) {
  const { formatCurrency } = useCurrency();
  const [open, setOpen] = useState(true);
  const panelId = `over-budget-glance-${month}`;
  // Split expenses (e.g. rent personal/business) must be judged on the combined total.
  void budgetType;
  const mode: BudgetActualMode = 'combined';
  const { data, isLoading } = useBudgetActual(month, mode);

  const over = useMemo(() => {
    if (!data) return [];
    return overBudgetExpenseLines([...data.pillars.flatMap(p => p.lines), ...data.uncategorized]);
  }, [data]);

  const totalOver = over.reduce((s, l) => s + l.over, 0);
  const unbudgeted = over.filter(l => l.budgeted === 0);

  return (
    <Card className="print:hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setOpen(o => !o)}
              aria-expanded={open}
              aria-controls={panelId}
              className="flex items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
              <AlertTriangle className="h-4 w-4 text-prism-rose" />
              Over budget at a glance
            </Button>
          </CardTitle>
          {!isLoading && (
            <Badge variant={over.length > 0 ? 'destructive' : 'secondary'} className="shrink-0">
              {over.length === 0 ? 'All clear' : `${over.length} categor${over.length === 1 ? 'y' : 'ies'} · ${formatCurrency(totalOver)} over`}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent id={panelId} hidden={!open}>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Checking spending against planned amounts…</p>
        ) : over.length === 0 ? (
          <p className="text-sm text-muted-foreground">Every category with a plan is at or under budget so far this month.</p>
        ) : (
          <div className="space-y-1.5">
            {over.map(line => {
              const color = `hsl(${line.pillar === 'uncategorized' ? 'var(--muted-foreground)' : PILLAR_COLOR[line.pillar]})`;
              const pct = line.budgeted > 0 ? Math.round((line.actual / line.budgeted) * 100) : null;
              const fixes = suggestFixes(line.name, line.over, line.budgeted, formatCurrency);
              return (
                <div key={line.key} className="rounded-md px-2 py-1.5 hover:bg-muted/50">
                  <Link
                    to={`/budgets/actual?month=${month}&mode=${mode}`}
                    className="group flex items-center gap-2"
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{line.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {line.pillar !== 'uncategorized' ? PILLAR_LABEL[line.pillar] : 'Uncategorized'}
                        {' · '}
                        {formatCurrency(line.actual)} spent of {formatCurrency(line.budgeted)} planned
                        {pct !== null && pct < 1000 && ` · ${pct}%`}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-prism-rose">
                      +{formatCurrency(line.over)}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  {fixes.length > 0 && (
                    <ul className="ml-4 mt-1 space-y-0.5 border-l-2 border-prism-amber/40 pl-2">
                      {fixes.map((fix, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                          <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-prism-amber" aria-hidden />
                          <span>
                            {fix.text}
                            {fix.link && (
                              <>
                                {' '}
                                <Link to={fix.link.to} className="font-medium text-prism-amber underline-offset-2 hover:underline">
                                  {fix.link.label}
                                </Link>
                              </>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
            {unbudgeted.length > 0 && (
              <p className="pt-1 text-[11px] text-muted-foreground">
                {unbudgeted.length === 1 ? 'One category has' : `${unbudgeted.length} categories have`} spending but no planned amount yet — give {unbudgeted.length === 1 ? 'it' : 'them'} a job on the Budget step.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
