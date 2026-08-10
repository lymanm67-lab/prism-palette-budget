import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { money, pct, type FundReturnRow } from '@/lib/retirement/investmentTracker';
import { NOT_AVAILABLE, RETURN_KINDS } from '@/lib/investment/portfolio';

export interface ComparisonGroup {
  label: string;
  currentValue: number;
  monthlyChange: number | null;
  ytdChange: number | null;
  ytdReturn: number | null;
  oneYear: number | null;
  threeYear: number | null;
  fiveYear: number | null;
  returnKind: 'personal' | 'fund' | 'portfolio';
  source: string;
}

interface Props {
  groups: ComparisonGroup[];
  fundReturns: FundReturnRow[];
}

const KIND_LABEL: Record<ComparisonGroup['returnKind'], string> = {
  personal: 'PERSONAL RETURN',
  fund: 'FUND RETURN',
  portfolio: 'PORTFOLIO RETURN',
};

function val(n: number | null, fmt: (v: number) => string) {
  if (n == null) return <span className="text-muted-foreground">{NOT_AVAILABLE}</span>;
  return (
    <span className={n >= 0 ? 'text-emerald-500' : 'text-destructive'}>{fmt(n)}</span>
  );
}

export function ComparisonCards({ groups, fundReturns }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-3">
        {groups.map((g) => (
          <Card key={g.label}>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm flex items-center justify-between gap-2">
                <span>{g.label}</span>
                <Badge variant="outline" className="text-[9px]">{KIND_LABEL[g.returnKind]}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs">
              <p className="text-2xl font-semibold tabular-nums">{money(g.currentValue, 2)}</p>
              {[
                ['Monthly change', val(g.monthlyChange, (v) => money(v, 2))],
                ['YTD change', val(g.ytdChange, (v) => money(v, 2))],
                ['YTD return', val(g.ytdReturn, (v) => pct(v, 2))],
                ['1-year return', val(g.oneYear, (v) => pct(v, 2))],
                ['3-year return', val(g.threeYear, (v) => pct(v, 2))],
                ['5-year return', val(g.fiveYear, (v) => pct(v, 2))],
              ].map(([label, node]) => (
                <div key={label as string} className="flex justify-between border-b border-border/40 py-1">
                  <span className="text-muted-foreground">{label as string}</span>
                  <span className="tabular-nums font-medium">{node}</span>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground pt-1">Source: {g.source}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm uppercase tracking-wider">
            Three different return measurements
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3">
          {RETURN_KINDS.map((k) => (
            <div key={k.key} className="rounded-lg border border-border/60 p-3">
              <p className="text-[11px] font-semibold tracking-wider">{k.label}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{k.detail}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Reported performance on file</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="text-left py-1.5">Measurement</th>
                  <th className="text-right">YTD</th>
                  <th className="text-right">1Y</th>
                  <th className="text-right">3Y</th>
                  <th className="text-right">5Y</th>
                  <th className="text-right">10Y</th>
                  <th className="text-right">As of</th>
                </tr>
              </thead>
              <tbody>
                {fundReturns.map((f) => (
                  <tr key={f.id} className="border-b border-border/30">
                    <td className="py-1.5">
                      {f.label}
                      {f.ticker ? <span className="text-muted-foreground"> · {f.ticker}</span> : null}
                      <Badge variant="outline" className="ml-2 text-[9px]">
                        {f.label.toLowerCase().includes('personal') ? 'PERSONAL RATE OF RETURN' : 'FUND PERFORMANCE'}
                      </Badge>
                    </td>
                    <td className="text-right tabular-nums">{pct(f.ytd_return, 2)}</td>
                    <td className="text-right tabular-nums">{pct(f.one_year_return, 2)}</td>
                    <td className="text-right tabular-nums">{pct(f.three_year_return, 2)}</td>
                    <td className="text-right tabular-nums">{pct(f.five_year_return, 2)}</td>
                    <td className="text-right tabular-nums">{pct(f.ten_year_return, 2)}</td>
                    <td className="text-right text-muted-foreground">{f.as_of_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Missing history is shown as {NOT_AVAILABLE} — performance data is never estimated.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
