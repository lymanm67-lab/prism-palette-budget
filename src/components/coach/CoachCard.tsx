import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';

export type Confidence = 'high' | 'medium' | 'low';

const CONFIDENCE_META: Record<Confidence, { label: string; cls: string; Icon: LucideIcon }> = {
  high:   { label: 'High confidence',   cls: 'bg-prism-teal/15 text-prism-teal border-prism-teal/30',   Icon: ShieldCheck },
  medium: { label: 'Medium confidence', cls: 'bg-prism-amber/15 text-prism-amber border-prism-amber/30', Icon: ShieldQuestion },
  low:    { label: 'Low confidence',    cls: 'bg-prism-rose/15 text-prism-rose border-prism-rose/30',   Icon: ShieldAlert },
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
}

const STATUS_DOT: Record<NonNullable<Props['status']>, string> = {
  ok:    'bg-prism-teal',
  warn:  'bg-prism-amber',
  alert: 'bg-prism-rose',
  soon:  'bg-muted-foreground/40',
};

export function CoachCard({
  number, title, subtitle, icon: Icon, iconColor = 'text-prism-amber',
  confidence, status = 'ok', action, children, className,
}: Props) {
  const conf = confidence ? CONFIDENCE_META[confidence] : null;
  return (
    <Card className={cn(
      'relative overflow-hidden border-border/60 bg-card/60 backdrop-blur-sm',
      'transition-all hover:border-prism-teal/40 hover:shadow-lg hover:shadow-prism-teal/5',
      className,
    )}>
      <div className={cn('absolute left-0 top-0 h-full w-1', STATUS_DOT[status])} />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background/60 border border-border/50">
              <Icon className={cn('h-5 w-5', iconColor)} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {number != null && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Card {number}
                  </span>
                )}
                {conf && (
                  <Badge variant="outline" className={cn('text-[10px] font-semibold gap-1 px-1.5 py-0', conf.cls)}>
                    <conf.Icon className="h-2.5 w-2.5" />
                    {conf.label}
                  </Badge>
                )}
              </div>
              <CardTitle className="font-display text-base leading-tight mt-0.5">{title}</CardTitle>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </CardHeader>
      <CardContent className="pt-0 text-sm">
        {children}
      </CardContent>
    </Card>
  );
}
