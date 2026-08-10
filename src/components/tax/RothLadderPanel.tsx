import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ArrowDownRight } from 'lucide-react';
import type { LadderResult } from '@/lib/tax/rothEngine';
import { money } from './TaxExecutiveDashboard';

interface Props {
  ladder: LadderResult;
  relief: { doNothingFirstRmd: number; ladderFirstRmd: number; reduction: number; doNothingBalance: number; ladderBalance: number };
  targetBracket: number;
  irmaaGuard: boolean;
}

export function RothLadderPanel({ ladder, relief, targetBracket, irmaaGuard }: Props) {
  const data = ladder.years.map((y) => ({
    year: y.year,
    Convert: Math.round(y.conversion),
    'Pre-tax left': Math.round(y.pretaxAfter),
    'Roth balance': Math.round(y.rothAfter),
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total converted (ladder)</p>
            <p className="font-display text-xl font-bold">{money(ladder.totalConverted)}</p>
            <p className="text-xs text-muted-foreground">Filling the {targetBracket}% bracket{irmaaGuard ? ', Medicare-surcharge guarded' : ''}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Tax to convert</p>
            <p className="font-display text-xl font-bold">{money(ladder.totalTax)}</p>
            <p className="text-xs text-muted-foreground">{money(ladder.totalLossOffset)} offset by business losses</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">First-RMD reduction</p>
            <p className="font-display text-xl font-bold text-primary flex items-center gap-1">
              <ArrowDownRight className="h-4 w-4" />{money(relief.reduction)}
            </p>
            <p className="text-xs text-muted-foreground">
              {money(relief.doNothingFirstRmd)} → {money(relief.ladderFirstRmd)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardContent className="p-4">
          <h3 className="font-display font-semibold">Conversion ladder</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Each year converts only what fits inside your target bracket, plus any available business-loss offset.
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `$${Math.round(v / 1000)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => money(v)} />
                <Legend />
                <Line type="monotone" dataKey="Convert" stroke="hsl(var(--destructive))" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="Pre-tax left" stroke="hsl(var(--muted-foreground))" dot={false} />
                <Line type="monotone" dataKey="Roth balance" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="p-0">
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card/95 text-xs text-muted-foreground">
                <tr>
                  {['Year', 'Age', 'Bracket room', 'Loss offset', 'Convert', 'Tax', 'Marginal', 'Roth after'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ladder.years.map((y) => (
                  <tr key={y.year} className="border-t border-border/50">
                    <td className="px-3 py-1.5">{y.year}</td>
                    <td className="px-3 py-1.5">{y.age}</td>
                    <td className="px-3 py-1.5">{Number.isFinite(y.headroom) ? money(y.headroom) : '—'}</td>
                    <td className="px-3 py-1.5">{y.lossOffset ? money(y.lossOffset) : '—'}</td>
                    <td className="px-3 py-1.5 font-medium">{money(y.conversion)}</td>
                    <td className="px-3 py-1.5">{money(y.taxOnConversion)}</td>
                    <td className="px-3 py-1.5">{y.marginalRate}%</td>
                    <td className="px-3 py-1.5">{money(y.rothAfter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Badge variant="outline" className="text-xs">
        Conversions are irreversible. Pay the tax from taxable cash, not the converted dollars, whenever possible.
      </Badge>
    </div>
  );
}
