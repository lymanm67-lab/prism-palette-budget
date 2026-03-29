import { Lightbulb, type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface InsightCardProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  type?: 'info' | 'warning' | 'success' | 'insight';
  className?: string;
}

const typeConfig = {
  info: { bg: 'bg-blue-500/5 border-blue-500/20', icon: 'text-blue-500', dot: 'bg-blue-500' },
  warning: { bg: 'bg-amber-500/5 border-amber-500/20', icon: 'text-amber-500', dot: 'bg-amber-500' },
  success: { bg: 'bg-emerald-500/5 border-emerald-500/20', icon: 'text-emerald-500', dot: 'bg-emerald-500' },
  insight: { bg: 'bg-primary/5 border-primary/20', icon: 'text-primary', dot: 'bg-primary' },
};

export default function InsightCard({ icon: Icon = Lightbulb, title, description, type = 'insight', className }: InsightCardProps) {
  const cfg = typeConfig[type];
  return (
    <Card className={cn('border', cfg.bg, className)}>
      <CardContent className="p-4 flex gap-3">
        <div className={cn('mt-0.5 shrink-0 p-1.5 rounded-lg', cfg.bg)}>
          <Icon className={cn('h-4 w-4', cfg.icon)} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
