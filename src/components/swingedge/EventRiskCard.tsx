// Event Risk card: what is expected, when, and whether it should stop a trade.

import { AlertTriangle, CalendarClock, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import CollapsibleSection from '@/components/swingedge/CollapsibleSection';
import {
  EVENT_RISK_DISCLAIMER,
  type EventDecision,
  type EventRiskBand,
  type EventRiskResult,
} from '@/lib/swingedge/eventRisk';
import { WINDOW_LABEL } from '@/lib/swingedge/earningsRisk';

const BAND_TONE: Record<EventRiskBand, string> = {
  LOW: 'bg-prism-lime/15 text-prism-lime border-prism-lime/40',
  MODERATE: 'bg-prism-amber/15 text-prism-amber border-prism-amber/40',
  HIGH: 'bg-prism-amber/20 text-prism-amber border-prism-amber/50',
  SEVERE: 'bg-prism-rose/15 text-prism-rose border-prism-rose/40',
};

const DECISION_TONE: Record<EventDecision, string> = {
  GO: 'bg-prism-lime/15 text-prism-lime border-prism-lime/40',
  WAIT: 'bg-prism-amber/15 text-prism-amber border-prism-amber/40',
  REVIEW: 'bg-prism-rose/15 text-prism-rose border-prism-rose/40',
};

export default function EventRiskCard({
  result,
  dataNote,
}: {
  result: EventRiskResult;
  dataNote?: string | null;
}) {
  const e = result.earnings;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Event risk</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn('font-semibold', BAND_TONE[result.band])}>
              {result.band} · {result.score}/100
            </Badge>
            <Badge variant="outline" className={cn('font-semibold', DECISION_TONE[result.decision])}>
              {result.decision}
            </Badge>
          </div>
        </div>
        <CardDescription>
          What is scheduled, whether it lands while you would still be holding, and how material it could be.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {result.hardGates.map((g) => (
          <p
            key={g}
            className="flex gap-2 rounded-md border border-prism-rose/40 bg-prism-rose/10 p-2 text-sm text-prism-rose"
          >
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> {g}
          </p>
        ))}

        <div className="rounded-md border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-medium">
              <CalendarClock className="h-4 w-4 text-muted-foreground" /> Earnings
            </span>
            <Badge variant="outline">{WINDOW_LABEL[e.window]}</Badge>
          </div>
          <p className="mt-2 text-sm">
            {e.available
              ? `${e.date} (${e.certainty.toLowerCase()}) · ${e.timingLabel}${
                  e.daysUntil !== null ? ` · ${e.daysUntil} days away` : ''
                }`
              : 'No earnings date is known for this symbol.'}
          </p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {e.lines.map((l) => (
              <li key={l}>· {l}</li>
            ))}
          </ul>
        </div>

        {result.timeline.length > 0 && (
          <CollapsibleSection id="analyzer-event-timeline" title="Timeline" defaultOpen>
            <ul className="space-y-1 text-sm">
              {result.timeline.map((t) => (
                <li key={`${t.kind}-${t.date}-${t.label}`} className="flex items-start justify-between gap-3">
                  <span>{t.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.date}
                    {t.daysFromNow !== null ? ` · ${t.daysFromNow}d` : ''}
                    {t.severity ? ` · ${t.severity}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {result.relevant.length > 0 && (
          <CollapsibleSection id="analyzer-event-upcoming" title="Upcoming events that touch this" defaultOpen={false}>
            <ul className="space-y-1 text-sm">
              {result.relevant.map((ev) => (
                <li key={ev.id} className="flex items-start justify-between gap-3">
                  <span>{ev.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {ev.eventDate} · {ev.severity}
                  </span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {result.pendingSignificant.length > 0 && (
          <div className="rounded-md border border-prism-amber/40 bg-prism-amber/10 p-2 text-xs text-prism-amber">
            <p className="flex gap-2 font-medium">
              <AlertTriangle className="h-4 w-4 shrink-0" /> Unverified reports that could matter
            </p>
            <ul className="mt-1 space-y-1">
              {result.pendingSignificant.map((ev) => (
                <li key={ev.id}>
                  · {ev.title} ({ev.eventDate})
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.warnings.map((w) => (
          <p key={w} className="text-xs text-prism-amber">
            {w}
          </p>
        ))}

        {result.lines.length > 0 && (
          <CollapsibleSection id="analyzer-event-reasoning" title="How this was scored" defaultOpen={false}>
            <ul className="space-y-1 text-sm">
              {result.lines.map((l) => (
                <li key={l}>· {l}</li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {dataNote && <p className="text-xs text-muted-foreground">{dataNote}</p>}
        <p className="text-xs text-muted-foreground">{EVENT_RISK_DISCLAIMER}</p>
      </CardContent>
    </Card>
  );
}
