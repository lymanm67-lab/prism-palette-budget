import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CATEGORY_LABELS, FundingSource, SourceTotal, money } from '@/lib/wealth/sourceOfFunds';
import { monthLabel } from '@/lib/retirement/cashflowEngine';

interface Props {
  sources: FundingSource[];
  totals: SourceTotal[];
  onPatch: (id: string, patch: Partial<FundingSource>) => void;
}

/** Every funding source, what it puts in, and when it starts. Editable in place. */
export function FundingLedger({ sources, totals, onPatch }: Props) {
  const totalById = new Map(totals.map((t) => [t.id, t]));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Where the money comes from</CardTitle>
        <CardDescription>
          Each line is one source of money. Turn a line on only when that money is really available —
          nothing here is assumed twice.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[36%]">Source</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Monthly</TableHead>
              <TableHead>Starts</TableHead>
              <TableHead className="text-right">Total added</TableHead>
              <TableHead className="text-right">On</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.map((s) => {
              const t = totalById.get(s.id);
              return (
                <TableRow key={s.id} className={s.enabled ? '' : 'opacity-55'}>
                  <TableCell>
                    <p className="text-sm font-medium">{s.label}</p>
                    {s.notes && <p className="text-xs text-muted-foreground">{s.notes}</p>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[11px]">
                      {CATEGORY_LABELS[s.category]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      value={s.monthly}
                      onChange={(e) => onPatch(s.id, { monthly: Math.max(0, Number(e.target.value) || 0) })}
                      className="ml-auto h-8 w-24 text-right"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="month"
                      value={s.startMonth}
                      onChange={(e) => onPatch(s.id, { startMonth: e.target.value || s.startMonth })}
                      className="h-8 w-[130px]"
                    />
                    <span className="sr-only">{monthLabel(s.startMonth)}</span>
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold">
                    {t ? money(t.total) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch
                      checked={s.enabled}
                      onCheckedChange={(v) => onPatch(s.id, { enabled: v })}
                      aria-label={`Include ${s.label}`}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
