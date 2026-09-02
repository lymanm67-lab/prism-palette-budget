import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, RefreshCw, Trash2, Pencil, ShieldAlert, Download } from 'lucide-react';
import {
  ACCOUNT_TYPES,
  CATALYST_CATEGORIES,
  DEFAULT_ROLE_POSITION_CAP,
  POSITION_STATUSES,
  ROLES,
  ROLE_META,
  SECURITY_TYPES,
  money,
  pct,
  positionGain,
  positionValue,
  securityTypeLabel,
  type InvestmentRole,
} from '@/lib/investing/roles';
import { useDeletePosition, useMarketLookup, useSavePosition, type RolePosition } from '@/hooks/use-investing';
import { CostBasisImport } from '@/components/investing/CostBasisImport';
import { useInvestingMetrics } from '@/hooks/use-investing-metrics';

const STARTER: Array<Partial<RolePosition>> = [
  { role: 'CORE', ticker: 'SPMO', account_type: 'sofi_investments' },
  { role: 'MOMENTUM', ticker: 'DRAM', account_type: 'sofi_investments' },
  { role: 'GUARDRAIL', ticker: 'ISU', account_type: 'sofi_investments' },
  { role: 'CONVICTION', ticker: 'QTUM', account_type: 'sofi_investments' },
  { role: 'CONVICTION', ticker: 'LYTE', account_type: 'sofi_investments' },
  { role: 'CATALYST', ticker: 'ITA', account_type: 'sofi_investments' },
];

function emptyPosition(role: InvestmentRole): Partial<RolePosition> {
  return {
    role,
    ticker: '',
    name: '',
    security_type: 'unverified',
    verified: false,
    account_type: 'sofi_investments',
    shares: 0,
    current_price: null,
    cost_basis: 0,
    status: 'hold',
    thesis_state: 'intact',
    dividend_instruction: 'reinvest',
  };
}

