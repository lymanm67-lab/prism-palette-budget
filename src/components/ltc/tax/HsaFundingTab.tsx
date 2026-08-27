import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PiggyBank, Check } from 'lucide-react';
import { money2, NumField, StatCard } from '../shared';
import { PlanningNotice } from '../nationwide/PlanningNotice';
import { compareHsaVsCash, TAX_DISCLAIMER, type HsaFundingInputs } from '@/lib/ltc/tax';
import { NW } from '@/lib/ltc/nationwide';

const DEFAULTS: HsaFundingInputs = {
  annualPremium: NW.annualPremium,
  years: 10,
  hsaBalance: 12_000,
  hsaReturnPct: 6,
  marginalRate: 0.22,
  ages: [59, 57],
  agi: 112_000,
  filingStatus: 'mfj',
  otherMedicalExpenses: 4_000,
  itemizes: false,
};

export function HsaFundingTab({
  inputs,
  onChange,
}: {
  inputs?: HsaFundingInputs;
  onChange?: (i: HsaFundingInputs) => void;
}) {
  const [local, setLocal] = useState<HsaFundingInputs>(inputs ?? DEFAULTS);
  const i = inputs ?? local;
  const patch = (p: Partial<HsaFundingInputs>) => {
    const next = { ...i, ...p };
    setLocal(next);
    onChange?.(next);
  };

  const r = useMemo(() => compareHsaVsCash(i), [i]);
  const paths = [r.hsaPath, r.cashPath];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <PiggyBank className="h-4 w-4 text-prism-sky" /> HSA vs Cash Premium Funding
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            HSA dollars pay qualified LTC premiums tax-free up to the IRS age-based eligible amount, but the dollars
            withdrawn stop compounding. Both paths are compared at the same future point in time.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs">Annual premium</Label>
              <NumField value={i.annualPremium} onChange={(n) => patch({ annualPremium: n })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Years funded from HSA</Label>
              <NumField value={i.years} onChange={(n) => patch({ years: Math.max(1, Math.round(n)) })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">HSA balance today</Label>
              <NumField value={i.hsaBalance} onChange={(n) => patch({ hsaBalance: n })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">HSA return (%)</Label>
              <NumField value={i.hsaReturnPct} onChange={(n) => patch({ hsaReturnPct: n })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Marginal rate (%)</Label>
              <NumField value={Math.round(i.marginalRate * 1000) / 10} onChange={(n) => patch({ marginalRate: n / 100 })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">AGI</Label>
              <NumField value={i.agi} onChange={(n) => patch({ agi: n })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Other medical expenses</Label>
              <NumField value={i.otherMedicalExpenses} onChange={(n) => patch({ otherMedicalExpenses: n })} />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <Switch checked={i.itemizes} onCheckedChange={(v) => patch({ itemizes: v })} id="hsa-itemize" />
              <Label htmlFor="hsa-itemize" className="text-xs">Itemizing</Label>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label="HSA-eligible premium / yr"
              value={money2(r.eligiblePremiumPerYear)}
              sub="Capped by the IRS age-based amount"
              tone="info"
            />
            <StatCard
              label="Better path on these inputs"
              value={r.winner === 'hsa' ? 'Pay from HSA' : 'Pay with cash'}
              sub={`Advantage ${money2(Math.abs(r.advantageHsa))}`}
              tone="good"
            />
            <StatCard
              label="Tax-free growth given up"
              value={money2(r.hsaPath.forgoneGrowth)}
              sub={`Over ${i.years} years at ${i.hsaReturnPct}%`}
              tone="warn"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {paths.map((p) => {
              const isWinner = (r.winner === 'hsa' && p === r.hsaPath) || (r.winner === 'cash' && p === r.cashPath);
              return (
                <div
                  key={p.label}
                  className={`rounded-lg border p-3 space-y-2 ${isWinner ? 'border-prism-lime/50 bg-prism-lime/5' : 'border-border/60'}`}
                >
                  <div className="flex items-center gap-2">
                    {isWinner && <Check className="h-3.5 w-3.5 text-prism-lime" />}
                    <p className="text-sm font-semibold">{p.label}</p>
                  </div>
                  <dl className="text-xs space-y-1">
                    <Row label={`After-tax outlay (future value, ${i.years} yr)`} value={money2(p.afterTaxCost)} />
                    <Row label="HSA balance at end of horizon" value={money2(p.hsaEndingBalance)} />
                    <Row label="Tax benefit captured" value={money2(p.taxBenefit)} />
                    <Row label="Tax-free growth given up" value={money2(p.forgoneGrowth)} />
                  </dl>
                  <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                    {p.notes.map((n, idx) => <li key={idx}>{n}</li>)}
                  </ul>
                </div>
              );
            })}
          </div>

          <p className="text-sm">{r.recommendation}</p>
          <p className="text-xs text-muted-foreground">{TAX_DISCLAIMER}</p>
        </CardContent>
      </Card>
      <PlanningNotice />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums font-medium">{value}</dd>
    </div>
  );
}
