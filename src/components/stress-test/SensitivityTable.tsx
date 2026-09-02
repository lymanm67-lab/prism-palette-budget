import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { SensitivityPoint } from '@/lib/retirement/stressTest';

const money = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n).toLocaleString()}`;

function probTone(pct: number) {
  if (pct >= 95) return 'text-prism-lime';
  if (pct >= 85) return 'text-prism-teal';
  if (pct >= 75) return 'text-prism-amber';
  return 'text-destructive';
}

export function SensitivityTable({
  title,
  description,
  rows,
  firstColumnLabel = 'Scenario',
  notes,
}: {
  title: string;
  description?: string;
  rows: (SensitivityPoint & { description?: string })[];
  firstColumnLabel?: string;
  notes?: string;
}) {
  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{firstColumnLabel}</TableHead>
                <TableHead className="text-right">Success</TableHead>
                <TableHead className="text-right">Median ending</TableHead>
                <TableHead className="text-right">10th percentile</TableHead>
                <TableHead className="text-right">Legacy odds</TableHead>
                <TableHead className="text-right">Depletion age</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.label}>
                  <TableCell>
                    <span className="font-medium">{r.label}</span>
                    {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                  </TableCell>
                  <TableCell className={`text-right font-semibold tabular-nums ${probTone(r.successProbability)}`}>
                    {r.successProbability.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{money(r.medianEnding)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(r.p10Ending)}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.legacyProbability.toFixed(1)}%</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.depletionAge ? <Badge variant="outline" className="text-destructive">{r.depletionAge}</Badge> : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {notes && <p className="text-xs text-muted-foreground">{notes}</p>}
      </CardContent>
    </Card>
  );
}
