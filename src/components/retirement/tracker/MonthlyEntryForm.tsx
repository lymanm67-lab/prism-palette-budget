import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  money,
  type RetirementAccountRow,
  type RetirementStatementRow,
} from '@/lib/retirement/investmentTracker';
import type { StatementInput } from '@/hooks/use-retirement-tracker';

interface Props {
  accounts: RetirementAccountRow[];
  statements: RetirementStatementRow[];
  onSave: (input: StatementInput) => Promise<unknown>;
  isSaving: boolean;
}

const num = (v: string) => (v.trim() === '' ? 0 : Number(v));
const optNum = (v: string) => (v.trim() === '' ? null : Number(v));

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function MonthlyEntryForm({ accounts, statements, onSave, isSaving }: Props) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [month, setMonth] = useState(currentMonth());
  const [statementDate, setStatementDate] = useState('');
  const [ending, setEnding] = useState('');
  const [ee, setEe] = useState('');
  const [er, setEr] = useState('');
  const [transIn, setTransIn] = useState('');
  const [transOut, setTransOut] = useState('');
  const [withdrawals, setWithdrawals] = useState('');
  const [fees, setFees] = useState('');
  const [prr, setPrr] = useState('');
  const [ytd, setYtd] = useState('');
  const [oneY, setOneY] = useState('');
  const [threeY, setThreeY] = useState('');
  const [fiveY, setFiveY] = useState('');
  const [tenY, setTenY] = useState('');
  const [notes, setNotes] = useState('');

  const account = accounts.find((a) => a.id === accountId);

  const beginning = useMemo(() => {
    const prior = statements
      .filter((s) => s.account_id === accountId && String(s.period_month).slice(0, 7) < month)
      .sort((a, b) => String(a.period_month).localeCompare(String(b.period_month)));
    const last = prior[prior.length - 1];
    return last ? Number(last.ending_balance) : Number(account?.baseline_balance ?? 0);
  }, [statements, accountId, month, account]);

  const netContributions =
    num(ee) + num(er) + num(transIn) - num(transOut) - num(withdrawals);
  const estimatedGain = num(ending) - beginning - netContributions + num(fees);

  const submit = async () => {
    if (!accountId) return toast.error('Pick an account first.');
    if (ending.trim() === '') return toast.error('Enter the ending balance from the statement.');

    try {
      await onSave({
        account_id: accountId,
        period_month: `${month}-01`,
        statement_date: statementDate || null,
        beginning_balance: beginning,
        employee_contributions: num(ee),
        employer_contributions: num(er),
        transfers_in: num(transIn),
        transfers_out: num(transOut),
        withdrawals: num(withdrawals),
        fees: num(fees),
        ending_balance: num(ending),
        reported_prr: optNum(prr),
        ytd_return: optNum(ytd),
        one_year_return: optNum(oneY),
        three_year_return: optNum(threeY),
        five_year_return: optNum(fiveY),
        ten_year_return: optNum(tenY),
        fund_name: account?.fund_name ?? null,
        ticker: account?.ticker ?? null,
        notes: notes || null,
      });
      toast.success(`${account?.name} saved for ${month}. Prior months are untouched.`);
      setEnding('');
      setEe('');
      setEr('');
      setTransIn('');
      setTransOut('');
      setWithdrawals('');
      setFees('');
      setPrr('');
      setNotes('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save the statement.');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Monthly statement entry</CardTitle>
        <p className="text-xs text-muted-foreground">
          Eight steps, under five minutes. Contributions are stored separately from investment growth —
          they are never counted as return.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="1. Account">
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="2. Month">
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </Field>
          <Field label="Statement date">
            <Input type="date" value={statementDate} onChange={(e) => setStatementDate(e.target.value)} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Beginning balance (auto)">
            <Input value={money(beginning, 2)} readOnly className="bg-muted/40" />
          </Field>
          <Field label="3. Ending balance">
            <Input inputMode="decimal" value={ending} onChange={(e) => setEnding(e.target.value)} placeholder="0.00" />
          </Field>
          <Field label="4. Employee contributions">
            <Input inputMode="decimal" value={ee} onChange={(e) => setEe(e.target.value)} placeholder="0.00" />
          </Field>
          <Field label="5. Employer contributions">
            <Input inputMode="decimal" value={er} onChange={(e) => setEr(e.target.value)} placeholder="0.00" />
          </Field>
          <Field label="Transfers in">
            <Input inputMode="decimal" value={transIn} onChange={(e) => setTransIn(e.target.value)} placeholder="0.00" />
          </Field>
          <Field label="Transfers out">
            <Input inputMode="decimal" value={transOut} onChange={(e) => setTransOut(e.target.value)} placeholder="0.00" />
          </Field>
          <Field label="Withdrawals">
            <Input
              inputMode="decimal"
              value={withdrawals}
              onChange={(e) => setWithdrawals(e.target.value)}
              placeholder="0.00"
            />
          </Field>
          <Field label="Fees">
            <Input inputMode="decimal" value={fees} onChange={(e) => setFees(e.target.value)} placeholder="0.00" />
          </Field>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-3 grid gap-2 sm:grid-cols-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Net contributions</span>
            <span className="tabular-nums font-medium">{money(netContributions, 2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Estimated Investment Gain</span>
            <span
              className={`tabular-nums font-semibold ${
                estimatedGain >= 0 ? 'text-emerald-500' : 'text-destructive'
              }`}
            >
              {money(estimatedGain, 2)}
            </span>
          </div>
          <p className="sm:col-span-2 text-[10px] text-muted-foreground">
            Calculated as ending balance − beginning balance − net contributions + fees. Because cash flows
            occur at different points in the month, this is an estimate, not an official personal rate of return.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Field label="6. Reported personal return %">
            <Input inputMode="decimal" value={prr} onChange={(e) => setPrr(e.target.value)} placeholder="optional" />
          </Field>
          <Field label="YTD return %">
            <Input inputMode="decimal" value={ytd} onChange={(e) => setYtd(e.target.value)} placeholder="optional" />
          </Field>
          <Field label="1-year %">
            <Input inputMode="decimal" value={oneY} onChange={(e) => setOneY(e.target.value)} placeholder="optional" />
          </Field>
          <Field label="3-year annualized %">
            <Input inputMode="decimal" value={threeY} onChange={(e) => setThreeY(e.target.value)} placeholder="optional" />
          </Field>
          <Field label="5-year annualized %">
            <Input inputMode="decimal" value={fiveY} onChange={(e) => setFiveY(e.target.value)} placeholder="optional" />
          </Field>
          <Field label="10-year annualized %">
            <Input inputMode="decimal" value={tenY} onChange={(e) => setTenY(e.target.value)} placeholder="optional" />
          </Field>
        </div>

        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Fund changes, rebalances, one-off events…" />
        </Field>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[11px] text-muted-foreground">
            Saving updates the portfolio total, charts, milestones, projections and the monthly scorecard.
          </p>
          <Button onClick={submit} disabled={isSaving}>
            {isSaving ? 'Saving…' : '8. Save statement'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
