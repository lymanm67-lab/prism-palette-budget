import { ReactNode, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { ShieldCheck, ShieldAlert, ShieldQuestion, AlertTriangle, Target, ChevronDown } from 'lucide-react';

export type Confidence = 'high' | 'medium' | 'low';

const CONFIDENCE_META: Record<Confidence, { label: string; cls: string; Icon: LucideIcon }> = {
  high:   { label: 'High',   cls: 'text-prism-teal',  Icon: ShieldCheck },
  medium: { label: 'Med',    cls: 'text-prism-amber', Icon: ShieldQuestion },
  low:    { label: 'Low',    cls: 'text-prism-rose',  Icon: ShieldAlert },
};

const STATUS_META = {
  ok:    { dot: 'bg-prism-teal',  label: 'On track', text: 'text-prism-teal' },
  warn:  { dot: 'bg-prism-amber', label: 'Attention', text: 'text-prism-amber' },
  alert: { dot: 'bg-prism-rose',  label: 'Action',    text: 'text-prism-rose' },
  soon:  { dot: 'bg-muted-foreground/40', label: 'Soon', text: 'text-muted-foreground' },
} as const;

const ICON_TINT: Record<string, string> = {
  'text-prism-orange': 'from-prism-orange/25 to-prism-orange/5 ring-prism-orange/30',
  'text-prism-amber':  'from-prism-amber/25 to-prism-amber/5 ring-prism-amber/30',
  'text-prism-teal':   'from-prism-teal/25 to-prism-teal/5 ring-prism-teal/30',
  'text-prism-sky':    'from-prism-sky/25 to-prism-sky/5 ring-prism-sky/30',
  'text-prism-lime':   'from-prism-lime/25 to-prism-lime/5 ring-prism-lime/30',
  'text-prism-rose':   'from-prism-rose/25 to-prism-rose/5 ring-prism-rose/30',
  'text-prism-violet': 'from-prism-violet/25 to-prism-violet/5 ring-prism-violet/30',
};

interface Props {
  number?: number;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  confidence?: Confidence;
  status?: keyof typeof STATUS_META;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  pitfall?: string;
  tryThis?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  summary?: ReactNode;
  momentBadge?: ReactNode;
}

export function CoachCard({
  title, subtitle, icon: Icon, iconColor = 'text-prism-amber',
  confidence, status = 'ok', action, children, className, pitfall, tryThis,
  collapsible = false, defaultOpen = true, summary, momentBadge,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const conf = confidence ? CONFIDENCE_META[confidence] : null;
  const sm = STATUS_META[status];
  const tint = ICON_TINT[iconColor] || ICON_TINT['text-prism-amber'];
  const showBody = !collapsible || open;
  const pulse = status === 'warn' || status === 'alert';

  return (
    <Card className={cn(
      'group relative overflow-hidden rounded-xl border-border/50 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-sm',
      'transition-all duration-300 hover:border-prism-teal/40 hover:shadow-lg hover:shadow-prism-teal/5 hover:-translate-y-0.5',
      className,
    )}>
      {/* gradient status rail */}
      <div className={cn(
        'absolute left-0 top-0 h-full w-1 bg-gradient-to-b',
        status === 'ok'    && 'from-prism-teal/80 via-prism-teal/30 to-transparent',
        status === 'warn'  && 'from-prism-amber/80 via-prism-amber/30 to-transparent',
        status === 'alert' && 'from-prism-rose/80 via-prism-rose/30 to-transparent',
        status === 'soon'  && 'from-muted-foreground/40 via-muted-foreground/10 to-transparent',
      )} />

      <CardHeader
        className={cn('p-4 pl-5', collapsible && 'cursor-pointer select-none')}
        onClick={collapsible ? () => setOpen(o => !o) : undefined}
        role={collapsible ? 'button' : undefined}
        aria-expanded={collapsible ? open : undefined}
        tabIndex={collapsible ? 0 : undefined}
        onKeyDown={collapsible ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); }
        } : undefined}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* Icon tile with gradient tint */}
            <div className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1',
              tint,
            )}>
              <Icon className={cn('h-[18px] w-[18px]', iconColor)} />
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display text-[15px] font-semibold leading-tight tracking-tight truncate">
                  {title}
                </h3>
                {momentBadge}
              </div>
              {(!collapsible || open) && subtitle && (
                <p className="text-[12px] text-muted-foreground mt-1 leading-snug">{subtitle}</p>
              )}
              {collapsible && !open && summary && (
                <div className="text-[12px] text-muted-foreground mt-1 truncate">{summary}</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* Status pill */}
            <div className={cn(
              'hidden sm:inline-flex items-center gap-1.5 rounded-full bg-background/50 border border-border/40 px-2 py-0.5',
              sm.text,
            )}>
              <span className={cn('h-1.5 w-1.5 rounded-full', sm.dot, pulse && 'animate-pulse')} />
              <span className="text-[10px] font-semibold uppercase tracking-wider">{sm.label}</span>
            </div>
            {/* Mobile: dot only */}
            <span className={cn('sm:hidden h-2 w-2 rounded-full', sm.dot, pulse && 'animate-pulse')} />

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
        <CardContent className="px-5 pb-4 pt-0 text-sm animate-in fade-in-0 slide-in-from-top-1 duration-200">
          {children}
          {(pitfall || tryThis || conf) && (
            <div className="pt-3 mt-3 border-t border-border/40 flex flex-wrap gap-2">
              {pitfall && (
                <div className="flex items-start gap-1.5 text-[11px] rounded-md bg-prism-amber/5 border border-prism-amber/20 px-2 py-1 flex-1 min-w-[180px]">
                  <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0 text-prism-amber" />
                  <span className="text-foreground/80"><span className="font-semibold text-prism-amber">Pitfall · </span>{pitfall}</span>
                </div>
              )}
              {tryThis && (
                <div className="flex items-start gap-1.5 text-[11px] rounded-md bg-prism-teal/5 border border-prism-teal/20 px-2 py-1 flex-1 min-w-[180px]">
                  <Target className="h-3 w-3 mt-0.5 shrink-0 text-prism-teal" />
                  <span className="text-foreground/80"><span className="font-semibold text-prism-teal">Try · </span>{tryThis}</span>
                </div>
              )}
              {conf && (
                <div className={cn('flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider', conf.cls)}>
                  <conf.Icon className="h-3 w-3" />
                  {conf.label} confidence
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
