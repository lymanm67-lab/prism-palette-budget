import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { LtcHousehold, LtcPolicy } from '@/lib/ltc/model';
import { PLAN_HOUR_TIERS } from '@/lib/ltc/careplan';
import { stressTest, usd, type GapStrategyState } from '@/lib/ltc/gapstrategy';

export function GapStressTest({ h, g, patchG, policy }: {
  h: LtcHousehold; g: GapStrategyState; patchG: (p: Partial<GapStrategyState>) => void; policy?: LtcPolicy;
}) {
  const rows = stressTest(h, g, g.weeklyHours, policy);
  const failures = rows.filter((r) => !r.sufficient).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Stress test — inflation, timing and duration</CardTitle>
        <p className="text-xs text-muted-foreground">
          3–5% care inflation × care beginning at 75/80/85 × 3- and 5-year events, all funded through the waterfall.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Hours tested:</span>
          {PLAN_HOUR_TIERS.map((hrs) => (
            <Button key={hrs} size="sm" variant={g.weeklyHours === hrs ? 'default' : 'outline'} onClick={() => patchG({ weeklyHours: hrs })}>{hrs}</Button>
          ))}
          <Badge variant="outline" className={failures === 0 ? 'text-prism-positive' : 'text-destructive'}>
            {failures === 0 ? 'All scenarios funded' : `${failures} of ${rows.length} scenarios lean on the portfolio`}
          </Badge>
        </div>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Scenario</TableHead><TableHead className="text-right">Total cost</TableHead>
            <TableHead className="text-right">Insurance</TableHead><TableHead className="text-right">HSA</TableHead>
            <TableHead className="text-right">Income</TableHead><TableHead className="text-right">Portfolio</TableHead>
            <TableHead>Result</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.label}>
                <TableCell className="text-xs">{r.label}</TableCell>
                <TableCell className="text-right">{usd(r.totalCost)}</TableCell>
                <TableCell className="text-right">{usd(r.insurancePaid)}</TableCell>
                <TableCell className="text-right">{usd(r.hsaPaid)}</TableCell>
                <TableCell className="text-right">{usd(r.incomePaid)}</TableCell>
                <TableCell className="text-right font-semibold">{usd(r.portfolioPaid)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[10px] ${r.sufficient ? 'text-prism-positive' : 'text-destructive'}`}>
                    {r.sufficient ? 'Funded' : 'Portfolio exposure'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
