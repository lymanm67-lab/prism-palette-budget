import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet } from 'lucide-react';
import { BRACKETS_SINGLE_2025, BRACKETS_MFJ_2025, taxOn } from '@/lib/investment/tax';

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

// Simplified 2025 state top marginal rates (flat approximation for take-home preview)
const STATE_RATES: Record<string, number> = {
  none: 0, CA: 0.093, NY: 0.0685, TX: 0, FL: 0, WA: 0, IL: 0.0495, PA: 0.0307, OH: 0.035,
  GA: 0.0549, NC: 0.045, MI: 0.0425, VA: 0.0575, MA: 0.05, NJ: 0.0637, AZ: 0.025, CO: 0.044,
};

export default function PaycheckCalculator() {
  const [gross, setGross] = useState(85000);
  const [filing, setFiling] = useState<'single' | 'mfj'>('single');
  const [state, setState] = useState('none');
  const [retire, setRetire] = useState(6); // % 401k
  const [health, setHealth] = useState(2400); // annual pre-tax
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'semi' | 'monthly'>('biweekly');

  const r = useMemo(() => {
    const preTax = gross * (retire / 100) + health;
    const fedTaxable = Math.max(0, gross - preTax - (filing === 'mfj' ? 29200 : 14600));
    const brackets = filing === 'mfj' ? BRACKETS_MFJ_2025 : BRACKETS_SINGLE_2025;
    const fed = taxOn(fedTaxable, brackets);
    const ss = Math.min(gross, 168600) * 0.062;
    const medicare = gross * 0.0145;
    const stateTax = fedTaxable * (STATE_RATES[state] ?? 0);
    const totalTax = fed + ss + medicare + stateTax;
    const annualNet = gross - preTax - totalTax;
    const divisor = frequency === 'weekly' ? 52 : frequency === 'biweekly' ? 26 : frequency === 'semi' ? 24 : 12;
    return {
      annualNet, perCheck: annualNet / divisor, fed, ss, medicare, stateTax, preTax, totalTax,
      effRate: totalTax / gross,
    };
  }, [gross, filing, state, retire, health, frequency]);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /> Paycheck / Take-Home Pay</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Annual gross salary</Label><Input type="number" value={gross} onChange={e => setGross(+e.target.value)} /></div>
          <div><Label>Filing status</Label>
            <Select value={filing} onValueChange={(v: any) => setFiling(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="single">Single</SelectItem><SelectItem value="mfj">Married Filing Jointly</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>State</Label>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No state tax (TX/FL/WA/...)</SelectItem>
                {Object.keys(STATE_RATES).filter(k => k !== 'none').map(s => <SelectItem key={s} value={s}>{s} ({((STATE_RATES[s]) * 100).toFixed(2)}%)</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Pay frequency</Label>
            <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly (52)</SelectItem>
                <SelectItem value="biweekly">Biweekly (26)</SelectItem>
                <SelectItem value="semi">Semi-monthly (24)</SelectItem>
                <SelectItem value="monthly">Monthly (12)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>401(k) contribution %</Label><Input type="number" value={retire} onChange={e => setRetire(+e.target.value)} /></div>
          <div><Label>Pre-tax health/HSA (annual)</Label><Input type="number" value={health} onChange={e => setHealth(+e.target.value)} /></div>
        </div>

        <div className="grid md:grid-cols-3 gap-3 pt-2">
          <div className="rounded-lg bg-primary/10 p-4">
            <div className="text-xs text-muted-foreground">Per paycheck</div>
            <div className="text-2xl font-bold text-primary">{fmt(r.perCheck)}</div>
          </div>
          <div className="rounded-lg bg-muted/40 p-4">
            <div className="text-xs text-muted-foreground">Annual net</div>
            <div className="text-2xl font-bold">{fmt(r.annualNet)}</div>
          </div>
          <div className="rounded-lg bg-muted/40 p-4">
            <div className="text-xs text-muted-foreground">Effective tax rate</div>
            <div className="text-2xl font-bold">{(r.effRate * 100).toFixed(1)}%</div>
          </div>
        </div>

        <div className="space-y-1 text-sm rounded-lg border p-3">
          <div className="flex justify-between"><span>Federal income tax</span><span>{fmt(r.fed)}</span></div>
          <div className="flex justify-between"><span>Social Security (6.2%)</span><span>{fmt(r.ss)}</span></div>
          <div className="flex justify-between"><span>Medicare (1.45%)</span><span>{fmt(r.medicare)}</span></div>
          <div className="flex justify-between"><span>State tax</span><span>{fmt(r.stateTax)}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>Pre-tax deductions (401k + health)</span><span>{fmt(r.preTax)}</span></div>
        </div>
      </CardContent>
    </Card>
  );
}
