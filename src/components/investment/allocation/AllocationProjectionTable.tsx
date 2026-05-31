import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BUCKET_LABELS, type Bucket, type ComputedEventRow } from '@/lib/retirement/allocationEngine';

interface Props {
  rows: ComputedEventRow[];
}

export function AllocationProjectionTable({ rows }: Props) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Event</TableHead>
            <TableHead className="text-right">Monthly</TableHead>
            <TableHead className="text-right">Annual</TableHead>
            <TableHead>Destination(s)</TableHead>
            <TableHead className="text-center">Plan limits</TableHead>
            <TableHead className="text-center">In projection</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const dests = (Object.keys(r.destinations) as Bucket[])
              .filter((b) => (r.destinations[b] ?? 0) > 0.01);
            return (
              <TableRow key={r.event.id} className={r.event.is_active ? '' : 'opacity-50'}>
                <TableCell className="font-mono text-xs">{r.event.event_date}</TableCell>
                <TableCell className="text-xs">{r.event.event_label}</TableCell>
                <TableCell className="text-right font-mono text-xs">${r.effectiveMonthly.toFixed(0)}</TableCell>
                <TableCell className="text-right font-mono text-xs">${(r.effectiveMonthly * 12).toFixed(0)}</TableCell>
                <TableCell className="text-xs">
                  <div className="flex flex-wrap gap-1">
                    {dests.length === 0 && <span className="text-muted-foreground">—</span>}
                    {dests.map((b) => (
                      <Badge key={b} variant="secondary" className="text-[10px]">
                        {BUCKET_LABELS[b]} ${(r.destinations[b] ?? 0).toFixed(0)}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-center text-xs">
                  {r.countsTowardLimits ? <Badge variant="outline">Yes</Badge> : <Badge variant="outline">No</Badge>}
                </TableCell>
                <TableCell className="text-center text-xs">
                  {r.includedInProjection ? <Badge>Yes</Badge> : <Badge variant="outline">No</Badge>}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
