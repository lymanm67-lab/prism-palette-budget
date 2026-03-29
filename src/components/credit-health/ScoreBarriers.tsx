import { AlertTriangle, ArrowRight, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface Barrier {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium';
  explanation: string;
  nextStep: string;
  onAction?: () => void;
}

const severityConfig = {
  critical: { label: 'Critical', bg: 'bg-destructive/10 text-destructive border-destructive/20' },
  high: { label: 'High Impact', bg: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  medium: { label: 'Moderate', bg: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
};

export default function ScoreBarriers({ barriers }: { barriers: Barrier[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          What's hurting your score most right now
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {barriers.map((b, i) => {
          const cfg = severityConfig[b.severity];
          return (
            <div
              key={b.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold">{b.title}</p>
                  <Badge variant="outline" className={cn('text-[10px] py-0', cfg.bg)}>{cfg.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{b.explanation}</p>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-primary gap-1 px-2" onClick={b.onAction}>
                  {b.nextStep} <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
        {barriers.length === 0 && (
          <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Info className="h-4 w-4" />
            Add credit accounts to identify score barriers
          </div>
        )}
      </CardContent>
    </Card>
  );
}
