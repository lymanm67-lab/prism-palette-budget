import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  GAP_RISK_TEXT,
  STOP_RULE_FOLLOW_UP,
  STOP_RULE_TEXT,
  type RewardRiskStatus,
} from '@/lib/swingedge/stops';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/50 py-1.5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-semibold tabular-nums', tone)}>{value}</span>
    </div>
  );
}

export interface RiskFirstProps {
  entry: number;
  invalidation: number | null;
  stop: number;
  riskPerShare: number | null;
  shares: number;
  plannedLoss: number;
  percentOfAccount: number;
  target: number;
  rewardRisk: number | null;
  rewardRiskStatus: RewardRiskStatus | null;
}

const RR_TONE: Record<RewardRiskStatus, string> = {
  STRONG: 'text-prism-lime',
  ACCEPTABLE: 'text-foreground',
  BELOW_RULE: 'text-destructive',
};

/** The card that appears on every trade plan. Risk before reward, always. */
export default function RiskFirstCard(p: RiskFirstProps) {
  return (
    <Card className="border-prism-amber/40">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="h-4 w-4 text-prism-amber" />
          RISK FIRST
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <Row label="Entry" value={money(p.entry)} />
        <Row label="Invalidation" value={p.invalidation === null ? 'Not identified' : money(p.invalidation)} />
        <Row label="Stop" value={money(p.stop)} />
        <Row
          label="Risk per share"
          value={p.riskPerShare === null ? 'INVALID STOP' : money(p.riskPerShare)}
          tone={p.riskPerShare === null ? 'text-destructive' : undefined}
        />
        <Row label="Shares" value={`${p.shares}`} />
        <Row label="Maximum planned loss" value={money(p.plannedLoss)} />
        <Row label="Percent of account risked" value={`${p.percentOfAccount}%`} />
        <Row label="Target" value={money(p.target)} />
        <Row
          label="Reward-to-risk"
          value={p.rewardRisk === null ? '—' : `${p.rewardRisk}:1`}
          tone={p.rewardRiskStatus ? RR_TONE[p.rewardRiskStatus] : undefined}
        />
        {p.rewardRiskStatus ? (
          <div className="pt-2">
            <Badge variant={p.rewardRiskStatus === 'BELOW_RULE' ? 'destructive' : 'secondary'}>
              {p.rewardRiskStatus === 'BELOW_RULE' ? 'BELOW RULE' : p.rewardRiskStatus}
            </Badge>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** Shown wherever a stop is being chosen. */
export function StopRuleCard() {
  return (
    <Alert>
      <AlertTitle>STOP-LOSS RULE</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{STOP_RULE_TEXT}</p>
        <p>{STOP_RULE_FOLLOW_UP}</p>
      </AlertDescription>
    </Alert>
  );
}

export function GapRiskCard({ earningsNote }: { earningsNote?: string }) {
  return (
    <Alert className="border-prism-amber/40">
      <ShieldAlert className="h-4 w-4" />
      <AlertTitle>Gap risk</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{GAP_RISK_TEXT}</p>
        {earningsNote ? <p>{earningsNote}</p> : null}
      </AlertDescription>
    </Alert>
  );
}
