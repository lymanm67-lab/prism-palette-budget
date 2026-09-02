import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { ACCOUNT_TYPES, FUNDING_SOURCES, ROLE_META, money, pct } from '@/lib/investing/roles';
import { useInvestingMetrics } from '@/hooks/use-investing-metrics';
import { useInvContributions, useSaveContribution } from '@/hooks/use-investing';

export function CapitalPriorityPanel() {
  const { priority, nextDollar, allocation } = useInvestingMetrics();
  const contributions = useInvContributions();
  const saveContribution = useSaveContribution();
  const [amount, setAmount] = useState(250);
  const [source, setSource] = useState('monthly_surplus');
  const [account, setAccount] = useState('sofi_investments');
  const [note, setNote] = useState('');

  const rows = (contributions.data ?? []) as any[];

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Capital priority check</CardTitle>
          <CardDescription>
            Investing comes after the plan's earlier claims on cash: emergency reserve floor, high-interest debt, and committed short-term funds.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {priority.checks.map((c) => (
            <div key={c.label} className="flex items-start gap-3 rounded-md border border-border/60 p-3">
              {c.passed ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              )}
              <div className="min-w-0">
                <div className="text-sm font-medium">{c.label}</div>
                <div className="text-sm text-muted-foreground">{c.detail}</div>
              </div>
            </div>
          ))}
          {!priority.clear && (
            <p className="text-sm text-amber-400">
              New investment dollars are flagged as out of sequence until these are handled. This is guidance, not a lock — you can still record a contribution.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Where the next dollar goes</CardTitle>
          <CardDescription>Based on the largest underweight versus your own targets. Requires your approval — nothing is bought automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {nextDollar ? (
            <div className="rounded-lg border border-border/60 bg-background/40 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={ROLE_META[nextDollar.role].accent}>{nextDollar.role}</Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{nextDollar.ticker ?? 'Choose a holding for this role'}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{nextDollar.reason}</p>
              <p className="mt-1 text-sm">
                Gap to target: <strong>{money(nextDollar.dollarGap)}</strong> · current {pct(nextDollar.currentPct)} vs target {pct(nextDollar.targetPct, 0)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Set role targets and add positions to get a next-dollar suggestion.</p>
          )}

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <Label>Amount</Label>
              <Input type="number" step="10" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label>Funding source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FUNDING_SOURCES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Account</Label>
              <Select value={account} onValueChange={setAccount}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Note</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={!nextDollar || amount <= 0}>Approve and record contribution</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Record {money(amount)} to {nextDollar?.role}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Prism records this contribution against your plan. It does not place a trade, move money, or connect to your brokerage.
                  {!priority.clear && ' Your capital priority checks are not all clear — this will be logged as out of sequence.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    nextDollar &&
                    saveContribution.mutate({
                      role: nextDollar.role,
                      ticker: nextDollar.ticker,
                      amount,
                      funding_source: source,
                      account_type: account,
                      approved: true,
                      priority_clear: priority.clear,
                      notes: note || null,
                      contributed_on: new Date().toISOString().slice(0, 10),
                    })
                  }
                >
                  Record contribution
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {rows.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Holding</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Sequence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 12).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.contributed_on}</TableCell>
                    <TableCell>{r.role}</TableCell>
                    <TableCell>{r.ticker ?? '—'}</TableCell>
                    <TableCell>{FUNDING_SOURCES.find((f) => f.value === r.funding_source)?.label ?? r.funding_source}</TableCell>
                    <TableCell className="text-right">{money(Number(r.amount), 2)}</TableCell>
                    <TableCell>
                      {r.priority_clear ? <Badge variant="secondary">In sequence</Badge> : <Badge variant="outline" className="border-amber-500/40 text-amber-400">Out of sequence</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Rebalance with new money first</CardTitle>
          <CardDescription>Directing contributions to underweight roles avoids selling and the taxes selling can trigger.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {allocation.rows
              .slice()
              .sort((a, b) => a.driftPp - b.driftPp)
              .map((r) => (
                <li key={r.role} className="flex justify-between gap-4">
                  <span>
                    <Badge variant="outline" className={`mr-2 ${ROLE_META[r.role].accent}`}>{r.role}</Badge>
                    {r.state === 'underweight' ? 'Add here' : r.state === 'overweight' ? 'Pause new money' : 'On target'}
                  </span>
                  <span className="text-muted-foreground">{r.driftPp >= 0 ? '+' : ''}{r.driftPp.toFixed(1)} pp · {money(r.dollarGap)}</span>
                </li>
              ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
