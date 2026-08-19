import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { LtcHousehold, LtcPolicy } from '@/lib/ltc/model';
import {
  portfolioComparison, partnershipProtection, premiumOpportunity,
  OPPORTUNITY_YEARS, OPPORTUNITY_RETURNS, usd, type GapStrategyState,
} from '@/lib/ltc/gapstrategy';

export function PortfolioProtectionPanel({ h, g, patchG, policy }: {
  h: LtcHousehold; g: GapStrategyState; patchG: (p: Partial<GapStrategyState>) => void; policy?: LtcPolicy;
}) {
  const age = g.stress.claimAge;
  const years = g.stress.careYears;
  const cmp = portfolioComparison(h, g, age, years, g.weeklyHours, policy);
  const partner = partnershipProtection(policy, h, age, years);

  const scenarios: [string, typeof cmp.ltcAndHsa][] = [
    ['LTC + HSA strategy', cmp.ltcAndHsa],
    ['LTC insurance only', cmp.ltcOnly],
    ['No LTC insurance', cmp.noLtc],
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Portfolio preservation — {years}-year event at age {age}, {g.weeklyHours} hrs/wk</CardTitle>
          <p className="text-xs text-muted-foreground">The portfolio is the last funding source, so preservation is the scorecard.</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Scenario</TableHead><TableHead className="text-right">Total care cost</TableHead>
              <TableHead className="text-right">Insurance paid</TableHead><TableHead className="text-right">HSA paid</TableHead>
              <TableHead className="text-right">Income paid</TableHead><TableHead className="text-right">Portfolio drawn</TableHead>
              <TableHead className="text-right">Risk transferred</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {scenarios.map(([label, s]) => (
                <TableRow key={label}>
                  <TableCell className="font-medium">{label}</TableCell>
                  <TableCell className="text-right">{usd(s.totalCost)}</TableCell>
                  <TableCell className="text-right">{usd(s.insurancePaid)}</TableCell>
                  <TableCell className="text-right">{usd(s.hsaPaid)}</TableCell>
                  <TableCell className="text-right">{usd(s.incomePaid)}</TableCell>
                  <TableCell className="text-right font-semibold">{usd(s.portfolioPaid)}</TableCell>
                  <TableCell className="text-right">{s.transferredPct.toFixed(0)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-[11px] text-muted-foreground mt-2">
            Retirement capital preserved with the full strategy: <span className="font-semibold">{usd(cmp.ltcAndHsa.preserved)}</span>{' '}
            vs <span className="font-semibold">{usd(cmp.noLtc.preserved)}</span> with no insurance.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Ohio Partnership asset protection backstop</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {[
              ['Partnership qualified', partner.qualified ? 'Yes' : 'No'],
              ['Benefits paid over event', usd(partner.benefitsPaid)],
              ['Asset disregard earned', usd(partner.assetDisregard)],
              ['Assets protected', usd(partner.assetsProtected)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-md border p-2">
                <div className="text-[11px] text-muted-foreground">{k}</div>
                <div className="font-semibold">{v}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <div>
              <Label className="text-xs">Assets exposed without Partnership</Label>
              <Input type="number" value={g.partnership.assetsExposed}
                onChange={(e) => patchG({ partnership: { ...g.partnership, assetsExposed: Number(e.target.value) } })} />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Partnership protection is a catastrophic backstop, not monthly income, and it does not replace the funding
            waterfall. Verify current Ohio Partnership rules and Medicaid eligibility with a qualified elder-law attorney.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Premium opportunity cost</CardTitle>
          <p className="text-xs text-muted-foreground">What the premium difference would be worth if invested instead.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <div>
              <Label className="text-xs">Monthly premium difference</Label>
              <Input type="number" value={g.opportunity.premiumDelta}
                onChange={(e) => patchG({ opportunity: { ...g.opportunity, premiumDelta: Number(e.target.value) } })} />
            </div>
            <div>
              <Label className="text-xs">Return assumption</Label>
              <div className="flex gap-1 mt-1">
                {OPPORTUNITY_RETURNS.map((r) => (
                  <Button key={r} size="sm" variant={g.opportunity.returnPct === r ? 'default' : 'outline'}
                    onClick={() => patchG({ opportunity: { ...g.opportunity, returnPct: r } })}>{r}%</Button>
                ))}
              </div>
            </div>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Years invested</TableHead><TableHead className="text-right">Contributed</TableHead>
              <TableHead className="text-right">Growth</TableHead><TableHead className="text-right">Future value</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {OPPORTUNITY_YEARS.map((y) => {
                const o = premiumOpportunity(g.opportunity.premiumDelta, y, g.opportunity.returnPct);
                return (
                  <TableRow key={y}>
                    <TableCell>{y} years</TableCell>
                    <TableCell className="text-right">{usd(o.contributed)}</TableCell>
                    <TableCell className="text-right">{usd(o.growth)}</TableCell>
                    <TableCell className="text-right font-semibold">{usd(o.value)}</TableCell>
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
