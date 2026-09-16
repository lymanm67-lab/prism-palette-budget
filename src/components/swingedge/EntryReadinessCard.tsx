import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BellRing, ChevronDown, ClipboardList, Eye, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  type EntryReadinessResult,
  type StagingStatus,
} from '@/lib/swingedge/conditionalStaging';

const TONE: Record<StagingStatus, string> = {
  GO: 'bg-prism-lime/15 text-prism-lime border-prism-lime/40',
  WAIT: 'bg-prism-amber/15 text-prism-amber border-prism-amber/40',
  REVIEW: 'bg-prism-amber/20 text-prism-amber border-prism-amber/50',
  STOP: 'bg-destructive/10 text-destructive border-destructive/40',
};

/**
 * The Analyzer's one job in this workflow: is this worth preparing, and if not
 * yet, what exactly has to happen first. The full order builder lives in the
 * Trade Planner, never here.
 */
export default function EntryReadinessCard({
  symbol,
  readiness,
  onPrepare,
}: {
  symbol: string;
  readiness: EntryReadinessResult;
  onPrepare: () => void;
}) {
  const { status } = readiness;

  return (
    <Card className={cn('border-2', TONE[status].split(' ').find((c) => c.startsWith('border-')))}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Entry readiness</CardTitle>
          <Badge variant="outline" className={cn('font-semibold', TONE[status])}>
            {readiness.statusLabel}
          </Badge>
        </div>
        <CardDescription>{readiness.headline}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          {readiness.rows.map((r) => (
            <div key={r.label} className="flex items-baseline justify-between gap-3 border-b border-border/40 pb-1">
              <span className="text-xs text-muted-foreground">{r.label}</span>
              <span className="text-sm font-semibold tabular-nums">{r.value}</span>
            </div>
          ))}
        </div>

        {readiness.waitingFor.length > 0 && (
          <div className="rounded-lg border border-prism-amber/40 bg-prism-amber/10 p-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-prism-amber">
              <AlertTriangle className="h-4 w-4" /> What are we waiting for?
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {readiness.waitingFor.map((w) => (
                <li key={w} className="flex gap-2">
                  <span className="text-prism-amber">•</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {status === 'GO' && (
            <Button size="sm" asChild>
              <Link to={`/swingedge/planner?symbol=${symbol}`}>
                Plan trade <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          )}

          {status === 'WAIT' && (
            <>
              <Button size="sm" onClick={onPrepare}>
                <ClipboardList className="mr-2 h-4 w-4" /> Prepare conditional trade
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to={`/swingedge/planner?symbol=${symbol}`}>
                  <BellRing className="mr-2 h-4 w-4" /> Set alert
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/swingedge/watchlists">
                  <Eye className="mr-2 h-4 w-4" /> Add to watchlist
                </Link>
              </Button>
            </>
          )}

          {status === 'REVIEW' && (
            <Button size="sm" variant="outline" asChild>
              <Link to="/swingedge/analyzer#analyzer-readiness-items">
                <ShieldAlert className="mr-2 h-4 w-4" /> Review conflicts
              </Link>
            </Button>
          )}

          {status === 'STOP' && (
            <Button size="sm" variant="outline" asChild>
              <Link to="/swingedge/scanner">Skip trade — back to the scanner</Link>
            </Button>
          )}

          <span className="text-xs text-muted-foreground">
            The Analyzer decides whether to prepare. The Trade Planner decides how to stage it.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
