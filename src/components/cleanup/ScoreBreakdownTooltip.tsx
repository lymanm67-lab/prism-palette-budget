import type { ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { scoreBreakdown, type DupeCluster } from '@/lib/duplicate-detector';

interface Props {
  cluster: Pick<DupeCluster, 'confirmed'>;
  children: ReactNode;
}

/** Hover tooltip that explains a duplicate cluster's 0–100 confidence score. */
export function ScoreBreakdownTooltip({ cluster, children }: Props) {
  const signals = scoreBreakdown(cluster);
  const total = signals.reduce((s, x) => s + (x.hit ? x.points : 0), 0);
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent className="w-72 p-3" side="bottom">
          <p className="text-xs font-medium mb-2">Confidence score — {total}/100</p>
          <ul className="space-y-1.5">
            {signals.map((s) => (
              <li key={s.label} className="text-xs">
                <span className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    {s.hit ? (
                      <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                    ) : (
                      <X className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                    )}
                    <span className={s.hit ? '' : 'text-muted-foreground/60'}>{s.label}</span>
                  </span>
                  <span className="font-mono text-muted-foreground">+{s.hit ? s.points : 0}</span>
                </span>
                <span className="block pl-[18px] text-[10px] text-muted-foreground">{s.detail}</span>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-muted-foreground mt-2 border-t border-border/50 pt-1.5">
            100 = confirmed double-import (same bank ID twice). 50 = same day & amount only — likely real repeat purchases.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
