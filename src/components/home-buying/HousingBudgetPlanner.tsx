import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Home, PiggyBank, Save, RotateCcw } from 'lucide-react';
import { calcMortgage, fmt$ } from '@/lib/home-buying/mortgage-math';
import { toast } from 'sonner';

const STORAGE_KEY = 'prism.housing-budget.v1';

interface HousingBudgetState {
  price: number;
  downPct: number;
  ratePct: number;
  termYears: number;
  propertyTaxPct: number;  // % of price/yr
  insurancePct: number;    // % of price/yr
  pmiPct: number;          // % of loan/yr (used when down < 20%)
  hoaMonthly: number;
  maintPct: number;        // % of price/yr
  utilities: number;
  internet: number;
  lawn: number;
  pest: number;
  warranty: number;
  repairReserve: number;   // monthly savings toward big-ticket repairs
  otherMonthly: number;
  otherLabel: string;
}

const DEFAULTS: HousingBudgetState = {
  price: 350000,
  downPct: 10,
  ratePct: 6.75,
  termYears: 30,
  propertyTaxPct: 1.6,   // Ohio avg ~1.6%
  insurancePct: 0.35,
  pmiPct: 0.5,
  hoaMonthly: 0,
  maintPct: 1.0,
  utilities: 240,
  internet: 80,
  lawn: 60,
  pest: 40,
  warranty: 45,
  repairReserve: 200,
  otherMonthly: 0,
  otherLabel: 'Other',
};

function load(): HousingBudgetState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { return DEFAULTS; }
}

