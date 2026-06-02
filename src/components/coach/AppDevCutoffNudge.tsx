import { Link } from 'react-router-dom';
import { ShieldAlert, ExternalLink } from 'lucide-react';
import { useAppDevCutoff } from '@/hooks/use-app-dev-cutoff';
import { cn } from '@/lib/utils';

const LOVABLE_LIMITS_URL = 'https://docs.lovable.dev/introduction/plans-and-credits';

export function AppDevCutoffNudge() {
  const cutoff = useAppDevCutoff();
  if (!cutoff.isEnabled || cutoff.status === 'ok') return null;

  const isOver = cutoff.status === 'over';

  return (
    <div
      className={cn(
        'rounded-lg border p-3 text-sm',
        isOver
          ? 'border-prism-orange/40 bg-prism-orange/5'
          : 'border-prism-amber/40 bg-prism-amber/5'
      )}
    >
      <Link to="/dashboard" className="flex items-center gap-3 transition hover:opacity-80">
        <ShieldAlert className={cn('h-5 w-5 shrink-0', isOver ? 'text-prism-orange' : 'text-prism-amber')} />
        <div className="flex-1 min-w-0">
          <p className="font-medium">
            App-dev cutoff: {Math.round(cutoff.worstPct)}% of monthly limit used
          </p>
          <p className="text-xs text-muted-foreground truncate">{cutoff.message}</p>
        </div>
      </Link>
      <div className="mt-2 pl-8">
        <a
          href={LOVABLE_LIMITS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'inline-flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline',
            isOver ? 'text-prism-orange' : 'text-prism-amber'
          )}
        >
          Set a hard stop in Lovable™ billing
          <ExternalLink className="h-3 w-3" />
        </a>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          This nudge is a soft warning. To actually block top-ups, set a spending limit or disable auto top-up in Lovable™ Settings → Plans &amp; Credits → Alerts &amp; limits.
        </p>
      </div>
    </div>
  );
}
