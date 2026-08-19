import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { LtcHousehold, LtcPolicy } from '@/lib/ltc/model';
import {
  combinedProtection, waterfallAt, hsaCoverageDuration, HSA_AGES, usd, type GapStrategyState,
} from '@/lib/ltc/gapstrategy';

export function CombinedProtection({ h, g, policy }: { h: LtcHousehold; g: GapStrategyState; policy?: LtcPolicy }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Total care protection — insurance pool + HSA reserve</CardTitle>
          <p className="text-xs text-muted-foreground">Combined protection is what matters, not the insurance benefit alone.</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Age</TableHead><TableHead className="text-right">Insurance pool</TableHead>
              <TableHead className="text-right">HSA reserve</TableHead><TableHead className="text-right">Total protection</TableHead>
              <TableHead className="text-right">Insurance / HSA split</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {HSA_AGES.map((age) => {
                const c = combinedProtection(policy, h, g, age);
                return (
                  <TableRow key={age}>
                    <TableCell>{age}</TableCell>
                    <TableCell className="text-right">{usd(c.insurancePool)}</TableCell>
                    <TableCell className="text-right">{usd(c.hsaBalance)}</TableCell>
                    <TableCell className="text-right font-semibold">{usd(c.total)}</TableCell>
                    <TableCell className="text-right">{c.insurancePct.toFixed(0)}% / {c.hsaPct.toFixed(0)}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">How long the HSA sustains the gap</CardTitle>
          <p className="text-xs text-muted-foreground">Duration of coverage at {g.weeklyHours} hrs/week, before any portfolio withdrawal.</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Care begins at</TableHead><TableHead className="text-right">Monthly gap after insurance + income</TableHead>
              <TableHead className="text-right">HSA balance</TableHead><TableHead className="text-right">Months covered</TableHead>
              <TableHead className="text-right">Years</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {[75, 80, 85].map((age) => {
                const w = waterfallAt(h, g, age, g.weeklyHours, policy);
                const gap = w.hsaSupport + w.portfolioGap;
                const d = hsaCoverageDuration(w.hsaBalance, gap);
                return (
                  <TableRow key={age}>
                    <TableCell>Age {age}</TableCell>
                    <TableCell className="text-right">{usd(gap)}/mo</TableCell>
                    <TableCell className="text-right">{usd(w.hsaBalance)}</TableCell>
                    <TableCell className="text-right font-semibold">{d.unlimited ? 'No gap' : Math.round(d.months)}</TableCell>
                    <TableCell className="text-right">{d.unlimited ? '—' : d.years.toFixed(1)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <p className="text-[11px] text-muted-foreground mt-2">
            HSA withdrawals for qualified long-term care are tax-free, which makes the HSA the most efficient gap-funding
            layer after insurance. Confirm qualification rules with a tax professional.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
