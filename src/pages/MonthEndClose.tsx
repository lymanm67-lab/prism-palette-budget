import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowRight, CheckCircle2, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { useMonthEndClose, monthStart } from '@/hooks/use-month-end-close';
import { ROLLOVER_RULES, type RolloverRule } from '@/lib/budget/rollover';
import { SWEEP_DESTINATIONS, type SweepMode } from '@/lib/budget/leftover';

const money = (n: number) =>
  (n ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

const monthLabel = (m: string) =>
  new Date(`${m}T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export default function MonthEndClose() {
  const [month, setMonth] = useState(() => monthStart(new Date()));
  const {
    rollover,
    closeSummary,
    checks,
    sweepRules,
    categories,
    history,
    closedRecord,
    bufferBalance,
    bufferTarget,
    updateCategory,
    saveRule,
    deleteRule,
    closeMonth,
    isLoading,
  } = useMonthEndClose(month);

  const [newRule, setNewRule] = useState<{ destination: string; mode: SweepMode; amount: string; cap: string }>({
    destination: 'buffer',
    mode: 'percent',
    amount: '100',
    cap: '',
  });

  const tiles = [
    { label: 'Leftover cash', value: closeSummary?.leftoverCash ?? 0, tone: 'text-prism-teal' },
    { label: 'Carried into next month', value: closeSummary?.totalRolledForward ?? 0, tone: 'text-primary' },
    { label: 'Moved to goals', value: closeSummary?.totalSwept ?? 0, tone: 'text-prism-amber' },
    { label: 'Still unassigned', value: closeSummary?.unassignedCash ?? 0, tone: 'text-muted-foreground' },
  ];

  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-4 py-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Month-end close &amp; rollover</h1>
          <p className="text-sm text-muted-foreground">
            Unused money from {monthLabel(month)} keeps a job: it carries forward, moves to a goal, or waits as
            unassigned cash.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="month"
            className="w-[160px]"
            value={month.slice(0, 7)}
            onChange={(e) => e.target.value && setMonth(`${e.target.value}-01`)}
          />
          <Button asChild variant="outline">
            <Link to="/budgets">Budgets</Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} className="glass-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{t.label}</p>
              <p className={`text-xl font-semibold ${t.tone}`}>{money(t.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="close">
        <TabsList className="flex-wrap">
          <TabsTrigger value="close">Close the month</TabsTrigger>
          <TabsTrigger value="categories">Rollover rules</TabsTrigger>
          <TabsTrigger value="sweep">Where leftovers go</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="close" className="space-y-4 pt-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">What happens to {monthLabel(month)}</CardTitle>
              <CardDescription>
                Income {money(closeSummary?.incomeReceived ?? 0)} minus spending {money(closeSummary?.actualSpending ?? 0)}{' '}
                and money already moved out {money(closeSummary?.actualTransfers ?? 0)}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {(closeSummary?.allocations ?? []).map((a) => (
                  <div key={a.destination} className="flex items-center justify-between rounded-md border p-3 text-sm">
                    <span className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      {a.destinationLabel}
                      {a.capped && <Badge variant="outline">capped</Badge>}
                    </span>
                    <span className="font-medium">{money(a.amount)}</span>
                  </div>
                ))}
                {!closeSummary?.allocations?.length && (
                  <p className="text-sm text-muted-foreground">
                    No destinations set yet — add them under “Where leftovers go”.
                  </p>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Emergency fund {money(bufferBalance ?? 0)} of {money(bufferTarget ?? 0)} — the buffer never gets more
                than it needs.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={() => closeMonth.mutate()} disabled={closeMonth.isPending || isLoading}>
                  {closedRecord ? 'Re-close month' : 'Close this month'}
                </Button>
                {closedRecord && <Badge variant="secondary">Closed {closedRecord.closed_at?.slice(0, 10)}</Badge>}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">Checks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {checks.map((c) => (
                <div key={c.id} className="flex items-start gap-2 text-sm">
                  {c.ok ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-prism-teal" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
                  )}
                  <div>
                    <p className="font-medium">{c.label}</p>
                    <p className="text-xs text-muted-foreground">{c.detail}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">Category by category</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Carried in</TableHead>
                    <TableHead className="text-right">Planned</TableHead>
                    <TableHead className="text-right">Spent</TableHead>
                    <TableHead className="text-right">Left</TableHead>
                    <TableHead className="text-right">Carries forward</TableHead>
                    <TableHead className="text-right">Swept</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rollover?.rows ?? []).map((r) => (
                    <TableRow key={r.categoryId}>
                      <TableCell>{r.name}</TableCell>
                      <TableCell className="text-right">{money(r.beginningRollover)}</TableCell>
                      <TableCell className="text-right">{money(r.planned)}</TableCell>
                      <TableCell className="text-right">{money(r.actual)}</TableCell>
                      <TableCell className={`text-right ${r.endingBalance < 0 ? 'text-destructive' : ''}`}>
                        {money(r.endingBalance)}
                      </TableCell>
                      <TableCell className="text-right">{money(r.rolledForward)}</TableCell>
                      <TableCell className="text-right">{money(r.sweptAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="pt-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">What each category does with unused money</CardTitle>
              <CardDescription>
                {ROLLOVER_RULES.map((r) => `${r.label}: ${r.help}`).join(' ')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {categories.map((c) => (
                <div key={c.id} className="grid items-center gap-2 rounded-md border p-3 md:grid-cols-4">
                  <span className="text-sm font-medium">{c.name}</span>
                  <Select
                    value={c.rollover_rule ?? 'reset'}
                    onValueChange={(v) => updateCategory.mutate({ id: c.id, rollover_rule: v as RolloverRule })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLLOVER_RULES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Keep amount"
                    defaultValue={Number(c.rollover_keep_amount) || ''}
                    disabled={c.rollover_rule !== 'hybrid'}
                    onBlur={(e) =>
                      updateCategory.mutate({ id: c.id, rollover_keep_amount: Number(e.target.value) || 0 })
                    }
                  />
                  <Select
                    value={c.sweep_destination ?? 'buffer'}
                    onValueChange={(v) => updateCategory.mutate({ id: c.id, sweep_destination: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sweep to" />
                    </SelectTrigger>
                    <SelectContent>
                      {SWEEP_DESTINATIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sweep" className="space-y-4 pt-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">Leftover cash order</CardTitle>
              <CardDescription>Money is assigned top to bottom until it runs out.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sweepRules.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-md border p-3 text-sm">
                  <Badge variant="outline">#{r.priority}</Badge>
                  <span className="flex-1 font-medium">
                    {SWEEP_DESTINATIONS.find((d) => d.value === r.destination)?.label ?? r.destination}
                  </span>
                  <span className="text-muted-foreground">
                    {r.mode === 'fixed' ? money(r.amount) : r.mode === 'percent' ? `${r.amount}%` : 'whatever is left'}
                    {r.capAmount ? ` (max ${money(r.capAmount)})` : ''}
                  </span>
                  <Switch
                    checked={r.isActive !== false}
                    onCheckedChange={(v) => saveRule.mutate({ ...r, isActive: v })}
                  />
                  <Button variant="ghost" size="icon" onClick={() => r.id && deleteRule.mutate(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {!sweepRules.length && <p className="text-sm text-muted-foreground">No rules yet.</p>}

              <div className="grid gap-2 rounded-md border border-dashed p-3 md:grid-cols-5">
                <Select value={newRule.destination} onValueChange={(v) => setNewRule({ ...newRule, destination: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SWEEP_DESTINATIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={newRule.mode}
                  onValueChange={(v) => setNewRule({ ...newRule, mode: v as SweepMode })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percent</SelectItem>
                    <SelectItem value="fixed">Fixed amount</SelectItem>
                    <SelectItem value="remainder">Whatever is left</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Amount"
                  value={newRule.amount}
                  onChange={(e) => setNewRule({ ...newRule, amount: e.target.value })}
                  disabled={newRule.mode === 'remainder'}
                />
                <Input
                  type="number"
                  placeholder="Max (optional)"
                  value={newRule.cap}
                  onChange={(e) => setNewRule({ ...newRule, cap: e.target.value })}
                />
                <Button
                  onClick={() =>
                    saveRule.mutate({
                      priority: (sweepRules.at(-1)?.priority ?? 0) + 1,
                      destination: newRule.destination,
                      mode: newRule.mode,
                      amount: Number(newRule.amount) || 0,
                      capAmount: newRule.cap ? Number(newRule.cap) : null,
                    })
                  }
                >
                  <Plus className="mr-1 h-4 w-4" /> Add
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="pt-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">Where past leftovers went</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(history as any[]).map((h) => (
                    <TableRow key={h.id}>
                      <TableCell>{monthLabel(h.month)}</TableCell>
                      <TableCell>{h.destination_label ?? h.destination}</TableCell>
                      <TableCell className="text-right">{money(Number(h.amount))}</TableCell>
                    </TableRow>
                  ))}
                  {!history.length && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-sm text-muted-foreground">
                        Close a month to start the history.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
