import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Info, Minus, Plus } from 'lucide-react';
import { ReserveTxnDialog } from './ReserveTxnDialog';
import { useReserves, useLinkableAccounts } from '@/hooks/use-reserves';
import {
  summarizeReserve, LIQUIDITY_CLASSES, LIQUIDITY_LABEL,
} from '@/lib/reserves/emergencyFund';

const money2 = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${tone || ''}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

/**
 * SoFi Investments — tracked under Build Wealth, deliberately NOT part of the
 * Emergency Fund balance. Market value is exposed to volatility, so it can
 * never satisfy the emergency cash target.
 */
export function SofiInvestmentsCard() {
  const { funds, txns, updateFund, isLoading } = useReserves();
  const { accounts, updateBalance } = useLinkableAccounts();
  const [editing, setEditing] = useState(false);
  const [balanceEdits, setBalanceEdits] = useState<Record<string, string>>({});
  const [marketValue, setMarketValue] = useState('');
  const [accountType, setAccountType] = useState('');
  const [goal, setGoal] = useState('');

  const fund = useMemo(() => funds.find((f) => f.kind === 'investment') || null, [funds]);

  /** Real SoFi brokerage / IRA accounts held in the accounts ledger. */
  const sofiAccounts = useMemo(
    () =>
      accounts.filter(
        (a) =>
          ['investment', 'other'].includes(a.account_type) &&
          `${a.institution || ''} ${a.name}`.toLowerCase().includes('sofi'),
      ),
    [accounts],
  );
  const liveTotal = useMemo(
    () => sofiAccounts.reduce((sum, a) => sum + Number(a.balance || 0), 0),
    [sofiAccounts],
  );
  const summary = useMemo(() => (fund ? summarizeReserve(fund, txns) : null), [fund, txns]);

  if (isLoading) return <Card className="h-48 animate-pulse" />;
  if (!fund || !summary) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">SoFi Investments</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">No SoFi investment account tracked yet.</CardContent>
      </Card>
    );
  }

  const s = summary;
  const netGainLoss = s.gains - s.losses;
  const marketVal = sofiAccounts.length > 0
    ? liveTotal
    : fund.market_value > 0 ? fund.market_value : s.balance;

  const startEdit = () => {
    setMarketValue(String(fund.market_value));
    setAccountType(fund.account_type || '');
    setGoal(fund.goal_label || '');
    setEditing(true);
  };
  const saveEdit = async () => {
    await updateFund.mutateAsync({
      id: fund.id,
      market_value: Number(marketValue) || 0,
      account_type: accountType.trim() || null,
      goal_label: goal.trim() || null,
    });
    setEditing(false);
  };

  return (
    <Card className="wos-page">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-prism-amber" /> SoFi Investments
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Build Wealth, not emergency cash. Market value is excluded from the Emergency Fund balance.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">{LIQUIDITY_LABEL[fund.liquidity_class]}</Badge>
            <ReserveTxnDialog fund={fund} defaultDirection="contribution"
              trigger={<Button size="sm" variant="outline"><Plus className="mr-1 h-3.5 w-3.5" />Add</Button>} />
            <ReserveTxnDialog fund={fund} defaultDirection="withdrawal"
              trigger={<Button size="sm" variant="outline"><Minus className="mr-1 h-3.5 w-3.5" />Withdraw</Button>} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="Investment account balance" value={money2(s.balance)} sub="Cost basis of contributions" />
          <Stat
            label="Current market value"
            value={money2(marketVal)}
            sub={sofiAccounts.length > 0
              ? `${sofiAccounts.length} real SoFi account${sofiAccounts.length === 1 ? '' : 's'}`
              : 'Updated manually'}
          />
          <Stat label="Gains / losses" value={`${netGainLoss >= 0 ? '+' : '−'}${money2(Math.abs(netGainLoss))}`}
            tone={netGainLoss >= 0 ? 'text-emerald-500' : 'text-destructive'} sub="Logged gain and loss entries" />
          <Stat label="Contributions" value={money2(s.contributed)} />
          <Stat label="Withdrawals" value={money2(s.withdrawn)} />
          <Stat label="Account type" value={fund.account_type || '—'} sub={fund.goal_label || 'Set an investment goal'} />
        </div>

        <div className="rounded-lg border border-border/60 p-3">
          <p className="text-sm font-medium">SoFi investment accounts</p>
          <p className="text-xs text-muted-foreground">
            Balances come straight from your accounts ledger. Update one here and the card total follows.
          </p>
          {sofiAccounts.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              No SoFi investment accounts found. Add them on the Accounts page (institution “SoFi”, type
              Investment) and they appear here automatically.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {sofiAccounts.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/30 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {(a.institution || 'SoFi')} · {a.account_type}
                      {a.last_synced_at ? ` · updated ${new Date(a.last_synced_at).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      className="h-8 w-32 text-right tabular-nums"
                      type="number"
                      step="0.01"
                      aria-label={`${a.name} balance`}
                      value={balanceEdits[a.id] ?? String(a.balance)}
                      onChange={(e) => setBalanceEdits((p) => ({ ...p, [a.id]: e.target.value }))}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        updateBalance.isPending ||
                        (balanceEdits[a.id] ?? String(a.balance)) === String(a.balance)
                      }
                      onClick={() =>
                        updateBalance.mutate({
                          id: a.id,
                          balance: Number(balanceEdits[a.id] ?? a.balance) || 0,
                        })
                      }
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex justify-between border-t border-border/60 pt-2 text-sm font-semibold">
                <span>Total SoFi investments</span>
                <span className="tabular-nums">{money2(liveTotal)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border/60 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Liquidity classification</p>
              <p className="text-xs text-muted-foreground">
                Must stay outside Emergency Cash — the same balance can never be both.
              </p>
            </div>
            <Select
              value={fund.liquidity_class}
              onValueChange={(v) => updateFund.mutate({ id: fund.id, liquidity_class: v })}
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

        {fund.liquidity_class === 'emergency_cash' && (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              This investment account is classified as Emergency Cash. Investments are exposed to market
              volatility and must not count toward the emergency target — change the classification.
            </AlertDescription>
          </Alert>
        )}

        <div className="rounded-lg border border-border/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Account details</p>
            {editing ? (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" onClick={saveEdit} disabled={updateFund.isPending}>Save</Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={startEdit}>Edit</Button>
            )}
          </div>
          {editing && (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="si-mv">Current market value</Label>
                <Input id="si-mv" type="number" step="0.01" value={marketValue} onChange={(e) => setMarketValue(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="si-type">Account type</Label>
                <Input id="si-type" value={accountType} onChange={(e) => setAccountType(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="si-goal">Investment goal</Label>
                <Input id="si-goal" value={goal} onChange={(e) => setGoal(e.target.value)} />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default SofiInvestmentsCard;
