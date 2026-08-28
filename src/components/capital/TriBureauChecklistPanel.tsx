import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, XOctagon, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BUREAU_PROFILE, type Bureau } from '@/lib/credit/triBureauModel';
import type { BureauChecklist, ReliabilityGate, Severity } from '@/lib/credit/triBureauChecklist';

const ICON: Record<Severity, typeof CheckCircle2> = {
  ok: CheckCircle2,
  degrades: AlertTriangle,
  blocking: XOctagon,
};
const COLOR: Record<Severity, string> = {
  ok: 'text-prism-lime',
  degrades: 'text-prism-amber',
  blocking: 'text-prism-rose',
};

export default function TriBureauChecklistPanel({
  checklists,
  gate,
}: {
  checklists: BureauChecklist[];
  gate: ReliabilityGate;
}) {
  const blocking = checklists.flatMap(c => c.items.filter(i => i.severity === 'blocking'));

  return (
    <Card className={cn('glass-card', blocking.length ? 'border-prism-rose/40' : 'border-prism-lime/30')}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-prism-sky" /> Required Data Checklist
            </CardTitle>
            <CardDescription>
              Exactly which tradeline fields each bureau needs. Missing required fields block those inputs
              instead of producing a number you can't trust.
            </CardDescription>
          </div>
          <Badge variant={blocking.length ? 'destructive' : 'default'} className="text-[10px]">
            {blocking.length ? `${blocking.length} blocking gap${blocking.length === 1 ? '' : 's'}` : 'All required fields present'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid lg:grid-cols-3 gap-3">
          {checklists.map(cl => (
            <div key={cl.bureau} className="rounded-lg border border-border/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className={cn('text-sm font-semibold', BUREAU_PROFILE[cl.bureau as Bureau].color)}>{cl.bureau}</span>
                <Badge variant={cl.reliable ? 'outline' : 'destructive'} className="text-[10px]">
                  {cl.reliable ? 'Reliable' : 'Unreliable'}
                </Badge>
              </div>
              <ul className="space-y-1.5">
                {cl.items.map(it => {
                  const Icon = ICON[it.severity];
                  return (
                    <li key={it.field} className="flex gap-1.5 text-[11px]">
                      <Icon className={cn('h-3.5 w-3.5 shrink-0 mt-[1px]', COLOR[it.severity])} />
                      <span className="min-w-0">
                        <span className="text-foreground/90 font-medium">{it.field}</span>
                        <span className="text-muted-foreground"> — {it.detail}</span>
                        {it.severity !== 'ok' && (
                          <span className="block text-muted-foreground/80">Needs: {it.requirement}</span>
                        )}
                        {it.accounts.length > 0 && (
                          <span className="block text-muted-foreground/70 truncate">Fix: {it.accounts.join(', ')}</span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {(gate.blockedAccountIds.size > 0 || gate.blockedKinds.length > 0) && (
          <div className="rounded-lg border border-prism-rose/30 bg-prism-rose/5 p-3 space-y-1">
            <p className="text-xs font-semibold text-prism-rose">Blocked inputs</p>
            {gate.blockedKinds.map(b => (
              <p key={b.kind} className="text-[11px] text-muted-foreground">• {b.reason}</p>
            ))}
            {gate.blockedAccountIds.size > 0 && (
              <p className="text-[11px] text-muted-foreground">
                • {gate.blockedAccountIds.size} account{gate.blockedAccountIds.size === 1 ? '' : 's'} cannot be
                simulated until the missing field is added — their sliders are disabled below.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