export default function HousingBudgetPlanner({ price: priceProp, onPriceChange }: { price?: number; onPriceChange?: (n: number) => void } = {}) {
  const [state, setState] = useState<HousingBudgetState>(load());
  const price = priceProp ?? state.price;

  // Sync shared price into local state so calcs stay consistent
  useEffect(() => {
    if (priceProp !== undefined && priceProp !== state.price) {
      setState((s) => ({ ...s, price: priceProp }));
    }
  }, [priceProp]);

  const set = <K extends keyof HousingBudgetState>(k: K, v: HousingBudgetState[K]) => {
    setState((s) => ({ ...s, [k]: v }));
    if (k === 'price' && onPriceChange) onPriceChange(v as number);
  };

  const mortgage = useMemo(() => calcMortgage({
    price,
    downPct: state.downPct,
    ratePct: state.ratePct,
    termYears: state.termYears,
    propertyTaxPct: state.propertyTaxPct,
    insurancePct: state.insurancePct,
    hoaMonthly: state.hoaMonthly,
    pmiPct: state.pmiPct,
  }), [price, state]);

  const monthlyMaint = (state.maintPct / 100) * price / 12;
  const totalMonthly =
    mortgage.monthlyPITI +
    monthlyMaint +
    state.utilities +
    state.internet +
    state.lawn +
    state.pest +
    state.warranty +
    state.repairReserve +
    state.otherMonthly;

  const surprise = totalMonthly - mortgage.monthlyPI;

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, price }));
      toast.success('Housing budget saved');
    } catch { toast.error('Could not save'); }
  };

  const reset = () => {
    setState(DEFAULTS);
    if (onPriceChange) onPriceChange(DEFAULTS.price);
    toast.info('Reset to defaults');
  };

  const rows: { label: string; value: number; note?: string }[] = [
    { label: 'Mortgage P&I', value: mortgage.monthlyPI, note: `${state.termYears}yr @ ${state.ratePct}%` },
    { label: 'Property Tax', value: mortgage.monthlyTax, note: `${state.propertyTaxPct}%/yr` },
    { label: 'Homeowners Insurance', value: mortgage.monthlyInsurance, note: `${state.insurancePct}%/yr` },
    { label: 'PMI', value: mortgage.monthlyPmi, note: state.downPct < 20 ? `${state.pmiPct}%/yr` : 'not required (≥20% down)' },
    { label: 'HOA', value: state.hoaMonthly },
    { label: 'Maintenance', value: monthlyMaint, note: `${state.maintPct}%/yr of price` },
    { label: 'Utilities', value: state.utilities, note: 'electric, gas, water, sewer, trash' },
    { label: 'Internet / Cable', value: state.internet },
    { label: 'Lawn / Landscaping', value: state.lawn },
    { label: 'Pest Control', value: state.pest },
    { label: 'Home Warranty', value: state.warranty },
    { label: 'Repair Reserve Savings', value: state.repairReserve, note: 'toward roof, HVAC, appliances' },
    { label: state.otherLabel || 'Other', value: state.otherMonthly },
  ];

  return (
    <Card className="prism-card-shine border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 font-display">
            <Home className="h-5 w-5 text-prism-teal" />
            Housing Budget — True Cost of Ownership
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={reset}><RotateCcw className="h-3.5 w-3.5 mr-1" />Reset</Button>
            <Button size="sm" onClick={save}><Save className="h-3.5 w-3.5 mr-1" />Save</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Inputs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><Label className="text-xs">Home Price</Label><Input type="number" value={price} onChange={(e) => set('price', +e.target.value)} /></div>
          <div><Label className="text-xs">Down %</Label><Input type="number" value={state.downPct} onChange={(e) => set('downPct', +e.target.value)} /></div>
          <div><Label className="text-xs">Rate %</Label><Input type="number" step="0.125" value={state.ratePct} onChange={(e) => set('ratePct', +e.target.value)} /></div>
          <div><Label className="text-xs">Term (yrs)</Label><Input type="number" value={state.termYears} onChange={(e) => set('termYears', +e.target.value)} /></div>
          <div><Label className="text-xs">Property Tax %/yr</Label><Input type="number" step="0.05" value={state.propertyTaxPct} onChange={(e) => set('propertyTaxPct', +e.target.value)} /></div>
          <div><Label className="text-xs">Insurance %/yr</Label><Input type="number" step="0.05" value={state.insurancePct} onChange={(e) => set('insurancePct', +e.target.value)} /></div>
          <div><Label className="text-xs">PMI %/yr</Label><Input type="number" step="0.05" value={state.pmiPct} onChange={(e) => set('pmiPct', +e.target.value)} /></div>
          <div><Label className="text-xs">Maintenance %/yr</Label><Input type="number" step="0.1" value={state.maintPct} onChange={(e) => set('maintPct', +e.target.value)} /></div>
          <div><Label className="text-xs">HOA / mo</Label><Input type="number" value={state.hoaMonthly} onChange={(e) => set('hoaMonthly', +e.target.value)} /></div>
          <div><Label className="text-xs">Utilities / mo</Label><Input type="number" value={state.utilities} onChange={(e) => set('utilities', +e.target.value)} /></div>
          <div><Label className="text-xs">Internet / mo</Label><Input type="number" value={state.internet} onChange={(e) => set('internet', +e.target.value)} /></div>
          <div><Label className="text-xs">Lawn / mo</Label><Input type="number" value={state.lawn} onChange={(e) => set('lawn', +e.target.value)} /></div>
          <div><Label className="text-xs">Pest / mo</Label><Input type="number" value={state.pest} onChange={(e) => set('pest', +e.target.value)} /></div>
          <div><Label className="text-xs">Home Warranty / mo</Label><Input type="number" value={state.warranty} onChange={(e) => set('warranty', +e.target.value)} /></div>
          <div><Label className="text-xs">Repair Reserve / mo</Label><Input type="number" value={state.repairReserve} onChange={(e) => set('repairReserve', +e.target.value)} /></div>
          <div>
            <Label className="text-xs">{state.otherLabel} / mo</Label>
            <Input type="number" value={state.otherMonthly} onChange={(e) => set('otherMonthly', +e.target.value)} />
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg border border-border/40 bg-card/40 p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Mortgage P&amp;I only</p>
            <p className="font-display text-2xl font-bold">{fmt$(mortgage.monthlyPI)}<span className="text-xs text-muted-foreground font-normal">/mo</span></p>
            <p className="text-[11px] text-muted-foreground">What most people quote you.</p>
          </div>
          <div className="rounded-lg border border-prism-amber/40 bg-prism-amber/5 p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">PITI (bank's number)</p>
            <p className="font-display text-2xl font-bold text-prism-amber">{fmt$(mortgage.monthlyPITI)}<span className="text-xs text-muted-foreground font-normal">/mo</span></p>
            <p className="text-[11px] text-muted-foreground">P&amp;I + tax + ins {state.downPct < 20 ? '+ PMI ' : ''}+ HOA.</p>
          </div>
          <div className="rounded-lg border border-prism-teal/40 bg-prism-teal/5 p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">True cost of ownership</p>
            <p className="font-display text-3xl font-extrabold prism-gradient-text">{fmt$(totalMonthly)}<span className="text-xs text-muted-foreground font-normal">/mo</span></p>
            <p className="text-[11px] text-muted-foreground">Everything you'll actually pay.</p>
          </div>
        </div>

        {/* Surprise callout */}
        <div className="rounded-lg border border-prism-rose/30 bg-prism-rose/5 p-4 flex items-start gap-3">
          <PiggyBank className="h-5 w-5 text-prism-rose flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">The "surprise" gap: {fmt$(surprise)}/mo</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              That's how much beyond the mortgage payment you'll actually spend every month owning this home
              — <strong>{fmt$(surprise * 12)}/yr</strong>. Budget for it now so it doesn't blindside you later.
            </p>
          </div>
        </div>

        {/* Detailed breakdown */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Monthly Breakdown</p>
          <div className="rounded-lg border border-border/40 divide-y divide-border/40">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between p-2.5 text-sm">
                <div className="flex flex-col">
                  <span>{r.label}</span>
                  {r.note && <span className="text-[10px] text-muted-foreground">{r.note}</span>}
                </div>
                <span className="font-mono font-medium">{fmt$(r.value)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between p-3 bg-muted/30">
              <span className="font-display font-bold">Total Monthly</span>
              <span className="font-display text-lg font-bold prism-gradient-text">{fmt$(totalMonthly)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
