import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import {
  PLAN_STATUS_TONE,
  RETURN_SCENARIOS,
  money,
  pct,
  planStatus,
  projectWealth,
  type FundReturnRow,
  type ProjectionInputs,
} from '@/lib/retirement/investmentTracker';

interface Props {
  fundReturns: FundReturnRow[];
  actualTrailingReturnPct: number | null;
  baseInputs: ProjectionInputs;
}

export function BenchmarksCard({ fundReturns, actualTrailingReturnPct, baseInputs }: Props) {
  const status = planStatus(actualTrailingReturnPct, 7);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Return benchmarks vs planning assumptions</CardTitle>
          <p className="text-xs text-muted-foreground">
            Recent market returns are not assumed to continue. Planning baseline is 7%.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Actual trailing return (estimated)</span>
              <span className="tabular-nums font-semibold">{pct(actualTrailingReturnPct)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Planning return</span>
              <span className="tabular-nums font-semibold">7.00%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Difference</span>
              <span className="tabular-nums font-semibold">
                {actualTrailingReturnPct == null ? '—' : pct(actualTrailingReturnPct - 7)}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-border/60">
              <span className="text-muted-foreground">Status</span>
              <span className={`font-semibold ${PLAN_STATUS_TONE[status]}`}>{status}</span>
            </div>
          </div>

          <div className="space-y-2">
            {RETURN_SCENARIOS.map((s) => {
              const rows = projectWealth({ ...baseInputs, expectedReturnPct: s.pct });
              const final = rows[rows.length - 1]?.endingBalance ?? baseInputs.startingBalance;
              const baseline =
                projectWealth({ ...baseInputs, expectedReturnPct: 7 }).slice(-1)[0]?.endingBalance ??
                baseInputs.startingBalance;
              const delta = final - baseline;
              return (
                <div
                  key={s.pct}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5 text-xs"
                >
                  <span className="flex items-center gap-2">
                    <Badge variant={s.pct === 7 ? 'default' : 'outline'} className="text-[10px]">
                      {s.pct}%
                    </Badge>
                    <span className="text-muted-foreground">{s.label}</span>
                  </span>
                  <span className="text-right">
                    <span className="tabular-nums font-semibold block">{money(final)}</span>
                    <span
                      className={`text-[10px] tabular-nums ${
                        delta > 0 ? 'text-emerald-500' : delta < 0 ? 'text-destructive' : 'text-muted-foreground'
                      }`}
                    >
                      {delta === 0 ? 'baseline' : `${delta > 0 ? '+' : ''}${money(delta)} vs baseline`}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Impact on projected wealth at age {baseInputs.targetAge}.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Fund &amp; personal return reference</CardTitle>
          <p className="text-xs text-muted-foreground">
            Historical reference values — editable, and not a forecast.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {fundReturns.map((f) => (
            <div key={f.id} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{f.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {f.ticker ? `${f.ticker} · ` : ''}As of {f.as_of_date}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {f.ticker ? 'Fund return' : 'Personal return'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3 text-center">
                <Metric label="YTD" value={f.ytd_return} />
                <Metric label="1-yr" value={f.one_year_return} />
                <Metric label="3-yr" value={f.three_year_return} />
                <Metric label="5-yr" value={f.five_year_return} />
                <Metric label="10-yr" value={f.ten_year_return} />
              </div>
              {f.methodology_note && (
                <p className="text-[10px] text-muted-foreground mt-2">{f.methodology_note}</p>
              )}
            </div>
          ))}
          <div className="flex gap-2 rounded-lg border border-prism-amber/40 bg-prism-amber/10 p-3">
            <AlertTriangle className="h-4 w-4 text-prism-amber shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground">
              These measurements may use different calculation methodologies. TIAA personal rates of return are
              not directly comparable to published VFIFX fund returns.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-md bg-muted/40 p-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value == null ? '—' : `${Number(value).toFixed(2)}%`}</p>
    </div>
  );
}
