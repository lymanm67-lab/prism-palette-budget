import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { LtcHousehold, LtcPolicy } from '@/lib/ltc/model';
import {
  waterfallAt, protectionBand, PROTECTION_LABEL, hsaCoverageDuration, usd, type GapStrategyState,
} from '@/lib/ltc/gapstrategy';

const AGES = [75, 80, 85];

export function AgeGapAnalysis({ h, g, policy }: { h: LtcHousehold; g: GapStrategyState; policy?: LtcPolicy }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        {AGES.map((age) => {
          const w = waterfallAt(h, g, age, g.weeklyHours, policy);
          return (
            <Card key={age}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Care beginning at age {age}</CardTitle>
                <Badge variant="outline" className="w-fit text-[10px]">{PROTECTION_LABEL[protectionBand(w)]}</Badge>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <Row k="Care cost" v={`${usd(w.monthlyCost)}/mo`} />
                <Row k="Plan maximum" v={`${usd(w.planMax)}/mo`} />
                <Row k="HSA balance" v={usd(w.hsaBalance)} />
                <Row k="HSA support" v={`${usd(w.hsaSupport)}/mo`} />
                <Row k="Income allocated" v={`${usd(w.incomeSupport)}/mo`} />
                <Row k="Portfolio gap" v={`${usd(w.portfolioGap)}/mo`} strong />
                <Row k="HSA covers gap for" v={`${hsaCoverageDuration(w.hsaBalance, w.portfolioGap + w.hsaSupport).toFixed(0)} months`} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Household coverage — both spouses</CardTitle>
          <p className="text-xs text-muted-foreground">
            Individual plans, individual HSAs. A simultaneous care event is the worst case.
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Person</TableHead><TableHead>Care starts</TableHead>
              <TableHead className="text-right">Hours/wk</TableHead><TableHead className="text-right">Care cost</TableHead>
              <TableHead className="text-right">Benefit</TableHead><TableHead className="text-right">Portfolio gap</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {g.people.map((p) => {
                const w = waterfallAt(h, g, p.careStartAge, p.weeklyHours, policy, {
                  planMaxToday: p.monthlyBenefit, hsaBalanceOverride: p.hsaBalance || undefined,
                });
                return (
                  <TableRow key={p.name}>
                    <TableCell className="font-medium">{p.name} <span className="text-muted-foreground">({p.age})</span></TableCell>
                    <TableCell>Age {p.careStartAge} · {p.careYears} yrs</TableCell>
                    <TableCell className="text-right">{p.weeklyHours}</TableCell>
                    <TableCell className="text-right">{usd(w.monthlyCost)}</TableCell>
                    <TableCell className="text-right">{usd(w.reimbursement)}</TableCell>
                    <TableCell className="text-right font-semibold">{usd(w.portfolioGap)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground text-xs">{k}</span>
      <span className={strong ? 'font-semibold' : ''}>{v}</span>
    </div>
  );
}
