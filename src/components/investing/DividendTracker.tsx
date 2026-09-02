import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Download, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useInvDividends,
  useSaveDividend,
  useDeleteDividend,
  useRolePositions,
  INCOME_TYPES,
} from '@/hooks/use-investing';
import { ROLE_META, ROLES, money, ACCOUNT_TYPES, type InvestmentRole } from '@/lib/investing/roles';

const today = () => new Date().toISOString().slice(0, 10);

export function DividendTracker() {
  const { data: dividends = [] } = useInvDividends();
  const { data: positions = [] } = useRolePositions();
  const save = useSaveDividend();
  const remove = useDeleteDividend();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    position_id: '',
    ticker: '',
    pay_date: today(),
    amount: '',
    income_type: 'dividend',
    account_type: 'taxable',
    notes: '',
  });
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const years = useMemo(() => {
    const set = new Set(dividends.map((d) => d.pay_date.slice(0, 4)));
    set.add(String(new Date().getFullYear()));
    return [...set].sort().reverse();
  }, [dividends]);

  const yearRows = dividends.filter((d) => d.pay_date.startsWith(year));

  const byTicker = useMemo(() => {
    const map = new Map<string, number>();
    yearRows.forEach((d) => map.set(d.ticker.toUpperCase(), (map.get(d.ticker.toUpperCase()) ?? 0) + Number(d.amount || 0)));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [yearRows]);

  const byRole = useMemo(() => {
    const roleOf = (ticker: string, positionId: string | null): InvestmentRole | null => {
      const p = positions.find((x) => x.id === positionId) ?? positions.find((x) => x.ticker.toUpperCase() === ticker.toUpperCase());
      return (p?.role as InvestmentRole) ?? null;
    };
    return ROLES.map((role) => ({
      role,
      total: yearRows
        .filter((d) => roleOf(d.ticker, d.position_id) === role)
        .reduce((s, d) => s + Number(d.amount || 0), 0),
    }));
  }, [yearRows, positions]);

  const total = yearRows.reduce((s, d) => s + Number(d.amount || 0), 0);
  const unmatched = yearRows.filter(
    (d) => !d.position_id && !positions.some((p) => p.ticker.toUpperCase() === d.ticker.toUpperCase()),
  ).length;

  const submit = async () => {
    const amount = Number(form.amount);
    const ticker = form.ticker.trim().toUpperCase();
    if (!ticker || !Number.isFinite(amount) || amount === 0) {
      toast.error('Enter a ticker and a non-zero amount.');
      return;
    }
    await save.mutateAsync({
      position_id: form.position_id || null,
      ticker,
      pay_date: form.pay_date,
      amount,
      income_type: form.income_type,
      account_type: form.account_type,
      notes: form.notes.trim() || null,
      source: 'manual',
    });
    setForm({ ...form, ticker: '', amount: '', notes: '', position_id: '' });
    setOpen(false);
  };

  const download = () => {
    const head = ['Pay date', 'Ticker', 'Amount', 'Income type', 'Account', 'Notes'];
    const lines = [head.join(',')].concat(
      yearRows.map((d) =>
        [d.pay_date, d.ticker, Number(d.amount).toFixed(2), d.income_type, d.account_type ?? '', `"${(d.notes ?? '').replace(/"/g, '""')}"`].join(','),
      ),
    );
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prism-investment-income-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onPickPosition = (id: string) => {
    const p = positions.find((x) => x.id === id);
    setForm((f) => ({
      ...f,
      position_id: id,
      ticker: p?.ticker ?? f.ticker,
      account_type: p?.account_type ?? f.account_type,
    }));
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Dividends &amp; income</CardTitle>
            <CardDescription>
              Record each payment you receive. The "Dividends received YTD" figure on a position is derived from these entries for the
              current year, so you never have to keep a running total by hand.
            </CardDescription>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={download} disabled={yearRows.length === 0}>
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Record income</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record a payment</DialogTitle>
                  <DialogDescription>Dividends, interest and capital gain distributions received.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Position (optional)</Label>
                    <Select value={form.position_id} onValueChange={onPickPosition}>
                      <SelectTrigger><SelectValue placeholder="Pick a role position" /></SelectTrigger>
                      <SelectContent>
                        {positions.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.ticker} — {p.role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="div-ticker">Ticker</Label>
                    <Input id="div-ticker" value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value })} placeholder="SPMO" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="div-date">Pay date</Label>
                    <Input id="div-date" type="date" value={form.pay_date} onChange={(e) => setForm({ ...form, pay_date: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="div-amount">Amount</Label>
                    <Input id="div-amount" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="12.47" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Income type</Label>
                    <Select value={form.income_type} onValueChange={(v) => setForm({ ...form, income_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {INCOME_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Account</Label>
                    <Select value={form.account_type} onValueChange={(v) => setForm({ ...form, account_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ACCOUNT_TYPES.map((a: any) => (
                          <SelectItem key={a.value ?? a} value={a.value ?? a}>{a.label ?? a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="div-notes">Notes</Label>
                    <Input id="div-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={submit} disabled={save.isPending}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border/60 bg-background/40 p-3">
            <div className="text-xs text-muted-foreground">Total income {year}</div>
            <div className="text-lg font-semibold">{money(total, 2)}</div>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/40 p-3">
            <div className="text-xs text-muted-foreground">Payments recorded</div>
            <div className="text-lg font-semibold">{yearRows.length}</div>
            {unmatched > 0 && <div className="mt-0.5 text-xs text-amber-400">{unmatched} not matched to a position</div>}
          </div>
          <div className="rounded-lg border border-border/60 bg-background/40 p-3 sm:col-span-2">
            <div className="text-xs text-muted-foreground">By role</div>
            <div className="mt-1 flex flex-wrap gap-2">
              {byRole.map((r) => (
                <Badge key={r.role} variant="outline" className={ROLE_META[r.role].accent}>
                  {r.role} {money(r.total, 2)}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 bg-card/60 backdrop-blur lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Payments</CardTitle>
            <CardDescription>Every recorded payment for {year}.</CardDescription>
          </CardHeader>
          <CardContent>
            {yearRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments recorded for {year} yet.</p>
            ) : (
              <div className="max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pay date</TableHead>
                      <TableHead>Ticker</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {yearRows.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>{d.pay_date}</TableCell>
                        <TableCell className="font-medium">{d.ticker}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {INCOME_TYPES.find((t) => t.value === d.income_type)?.label ?? d.income_type}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{d.account_type ?? '—'}</TableCell>
                        <TableCell className="text-right">{money(Number(d.amount), 2)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => remove.mutate(d.id)} aria-label={`Remove ${d.ticker} payment`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Income by holding</CardTitle>
            <CardDescription>{year} totals per ticker.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {byTicker.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing yet.</p>
            ) : (
              byTicker.map(([ticker, amount]) => (
                <div key={ticker} className="flex items-center justify-between rounded-md border border-border/60 bg-background/40 px-3 py-2 text-sm">
                  <span className="font-medium">{ticker}</span>
                  <span>{money(amount, 2)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Recorded income is for your own tracking and tax preparation. Prism does not receive brokerage tax forms and this is not tax advice.
      </p>
    </div>
  );
}
