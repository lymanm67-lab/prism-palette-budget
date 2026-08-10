import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { money } from '@/lib/retirement/investmentTracker';
import {
  monthLabel, type ContributionSource, type EngineConfig, type LadderStep,
  type ReallocationRow,
} from '@/lib/retirement/cashflowEngine';

const CATEGORY_LABEL: Record<string, string> = {
  employee_base: 'Base employee',
  employer: 'Employer',
  accelerator: 'Retirement accelerator',
  debt_reallocation: 'Debt reallocation',
  loan_reallocation: 'Student loan reallocation',
  step_up: 'Monthly step-up',
  wealth_accelerator: 'Monthly Wealth Accelerator',
  tax_refund: 'Optional tax refund',
  raise_reallocation: 'Pay raise reallocation',
  lump_sum: 'Other lump sum',
  obligation: 'Household obligation',
};

const TAX_LABEL: Record<string, string> = {
  pre_tax: 'Pre-tax',
  roth: 'Roth',
  employer_pre_tax: 'Employer pre-tax',
  taxable: 'Taxable',
  cash_flow: 'Cash flow',
};

interface Props {
  sources: ContributionSource[];
  config: EngineConfig;
  currentMonthly: number;
  ladder: LadderStep[];
  realloc: ReallocationRow[];
  timeline: { when: string; headline: string; detail: string }[];
  onToggle: (id: string) => void;
  onUpdate: (id: string, patch: Partial<ContributionSource>) => void;
}

export function ContributionSourcesPanel({
  sources, config, currentMonthly, ladder, realloc, timeline, onToggle, onUpdate,
}: Props) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Contribution sources</CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Every dollar has a source, a start date, a destination and a tax classification. Obligations are
            tracked here but never counted as investments.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {sources.map((s) => {
            const disabled = config.disabledSources.includes(s.id);
            const annual = s.frequency === 'annual'
              ? (s.id === 'refund' ? config.refundAmount : s.annualAmount ?? 0)
              : s.monthlyAmount * 12;
            return (
              <div key={s.id} className={`rounded-lg border p-3 ${disabled ? 'opacity-50 border-border' : s.isObligation ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-card/40'}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <Switch checked={!disabled} onCheckedChange={() => onToggle(s.id)} />
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium">{s.label}</span>
                      <Badge variant="outline" className="text-[10px]">{CATEGORY_LABEL[s.category]}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{TAX_LABEL[s.taxClass]}</Badge>
                      {s.isObligation && <Badge variant="destructive" className="text-[10px]">Not an investment</Badge>}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {monthLabel(s.startMonth)} → {s.endMonth ? monthLabel(s.endMonth) : 'ongoing'} · {s.destination}
                      {s.notes ? ` · ${s.notes}` : ''}
                    </p>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                        {s.frequency === 'annual' ? 'Annual' : 'Monthly'}
                      </p>
                      <Input
                        type="number"
                        step="0.01"
                        value={s.frequency === 'annual' ? annual : s.monthlyAmount}
                        onChange={(e) => {
                          const v = Number(e.target.value) || 0;
                          if (s.frequency === 'annual') onUpdate(s.id, { annualAmount: v });
                          else onUpdate(s.id, { monthlyAmount: v });
                        }}
                        className="h-8 w-24 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Start</p>
                      <Input
                        type="month"
                        value={s.startMonth}
                        onChange={(e) => onUpdate(s.id, { startMonth: e.target.value })}
                        className="h-8 w-32 text-xs"
                      />
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Annualized</p>
                      <p className="text-xs font-semibold tabular-nums">{money(annual, 2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs font-medium">Total monthly retirement investment (today)</p>
            <p className="text-lg font-semibold tabular-nums">{money(currentMonthly, 2)}</p>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Annual lump sums are reported separately. The optional tax refund (${config.refundAmount.toLocaleString()}) is
            never divided by 12.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Retirement contribution ladder</CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Lifestyle spending does not rise when debt ends. Freed cash flow climbs this ladder instead.
          </p>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {ladder.map((step, i) => (
            <div key={step.label} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/40 p-2.5">
              <span className="text-[10px] font-mono text-muted-foreground w-5">{i + 1}</span>
              <div className="flex-1 min-w-[180px]">
                <p className="text-xs font-medium">{step.label}</p>
                <p className="text-[10px] text-muted-foreground">{step.effective}{step.note ? ` · ${step.note}` : ''}</p>
              </div>
              <p className="text-sm font-semibold tabular-nums">
                {step.kind === 'base' ? money(step.amount, 2)
                  : step.kind === 'annual' ? `${money(step.amount)}/yr`
                  : step.kind === 'variable' ? (step.amount ? `+${money(step.amount, 2)}/mo` : 'Variable')
                  : `+${money(step.amount, 2)}/mo`}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Contribution timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {timeline.map((t) => (
            <div key={t.when + t.headline} className="border-l-2 border-primary/40 pl-3 py-1">
              <p className="text-[10px] uppercase tracking-wider text-prism-amber">{t.when}</p>
              <p className="text-xs font-medium">{t.headline}</p>
              <p className="text-[10px] text-muted-foreground">{t.detail}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Where freed cash flow goes</CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Every obligation that ends gets a new destination before it can turn into lifestyle inflation.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {realloc.map((r) => (
            <div key={r.obligation} className="rounded-lg border border-border bg-card/40 p-3 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium">{r.obligation}</p>
                <Badge
                  variant={r.status === 'active' ? 'default' : r.status === 'pending_confirmation' ? 'destructive' : 'outline'}
                  className="text-[10px]"
                >
                  {r.status === 'active' ? 'Active' : r.status === 'pending_confirmation' ? 'Pending confirmation' : 'Scheduled'}
                </Badge>
              </div>
              <div className="grid gap-2 sm:grid-cols-4 text-[10px]">
                <Kv label="Previous monthly" value={money(r.previousMonthly, 2)} />
                <Kv label="Ends" value={r.endsOn} />
                <Kv label="Released" value={money(r.released, 2)} />
                <Kv label="Effective" value={r.effective} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {r.destinations.map((d) => (
                  <span key={d.label} className="rounded-md border border-border bg-muted/40 px-2 py-1 text-[10px]">
                    {d.label}: <span className="font-semibold tabular-nums">{money(d.amount, 2)}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
