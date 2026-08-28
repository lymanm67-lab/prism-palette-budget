import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DataWarning } from '@/lib/credit/triBureauChecklist';

/** Prominent, always-visible data-quality banner. Mirrored into PDF/CSV exports. */
export default function TriBureauWarningBanner({ warnings }: { warnings: DataWarning[] }) {
  const [open, setOpen] = useState(false);
  const blocking = warnings.filter(w => w.severity === 'blocking');
  const degrades = warnings.filter(w => w.severity === 'degrades');

  if (warnings.length === 0) {
    return (
      <div className="rounded-lg border border-prism-lime/40 bg-prism-lime/10 px-3 py-2 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-prism-lime shrink-0" />
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Data complete.</span> All required tradeline fields are
          present on all three bureaus — these projections use your full file.
        </p>
      </div>
    );
  }

  const severe = blocking.length > 0;

  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2.5 space-y-2',
        severe ? 'border-prism-rose/50 bg-prism-rose/10' : 'border-prism-amber/50 bg-prism-amber/10',
      )}
    >
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-start gap-2 text-left">
        <AlertTriangle className={cn('h-4 w-4 shrink-0 mt-0.5', severe ? 'text-prism-rose' : 'text-prism-amber')} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold">
            {severe
              ? 'Data quality: parts of this simulation are unreliable'
              : 'Data quality: results are usable but approximate'}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {blocking.length > 0 && `${blocking.length} blocking issue${blocking.length === 1 ? '' : 's'}`}
            {blocking.length > 0 && degrades.length > 0 && ' · '}
            {degrades.length > 0 && `${degrades.length} accuracy caveat${degrades.length === 1 ? '' : 's'}`}
            {' · included in every PDF and CSV export'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="outline" className={cn('text-[10px]', severe ? 'text-prism-rose' : 'text-prism-amber')}>
            {severe ? 'UNRELIABLE' : `${warnings.length} caveats`}
          </Badge>
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </div>
      </button>

      {open && (
        <ul className="space-y-1 pl-6">
          {warnings.map((w, i) => (
            <li key={i} className="text-[11px] text-muted-foreground flex gap-2">
              <span
                className={cn(
                  'font-semibold shrink-0',
                  w.severity === 'blocking' ? 'text-prism-rose' : 'text-prism-amber',
                )}
              >
                {w.severity === 'blocking' ? 'BLOCKING' : 'degrades'}
              </span>
              <span>{w.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
