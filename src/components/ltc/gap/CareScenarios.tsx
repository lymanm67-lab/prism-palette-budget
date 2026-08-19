import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { LtcHousehold, LtcPolicy } from '@/lib/ltc/model';
import { targetAgencyRate } from '@/lib/ltc/careplan';
import type { LtcLocationState } from '@/lib/ltc/location';
import {
  waterfallAt, protectionBand, PROTECTION_LABEL, simulateGapProgression, plannedHourTiers, usd, type GapStrategyState,
} from '@/lib/ltc/gapstrategy';
import { PlannedHoursControl } from './PlannedHoursControl';

export function CareScenarios({ h, g, patchG, policy, loc }: {
  h: LtcHousehold; g: GapStrategyState; patchG: (p: Partial<GapStrategyState>) => void;
  policy?: LtcPolicy; loc?: LtcLocationState;
}) {
  const age = g.stress.claimAge;
  const tiers = plannedHourTiers(g.weeklyHours);
  const rows = tiers.map((hrs) => ({ hrs, w: waterfallAt(h, g, age, hrs, policy) }));
  const bump = g.progression === 'higher' ? 10 : 5;
  const progressionHours = Array.from({ length: Math.max(1, Math.round(g.stress.careYears || 3)) },
    (_, i) => Math.max(1, g.weeklyHours + i * bump));
  const progression = simulateGapProgression(h, g, age, progressionHours, policy);
  const agencies = (loc?.agencies || [])
    .map((a) => ({ ...a, rate: a.nonMedicalHourly ?? a.personalCareHourly ?? 0 }))
    .filter((a) => a.rate > 0)
    .slice(0, 8);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Care hour scenarios at age {age}</CardTitle>
          <p className="text-xs text-muted-foreground">Built from my real planned hours — every variation is funded through the same waterfall.</p>
        </CardHeader>
        <CardContent>
          <div className="mb-3">
            <PlannedHoursControl g={g} patchG={patchG} />
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Hours</TableHead><TableHead className="text-right">Care cost</TableHead>
              <TableHead className="text-right">Reimbursed</TableHead><TableHead className="text-right">HSA</TableHead>
              <TableHead className="text-right">Income</TableHead><TableHead className="text-right">Portfolio gap</TableHead>
              <TableHead className="text-right">Agency rate needed</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map(({ hrs, w }) => (
                <TableRow key={hrs} className={g.weeklyHours === hrs ? 'bg-primary/5' : ''}>
                  <TableCell className="font-medium">{hrs}/wk{hrs === g.weeklyHours ? ' (plan)' : ''}</TableCell>
                  <TableCell className="text-right">{usd(w.monthlyCost)}</TableCell>
                  <TableCell className="text-right">{usd(w.reimbursement)}</TableCell>
                  <TableCell className="text-right">{usd(w.hsaSupport)}</TableCell>
                  <TableCell className="text-right">{usd(w.incomeSupport)}</TableCell>
                  <TableCell className="text-right font-semibold">{usd(w.portfolioGap)}</TableCell>
                  <TableCell className="text-right">{usd(targetAgencyRate(hrs, w.planMax), 2)}/hr</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{PROTECTION_LABEL[protectionBand(w)]}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Agency fit against the plan maximum</CardTitle></CardHeader>
        <CardContent>
          {agencies.length === 0 ? (
            <p className="text-xs text-muted-foreground">Add agencies on the Local Agencies tab to compare rates here.</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Agency</TableHead><TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Cost at {g.weeklyHours} hrs</TableHead>
                <TableHead className="text-right">Portfolio gap</TableHead><TableHead>Fit</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {agencies.map((a) => {
                  const w = waterfallAt(h, g, age, g.weeklyHours, policy, { hourlyRateOverride: a.rate });
                  return (
                    <TableRow key={a.id}>
                      <TableCell>{a.name}</TableCell>
                      <TableCell className="text-right">{usd(a.rate, 2)}/hr</TableCell>
                      <TableCell className="text-right">{usd(w.monthlyCost)}</TableCell>
                      <TableCell className="text-right font-semibold">{usd(w.portfolioGap)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${w.portfolioGap <= 0 ? 'text-prism-positive' : ''}`}>
                          {PROTECTION_LABEL[protectionBand(w)]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Progressive care need</CardTitle>
          <p className="text-xs text-muted-foreground">Starts at my planned {g.weeklyHours} hrs/week and escalates by {bump} hrs each year.</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Year</TableHead><TableHead>Age</TableHead><TableHead className="text-right">Hours/wk</TableHead>
              <TableHead className="text-right">Care cost</TableHead><TableHead className="text-right">Portfolio gap</TableHead>
              <TableHead className="text-right">HSA remaining</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {progression.map((p) => (
                <TableRow key={p.year}>
                  <TableCell>{p.year + 1}</TableCell><TableCell>{p.age}</TableCell>
                  <TableCell className="text-right">{p.weeklyHours}</TableCell>
                  <TableCell className="text-right">{usd(p.careCost / 12)}</TableCell>
                  <TableCell className="text-right font-semibold">{usd(p.portfolioWithdrawal / 12)}</TableCell>
                  <TableCell className="text-right">{usd(p.hsaRemaining)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
