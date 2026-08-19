import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { LtcHousehold } from '@/lib/ltc/model';
import {
  projectHsa, hsaMonthlyCapacity, hsaTargetContribution, HSA_AGES, HSA_RETURN_OPTIONS,
  CARE_MONTH_OPTIONS, HSA_TARGET_OPTIONS, HSA_STRATEGY_LABEL, HSA_STRATEGY_NOTE, usd,
  type GapStrategyState, type HsaStrategy,
} from '@/lib/ltc/gapstrategy';

export function HsaGapReserve({ h, g, patchG }: {
  h: LtcHousehold; g: GapStrategyState; patchG: (p: Partial<GapStrategyState>) => void;
}) {
  const hsa = g.hsa;
  const setHsa = (p: Partial<GapStrategyState['hsa']>) => patchG({ hsa: { ...hsa, ...p } });
  const annual = hsa.monthlyContribution * 12 + hsa.annualCatchUp + hsa.employerAnnual;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Future Care HSA Reserve</CardTitle>
          <p className="text-xs text-muted-foreground">
            Default strategy: invest the HSA for retirement healthcare and LTC whenever practical instead of
            routinely spending it on current medical expenses.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><Label className="text-xs">Current HSA balance</Label><Input type="number" value={hsa.balance} onChange={(e) => setHsa({ balance: Number(e.target.value) })} /></div>
            <div><Label className="text-xs">Monthly contribution</Label><Input type="number" value={hsa.monthlyContribution} onChange={(e) => setHsa({ monthlyContribution: Number(e.target.value) })} /></div>
            <div><Label className="text-xs">Annual catch-up (55+)</Label><Input type="number" value={hsa.annualCatchUp} onChange={(e) => setHsa({ annualCatchUp: Number(e.target.value) })} /></div>
            <div><Label className="text-xs">Employer annual</Label><Input type="number" value={hsa.employerAnnual} onChange={(e) => setHsa({ employerAnnual: Number(e.target.value) })} /></div>
            <div><Label className="text-xs">Annual medical withdrawals</Label><Input type="number" value={hsa.annualMedical} onChange={(e) => setHsa({ annualMedical: Number(e.target.value) })} /></div>
            <div><Label className="text-xs">Age when LTC begins</Label><Input type="number" value={g.stress.claimAge} onChange={(e) => patchG({ stress: { ...g.stress, claimAge: Number(e.target.value) } })} /></div>
            <div><Label className="text-xs">Expected care months</Label><Input type="number" value={g.careMonths} onChange={(e) => patchG({ careMonths: Number(e.target.value) })} /></div>
            <div>
              <Label className="text-xs">Total annual contribution</Label>
              <div className="h-10 flex items-center font-semibold">{usd(annual)}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Return assumption:</span>
            {HSA_RETURN_OPTIONS.map((r) => (
              <Button key={r} size="sm" variant={hsa.returnPct === r ? 'default' : 'outline'} onClick={() => setHsa({ returnPct: r })}>{r}%</Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Care period:</span>
            {CARE_MONTH_OPTIONS.map((m) => (
              <Button key={m} size="sm" variant={g.careMonths === m ? 'default' : 'outline'} onClick={() => patchG({ careMonths: m })}>{m} mo</Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Projected HSA balance and monthly gap capacity</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Age</TableHead><TableHead className="text-right">HSA balance</TableHead>
              <TableHead className="text-right">Monthly HSA support ({g.careMonths} mo)</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {HSA_AGES.map((age) => {
                const bal = projectHsa(hsa, h.lymanAge, age);
                return (
                  <TableRow key={age}>
                    <TableCell>{age}</TableCell>
                    <TableCell className="text-right font-medium">{usd(bal)}</TableCell>
                    <TableCell className="text-right">{usd(hsaMonthlyCapacity(bal, g.careMonths))}/mo</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <p className="text-[11px] text-muted-foreground mt-2">
            Monthly HSA support = available balance ÷ expected months of care, before investment changes and other medical use.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">HSA preservation scenarios</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Strategy</TableHead><TableHead className="text-right">Age 75</TableHead>
              <TableHead className="text-right">Age 80</TableHead><TableHead className="text-right">Age 85</TableHead>
              <TableHead className="text-right">Monthly gap it can fund at 80</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(['spendToday', 'partial', 'reserve'] as HsaStrategy[]).map((s) => {
                const b80 = projectHsa(hsa, h.lymanAge, 80, { strategy: s });
                return (
                  <TableRow key={s} className={g.hsa.strategy === s ? 'bg-primary/5' : ''}>
                    <TableCell>
                      <button className="text-left" onClick={() => setHsa({ strategy: s })}>
                        <div className="font-medium">{HSA_STRATEGY_LABEL[s]}</div>
                        <div className="text-[11px] text-muted-foreground">{HSA_STRATEGY_NOTE[s]}</div>
                      </button>
                    </TableCell>
                    <TableCell className="text-right">{usd(projectHsa(hsa, h.lymanAge, 75, { strategy: s }))}</TableCell>
                    <TableCell className="text-right">{usd(b80)}</TableCell>
                    <TableCell className="text-right">{usd(projectHsa(hsa, h.lymanAge, 85, { strategy: s }))}</TableCell>
                    <TableCell className="text-right">{usd(hsaMonthlyCapacity(b80, g.careMonths))}/mo · {Math.round(g.careMonths)} mo of care</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">HSA future care target</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {HSA_TARGET_OPTIONS.map((t) => (
              <Button key={t} size="sm" variant={g.hsaTarget === t ? 'default' : 'outline'} onClick={() => patchG({ hsaTarget: t })}>{usd(t)}</Button>
            ))}
            <Input className="w-32" type="number" value={g.hsaTarget} onChange={(e) => patchG({ hsaTarget: Number(e.target.value) })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[70, 75, 80].map((age) => (
              <div key={age} className="rounded-md border p-3">
                <div className="text-[11px] text-muted-foreground">Monthly needed by age {age}</div>
                <div className="text-lg font-semibold">{usd(hsaTargetContribution(hsa, h.lymanAge, age, g.hsaTarget))}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">HSA shortfall backup — taxable Future Care Reserve</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Funding order: HSA → taxable LTC reserve → retirement portfolio. A taxable reserve is only needed when HSA
            projections fall short of the target.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><Label className="text-xs">Reserve balance</Label><Input type="number" value={g.taxableReserve.balance} onChange={(e) => patchG({ taxableReserve: { ...g.taxableReserve, balance: Number(e.target.value) } })} /></div>
            <div><Label className="text-xs">Monthly contribution</Label><Input type="number" value={g.taxableReserve.monthlyContribution} onChange={(e) => patchG({ taxableReserve: { ...g.taxableReserve, monthlyContribution: Number(e.target.value) } })} /></div>
            <div><Label className="text-xs">Return %</Label><Input type="number" value={g.taxableReserve.returnPct} onChange={(e) => patchG({ taxableReserve: { ...g.taxableReserve, returnPct: Number(e.target.value) } })} /></div>
            <div>
              <Label className="text-xs">Projected at claim age</Label>
              <div className="h-10 flex items-center font-semibold">
                {usd(projectHsa(
                  { ...g.hsa, balance: g.taxableReserve.balance, monthlyContribution: g.taxableReserve.monthlyContribution, annualCatchUp: 0, employerAnnual: 0, annualMedical: 0, returnPct: g.taxableReserve.returnPct, strategy: 'reserve' },
                  h.lymanAge, g.stress.claimAge,
                ))}
              </div>
            </div>
          </div>
          {projectHsa(hsa, h.lymanAge, g.stress.claimAge) >= g.hsaTarget && (
            <p className="text-[11px] text-prism-positive">HSA projections already meet the target — a taxable reserve is optional.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
