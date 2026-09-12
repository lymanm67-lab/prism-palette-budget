import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CACHE_STATUS_TONE, lastUpdatedLabel } from '@/lib/swingedge/cache';
import type { CacheStatus, DataMode } from '@/lib/swingedge/types';
import { Database, FlaskConical, Radio } from 'lucide-react';

interface Props {
  title: string;
  subtitle?: string;
  mode: DataMode;
  cacheState?: CacheStatus;
  fetchedAt?: string | null;
  right?: React.ReactNode;
}

const MODE_META: Record<DataMode, { label: string; icon: typeof Radio; tone: string }> = {
  DEMO: { label: 'DEMO DATA', icon: FlaskConical, tone: 'border-prism-amber/50 text-prism-amber' },
  LIVE: { label: 'LIVE DATA', icon: Radio, tone: 'border-prism-lime/50 text-prism-lime' },
  CACHED: { label: 'CACHED DATA', icon: Database, tone: 'border-prism-sky/50 text-prism-sky' },
};

export default function SwingEdgeHeader({ title, subtitle, mode, cacheState, fetchedAt, right }: Props) {
  const meta = MODE_META[mode];
  const Icon = meta.icon;
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
          <Badge variant="outline" className={cn('gap-1 font-semibold', meta.tone)}>
            <Icon className="h-3 w-3" />
            {meta.label}
          </Badge>
        </div>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        <p className="text-xs text-muted-foreground">
          Last market data update: <span className="font-medium">{lastUpdatedLabel(fetchedAt)}</span>
          {cacheState ? (
            <>
              {' · '}
              <span className={cn('font-semibold', CACHE_STATUS_TONE[cacheState])}>{cacheState}</span>
            </>
          ) : null}
        </p>
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}
