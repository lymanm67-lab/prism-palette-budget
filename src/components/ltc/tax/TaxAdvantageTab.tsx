import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Receipt } from 'lucide-react';
import { money2, NumField, StatCard } from '../shared';
import { PlanningNotice } from '../nationwide/PlanningNotice';
import {
  estimatePremiumDeduction,
  NW_TAX_DEFAULTS,
  FILING_LABEL,
  TAX_DISCLAIMER,
  type FilingStatus,
  type PremiumDeductionInputs,
} from '@/lib/ltc/tax';

export function TaxAdvantageTab({
  inputs,
  onChange,
}: {
  inputs?: PremiumDeductionInputs;
  onChange?: (i: PremiumDeductionInputs) => void;
}) {
  const [local, setLocal] = useState<PremiumDeductionInputs>(inputs ?? NW_TAX_DEFAULTS);
  const i = inputs ?? local;
  const patch = (p: Partial<PremiumDeductionInputs>) => {
    const next = { ...i, ...p };
    setLocal(next);
    onChange?.(next);
  };

  const r = useMemo(() => estimatePremiumDeduction(i), [i]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4 text-prism-lime" /> Premium Deduction Estimator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Applies the IRS age-based eligible long-term care premium caps, then tests whether any of it survives the
            7.5% AGI medical floor on your filing path.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Annual LTC premium</Label>
              <NumField value={i.annualPremium} onChange={(n) => patch({ annualPremium: n })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Insured 1 age (year end)</Label>
              <NumField value={i.ages[0] ?? 0} onChange={(n) => patch({ ages: [n, i.ages[1] ?? 0] })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Insured 2 age (year end)</Label>
              <NumField value={i.ages[1] ?? 0} onChange={(n) => patch({ ages: [i.ages[0] ?? 0, n] })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Filing status</Label>
              <Select value={i.filingStatus} onValueChange={(v) => patch({ filingStatus: v as FilingStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(FILING_LABEL) as FilingStatus[]).map((k) => (
                    <SelectItem key={k} value={k}>{FILING_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">AGI</Label>
              <NumField value={i.agi} onChange={(n) => patch({ agi: n })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Other medical expenses</Label>
              <NumField value={i.otherMedicalExpenses} onChange={(n) => patch({ otherMedicalExpenses: n })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Marginal rate (%)</Label>
              <NumField value={Math.round(i.marginalRate * 1000) / 10} onChange={(n) => patch({ marginalRate: n / 100 })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Premium paid from HSA</Label>
              <NumField value={i.premiumPaidFromHsa ?? 0} onChange={(n) => patch({ premiumPaidFromHsa: n })} />
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={i.itemizes} onCheckedChange={(v) => patch({ itemizes: v })} id="itemizes" />
              <Label htmlFor="itemizes" className="text-xs">Itemizing deductions (Schedule A)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={i.selfEmployedHealthPlan}
                onCheckedChange={(v) => patch({ selfEmployedHealthPlan: v })}
                id="se-health"
              />
              <Label htmlFor="se-health" className="text-xs">Self-employed health insurance deduction</Label>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="IRS eligible premium cap" value={money2(r.eligiblePremiumCap)} sub="Sum of the age-band limits" />
            <StatCard label="Countable premium" value={money2(r.countablePremium)} sub="After caps and HSA exclusion" tone="info" />
            <StatCard
              label="Estimated deduction"
              value={money2(r.deductibleAmount)}
              sub={r.path === 'self-employed' ? 'Above the line' : r.path === 'schedule-a' ? 'Above the 7.5% AGI floor' : 'No deduction on these inputs'}
              tone={r.deductibleAmount > 0 ? 'good' : 'warn'}
            />
            <StatCard
              label="Estimated tax savings"
              value={money2(r.estimatedTaxSavings)}
              sub={`At a ${(i.marginalRate * 100).toFixed(1)}% marginal rate`}
              tone={r.estimatedTaxSavings > 0 ? 'good' : 'default'}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="text-left py-1.5">Insured age</th>
                  <th className="text-left py-1.5">IRS age band</th>
                  <th className="text-right py-1.5">Eligible limit</th>
                  <th className="text-right py-1.5">Counted premium</th>
                </tr>
              </thead>
              <tbody>
                {r.perInsured.map((p, idx) => (
                  <tr key={idx} className="border-b border-border/40">
                    <td className="py-1.5">Age {p.age}</td>
                    <td className="py-1.5">{p.band}</td>
                    <td className="py-1.5 text-right tabular-nums">{money2(p.limit)}</td>
                    <td className="py-1.5 text-right tabular-nums font-semibold">{money2(p.counted)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-1.5 text-xs text-muted-foreground" colSpan={2}>7.5% AGI medical floor</td>
                  <td className="py-1.5" />
                  <td className="py-1.5 text-right tabular-nums">{money2(r.agiFloor)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {r.reasons.length > 0 && (
            <ul className="space-y-1 text-xs text-muted-foreground list-disc pl-5">
              {r.reasons.map((x, idx) => <li key={idx}>{x}</li>)}
            </ul>
          )}

          <p className="text-xs text-muted-foreground">{TAX_DISCLAIMER}</p>
        </CardContent>
      </Card>
      <PlanningNotice />
    </div>
  );
}
