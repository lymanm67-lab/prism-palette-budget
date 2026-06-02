import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAppDevCutoff } from '@/hooks/use-app-dev-cutoff';
import { cn } from '@/lib/utils';

export function AppDevCutoffNudge() {
  const cutoff = useAppDevCutoff();
  if (!cutoff.isEnabled || cutoff.status === 'ok') return null;

  return (
    <Link
      to="/dashboard"
      className={cn(
        'flex items-center gap-3 rounded-lg border p-3 text-sm transition hover:bg-card/60',
        cutoff.status === 'over'
          ? 'border-prism-orange/40 bg-prism-orange/5'
          : 'border-prism-amber/40 bg-prism-amber/5'
      )}
    >
      <ShieldAlert className={cn('h-5 w-5 shrink-0', cutoff.status === 'over' ? 'text-prism-orange' : 'text-prism-amber')} />
      <div className="flex-1 min-w-0">
        <p className="font-medium">
          App-dev cutoff: {Math.round(cutoff.worstPct)}% of monthly limit used
        </p>
        <p className="text-xs text-muted-foreground truncate">{cutoff.message}</p>
      </div>
    </Link>
  );
}
