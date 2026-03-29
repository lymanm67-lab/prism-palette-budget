import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, ChevronRight, type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';

export type FactorStatus = 'good' | 'fair' | 'poor' | 'critical';

interface FactorCardProps {
  icon: LucideIcon;
  title: string;
  status: FactorStatus;
  statusText: string;
  score: number;
  opportunity?: string;
  onClick?: () => void;
  className?: string;
}

const statusConfig: Record<FactorStatus, { color: string; bg: string; Icon: LucideIcon }> = {
  good: { color: 'text-emerald-600', bg: 'bg-emerald-500/10', Icon: TrendingUp },
  fair: { color: 'text-amber-600', bg: 'bg-amber-500/10', Icon: Minus },
  poor: { color: 'text-orange-600', bg: 'bg-orange-500/10', Icon: TrendingDown },
  critical: { color: 'text-destructive', bg: 'bg-destructive/10', Icon: TrendingDown },
};

const progressColor: Record<FactorStatus, string> = {
  good: '[&>div]:bg-emerald-500',
  fair: '[&>div]:bg-amber-500',
  poor: '[&>div]:bg-orange-500',
  critical: '[&>div]:bg-destructive',
};

export default function FactorCard({ icon: Icon, title, status, statusText, score, opportunity, onClick, className }: FactorCardProps) {
  const cfg = statusConfig[status];
  const StatusIcon = cfg.Icon;

  return (
    <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 400 }}>
      <Card
        className={cn('cursor-pointer hover:shadow-md transition-shadow', className)}
        onClick={onClick}
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className={cn('p-2 rounded-lg', cfg.bg)}>
                <Icon className={cn('h-4 w-4', cfg.color)} />
              </div>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <div className="flex items-center gap-1">
                  <StatusIcon className={cn('h-3 w-3', cfg.color)} />
                  <span className={cn('text-xs font-medium', cfg.color)}>{statusText}</span>
                </div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
          </div>
          <Progress value={score} className={cn('h-1.5', progressColor[status])} />
          {opportunity && (
            <p className="text-[11px] text-muted-foreground leading-tight">{opportunity}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
