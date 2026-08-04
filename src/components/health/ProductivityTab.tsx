import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Brain, DollarSign, Activity } from 'lucide-react';
import { useHealthLogs, useHealthProfile } from '@/hooks/use-health';
import { productivityInsight } from '@/lib/health/healthEngine';

const pct = (v: number | null) => (v == null ? '—' : `${v > 0 ? '+' : ''}${Math.round(v)}%`);

export default function ProductivityTab() {
  const { data: profile } = useHealthProfile();
  const { data: logs = [] } = useHealthLogs();
  const insight = productivityInsight(logs, profile ?? null);

  const cards = [
    { icon: Zap, label: 'Energy lift', value: pct(insight.energyLift), tone: 'text-prism-lime' },
    { icon: Brain, label: 'Focus lift', value: pct(insight.focusLift), tone: 'text-prism-violet' },
    { icon: DollarSign, label: 'Revenue lift', value: pct(insight.revenueLift), tone: 'text-prism-teal' },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-0 prism-gradient-teal">
        <CardContent className="p-6">
          <p className="text-xs uppercase tracking-wide text-prism-on-dark-muted">
            Health → performance connection
          </p>
          <p className="mt-2 text-lg font-semibold text-prism-on-dark">{insight.headline}</p>
          <div className="mt-3 flex gap-2">
            <Badge variant="outline" className="border-white/30 bg-white/10 text-prism-on-dark">
              {insight.consistentWeeks} consistent weeks
            </Badge>
            <Badge variant="outline" className="border-white/30 bg-white/10 text-prism-on-dark">
              {insight.inconsistentWeeks} off-target weeks
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-6">
              <c.icon className={`h-5 w-5 ${c.tone}`} />
              <p className="mt-3 text-3xl font-bold tabular-nums">{c.value}</p>
              <p className="text-sm text-muted-foreground">{c.label}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Consistent walking weeks compared with off-target weeks.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-prism-teal" /> How to strengthen the signal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Rate energy, focus, stress and mood every day — the correlation needs daily inputs.</p>
          <p>• Log business revenue on the days it lands to connect health habits to income.</p>
          <p>
            • Four or more weeks of data produces a usable comparison; correlation is not causation, so
            treat these as directional signals only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
