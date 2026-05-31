import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle } from 'lucide-react';
import {
  BUCKET_LABELS,
  type AllocationEvent,
  type Bucket,
  type ComputedEventRow,
} from '@/lib/retirement/allocationEngine';

interface Props {
  rows: ComputedEventRow[];
  onToggleActive: (id: string, active: boolean) => void;
  onAmountChange: (id: string, monthly_amount: number) => void;
  onAllocationChange: (id: string, alloc: Partial<Record<Bucket, number>>) => void;
}

const BUCKET_ORDER: Bucket[] = ['hsa', 'roth_457b', 'roth_tda', 'pretax_457b', 'pretax_tda', 'taxable'];

export function AllocationEventsList({ rows, onToggleActive, onAmountChange, onAllocationChange }: Props) {
  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-2">
        {rows.map((row) => (
          <EventRow
            key={row.event.id}
            row={row}
            onToggleActive={onToggleActive}
            onAmountChange={onAmountChange}
            onAllocationChange={onAllocationChange}
          />
        ))}
      </div>
    </TooltipProvider>
  );
}

function EventRow({
  row, onToggleActive, onAmountChange, onAllocationChange,
}: { row: ComputedEventRow } & Omit<Props, 'rows'>) {
  const e = row.event;
  const isRaise = e.event_type === 'raise_redirect';
  return (
    <div className="rounded-lg border border-border bg-card/40 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <Switch
          checked={e.is_active}
          onCheckedChange={(v) => onToggleActive(e.id, v)}
        />
        <div className="flex-1 min-w-[180px]">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{e.event_label}</span>
            <Badge variant="outline" className="text-[10px]">{e.event_type.replace('_', ' ')}</Badge>
            {row.warnings.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <ul className="list-disc pl-4 text-xs space-y-1">
                    {row.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{e.event_date}{e.notes ? ` — ${e.notes}` : ''}</p>
        </div>

        <div className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">Monthly</span>
          {isRaise ? (
            <span className="font-mono">≈ ${row.effectiveMonthly.toFixed(0)}</span>
          ) : (
            <Input
              type="number"
              value={e.monthly_amount ?? 0}
              onChange={(ev) => onAmountChange(e.id, Number(ev.target.value) || 0)}
              className="h-8 w-24"
            />
          )}
        </div>
      </div>

      {e.is_active && (
        <div className="mt-3 grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {BUCKET_ORDER.map((b) => (
            <div key={b} className="space-y-1">
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground">{BUCKET_LABELS[b]}</label>
              <Input
                type="number"
                value={Number((row.destinations[b] ?? 0).toFixed(2))}
                onChange={(ev) => onAllocationChange(e.id, { ...row.destinations, [b]: Number(ev.target.value) || 0 })}
                className="h-8 text-xs font-mono"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
