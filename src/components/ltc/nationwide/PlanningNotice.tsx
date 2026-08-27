import { ShieldAlert } from 'lucide-react';
import { NW_PLANNING_NOTICE } from '@/lib/ltc/nationwide';

/** Required at the bottom of every LTC projection display. */
export function PlanningNotice() {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-3 flex gap-2">
      <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Planning Notice</p>
        <p className="text-xs text-muted-foreground mt-1">{NW_PLANNING_NOTICE}</p>
      </div>
    </div>
  );
}

export function IllustrationTag({ illustrated }: { illustrated: boolean }) {
  return illustrated ? (
    <span className="text-[10px] rounded border border-prism-lime/30 bg-prism-lime/10 px-1.5 py-0.5 text-prism-lime whitespace-nowrap">
      Policy Illustration Value
    </span>
  ) : (
    <span className="text-[10px] rounded border border-prism-sky/30 bg-prism-sky/10 px-1.5 py-0.5 text-prism-sky whitespace-nowrap">
      App Planning Estimate
    </span>
  );
}
