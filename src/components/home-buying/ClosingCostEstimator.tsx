import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { FileText } from 'lucide-react';
import { STATE_DATA } from '@/lib/state-data';
import { fmt$ } from '@/lib/home-buying/mortgage-math';

export default function ClosingCostEstimator() {
  const [price, setPrice] = useState(350000);
  const [state, setState] = useState('OH');
  const stateInfo = STATE_DATA[state] ?? STATE_DATA[''];

  const breakdown = useMemo(() => {
    const loanAmount = price * 0.9;
    return {
      'Loan origination (1%)': loanAmount * 0.01,
      'Appraisal': 600,
      'Credit report': 50,
      'Title insurance': price * 0.005,
      'Escrow / settlement': 800,
      'Recording fees': 250,
      'Prepaid property tax (3 mo)': (stateInfo.propertyTax / 100 * price) / 4,
      'Prepaid homeowners insurance (1 yr)': (stateInfo.insurance / 100 * price),
      'Transfer tax': price * 0.004,
      'Inspection': 450,
    };
  }, [price, stateInfo]);

  const total = Object.values(breakdown).reduce((s, v) => s + v, 0);
  const pctOfPrice = (total / price) * 100;

  return (
    <Card className="prism-card-shine border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-display">
          <FileText className="h-5 w-5 text-prism-amber" />
          Closing Cost Estimator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Home Price</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(+e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">State</Label>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {Object.entries(STATE_DATA).filter(([k]) => k).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg border border-border/40 divide-y divide-border/40">
          {Object.entries(breakdown).map(([label, value]) => (
            <div key={label} className="flex items-center justify-between p-2.5 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-mono font-medium">{fmt$(value)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between p-3 bg-prism-amber/5">
            <span className="font-display font-bold">Estimated Closing Costs</span>
            <div className="text-right">
              <div className="font-display text-lg font-bold prism-gradient-text">{fmt$(total)}</div>
              <div className="text-[10px] text-muted-foreground">~{pctOfPrice.toFixed(1)}% of price</div>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Closing costs typically run 2–5% of the home price. Many can be negotiated, rolled into the loan, or paid by the seller (a "seller credit").
        </p>
      </CardContent>
    </Card>
  );
}
