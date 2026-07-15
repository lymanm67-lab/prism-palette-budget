import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Bell, CheckCircle2, Info, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationInput {
  freedomScore: number;
  dti: number;
  ltv: number;
  emergencyMonths: number;
  mortgageRate: number;
  marketRate: number;
  monthlySurplus: number;
  creditScore: number;
  helocRateShockSensitivity: number; // survivability from stress test (0-100)
}

interface Notification {
  id: string;
  severity: 'success' | 'info' | 'warn' | 'danger';
  title: string;
  detail: string;
}

function derive(inp: NotificationInput): Notification[] {
  const out: Notification[] = [];

  if (inp.mortgageRate - inp.marketRate >= 1.0) {
    out.push({
      id: 'refi',
      severity: 'info',
      title: 'Refinance opportunity',
      detail: `Your mortgage rate (${inp.mortgageRate.toFixed(2)}%) is ≥1% above market (${inp.marketRate.toFixed(2)}%). Refi could cut monthly payment materially — check breakeven vs closing costs.`,
    });
  }

  if (inp.dti > 43) {
    out.push({
      id: 'dti',
      severity: 'danger',
      title: 'DTI is critical',
      detail: `Back-end DTI at ${inp.dti.toFixed(1)}%. Most lenders cap at 43%. Pay down non-mortgage debt before adding a HELOC.`,
    });
  } else if (inp.dti > 36) {
    out.push({
      id: 'dti-watch',
      severity: 'warn',
      title: 'DTI stretched',
      detail: `DTI at ${inp.dti.toFixed(1)}% leaves little room for a shock. Aim to trim below 36%.`,
    });
  }

  if (inp.emergencyMonths < 3) {
    out.push({
      id: 'emergency',
      severity: 'danger',
      title: 'Emergency fund too thin',
      detail: `Only ${inp.emergencyMonths.toFixed(1)} months of expenses in reserves. Do NOT use HELOC aggressively — build to 3 months minimum first.`,
    });
  } else if (inp.emergencyMonths < 6) {
    out.push({
      id: 'emergency-watch',
      severity: 'warn',
      title: 'Emergency fund light',
      detail: `${inp.emergencyMonths.toFixed(1)} months in reserves. Target 6 months before aggressive payoff.`,
    });
  }

  if (inp.ltv >= 80) {
    out.push({
      id: 'pmi',
      severity: 'info',
      title: 'PMI may still apply',
      detail: `LTV at ${inp.ltv.toFixed(0)}% — cross under 80% to drop PMI (worth ~0.5–1% of loan/yr).`,
    });
  }

  if (inp.creditScore > 0 && inp.creditScore < 680) {
    out.push({
      id: 'credit',
      severity: 'warn',
      title: 'Credit score limits options',
      detail: `FICO ${inp.creditScore} — HELOC lenders typically want 680+. Focus on utilization + on-time payments to raise the score.`,
    });
  }

  if (inp.helocRateShockSensitivity < 50) {
    out.push({
      id: 'shock',
      severity: 'warn',
      title: 'HELOC shock risk',
      detail: `Stress test survivability ${inp.helocRateShockSensitivity}/100. A rate hike or income drop would break the plan — carry more reserves or reduce HELOC exposure.`,
    });
  }

  if (inp.monthlySurplus <= 0) {
    out.push({
      id: 'no-surplus',
      severity: 'danger',
      title: 'No monthly surplus',
      detail: 'You have $0 or negative free cash flow. Cut expenses or raise income before any acceleration strategy.',
    });
  }

  if (inp.freedomScore >= 80 && out.filter(o => o.severity === 'danger').length === 0) {
    out.push({
      id: 'strong',
      severity: 'success',
      title: 'You\'re in a strong position',
      detail: `Freedom Score ${inp.freedomScore}. Consider aggressive acceleration to shorten payoff by years.`,
    });
  }

  return out;
}

const STYLE = {
  success: { icon: CheckCircle2, cn: 'border-emerald-500/40 bg-emerald-500/5',     text: 'text-emerald-600 dark:text-emerald-400' },
  info:    { icon: TrendingUp,   cn: 'border-primary/40 bg-primary/5',              text: 'text-primary' },
  warn:    { icon: Info,         cn: 'border-amber-500/40 bg-amber-500/5',          text: 'text-amber-600 dark:text-amber-400' },
  danger:  { icon: AlertTriangle,cn: 'border-rose-500/40 bg-rose-500/5',            text: 'text-rose-600 dark:text-rose-400' },
} as const;

export default function SmartNotifications(props: NotificationInput) {
  const items = useMemo(() => derive(props), [props]);

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5 text-primary" /> Smart Alerts
          {items.length > 0 && <Badge variant="secondary" className="ml-1">{items.length}</Badge>}
        </CardTitle>
        <p className="text-sm text-muted-foreground">Personalized nudges from your profile — the things worth doing next.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/50 p-6 text-center text-sm text-muted-foreground">
            No alerts. Everything looks healthy — keep executing the plan.
          </div>
        )}
        {items.map(n => {
          const s = STYLE[n.severity];
          const Icon = s.icon;
          return (
            <div key={n.id} className={cn('rounded-lg border p-3 flex items-start gap-3', s.cn)}>
              <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', s.text)} />
              <div className="min-w-0 flex-1">
                <div className={cn('font-semibold text-sm', s.text)}>{n.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{n.detail}</div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
