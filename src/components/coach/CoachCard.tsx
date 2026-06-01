import { ReactNode, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { ShieldCheck, ShieldAlert, ShieldQuestion, AlertTriangle, Target, ChevronDown } from 'lucide-react';

export type Confidence = 'high' | 'medium' | 'low';

const CONFIDENCE_META: Record<Confidence, { label: string; cls: string; Icon: LucideIcon }> = {
  high:   { label: 'High',   cls: 'bg-prism-teal/15 text-prism-teal border-prism-teal/30',   Icon: ShieldCheck },
  medium: { label: 'Medium', cls: 'bg-prism-amber/15 text-prism-amber border-prism-amber/30', Icon: ShieldQuestion },
  low:    { label: 'Low',    cls: 'bg-prism-rose/15 text-prism-rose border-prism-rose/30',   Icon: ShieldAlert },
};

interface Props {
  number?: number;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  confidence?: Confidence;
  status?: 'ok' | 'warn' | 'alert' | 'soon';
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  pitfall?: string;
  tryThis?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  summary?: ReactNode;
}

const STATUS_DOT: Record<NonNullable<Props['status']>, string> = {
  ok:    'bg-prism-teal',
  warn:  'bg-prism-amber',
  alert: 'bg-prism-rose',
  soon:  'bg-muted-foreground/40',
};

export function CoachCard({
  number, title, subtitle, icon: Icon, iconColor = 'text-prism-amber',
  confidence, status = 'ok', action, children, className, pitfall, tryThis,
  collapsible = false, defaultOpen = true, summary,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const conf = confidence ? CONFIDENCE_META[confidence] : null;
  const pulse = status === 'warn' || status === 'alert';
  const showBody = !collapsible || open;

  return (
    <Card className={cn(
      'group relative overflow-hidden border-border/60 bg-card/60 backdrop-blur-sm',
      'transition-all hover:border-prism-teal/40 hover:shadow-md hover:shadow-prism-teal/5',
      className,
    )}>
      <div className={cn('absolute left-0 top-0 h-full w-0.5', STATUS_DOT[status], pulse && 'animate-pulse')} />

      <CardHeader
        className={cn('p-3 pl-4', collapsible && 'cursor-pointer select-none')}
        onClick={collapsible ? () => setOpen(o => !o) : undefined}
        role={collapsible ? 'button' : undefined}
        aria-expanded={collapsible ? open : undefined}
        tabIndex={collapsible ? 0 : undefined}
        onKeyDown={collapsible ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); }
        } : undefined}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-background/60 border border-border/50">
              <Icon className={cn('h-4 w-4', iconColor)} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {number != null && (
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                    {String(number).padStart(2, '0')}
                  </span>
                )}
                <CardTitle className="font-display text-sm leading-tight truncate">{title}</CardTitle>
                {conf && (
                  <Badge variant="outline" className={cn('text-[9px] font-semibold gap-0.5 px-1 py-0 h-4', conf.cls)}>
                    <conf.Icon className="h-2 w-2" />
                    {conf.label}
                  </Badge>
                )}
              </div>
              {(!collapsible || open) && subtitle && (
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>
              )}
              {collapsible && !open && summary && (
                <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{summary}</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {action}
            {collapsible && (
              <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-label={open ? 'Collapse' : 'Expand'}
                className="h-7 w-7 rounded-md inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/60 transition"
              >
                <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', open && 'rotate-180')} />
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      {showBody && (
        <CardContent className="px-4 pb-3 pt-0 text-sm animate-in fade-in-0 slide-in-from-top-1 duration-200">
          {children}
          {(pitfall || tryThis) && (
            <div className="pt-2.5 mt-2.5 border-t border-border/40 space-y-1">
              {pitfall && (
                <div className="flex items-start gap-1.5 text-[11px] text-prism-amber/90">
                  <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                  <span><span className="font-bold uppercase tracking-wider mr-1">Pitfall:</span>{pitfall}</span>
                </div>
              )}
              {tryThis && (
                <div className="flex items-start gap-1.5 text-[11px] text-prism-teal/90">
                  <Target className="h-3 w-3 mt-0.5 shrink-0" />
                  <span><span className="font-bold uppercase tracking-wider mr-1">Try:</span>{tryThis}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