export function PositionDialog({
  position,
  role,
  trigger,
}: {
  position?: RolePosition;
  role?: InvestmentRole;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<RolePosition>>(position ?? emptyPosition(role ?? 'CORE'));
  const [autoFilled, setAutoFilled] = useState<string[]>([]);
  const lastLookedUp = useRef<string>(position?.ticker ?? '');
  const save = useSavePosition();
  const { quote, holdings } = useMarketLookup();

  const set = (patch: Partial<RolePosition>) => setDraft((d) => ({ ...d, ...patch }));
  const isTactical = draft.role === 'CONVICTION' || draft.role === 'CATALYST';

  // Dividends received this year, derived from recorded payments for this ticker.
  const { data: dividendRows = [] } = useInvDividends();
  const currentYear = String(new Date().getFullYear());
  const recordedDividendYtd = dividendRows
    .filter(
      (d) =>
        d.pay_date.startsWith(currentYear) &&
        (d.position_id === position?.id || d.ticker.toUpperCase() === (draft.ticker ?? '').trim().toUpperCase()),
    )
    .reduce((s, d) => s + Number(d.amount || 0), 0);

  const lookup = async (rawTicker?: string) => {
    const ticker = (rawTicker ?? draft.ticker ?? '').trim().toUpperCase();
    if (!ticker) return;
    lastLookedUp.current = ticker;
    const result = await quote.mutateAsync(ticker);
    const filled: string[] = [];

    setDraft((d) => {
      const patch: Partial<RolePosition> = {
        ticker: result.symbol,
        security_type: result.securityType,
        verified: result.verified,
        price_updated_at: new Date().toISOString(),
      };

      if (result.name && !d.name) {
        patch.name = result.name;
        filled.push('security name');
      }
      if (result.price != null) {
        patch.current_price = result.price;
        filled.push('current price');
      }

      const price = result.price ?? d.current_price ?? 0;
      const shares = Number(d.shares ?? 0);
      if (!d.cost_basis && price > 0 && shares > 0) {
        patch.cost_basis = Number((price * shares).toFixed(2));
        filled.push('cost basis (shares × price — edit to your actual basis)');
      }
      if (!d.entry_date) {
        patch.entry_date = new Date().toISOString().slice(0, 10);
        filled.push('entry date (today)');
      }
      const roleForCap = (d.role ?? 'CORE') as InvestmentRole;
      if (d.max_pct == null) {
        patch.max_pct = DEFAULT_ROLE_POSITION_CAP[roleForCap];
        filled.push(`position cap (${roleForCap} default)`);
      }
      const value = price * shares;
      if (!d.dividend_income_ytd && result.dividendYield != null && result.dividendYield > 0 && value > 0) {
        const monthsElapsed = new Date().getMonth() + 1;
        patch.dividend_income_ytd = Number(((value * (result.dividendYield / 100)) * (monthsElapsed / 12)).toFixed(2));
        filled.push('dividends YTD (estimated from yield)');
      }

      return { ...d, ...patch };
    });

    setAutoFilled(filled);
    if (result.securityType === 'etf') holdings.mutate(result.symbol);
  };

  // Auto-fill shortly after a ticker is typed, without needing the refresh button.
  useEffect(() => {
    const ticker = (draft.ticker ?? '').trim().toUpperCase();
    if (!open || ticker.length < 2 || ticker === lastLookedUp.current || quote.isPending) return;
    const t = setTimeout(() => { void lookup(ticker); }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.ticker, open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{position ? `Edit ${position.ticker}` : 'Add a position'}</DialogTitle>
          <DialogDescription>Every investment must have a job. Assign its role, account, and — for tactical roles — a written thesis.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Role</Label>
            <Select value={draft.role} onValueChange={(v) => set({ role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{r} — {ROLE_META[r].purpose}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Account</Label>
            <Select value={draft.account_type} onValueChange={(v) => set({ account_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {ACCOUNT_TYPES.find((a) => a.value === draft.account_type)?.tax}
            </p>
          </div>

          <div className="space-y-1">
            <Label>Ticker</Label>
            <div className="flex gap-2">
              <Input value={draft.ticker ?? ''} onChange={(e) => set({ ticker: e.target.value.toUpperCase() })} placeholder="SPMO" />
              <Button type="button" variant="outline" size="icon" onClick={() => void lookup()} disabled={quote.isPending} aria-label="Look up security">
                <RefreshCw className={`h-4 w-4 ${quote.isPending ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {quote.isPending
                ? 'Looking up security…'
                : autoFilled.length > 0
                  ? `Auto-filled: ${autoFilled.join(', ')}.`
                  : 'Type a ticker — Prism fills in the details automatically.'}
            </p>
          </div>
          <div className="space-y-1">
            <Label>Security name</Label>
            <Input value={draft.name ?? ''} onChange={(e) => set({ name: e.target.value })} />
          </div>

          <div className="space-y-1">
            <Label>Security type</Label>
            <Select value={draft.security_type} onValueChange={(v) => set({ security_type: v, verified: v !== 'unverified' })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SECURITY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={draft.status} onValueChange={(v) => set({ status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {POSITION_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Shares</Label>
            <Input type="number" step="0.0001" value={draft.shares ?? 0} onChange={(e) => set({ shares: Number(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <Label>Current price</Label>
            <Input type="number" step="0.01" value={draft.current_price ?? ''} onChange={(e) => set({ current_price: Number(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <Label>Cost basis (total)</Label>
            <Input type="number" step="0.01" value={draft.cost_basis ?? 0} onChange={(e) => set({ cost_basis: Number(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <Label>Entry date</Label>
            <Input type="date" value={draft.entry_date ?? ''} onChange={(e) => set({ entry_date: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Dividends received YTD</Label>
            <Input type="number" step="0.01" value={draft.dividend_income_ytd ?? 0} onChange={(e) => set({ dividend_income_ytd: Number(e.target.value) })} />
            {recordedDividendYtd > 0 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Recorded payments: {money(recordedDividendYtd, 2)}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2"
                  onClick={() => set({ dividend_income_ytd: recordedDividendYtd })}
                >
                  Use recorded
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label>Position cap (% of portfolio)</Label>
            <Input type="number" step="0.1" value={draft.max_pct ?? ''} onChange={(e) => set({ max_pct: Number(e.target.value) })} />
          </div>

          {isTactical && (
            <>
              <div className="space-y-1 sm:col-span-2">
                <Label>{draft.role === 'CATALYST' ? 'Catalyst' : 'Thesis'}</Label>
                <Textarea
                  rows={2}
                  value={(draft.role === 'CATALYST' ? draft.catalyst : draft.thesis) ?? ''}
                  onChange={(e) => set(draft.role === 'CATALYST' ? { catalyst: e.target.value } : { thesis: e.target.value })}
                  placeholder={draft.role === 'CATALYST' ? 'What identifiable development drives this?' : 'Why do you own this? What did your research find?'}
                />
              </div>
              {draft.role === 'CATALYST' && (
                <div className="space-y-1">
                  <Label>Catalyst category</Label>
                  <Select value={draft.catalyst_category ?? ''} onValueChange={(v) => set({ catalyst_category: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {CATALYST_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1">
                <Label>Expected holding period</Label>
                <Input value={draft.expected_holding_period ?? ''} onChange={(e) => set({ expected_holding_period: e.target.value })} placeholder="3–5 years" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>What would prove this wrong</Label>
                <Textarea rows={2} value={draft.invalidation ?? ''} onChange={(e) => set({ invalidation: e.target.value })} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Exit criteria</Label>
                <Textarea rows={2} value={draft.exit_criteria ?? ''} onChange={(e) => set({ exit_criteria: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Risk level</Label>
                <Select value={draft.risk_level ?? ''} onValueChange={(v) => set({ risk_level: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="speculative">Speculative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Next review date</Label>
                <Input type="date" value={draft.review_date ?? ''} onChange={(e) => set({ review_date: e.target.value })} />
              </div>
            </>
          )}

          <div className="space-y-1 sm:col-span-2">
            <Label>Notes</Label>
            <Textarea rows={2} value={draft.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={async () => {
              await save.mutateAsync({ ...draft, id: position?.id });
              setOpen(false);
            }}
            disabled={!draft.ticker || save.isPending}
          >
            Save position
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RolesBoard() {
  const { allocation, positions, totals } = useInvestingMetrics();
  const save = useSavePosition();
  const remove = useDeletePosition();

  const seed = async () => {
    for (const s of STARTER) {
      if (positions.some((p) => p.ticker === s.ticker)) continue;
      await save.mutateAsync({ ...emptyPosition(s.role as InvestmentRole), ...s });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Five Investment Roles</h2>
          <p className="text-sm text-muted-foreground">Every investment must have a job. Portfolio value {money(totals.value)}.</p>
        </div>
        <div className="flex gap-2">
          {positions.length === 0 && (
            <Button variant="outline" onClick={seed} disabled={save.isPending}>
              <Download className="mr-2 h-4 w-4" /> Load my current holdings
            </Button>
          )}
          <CostBasisImport />
          <PositionDialog trigger={<Button><Plus className="mr-2 h-4 w-4" /> Add position</Button>} />

        </div>
      </div>

      {allocation.rows.map((row) => {
        const meta = ROLE_META[row.role];
        return (
          <Card key={row.role} className="border-border/60 bg-card/60 backdrop-blur">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={meta.accent}>{row.role}</Badge>
                    <CardTitle className="text-base">{meta.purpose}</CardTitle>
                  </div>
                  <CardDescription>{meta.job}</CardDescription>
                </div>
                <div className="text-right text-sm">
                  <div className="font-semibold">{money(row.value)}</div>
                  <div className="text-muted-foreground">
                    {pct(row.currentPct)} now vs {pct(row.targetPct, 0)} target
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {row.positions.length === 0 ? (
                <div className="flex items-center justify-between rounded-md border border-dashed border-border/60 p-3 text-sm text-muted-foreground">
                  <span>No position assigned to this role yet.</span>
                  <PositionDialog role={row.role} trigger={<Button size="sm" variant="ghost"><Plus className="mr-1 h-3.5 w-3.5" /> Assign</Button>} />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Holding</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right">Gain/loss</TableHead>
                      <TableHead className="text-right">% of portfolio</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {row.positions.map((p) => {
                      const value = positionValue(p);
                      const gain = positionGain(p);
                      const position = p as RolePosition;
                      return (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div className="font-medium">{p.ticker}</div>
                            <div className="text-xs text-muted-foreground">{p.name || '—'}</div>
                          </TableCell>
                          <TableCell>
                            {position.verified ? (
                              <Badge variant="secondary">{securityTypeLabel(p.security_type)}</Badge>
                            ) : (
                              <Badge variant="outline" className="border-amber-500/40 text-amber-400">
                                <ShieldAlert className="mr-1 h-3 w-3" /> Instrument requires verification
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{money(value, 2)}</TableCell>
                          <TableCell className={`text-right ${gain >= 0 ? 'text-emerald-400' : 'text-destructive'}`}>{money(gain, 2)}</TableCell>
                          <TableCell className="text-right">{pct(totals.value > 0 ? (value / totals.value) * 100 : 0)}</TableCell>
                          <TableCell className="capitalize">{POSITION_STATUSES.find((s) => s.value === p.status)?.label ?? p.status}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <PositionDialog position={position} trigger={<Button size="icon" variant="ghost" aria-label="Edit position"><Pencil className="h-3.5 w-3.5" /></Button>} />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="icon" variant="ghost" aria-label="Remove position"><Trash2 className="h-3.5 w-3.5" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove {p.ticker} from this role?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This removes the role assignment and its records from your strategy view. No trade is placed.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => remove.mutate(p.id)}>Remove</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
