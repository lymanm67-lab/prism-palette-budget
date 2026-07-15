import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GaugeProps {
  dti: number;
  ltv: number;
  emergencyMonths: number;
  freedomAge: number | null;      // age at payoff (null = unknown)
  currentAge: number;
}

export default function DashboardGauges({ dti, ltv, emergencyMonths, freedomAge, currentAge }: GaugeProps) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gauge className="h-5 w-5 text-primary" /> Health Gauges
        </CardTitle>
        <p className="text-sm text-muted-foreground">Four vitals at a glance. Green = healthy, amber = watch, rose = act now.</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <GaugeTile
            label="DTI"
            value={dti}
            display={`${dti.toFixed(1)}%`}
            max={60}
            greenBelow={36}
            amberBelow={43}
            hint={dti <= 36 ? 'Healthy debt load' : dti <= 43 ? 'Stretched' : 'Overleveraged'}
          />
          <GaugeTile
            label="LTV"
            value={ltv}
            display={`${ltv.toFixed(0)}%`}
            max={100}
            greenBelow={80}
            amberBelow={95}
            hint={ltv <= 80 ? 'PMI-free equity' : ltv <= 95 ? 'Building equity' : 'Little equity'}
          />
          <GaugeTile
            label="Emergency Fund"
            value={Math.min(emergencyMonths, 12)}
            display={`${emergencyMonths.toFixed(1)} mo`}
            max={12}
            greenAbove={6}
            amberAbove={3}
            hint={emergencyMonths >= 6 ? 'Solid runway' : emergencyMonths >= 3 ? 'Rebuild it' : 'Top priority'}
            invert
          />
          <GaugeTile
            label="Freedom Age"
            value={freedomAge ?? currentAge + 30}
            display={freedomAge ? `${freedomAge}` : '—'}
            max={80}
            greenBelow={60}
            amberBelow={70}
            hint={
              !freedomAge ? 'Set age & payoff to see' :
              freedomAge <= 60 ? 'Early retirement possible' :
              freedomAge <= 70 ? 'Standard timeline' :
              'Working long into retirement'
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

function GaugeTile({
  label, value, display, max, greenBelow, amberBelow, greenAbove, amberAbove, hint, invert,
}: {
  label: string;
  value: number;
  display: string;
  max: number;
  greenBelow?: number;
  amberBelow?: number;
  greenAbove?: number;
  amberAbove?: number;
  hint: string;
  invert?: boolean;
}) {
  let status: 'green' | 'amber' | 'rose' = 'rose';
  if (greenBelow !== undefined && value <= greenBelow) status = 'green';
  else if (amberBelow !== undefined && value <= amberBelow) status = 'amber';
  if (greenAbove !== undefined && value >= greenAbove) status = 'green';
  else if (amberAbove !== undefined && value >= amberAbove) status = 'amber';

  const pct = Math.min(100, (value / max) * 100);
  const fill = status === 'green' ? 'stroke-emerald-500' : status === 'amber' ? 'stroke-amber-500' : 'stroke-rose-500';
  const text = status === 'green' ? 'text-emerald-500' : status === 'amber' ? 'text-amber-500' : 'text-rose-500';

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;

  return (
    <div className="rounded-2xl border border-border/50 bg-card/50 p-3 flex flex-col items-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={radius} className="stroke-muted/30" strokeWidth="8" fill="none" />
          <circle
            cx="50" cy="50" r={radius}
            className={cn(fill, 'transition-all duration-500')}
            strokeWidth="8" fill="none" strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn('text-lg font-bold', text)}>{display}</div>
        </div>
      </div>
      <div className="text-[11px] text-muted-foreground text-center mt-1">{hint}</div>
    </div>
  );
}
