import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { rothConversionLadder, BRACKETS_SINGLE_2025, BRACKETS_MFJ_2025 } from '@/lib/investment/tax';
import { ArrowUpDown } from 'lucide-react';

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

export default function RothConversionLadderCalculator() {
  const [balance, setBalance] = useState(400000);
  const [baseIncome, setBaseIncome] = useState(60000);
  const [years, setYears] = useState(10);
  const [rate, setRate] = useState(0.12);
  const [filing, setFiling] = useState<'single' | 'mfj'>('single');
  const [returnPct, setReturnPct] = useState(6);

  const brackets = filing === 'single' ? BRACKETS_SINGLE_2025 : BRACKETS_MFJ_2025;
  const r = useMemo(() => rothConversionLadder({
    traditionalBalance: balance,
    baseTaxableIncome: baseIncome,
    yearsAvailable: years,
    fillToTopOfBracketRate: rate,
    brackets,
    returnPct,
  }), [balance, baseIncome, years, rate, brackets, returnPct]);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><ArrowUpDown className="h-5 w-5 text-primary" /> Roth Conversion Ladder</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-3 gap-3">
          <div><Label>Traditional balance</Label><Input type="number" value={balance} onChange={e => setBalance(+e.target.value)} /></div>
          <div><Label>Base taxable income</Label><Input type="number" value={baseIncome} onChange={e => setBaseIncome(+e.target.value)} /></div>
          <div><Label>Years available (before RMD)</Label><Input type="number" value={years} onChange={e => setYears(+e.target.value)} /></div>
          <div>
            <Label>Filing status</Label>
            <Select value={filing} onValueChange={v => setFiling(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="mfj">Married filing jointly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fill to top of bracket</Label>
            <Select value={String(rate)} onValueChange={v => setRate(+v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0.1">10%</SelectItem>
                <SelectItem value="0.12">12%</SelectItem>
                <SelectItem value="0.22">22%</SelectItem>
                <SelectItem value="0.24">24%</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Return %</Label><Input type="number" value={returnPct} onChange={e => setReturnPct(+e.target.value)} /></div>
        </div>

        <div className="rounded-lg bg-primary/10 p-4">
          <div className="text-sm text-muted-foreground">Total converted over {years} years</div>
          <div className="text-3xl font-bold text-primary">{fmt(r.totalConverted)}</div>
          <div className="text-xs text-muted-foreground mt-1">Total tax paid: <strong>{fmt(r.totalTax)}</strong> · Effective rate: <strong>{(r.effectiveRate * 100).toFixed(1)}%</strong></div>
        </div>

        <div className="border rounded-md max-h-72 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 sticky top-0">
              <tr>
                <th className="text-left p-2">Year</th>
                <th className="text-right p-2">Convert</th>
                <th className="text-right p-2">Tax</th>
                <th className="text-right p-2">Remaining trad</th>
              </tr>
            </thead>
            <tbody>
              {r.yearly.map(row => (
                <tr key={row.year} className="border-t">
                  <td className="p-2">{row.year}</td>
                  <td className="p-2 text-right">{fmt(row.conversion)}</td>
                  <td className="p-2 text-right">{fmt(row.taxOwed)}</td>
                  <td className="p-2 text-right">{fmt(row.remaining)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-xs text-muted-foreground">Converts up to the top of your target bracket each year. Converted amounts must season 5 years before penalty-free withdrawal. Useful between early retirement and age 73 RMDs.</div>
      </CardContent>
    </Card>
  );
}
