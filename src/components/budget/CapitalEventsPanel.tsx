import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { AlertTriangle, ChevronDown, Coins, Plus, Trash2, Wallet } from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';
import {
  CAPITAL_DESTINATIONS,
  CAPITAL_EVENT_TYPES,
  FUNDING_SOURCES,
  summariseReserve,
  useCapitalEvents,
  useCreateCapitalEvent,
  useCreateReserveEntry,
  useReserveLedger,
  useSoftDeleteCapitalEvent,
  useSoftDeleteReserveEntry,
} from '@/hooks/use-capital-events';

const labelFor = (list: readonly { value: string; label: string }[], v: string) =>
  list.find(i => i.value === v)?.label ?? v;

export default function CapitalEventsPanel({ month }: { month?: string }) {
  const { formatCurrency } = useCurrency();
  const { data: events } = useCapitalEvents();
  const { data: ledger } = useReserveLedger();
  const createEvent = useCreateCapitalEvent();
  const deleteEvent = useSoftDeleteCapitalEvent();
  const createEntry = useCreateReserveEntry();
  const deleteEntry = useSoftDeleteReserveEntry();

  const reserve = useMemo(() => summariseReserve(ledger, month), [ledger, month]);
  const monthLabel = month
    ? new Date(`${month.slice(0, 7)}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : null;
  const miscounted = (events || []).filter(
    e => e.is_recurring || e.include_in_budget_pct || e.include_in_allocation_pct,
  );

  const [open, setOpen] = useState({ reserve: true, ledger: true, events: true });
  const toggle = (k: 'reserve' | 'ledger' | 'events') => setOpen(o => ({ ...o, [k]: !o[k] }));
  const Chevron = ({ section }: { section: 'reserve' | 'ledger' | 'events' }) => (
    <Button
      variant="ghost"
      size="icon"
      aria-label={open[section] ? 'Collapse section' : 'Expand section'}
      aria-expanded={open[section]}
      onClick={() => toggle(section)}
    >
      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open[section] ? '' : '-rotate-90'}`} />
    </Button>
  );

  const [showEvent, setShowEvent] = useState(false);
  const [ev, setEv] = useState({
    event_date: new Date().toISOString().slice(0, 10),
    event_type: 'stock_sale',
    source: '',
    description: '',
    gross_amount: '',
    cost_basis: '',
    destination: 'business_capital',
    tax_notes: '',
  });

  const [showSpend, setShowSpend] = useState(false);
  const [sp, setSp] = useState({
    entry_date: new Date().toISOString().slice(0, 10),
    description: '',
    expense_category: '',
    amount: '',
    funding_source: 'business_capital_reserve',
    notes: '',
  });

  const gain = useMemo(() => {
    const g = parseFloat(ev.gross_amount);
    const b = parseFloat(ev.cost_basis);
    if (!isFinite(g) || !isFinite(b)) return null;
    return g - b;
  }, [ev.gross_amount, ev.cost_basis]);

  const submitEvent = () => {
    const gross = parseFloat(ev.gross_amount) || 0;
    const basis = ev.cost_basis === '' ? null : parseFloat(ev.cost_basis);
    createEvent.mutate(
      {
        event_date: ev.event_date,
        event_type: ev.event_type,
        source: ev.source || null,
        description: ev.description,
        gross_amount: gross,
        cost_basis: basis,
        estimated_gain_loss: basis === null ? null : gross - basis,
        destination: ev.destination,
        tax_notes: ev.tax_notes || null,
        is_recurring: false,
        include_in_budget_pct: false,
        include_in_allocation_pct: false,
      },
      {
        onSuccess: () => {
          setShowEvent(false);
          setEv({ ...ev, description: '', gross_amount: '', cost_basis: '', tax_notes: '', source: '' });
        },
      },
    );
  };

  const submitSpend = () => {
    createEntry.mutate(
      {
        entry_date: sp.entry_date,
        direction: 'spent',
        description: sp.description,
        expense_category: sp.expense_category || null,
        amount: parseFloat(sp.amount) || 0,
        funding_source: sp.funding_source,
        notes: sp.notes || null,
      },
      {
        onSuccess: () => {
          setShowSpend(false);
          setSp({ ...sp, description: '', expense_category: '', amount: '', notes: '' });
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      {miscounted.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Capital event flagged as recurring income</AlertTitle>
          <AlertDescription>
            {miscounted.length} capital event{miscounted.length > 1 ? 's are' : ' is'} marked as recurring or
            included in budget percentages. Capital events are asset conversions, not earned income — they
            should stay out of the 45/10/25/20 allocation and monthly budget percentages.
          </AlertDescription>
        </Alert>
      )}

      {/* Reserve card */}
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <CardTitle>Business Capital Reserve</CardTitle>
            </div>
            <Chevron section="reserve" />
          </div>
          <CardDescription>
            {monthLabel ? `${monthLabel} activity. ` : ''}Tracked independently of monthly take-home pay.
            Expenses paid from this reserve are never deducted from the personal monthly budget.
          </CardDescription>
        </CardHeader>
        {open.reserve && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {monthLabel && (
              <div>
                <p className="text-xs text-muted-foreground">Carried in</p>
                <p className="font-display text-xl font-bold">{formatCurrency(reserve.carryIn)}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">
                {monthLabel ? 'Capital added this month' : 'Capital added (funding)'}
              </p>
              <p className="font-display text-xl font-bold">{formatCurrency(reserve.added)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{monthLabel ? 'Amount used this month' : 'Amount used'}</p>
              <p className="font-display text-xl font-bold text-destructive">{formatCurrency(reserve.spent)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Amount remaining</p>
              <p className="font-display text-xl font-bold text-primary">{formatCurrency(reserve.ending)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Percentage remaining</p>
              <p className="font-display text-xl font-bold">{reserve.pctRemaining.toFixed(1)}%</p>
            </div>
          </div>
          <Progress value={reserve.pctRemaining} />
          <p className="text-xs text-muted-foreground">
            Ending reserve = beginning reserve + capital added − business expenses paid from reserve.
            {monthLabel && reserve.added === 0 && reserve.spent === 0
              ? ` No reserve activity in ${monthLabel}.`
              : ''}
          </p>
        </CardContent>
        )}
      </Card>

      {/* Reserve ledger */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">Reserve ledger</CardTitle>
            <CardDescription>Every dollar in and out of the reserve, with its funding source.</CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={() => { setOpen(o => ({ ...o, ledger: true })); setShowSpend(v => !v); }}>
              <Plus className="mr-1 h-4 w-4" /> Record expense
            </Button>
            <Chevron section="ledger" />
          </div>
        </CardHeader>
        {open.ledger && (
        <CardContent className="space-y-4">
          {showSpend && (
            <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-3">
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" value={sp.entry_date} onChange={e => setSp({ ...sp, entry_date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Expense description</Label>
                <Input value={sp.description} onChange={e => setSp({ ...sp, description: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Expense category</Label>
                <Input value={sp.expense_category} onChange={e => setSp({ ...sp, expense_category: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Amount</Label>
                <Input type="number" step="0.01" value={sp.amount} onChange={e => setSp({ ...sp, amount: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Funding source</Label>
                <Select value={sp.funding_source} onValueChange={v => setSp({ ...sp, funding_source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FUNDING_SOURCES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Input value={sp.notes} onChange={e => setSp({ ...sp, notes: e.target.value })} />
              </div>
              <div className="md:col-span-3">
                {sp.funding_source !== 'business_capital_reserve' && (
                  <p className="mb-2 text-xs text-muted-foreground">
                    Only expenses funded by the Business Capital Reserve reduce the reserve balance. This one will be
                    logged for the audit trail with its own funding source.
                  </p>
                )}
                <Button size="sm" onClick={submitSpend} disabled={createEntry.isPending}>Save entry</Button>
              </div>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Funding source</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(ledger || []).length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No reserve activity yet.</TableCell></TableRow>
              )}
              {(ledger || []).map(r => (
                <TableRow key={r.id}>
                  <TableCell>{r.entry_date}</TableCell>
                  <TableCell>{r.description}</TableCell>
                  <TableCell>{r.expense_category || '—'}</TableCell>
                  <TableCell>{labelFor(FUNDING_SOURCES, r.funding_source)}</TableCell>
                  <TableCell className={`text-right font-medium ${r.direction === 'added' ? 'text-primary' : 'text-destructive'}`}>
                    {r.direction === 'added' ? '+' : '−'}{formatCurrency(Number(r.amount))}
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate text-muted-foreground">{r.notes || '—'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => deleteEntry.mutate(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        )}
      </Card>

      {/* Capital events history */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Capital events history</CardTitle>
            </div>
            <CardDescription>One-time funding events — excluded from recurring income and allocation percentages.</CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={() => { setOpen(o => ({ ...o, events: true })); setShowEvent(v => !v); }}>
              <Plus className="mr-1 h-4 w-4" /> Add event
            </Button>
            <Chevron section="events" />
          </div>
        </CardHeader>
        {open.events && (
        <CardContent className="space-y-4">
          {showEvent && (
            <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-3">
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" value={ev.event_date} onChange={e => setEv({ ...ev, event_date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Event type</Label>
                <Select value={ev.event_type} onValueChange={v => setEv({ ...ev, event_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAPITAL_EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Source</Label>
                <Input value={ev.source} onChange={e => setEv({ ...ev, source: e.target.value })} placeholder="Personal brokerage" />
              </div>
              <div className="space-y-1 md:col-span-3">
                <Label>Description</Label>
                <Input value={ev.description} onChange={e => setEv({ ...ev, description: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Gross proceeds</Label>
                <Input type="number" step="0.01" value={ev.gross_amount} onChange={e => setEv({ ...ev, gross_amount: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Cost basis (optional)</Label>
                <Input type="number" step="0.01" value={ev.cost_basis} onChange={e => setEv({ ...ev, cost_basis: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Destination</Label>
                <Select value={ev.destination} onValueChange={v => setEv({ ...ev, destination: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAPITAL_DESTINATIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 md:col-span-3">
                <Label>Tax notes</Label>
                <Textarea rows={2} value={ev.tax_notes} onChange={e => setEv({ ...ev, tax_notes: e.target.value })} />
              </div>
              <div className="md:col-span-3">
                {gain !== null && (
                  <p className="mb-2 text-xs text-muted-foreground">
                    Estimated gain/loss: <span className="font-medium">{formatCurrency(gain)}</span> — only the gain is
                    potentially taxable, not the full proceeds.
                  </p>
                )}
                <Button size="sm" onClick={submitEvent} disabled={createEvent.isPending}>Save event</Button>
              </div>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type / source</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Cost basis</TableHead>
                <TableHead className="text-right">Est. gain/loss</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Recurring</TableHead>
                <TableHead>Tax notes</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(events || []).length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No capital events recorded.</TableCell></TableRow>
              )}
              {(events || []).map(e => (
                <TableRow key={e.id}>
                  <TableCell>{e.event_date}</TableCell>
                  <TableCell>
                    <div className="font-medium">{labelFor(CAPITAL_EVENT_TYPES, e.event_type)}</div>
                    <div className="text-xs text-muted-foreground">{e.description || e.source || '—'}</div>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(e.gross_amount))}</TableCell>
                  <TableCell className="text-right">{e.cost_basis === null ? '—' : formatCurrency(Number(e.cost_basis))}</TableCell>
                  <TableCell className="text-right">
                    {e.estimated_gain_loss === null ? '—' : formatCurrency(Number(e.estimated_gain_loss))}
                  </TableCell>
                  <TableCell>{labelFor(CAPITAL_DESTINATIONS, e.destination)}</TableCell>
                  <TableCell>
                    <Badge variant={e.is_recurring ? 'destructive' : 'secondary'}>
                      {e.is_recurring ? 'Recurring' : 'One-time'}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate text-muted-foreground">{e.tax_notes || '—'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => deleteEvent.mutate(e.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">No double-counting</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
          <p><span className="font-medium text-foreground">Recurring monthly income:</span> take-home pay only — unchanged at $4,250.02.</p>
          <p><span className="font-medium text-foreground">One-time capital events:</span> {formatCurrency(reserve.added)} converted from personal assets.</p>
          <p><span className="font-medium text-foreground">Business Capital Reserve:</span> {formatCurrency(reserve.ending)} available for business costs.</p>
          <p><span className="font-medium text-foreground">Recurring business expenses:</span> tracked in the Business budget with their own funding source.</p>
        </CardContent>
      </Card>
    </div>
  );
}
