import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Coins, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import PageOverview from '@/components/PageOverview';
import { useCurrency } from '@/hooks/use-currency';
import {
  CAPITAL_DESTINATIONS,
  CAPITAL_EVENT_TYPES,
  FUNDING_SOURCES,
  useCapitalEvents,
  useReserveLedger,
} from '@/hooks/use-capital-events';

const labelFor = (list: readonly { value: string; label: string }[], v: string) =>
  list.find(i => i.value === v)?.label ?? v;

const monthLabel = (key: string) =>
  new Date(`${key}-01T00:00:00`).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });

export default function CapitalEventsReport() {
  const { formatCurrency } = useCurrency();
  const { data: events } = useCapitalEvents();
  const { data: ledger } = useReserveLedger();

  const rows = ledger || [];
  const evs = events || [];

  const totals = useMemo(() => {
    const gross = evs.reduce((s, e) => s + Number(e.gross_amount), 0);
    const basis = evs.reduce((s, e) => s + Number(e.cost_basis || 0), 0);
    const gain = evs.reduce(
      (s, e) => s + Number(e.estimated_gain_loss ?? (e.cost_basis == null ? 0 : e.gross_amount - e.cost_basis)),
      0,
    );
    const added = rows.filter(r => r.direction === 'added').reduce((s, r) => s + Number(r.amount), 0);
    const spent = rows.filter(r => r.direction === 'spent').reduce((s, r) => s + Number(r.amount), 0);
    return { gross, basis, gain, added, spent, balance: added - spent };
  }, [evs, rows]);

  /** Month-by-month reserve cash flow with running balance. */
  const series = useMemo(() => {
    const map = new Map<string, { added: number; spent: number }>();
    rows.forEach(r => {
      const key = r.entry_date.slice(0, 7);
      const cur = map.get(key) || { added: 0, spent: 0 };
      if (r.direction === 'added') cur.added += Number(r.amount);
      else cur.spent += Number(r.amount);
      map.set(key, cur);
    });
    let running = 0;
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, v]) => {
        running += v.added - v.spent;
        return {
          month: monthLabel(key),
          added: Number(v.added.toFixed(2)),
          used: Number(-v.spent.toFixed(2)),
          balance: Number(running.toFixed(2)),
        };
      });
  }, [rows]);

  /** Spend grouped by funding source. */
  const bySource = useMemo(() => {
    const map = new Map<string, number>();
    rows.filter(r => r.direction === 'spent').forEach(r => {
      map.set(r.funding_source, (map.get(r.funding_source) || 0) + Number(r.amount));
    });
    return [...map.entries()]
      .map(([source, amount]) => ({ source: labelFor(FUNDING_SOURCES, source), amount: Number(amount.toFixed(2)) }))
      .sort((a, b) => b.amount - a.amount);
  }, [rows]);

  const stats = [
    { label: 'Capital raised (gross)', value: totals.gross, icon: Coins, tone: 'text-foreground' },
    { label: 'Cost basis', value: totals.basis, icon: TrendingDown, tone: 'text-muted-foreground' },
    { label: 'Estimated gain / loss', value: totals.gain, icon: TrendingUp, tone: totals.gain >= 0 ? 'text-primary' : 'text-destructive' },
    { label: 'Reserve balance', value: totals.balance, icon: Wallet, tone: 'text-primary' },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Capital Events Report</h1>
        <p className="text-muted-foreground">
          One-time asset conversions and the Business Capital Reserve they fund — kept out of recurring
          take-home pay and the 45/10/25/20 allocation.
        </p>
      </div>

      <PageOverview
        pageKey="capital-events-report"
        title="How to read this report"
        bullets={[
          'Every capital event shows its gross proceeds, cost basis and estimated gain or loss.',
          'The reserve cash flow graph tracks money added versus business expenses paid from the reserve.',
          'Reserve spending never reduces your monthly personal budget — it draws from the reserve balance.',
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(s => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <s.icon className="h-4 w-4" /> {s.label}
              </div>
              <p className={`font-display text-2xl font-bold ${s.tone}`}>{formatCurrency(s.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reserve cash flow</CardTitle>
          <CardDescription>Running reserve balance after each month of funding and spending.</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          {series.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reserve activity recorded yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="reserveFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  formatter={(v: number) => formatCurrency(Number(v))}
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="balance"
                  name="Reserve balance"
                  stroke="hsl(var(--primary))"
                  fill="url(#reserveFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funding in vs. spending out</CardTitle>
            <CardDescription>Capital added and business expenses paid from the reserve, by month.</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {series.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reserve activity recorded yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    formatter={(v: number) => formatCurrency(Math.abs(Number(v)))}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend />
                  <Bar dataKey="added" name="Capital added" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="used" name="Paid from reserve" fill="hsl(var(--destructive))" radius={[0, 0, 4, 4]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spending by funding source</CardTitle>
            <CardDescription>Which pocket actually paid each business expense.</CardDescription>
          </CardHeader>
          <CardContent>
            {bySource.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing spent yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funding source</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bySource.map(r => (
                    <TableRow key={r.source}>
                      <TableCell>{r.source}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(r.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Capital events</CardTitle>
          <CardDescription>Gross proceeds, cost basis, estimated gain or loss and where the money went.</CardDescription>
        </CardHeader>
        <CardContent>
          {evs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No capital events recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Cost basis</TableHead>
                    <TableHead className="text-right">Gain / loss</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evs.map(e => {
                    const gain = e.estimated_gain_loss ?? (e.cost_basis == null ? null : e.gross_amount - e.cost_basis);
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="whitespace-nowrap">{e.event_date}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{labelFor(CAPITAL_EVENT_TYPES, e.event_type)}</Badge>
                        </TableCell>
                        <TableCell>
                          {e.description}
                          {e.source && <span className="block text-xs text-muted-foreground">{e.source}</span>}
                        </TableCell>
                        <TableCell>{labelFor(CAPITAL_DESTINATIONS, e.destination)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(Number(e.gross_amount))}</TableCell>
                        <TableCell className="text-right">
                          {e.cost_basis == null ? '—' : formatCurrency(Number(e.cost_basis))}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${
                            gain == null ? '' : gain >= 0 ? 'text-primary' : 'text-destructive'
                          }`}
                        >
                          {gain == null ? '—' : formatCurrency(Number(gain))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reserve ledger detail</CardTitle>
          <CardDescription>Every dollar in and out, with its funding source.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entries yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Funding source</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">{r.entry_date}</TableCell>
                      <TableCell>{r.description}</TableCell>
                      <TableCell>{r.expense_category || '—'}</TableCell>
                      <TableCell>{labelFor(FUNDING_SOURCES, r.funding_source)}</TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          r.direction === 'added' ? 'text-primary' : 'text-destructive'
                        }`}
                      >
                        {r.direction === 'added' ? '+' : '−'}
                        {formatCurrency(Number(r.amount))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
