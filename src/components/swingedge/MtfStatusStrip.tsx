// Compact multi-timeframe status strip for the top of the chart.
//
// One small chip per timeframe with that timeframe's verdict, plus the overall
// alignment. Read-only: the full explanation stays in the multi-timeframe card
// further down the page.

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AlignmentState, MultiTimeframeResult } from '@/lib/swingedge/multiTimeframe';

const ALIGN_TONE: Record<AlignmentState, string> = {
  STRONG_ALIGNMENT: 'border-prism-lime/40 bg-prism-lime/15 text-prism-lime',
  ALIGNED: 'border-prism-lime/30 bg-prism-lime/10 text-prism-lime',
  MIXED: 'border-prism-amber/40 bg-prism-amber/15 text-prism-amber',
  CONFLICT: 'border-destructive/40 bg-destructive/10 text-destructive',
};

/** Green when the timeframe is doing its job, amber when unsure, red when not. */
function stateTone(state: string): string {
  if (['BULLISH', 'VALID_SETUP', 'CONFIRMS', 'ENTRY_CONFIRMED', 'CLEAN_ENTRY'].includes(state)) {
    return 'text-prism-lime';
  }
  if (['BEARISH', 'INVALIDATED', 'CONTRADICTS', 'FAILED'].includes(state)) return 'text-destructive';
  if (['NOT_USED'].includes(state)) return 'text-muted-foreground';
  return 'text-prism-amber';
}

export default function MtfStatusStrip({ result }: { result: MultiTimeframeResult | null }) {
  if (!result) {
    return (
      <p className="text-[11px] text-muted-foreground">
        Multi-timeframe read not available yet for this symbol.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Multi-timeframe status">
      {result.rows.map((row) => (
        <span
          key={row.key}
          title={`${row.role} — ${row.headline}`}
          className="inline-flex items-baseline gap-1 rounded-md border border-border/60 bg-muted/30 px-1.5 py-0.5 text-[10px] leading-tight"
        >
          <span className="font-semibold uppercase text-muted-foreground">{row.label}</span>
          <span className={cn('font-semibold', stateTone(row.state))}>{row.stateLabel}</span>
          <span className="text-muted-foreground">({row.weight})</span>
        </span>
      ))}
      <Badge variant="outline" className={cn('text-[10px] font-semibold', ALIGN_TONE[result.alignment])}>
        {result.alignmentLabel} · {result.score}/100
      </Badge>
    </div>
  );
}
