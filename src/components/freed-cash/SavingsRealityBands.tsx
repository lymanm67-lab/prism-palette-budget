import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { RealityMetrics } from '@/lib/freed-cash/reality';

const currency = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

interface Props {
  metrics: RealityMetrics;
}

interface Stat {
  label: string;
  value: string;
  note: string;
  tone?: string;
}

function Band({
  title,
  description,
  stats,
  accent,
}: {
  title: string;
  description: string;
  stats: Stat[];
  accent: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className={`text-[11px] ${accent}`}>{description}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-border/60">
            <CardContent className="space-y-1 p-3">
              <p className="text-[11px] font-medium leading-tight text-muted-foreground">{s.label}</p>
              <p className={`text-base font-bold leading-tight tracking-tight ${s.tone ?? ''}`}>{s.value}</p>
              <p className="text-[11px] leading-tight text-muted-foreground">{s.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * Three clearly separated bands so realized savings, the current run rate and
 * future pipeline savings can never be mistaken for one another.
 */
export function SavingsRealityBands({ metrics: m }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Savings Reality</CardTitle>
            <CardDescription>
              Already happened, happening now, and still coming — kept apart on purpose.
            </CardDescription>
          </div>
          {m.hasEstimatedMonths && (
            <Badge variant="outline" className="text-[10px]">
              Some months prorated
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Band
          title="Already happened"
          description="Money that was genuinely not spent"
          accent="text-emerald-600 dark:text-emerald-400"
          stats={[
            {
              label: 'Created this month',
              value: `${currency(m.createdThisMonth)}/mo`,
              note: 'New recurring savings that became effective this month',
            },
            {
              label: 'Realized this month',
              value: currency(m.realizedThisMonth),
              note: 'Based on effective dates and billing cycles',
              tone: 'text-emerald-600 dark:text-emerald-400',
            },
            {
              label: 'Realized savings YTD',
              value: currency(m.realizedYtd),
              note: 'January 1 to today, source by source',
              tone: 'text-emerald-600 dark:text-emerald-400',
            },
            {
              label: 'Realized savings lifetime',
              value: currency(m.realizedLifetime),
              note: 'Everything realized since each source began',
            },
          ]}
        />

        <Band
          title="Happening now"
          description="Your current expense level, not new money each month"
          accent="text-primary"
          stats={[
            {
              label: 'Current monthly run rate',
              value: `${currency(m.runRate)}/mo`,
              note: 'How much lower recurring expenses are versus baseline',
            },
            {
              label: 'Forward annualized savings',
              value: `${currency(m.forwardAnnualized)}/yr`,
              note: 'Projected full-year savings at the current run rate — not savings already realized this year',
              tone: 'text-muted-foreground',
            },
            {
              label: 'Verified + reconciled',
              value: `${currency(m.verifiedMonthly + m.reconciledMonthly)}/mo`,
              note: 'Confirmed by a bill, statement or cash flow match',
            },
            {
              label: 'Estimated',
              value: `${currency(m.estimatedMonthly)}/mo`,
              note: 'Entered or projected, not yet confirmed',
              tone: m.estimatedMonthly > 0.01 ? 'text-amber-600 dark:text-amber-400' : '',
            },
          ]}
        />

        <Band
          title="Still coming"
          description="Real, but not yet effective — excluded from realized savings"
          accent="text-muted-foreground"
          stats={[
            {
              label: 'Savings in pipeline',
              value: `${currency(m.pipelineMonthly)}/mo`,
              note: 'Confirmed or expected savings with a future start date',
            },
            {
              label: 'Projected future run rate',
              value: `${currency(m.projectedRunRate)}/mo`,
              note: 'Current run rate plus confirmed pipeline',
            },
            {
              label: 'Projected future annualized',
              value: `${currency(m.projectedAnnualized)}/yr`,
              note: 'Projected full-year savings once the pipeline lands',
              tone: 'text-muted-foreground',
            },
            {
              label: 'Needs a job',
              value: `${currency(m.needsJobMonthly)}/mo`,
              note: 'Realized savings that has not actually been moved anywhere',
              tone: m.needsJobMonthly > 0.01 ? 'text-amber-600 dark:text-amber-400' : '',
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}
