import { Sparkles, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NextBestStepProps {
  title: string;
  description: string;
  impact: string;
  actionLabel: string;
  onAction?: () => void;
  className?: string;
}

export default function NextBestStep({ title, description, impact, actionLabel, onAction, className }: NextBestStepProps) {
  return (
    <Card className={cn('relative overflow-hidden border-primary/20', className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      <CardContent className="relative p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Your Next Best Step</p>
            <h3 className="text-base font-semibold">{title}</h3>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full">
            {impact}
          </span>
          <Button size="sm" onClick={onAction} className="gap-1.5">
            {actionLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
