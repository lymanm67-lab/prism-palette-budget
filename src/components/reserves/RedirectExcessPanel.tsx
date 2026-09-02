import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowRightLeft, Info, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useReserves, useLinkableAccounts } from '@/hooks/use-reserves';
import { summarizeReserve, redirectPlan, fundLink } from '@/lib/reserves/emergencyFund';

const money2 = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

/**
 * Turns the redirect percentages into a dollar plan. Nothing moves automatically:
 * the emergency floor is protected first, and money is only recorded once the
 * household confirms the transfer actually happened.
 */
export function RedirectExcessPanel() {
  const { emergency, funds, txns, addTxn, isLoading } = useReserves();
  const { accounts } = useLinkableAccounts();
  const [monthlyExcess, setMonthlyExcess] = useState('0');

  const investmentFund = useMemo(
    () => funds.find((f) => f.kind === 'investment') || null,
    [funds],
  );

  const em = useMemo(
    () => (emergency ? summarizeReserve(emergency, txns, { link: fundLink(emergency, accounts) }) : null),
    [emergency, txns, accounts],
  );

  const plan = useMemo(
    () => (em ? redirectPlan(em, Number(monthlyExcess) || 0) : null),
    [em, monthlyExcess],
  );

  if (isLoading || !emergency || !em || !plan) return null;

  const markTransferred = async () => {
    if (plan.toInvestments <= 0 || !investmentFund) return;
    const today = new Date().toISOString().slice(0, 10);
    await addTxn.mutateAsync({
      reserve_fund_id: emergency.id,
      txn_date: today,
      direction: 'withdrawal',
      amount: plan.toInvestments,
      reason: 'Excess cash redirected to SoFi Investments',
      notes: `Emergency floor of ${money2(plan.floor)} protected before redirect.`,
    });
    await addTxn.mutateAsync({
      reserve_fund_id: investmentFund.id,
      txn_date: today,
      direction: 'contribution',
      amount: plan.toInvestments,
      reason: 'Redirected excess emergency cash',
    });
    toast.success(`Recorded ${money2(plan.toInvestments)} moved into SoFi Investments`);
  };

  return (
    <Card className="wos-page">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowRightLeft className="h-4 w-4 text-prism-teal" /> Redirect Excess Cash to Investments
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {plan.investmentsPct}% SoFi Investments / {plan.otherPct}% other goals, applied only to cash
              above the {money2(plan.floor)} emergency floor.
            </p>
          </div>
          <Badge variant={plan.enabled ? 'default' : 'outline'} className="text-[10px]">
            {plan.enabled ? 'Rule on' : 'Rule off'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Above the floor now', value: money2(plan.surplusAboveFloor) },
            { label: 'Monthly excess assumed', value: money2(plan.monthlyExcess) },
            { label: `To SoFi Investments (${plan.investmentsPct}%)`, value: money2(plan.toInvestments) },
            { label: `To other goals (${plan.otherPct}%)`, value: money2(plan.toOtherGoals) },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border/60 p-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="rx-excess">Monthly excess cash to redirect</Label>
            <Input
              id="rx-excess"
              type="number"
              step="0.01"
              className="w-40"
              value={monthlyExcess}
              onChange={(e) => setMonthlyExcess(e.target.value)}
            />
          </div>
          <Button
            onClick={markTransferred}
            disabled={plan.blocked || plan.toInvestments <= 0 || !investmentFund || addTxn.isPending}
          >
            Mark transferred
          </Button>
        </div>

        {plan.blocked ? (
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription className="text-xs">{plan.blockedReason}</AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Prism never moves money for you. Make the transfer at SoFi, then press “Mark transferred” to
              record the withdrawal from Emergency Cash and the matching contribution to SoFi Investments.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default RedirectExcessPanel;
