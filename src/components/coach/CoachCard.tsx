import { ReactNode, useState } from 'react';
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
  ok:    { dot: 'bg-prism-teal',  label: 'On track',  text: 'text-prism-teal' },
  warn:  { dot: 'bg-prism-amber', label: 'Attention', text: 'text-prism-amber' },
  alert: { dot: 'bg-prism-rose',  label: 'Action',    text: 'text-prism-rose' },
  soon:  { dot: 'bg-muted-foreground/40', label: 'Soon', text: 'text-muted-foreground' },
} as const;

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

/**
 * Row-style coach module. Designed to live inside an equal-width column
 * (no card chrome). Click row to expand inline.
 */
export function CoachCard({
  title, subtitle, icon: Icon, iconColor = 'text-prism-amber',
  confidence, status = 'ok', action, children, className, pitfall, tryThis,
  collapsible = true, defaultOpen = false, summary, momentBadge,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const conf = confidence ? CONFIDENCE_META[confidence] : null;
  const sm = STATUS_META[status];
  const showBody = !collapsible || open;
  const pulse = status === 'warn' || status === 'alert';

  return (
    <div
      className={cn(
        'group relative border-b border-border/30 last:border-b-0 transition-colors',
        open ? 'bg-background/40' : 'hover:bg-background/30',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-start gap-3 px-4 py-3.5',
          collapsible && 'cursor-pointer select-none',
        )}
        onClick={collapsible ? () => setOpen(o => !o) : undefined}
        role={collapsible ? 'button' : undefined}
        aria-expanded={collapsible ? open : undefined}
        tabIndex={collapsible ? 0 : undefined}
        onKeyDown={collapsible ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); }
        } : undefined}
      >
        <Icon className={cn('h-[18px] w-[18px] mt-0.5 shrink-0', iconColor)} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[15px] font-semibold leading-tight text-foreground truncate">
              {title}
            </h3>
            {momentBadge}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1 leading-snug line-clamp-1">
              {open ? subtitle : (summary || subtitle)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <span className={cn(
            'hidden md:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider',
            sm.text,
          )}>
            <span className={cn('h-1.5 w-1.5 rounded-full', sm.dot, pulse && 'animate-pulse')} />
            {sm.label}
          </span>
          <span className={cn('md:hidden h-1.5 w-1.5 rounded-full', sm.dot, pulse && 'animate-pulse')} />

          {collapsible && (
            <ChevronDown className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200',
              open && 'rotate-180',
            )} />
          )}
        </div>
      </div>

      {showBody && (
        <div className="px-4 pb-4 pt-1 text-sm animate-in fade-in-0 slide-in-from-top-1 duration-200">
          {action && (
            <div className="mb-3 flex justify-end">{action}</div>
          )}
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
        </div>
      )}
    </div>
  );
}
