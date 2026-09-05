import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import {
  CONFIDENCE_LEVELS,
  FreedCashRedirect,
  FreedCashSource,
  confidenceLabel,
  durabilityLabel,
} from '@/hooks/use-freed-cash';
import { conversionMetrics, expiringSoon, runRateAudit } from '@/lib/freed-cash/conversion';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

interface Props {
  sources: FreedCashSource[];
  redirects: FreedCashRedirect[];
}

export function RedirectEffectiveness({ sources, redirects }: Props) {
  const [confidence, setConfidence] = useState<string>('all');
  const m = useMemo(() => conversionMetrics(sources, redirects), [sources, redirects]);
  const audit = useMemo(() => runRateAudit(sources, redirects), [sources, redirects]);
  const expiring = useMemo(() => expiringSoon(sources), [sources]);

  const rows = useMemo(
    () => (confidence === 'all' ? audit : audit.filter((r) => r.confidence === confidence)),
    [audit, confidence],
  );
  const filteredTotal = rows.reduce((sum, r) => sum + r.netMonthly, 0);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Realized savings (run rate)"
            value={`${money(m.realizedMonthly)}/mo`}
            hint="Verified savings still in effect"
            tip="Verified cancellations and reductions currently active. Expired, resumed and reversed savings are excluded."
          />
          <Stat
            label="Assigned to goals"
            value={`${money(m.assignedMonthly)}/mo`}
            hint={`Savings Capture Rate ${m.captureRate.toFixed(0)}%`}
            tip="Capture Rate measures assignment only — whether each freed dollar has been given a job."
          />
          <Stat
            label="Actually redirected"
            value={`${money(m.executedMonthly)}/mo`}
            hint={`Freed Cash Conversion Rate ${m.conversionRate.toFixed(0)}%`}
            tip="Conversion Rate measures execution — money actually transferred or contributed. An assigned redirect is not progress until it is confirmed moved."
          />
          <Stat
            label="Redirect execution gap"
            value={`${money(m.executionGap)}/mo`}
            hint="Assigned but not moved"
            tone={m.executionGap > 0 ? 'warn' : 'ok'}
            tip="Assigned redirects minus what was actually moved. This money is promised but not yet working."
          />
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Assignment vs execution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Savings Capture Rate (assigned)</span>
                <span>{m.captureRate.toFixed(0)}%</span>
              </div>
              <Progress value={Math.min(100, m.captureRate)} />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Freed Cash Conversion Rate (executed)</span>
                <span>{m.conversionRate.toFixed(0)}%</span>
              </div>
              <Progress value={Math.min(100, m.conversionRate)} />
            </div>
            <p className="text-xs text-muted-foreground">
              Unallocated freed cash: {money(m.unallocatedMonthly)}/mo. Every freed dollar needs a new job —
              and the transfer has to actually happen.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Redirect effectiveness by destination</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              What was promised to each goal versus what actually arrived.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {m.byDestination.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No active redirects yet.</p>
            )}
            {m.byDestination.map((d) => (
              <div
                key={d.destination}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/40 p-3"
              >
                <p className="min-w-[10rem] text-sm font-medium">{d.label}</p>
                <p className="text-xs text-muted-foreground">
                  Assigned {money(d.assigned)}/mo → moved {money(d.executed)}/mo
                </p>
                <p className={`text-sm font-semibold ${d.gap > 0 ? 'text-destructive' : 'text-primary'}`}>
                  {d.gap > 0 ? `${money(d.gap)}/mo short` : 'Fully executed'}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {expiring.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Expiring soon</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Promotional rates, discounts and pauses ending in the next 60 days. These stop counting toward
                the run rate automatically once they expire.
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {expiring.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/40 p-3"
                >
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Ends {s.expires_on || s.resume_date} · {durabilityLabel(s.durability || 'permanent')}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-3">
            <div>
              <CardTitle className="text-base">What makes up this total?</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Every active source behind the run rate — {money(filteredTotal)}/mo shown.
              </p>
            </div>
            <div className="w-44">
              <Select value={confidence} onValueChange={setConfidence}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All confidence levels</SelectItem>
                  {CONFIDENCE_LEVELS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nothing matches this confidence level.
              </p>
            ) : (
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b">
                    <th className="p-2 text-left">Expense</th>
                    <th className="p-2 text-left">Category</th>
                    <th className="p-2 text-right">Was</th>
                    <th className="p-2 text-right">Now</th>
                    <th className="p-2 text-right">Net saved</th>
                    <th className="p-2 text-left">Effective</th>
                    <th className="p-2 text-left">Confidence</th>
                    <th className="p-2 text-left">Durability</th>
                    <th className="p-2 text-left">Goes to</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-border/40">
                      <td className="p-2">
                        <span className="font-medium">{r.name}</span>
                        {r.vendor && <span className="text-muted-foreground"> · {r.vendor}</span>}
                        <Badge variant="outline" className="ml-1 text-[10px]">
                          {r.entityScope === 'business' ? 'Business' : 'Personal'}
                        </Badge>
                      </td>
                      <td className="p-2 text-muted-foreground">{r.category || '—'}</td>
                      <td className="p-2 text-right">{money(r.original)}</td>
                      <td className="p-2 text-right">{money(r.replacement)}</td>
                      <td className="p-2 text-right font-semibold">{money(r.netMonthly)}</td>
                      <td className="p-2 text-muted-foreground">
                        {r.effectiveDate}
                        {r.expiresOn ? ` → ${r.expiresOn}` : ''}
                      </td>
                      <td className="p-2">{confidenceLabel(r.confidence)}</td>
                      <td className="p-2">{durabilityLabel(r.durability)}</td>
                      <td className="p-2 text-muted-foreground">{r.destinations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

function Stat({
  label,
  value,
  hint,
  tip,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tip?: string;
  tone?: 'ok' | 'warn';
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="flex items-start gap-1 text-xs text-muted-foreground">
          {label}
          {tip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help">
                  <Info className="h-3 w-3" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">{tip}</TooltipContent>
            </Tooltip>
          )}
        </p>
        <p
          className={`mt-1 text-lg font-semibold ${
            tone === 'warn' ? 'text-destructive' : tone === 'ok' ? 'text-primary' : ''
          }`}
        >
          {value}
        </p>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
