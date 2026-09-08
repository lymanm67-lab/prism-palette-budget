import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import type { RealityMetrics } from '@/lib/freed-cash/reality';

const currency = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

interface Props {
  metrics: RealityMetrics;
}

/** The clearest one-glance summary of the whole page. */
export function FreedCashSnapshotHeadline({ metrics: m }: Props) {
  const tiles = [
    {
      label: 'Realized savings YTD',
      value: currency(m.realizedYtd),
      hint: 'Money actually saved this year',
      tip: 'Counted source by source from each real effective date. Never the run rate multiplied by months elapsed.',
      tone: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Current monthly run rate',
      value: `${currency(m.runRate)}/mo`,
      hint: 'How much lower your recurring bills are now',
      tip: 'The combined effect of every saving currently in force. A current expense level, not one month of new savings.',
      tone: '',
    },
    {
      label: 'Forward annualized savings',
      value: `${currency(m.forwardAnnualized)}/yr`,
      hint: 'Run rate over a full 12 months',
      tip: 'Projected full-year savings at the current run rate. This is not money already saved this year.',
      tone: 'text-muted-foreground',
    },
    {
      label: 'Future pipeline',
      value: `${currency(m.pipelineMonthly)}/mo`,
      hint: 'Savings with a future start date',
      tip: 'Confirmed or expected savings that have not become effective yet. Excluded from realized savings and from the run rate.',
      tone: '',
    },
    {
      label: 'Projected future run rate',
      value: `${currency(m.projectedRunRate)}/mo`,
      hint: `${currency(m.projectedAnnualized)}/yr once the pipeline lands`,
      tip: 'Current run rate plus confirmed pipeline savings.',
      tone: '',
    },
    {
      label: 'Actually redirected',
      value: `${currency(m.redirectedMonthly)}/mo`,
      hint: `${m.conversionRate.toFixed(0)}% of realized savings moved`,
      tone: 'text-emerald-600 dark:text-emerald-400',
      tip: 'Freed cash that was genuinely transferred or contributed, not merely assigned to a goal.',
    },
    {
      label: 'Needs a job',
      value: `${currency(m.needsJobMonthly)}/mo`,
      hint: 'Freed cash with nowhere to go yet',
      tip: 'Realized savings that has not actually been moved anywhere. Left alone, it quietly drifts back into spending.',
      tone: m.needsJobMonthly > 0.01 ? 'text-amber-600 dark:text-amber-400' : '',
    },
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Your Freed Cash Snapshot</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
          {tiles.map((t) => (
            <Card key={t.label} className="border-border/60">
              <CardContent className="space-y-1 p-3">
                <div className="flex items-start gap-1 text-[11px] font-medium leading-tight text-muted-foreground">
                  {t.label}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">
                        <Info className="h-3 w-3" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">{t.tip}</TooltipContent>
                  </Tooltip>
                </div>
                <p className={`text-lg font-bold leading-tight tracking-tight ${t.tone}`}>{t.value}</p>
                <p className="text-[11px] leading-tight text-muted-foreground">{t.hint}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </TooltipProvider>
  );
}
