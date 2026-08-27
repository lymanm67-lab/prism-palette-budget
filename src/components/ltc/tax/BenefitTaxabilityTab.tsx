import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, FileText } from 'lucide-react';
import { money2, NumField, StatCard } from '../shared';
import { PlanningNotice } from '../nationwide/PlanningNotice';
import { assessBenefitTaxability, TAX_DISCLAIMER, type BenefitTaxInputs } from '@/lib/ltc/tax';
import { NW } from '@/lib/ltc/nationwide';

const DEFAULTS: BenefitTaxInputs = {
  monthlyBenefit: NW.monthlyBenefitEach,
  monthlyQualifiedCost: 2_100,
  daysInMonth: 30,
  chronicallyIllCertified: true,
  planOfCareOnFile: true,
  taxQualifiedContract: true,
};

export function BenefitTaxabilityTab({
  inputs,
  onChange,
}: {
  inputs?: BenefitTaxInputs;
  onChange?: (i: BenefitTaxInputs) => void;
}) {
  const [local, setLocal] = useState<BenefitTaxInputs>(inputs ?? DEFAULTS);
  const i = inputs ?? local;
  const patch = (p: Partial<BenefitTaxInputs>) => {
    const next = { ...i, ...p };
    setLocal(next);
    onChange?.(next);
  };

  const r = useMemo(() => assessBenefitTaxability(i), [i]);

  const tone = r.status === 'likely-excluded' ? 'good' : r.status === 'partially-taxable' ? 'warn' : 'risk';
  const statusLabel =
    r.status === 'likely-excluded'
      ? 'Likely excluded from income'
      : r.status === 'partially-taxable'
      ? 'Partially taxable'
      : 'Needs review';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-prism-amber" /> Qualified LTC Benefit Taxability
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Cash indemnity benefits are excludable up to the greater of actual qualified long-term care costs or the
            statutory per-diem amount, provided the contract is tax-qualified and the chronically ill certification and
            plan of care are in place.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Monthly benefit elected</Label>
              <NumField value={i.monthlyBenefit} onChange={(n) => patch({ monthlyBenefit: n })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Monthly qualified care cost</Label>
              <NumField value={i.monthlyQualifiedCost} onChange={(n) => patch({ monthlyQualifiedCost: n })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Days in benefit month</Label>
              <NumField value={i.daysInMonth ?? 30} onChange={(n) => patch({ daysInMonth: Math.max(1, Math.round(n)) })} />
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <Toggle
              id="qualified"
              label="Tax-qualified contract (IRC §7702B)"
              checked={i.taxQualifiedContract}
              onChange={(v) => patch({ taxQualifiedContract: v })}
            />
            <Toggle
              id="chronic"
              label="Chronically ill certification in place"
              checked={i.chronicallyIllCertified}
              onChange={(v) => patch({ chronicallyIllCertified: v })}
            />
            <Toggle
              id="poc"
              label="Plan of care on file"
              checked={i.planOfCareOnFile}
              onChange={(v) => patch({ planOfCareOnFile: v })}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Status" value={statusLabel} sub="Based on your assumptions" tone={tone as never} />
            <StatCard label="Per-diem limit" value={`${money2(r.perDiemLimit)}/day`} sub="IRC §7702B(d)" />
            <StatCard label="Monthly per-diem allowance" value={money2(r.monthlyPerDiemAllowance)} sub={`${i.daysInMonth ?? 30} days`} />
            <StatCard
              label="Potentially taxable"
              value={money2(r.potentiallyTaxable)}
              sub={`Excludable ${money2(r.excludableAmount)}`}
              tone={r.potentiallyTaxable > 0 ? 'warn' : 'good'}
            />
          </div>

          <div className="space-y-2">
            {r.tests.map((t) => (
              <div key={t.label} className="rounded-lg border border-border/60 p-3 flex gap-2">
                {t.passed ? (
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-prism-lime" />
                ) : (
                  <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
                )}
                <div>
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.detail}</p>
                </div>
                <Badge variant={t.passed ? 'secondary' : 'destructive'} className="ml-auto h-5 text-[10px]">
                  {t.passed ? 'Met' : 'Unmet'}
                </Badge>
              </div>
            ))}
          </div>

          <p className="text-sm">{r.summary}</p>
          <p className="text-xs text-muted-foreground">{r.caveat}</p>
          <p className="text-xs text-muted-foreground">{TAX_DISCLAIMER}</p>
        </CardContent>
      </Card>
      <PlanningNotice />
    </div>
  );
}

function Toggle({
  id, label, checked, onChange,
}: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="text-xs">{label}</Label>
    </div>
  );
}
