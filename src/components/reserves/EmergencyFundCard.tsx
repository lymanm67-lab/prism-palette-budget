import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info, ShieldCheck, Minus, Plus, ArrowRightLeft, Check, Clock, Circle } from 'lucide-react';
import { ReserveTxnDialog } from './ReserveTxnDialog';
import { useReserves } from '@/hooks/use-reserves';
import {
  summarizeReserve, fundingPriorities, STATUS_LABEL, DIRECTION_LABEL,
  type GuardrailContext,
} from '@/lib/reserves/emergencyFund';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const money2 = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

interface Props {
  guardrailContext?: GuardrailContext;
  vacationDebtBalance?: number;
  freedMonthly?: number;
}

export function EmergencyFundCard({
  guardrailContext = {},
  vacationDebtBalance = 0,
  freedMonthly = 0,
}: Props) {
  const { emergency, txns, updateFund, removeTxn, isLoading } = useReserves();
  const [editing, setEditing] = useState(false);
  const [contrib, setContrib] = useState('');
  const [essential, setEssential] = useState('');

  const summary = useMemo(
    () => (emergency ? summarizeReserve(emergency, txns, guardrailContext) : null),
    [emergency, txns, guardrailContext],
  );

  const priorities = useMemo(
    () => (summary ? fundingPriorities(summary, { vacationDebtBalance, freedMonthly }) : []),
    [summary, vacationDebtBalance, freedMonthly],
  );

  if (isLoading) return <Card className="h-64 animate-pulse" />;
  if (!emergency || !summary) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Emergency Fund</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No emergency fund configured yet for this household.
        </CardContent>
      </Card>
    );
  }

  const s = summary;
  const statusTone =
    s.status === 'funded' ? 'bg-emerald-500/15 text-emerald-500'
      : s.status === 'replenishment_needed' ? 'bg-destructive/15 text-destructive'
        : s.status === 'stage1_met' ? 'bg-prism-teal/15 text-prism-teal'
          : 'bg-muted text-muted-foreground';

  const startEdit = () => {
    setContrib(String(emergency.monthly_contribution));
    setEssential(String(emergency.essential_monthly_expenses));
    setEditing(true);
  };

  const saveEdit = async () => {
    await updateFund.mutateAsync({
      id: emergency.id,
      monthly_contribution: Number(contrib) || 0,
      essential_monthly_expenses: Number(essential) || 0,
    });
    setEditing(false);
  };

  const emTxns = txns.filter((t) => t.fund_id === emergency.id).slice(0, 8);

  return (
    <Card className="wos-page">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-prism-teal" /> SoFi Emergency Cash
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Dedicated liquid cash for true unexpected events — held at{' '}
              {emergency.institution_label || 'SoFi Bank'}. Liquid, readily accessible and not exposed to
              market volatility. Separate from the monthly Buffer, Vacation Fund, Vehicle Fund, HSA,
              retirement, brokerage and the Business Capital Reserve.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Badge className={statusTone} variant="secondary">{STATUS_LABEL[s.status]}</Badge>
            <Badge variant="outline" className="text-[10px]">
              {LIQUIDITY_LABEL[emergency.liquidity_class]}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-bold tabular-nums">{money2(s.balance)}</p>
              <p className="text-xs text-muted-foreground">
                {Math.round(s.pctFunded * 100)}% of the {money(emergency.primary_target)} primary goal
              </p>
            </div>
            <div className="flex gap-2">
              <ReserveTxnDialog
                fund={emergency}
                defaultDirection="contribution"
                trigger={<Button size="sm" variant="outline"><Plus className="mr-1 h-3.5 w-3.5" />Add</Button>}
              />
              <ReserveTxnDialog
                fund={emergency}
                defaultDirection="buffer_transfer"
                trigger={<Button size="sm" variant="outline"><ArrowRightLeft className="mr-1 h-3.5 w-3.5" />Buffer transfer</Button>}
              />
              <ReserveTxnDialog
                fund={emergency}
                defaultDirection="withdrawal"
                trigger={<Button size="sm" variant="outline"><Minus className="mr-1 h-3.5 w-3.5" />Withdraw</Button>}
              />
            </div>
          </div>
          <Progress value={s.pctFunded * 100} className="mt-3 h-2.5" />
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
            <span>Stage 1 {money(emergency.stage1_target)}</span>
            <span>Goal {money(emergency.primary_target)}</span>
            <span>Ceiling {money(emergency.ceiling_target)}</span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Stage 1 floor" value={money(emergency.stage1_target)}
            sub={s.remainingToStage1 > 0 ? `${money2(s.remainingToStage1)} remaining` : 'Met'} />
          <Stat label="Primary goal" value={money(emergency.primary_target)}
            sub={s.remainingToPrimary > 0 ? `${money2(s.remainingToPrimary)} remaining` : 'Funded'} />
          <Stat label="Optional ceiling" value={money(emergency.ceiling_target)}
            sub={s.remainingToCeiling > 0 ? `${money2(s.remainingToCeiling)} above goal` : 'Reached'} />
          <Stat label="Percentage funded" value={`${Math.round(s.pctFunded * 100)}%`} sub="Against the primary goal" />
          <Stat label="Monthly transfer to SoFi" value={money2(s.monthlyContribution)}
            sub={s.monthlyContribution === 0 ? 'Paused — goal met' : 'Automatic'} />
          <Stat label="YTD contributions" value={money2(s.ytdContributions)}
            sub={s.bufferTransferred > 0 ? `Includes ${money2(s.bufferTransferred)} of buffer sweeps` : 'Contributions, sweeps & interest'} />
          <Stat label="YTD withdrawals" value={money2(s.ytdWithdrawals)}
            sub={s.withdrawn > 0 ? `${money2(s.withdrawn)} withdrawn all-time` : 'No withdrawals'} />
          <Stat label="Estimated completion"
            value={s.goalDate ? new Date(s.goalDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
            sub={s.monthsToGoal == null ? 'Set a contribution to project' : s.monthsToGoal === 0 ? 'Goal reached' : `${s.monthsToGoal} months`} />
          <Stat label="Months of essentials covered"
            value={s.monthsCovered == null ? '—' : `${s.monthsCovered.toFixed(1)} mo`}
            sub={emergency.essential_monthly_expenses > 0 ? `At ${money(emergency.essential_monthly_expenses)}/mo essentials` : 'Set essential expenses'} />
          <Stat label="Amount required to replenish"
            value={money2(s.replenishmentNeeded)}
            sub={s.belowGoal > 0 ? `${money2(s.belowGoal)} below the ${money(emergency.primary_target)} goal` : 'At or above goal'} />
        </div>

        <div className="rounded-lg border border-border/60 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Liquidity classification</p>
              <p className="text-xs text-muted-foreground">
                Only balances classified Emergency Cash count toward the {money(emergency.primary_target)} target.
              </p>
            </div>
            <Select
              value={emergency.liquidity_class}
              onValueChange={(v) => updateFund.mutate({ id: emergency.id, liquidity_class: v })}
            >
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LIQUIDITY_CLASSES.map((c) => (
                  <SelectItem key={c} value={c}>{LIQUIDITY_LABEL[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {s.guardrails.map((g) => (
          <Alert key={g.id} variant={g.severity === 'critical' ? 'destructive' : 'default'}>
            {g.severity === 'info' ? <Info className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <AlertDescription className="text-xs">{g.message}</AlertDescription>
          </Alert>
        ))}

        <div className="rounded-lg border border-border/60 p-3">
          <p className="text-sm font-medium">Funding priority</p>
          <ol className="mt-2 space-y-2">
            {priorities.map((p) => (
              <li key={p.order} className="flex items-start gap-2 text-xs">
                {p.state === 'done' ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  : p.state === 'active' ? <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-prism-teal" />
                    : <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                <span>
                  <span className="font-medium">{p.order}. {p.label}</span>
                  <span className="block text-muted-foreground">{p.detail}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-lg border border-border/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Settings</p>
            {editing ? (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" onClick={saveEdit} disabled={updateFund.isPending}>Save</Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={startEdit}>Edit</Button>
            )}
          </div>
          {editing ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ef-contrib">Monthly contribution</Label>
                <Input id="ef-contrib" type="number" step="0.01" value={contrib} onChange={(e) => setContrib(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ef-essential">Essential monthly expenses</Label>
                <Input id="ef-essential" type="number" step="0.01" value={essential} onChange={(e) => setEssential(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                {money2(emergency.monthly_contribution)}/mo · essentials {money(emergency.essential_monthly_expenses)}/mo
              </span>
              <label className="flex items-center gap-2">
                <span>Pause contributions</span>
                <Switch
                  checked={emergency.contributions_paused}
                  onCheckedChange={(v) => updateFund.mutate({ id: emergency.id, contributions_paused: v })}
                />
              </label>
            </div>
          )}
        </div>

        {emTxns.length > 0 && (
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-sm font-medium">Recent activity</p>
            <div className="mt-2 space-y-1.5">
              {emTxns.map((t) => (
                <div key={t.id} className="flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {DIRECTION_LABEL[t.direction]}
                      {t.category ? ` · ${t.category}` : ''}
                    </p>
                    {t.reason && <p className="truncate text-muted-foreground">{t.reason}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`tabular-nums ${t.direction === 'withdrawal' ? 'text-destructive' : 'text-emerald-500'}`}>
                      {t.direction === 'withdrawal' ? '−' : '+'}{money2(Math.abs(t.amount))}
                    </span>
                    <span className="text-muted-foreground">{t.txn_date}</span>
                    <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]"
                      onClick={() => removeTxn.mutate(t.id)}>Remove</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default EmergencyFundCard;
