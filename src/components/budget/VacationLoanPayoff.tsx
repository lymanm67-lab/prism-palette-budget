import { useEffect, useState } from 'react';
import { ChevronDown, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  DEFAULT_STATE, LOAN_2306, LOAN_3006, monthly3006, plan2306, schedule3006,
  type Loan2306State, type Loan3006State, type PaymentStatus,
} from '@/lib/budgeting/vacationLoanPayoff';

type State = { l2306: Loan2306State; l3006: Loan3006State };
const key = (h: string) => `vacation-loan-payoff:${h}`;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}

export function VacationLoanPayoff({ householdId }: { householdId: string }) {
  const { formatCurrency: f } = useCurrency();
  const [open, setOpen] = useState(false);
  const [s, setS] = useState<State>(() => {
    try { const raw = localStorage.getItem(key(householdId)); if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) }; } catch { /* ignore */ }
    return DEFAULT_STATE;
  });
  useEffect(() => { localStorage.setItem(key(householdId), JSON.stringify(s)); }, [s, householdId]);

  const set2306 = (p: Partial<Loan2306State>) => setS(v => ({ ...v, l2306: { ...v.l2306, ...p } }));
  const set3006 = (p: Partial<Loan3006State>) => setS(v => ({ ...v, l3006: { ...v.l3006, ...p } }));
  const num = (v: string) => (v === '' ? null : Number(v));

  const p = plan2306(s.l2306);
  const paid2306 = s.l2306.lenderZero;
  const sch = schedule3006(s.l3006, paid2306);
  const src = LOAN_3006.sources;

  return (
    <section className="space-y-3 border-b py-4" aria-label="Vacation loan payoff">
      <button type="button" aria-expanded={open} aria-controls="vlp-panel" onClick={() => setOpen(o => !o)} className="flex w-full items-center gap-2 text-left">
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? '' : '-rotate-90'}`} />
        <h2 className="text-lg font-semibold">Vacation Loan Payoff</h2>
        <span className="ml-auto text-xs text-muted-foreground">35.99% APR · 2306 → 3006</span>
      </button>
      {open && (
        <div id="vlp-panel" className="grid gap-4 lg:grid-cols-2">
          {/* Loan 2306 */}
          <div className="space-y-3 rounded-lg border bg-card/60 p-4 backdrop-blur">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Loan 2306</h3>
              {paid2306 ? <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />Paid Off</Badge> : <Badge variant="secondary">Target Nov 30, 2026</Badge>}
            </div>
            <dl className="space-y-1 text-sm tabular-nums">
              <div className="flex justify-between"><dt>IUCU (incl. $0.20 shortfall)</dt><dd>{f(LOAN_2306.iucu)}</dd></div>
              <div className="flex justify-between"><dt>MyUSA</dt><dd>{f(LOAN_2306.myusa)}</dd></div>
              <div className="flex justify-between border-t pt-1 font-medium"><dt>Planned funding</dt><dd>{f(LOAN_2306.balance)}</dd></div>
            </dl>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Balance"><Input type="number" step="0.01" value={s.l2306.balance} onChange={e => set2306({ balance: Number(e.target.value) })} /></Field>
              <Field label="Balance as-of"><Input type="date" value={s.l2306.asOf} onChange={e => set2306({ asOf: e.target.value })} /></Field>
              <Field label="IUCU posting date"><Input type="date" value={s.l2306.iucuDate} onChange={e => set2306({ iucuDate: e.target.value })} /></Field>
              <Field label="MyUSA posting date"><Input type="date" value={s.l2306.myusaDate} onChange={e => set2306({ myusaDate: e.target.value })} /></Field>
              <Field label="Lender payoff quote"><Input type="number" step="0.01" value={s.l2306.quoteAmount ?? ''} onChange={e => set2306({ quoteAmount: num(e.target.value) })} /></Field>
              <Field label="Quote good through"><Input type="date" value={s.l2306.quoteGoodThrough} onChange={e => set2306({ quoteGoodThrough: e.target.value })} /></Field>
            </div>
            {p.required == null ? (
              <p className="flex items-start gap-2 rounded-md bg-muted/40 p-2 text-sm text-muted-foreground"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Enter the {p.missing.join(', ')} to estimate interest and the payoff amount.</p>
            ) : (
              <dl className="space-y-1 rounded-md bg-muted/40 p-2 text-sm tabular-nums">
                <div className="flex justify-between"><dt>{p.quoteValid ? 'Lender payoff quote' : 'Estimated interest (APR ÷ 365, simple daily)'}</dt><dd>{p.quoteValid ? f(p.required) : f(p.interest!)}</dd></div>
                <div className="flex justify-between"><dt>Total needed</dt><dd>{f(p.required)}</dd></div>
                <div className="flex justify-between"><dt>MyUSA (fixed)</dt><dd>{f(LOAN_2306.myusa)}</dd></div>
                <div className="flex justify-between font-medium"><dt>IUCU needed</dt><dd>{f(p.iucuNeeded!)}</dd></div>
                {p.extraFromIucu! > 0 && <div className="flex justify-between text-primary"><dt>Additional from IUCU</dt><dd>+{f(p.extraFromIucu!)}</dd></div>}
                {!p.quoteValid && s.l2306.quoteAmount && <p className="text-xs text-muted-foreground">Quote isn't valid through {p.payoffDate}; using estimate.</p>}
              </dl>
            )}
            <label className="flex items-center gap-2 text-sm"><Switch checked={s.l2306.lenderZero} onCheckedChange={v => set2306({ lenderZero: v })} />Lender confirmed $0 balance</label>
          </div>

          {/* Loan 3006 */}
          <div className="space-y-3 rounded-lg border bg-card/60 p-4 backdrop-blur">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Loan 3006</h3>
              {s.l3006.lenderZero ? <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />Paid Off</Badge> : <Badge variant="secondary">From Dec 2026</Badge>}
            </div>
            <dl className="space-y-1 text-sm tabular-nums">
              <div className="flex justify-between"><dt>Regular payment</dt><dd>{f(src.regular)}</dd></div>
              <div className={`flex justify-between ${paid2306 ? '' : 'text-muted-foreground line-through'}`}><dt>Loan 2306 redirect {paid2306 ? '' : '(after 2306 paid off)'}</dt><dd>{f(src.redirect2306)}</dd></div>
              <div className="flex justify-between"><dt>Progressive + Capital One redirects</dt><dd>{f(src.debtRedirects)}</dd></div>
              <div className="flex justify-between"><dt>MyUSA</dt><dd>{f(src.myusa)}</dd></div>
              <div className="flex justify-between"><dt>Extra from IUCU</dt><dd>{f(src.iucuExtra)}</dd></div>
              <div className="flex justify-between border-t pt-1 font-medium"><dt>Monthly plan {paid2306 ? '' : '(2306 still open)'}</dt><dd>{f(monthly3006(paid2306))}</dd></div>
            </dl>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Balance"><Input type="number" step="0.01" value={s.l3006.balance} onChange={e => set3006({ balance: Number(e.target.value) })} /></Field>
              <Field label="Balance as-of"><Input type="date" value={s.l3006.asOf} onChange={e => set3006({ asOf: e.target.value })} /></Field>
              <Field label="Posting day of month"><Input type="number" min={1} max={31} value={s.l3006.postingDay ?? ''} onChange={e => set3006({ postingDay: num(e.target.value) })} /></Field>
              <Field label="Final payoff quote"><Input type="number" step="0.01" value={s.l3006.quoteAmount ?? ''} onChange={e => set3006({ quoteAmount: num(e.target.value) })} /></Field>
              <Field label="Quote good through"><Input type="date" value={s.l3006.quoteGoodThrough} onChange={e => set3006({ quoteGoodThrough: e.target.value })} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm"><Switch checked={s.l3006.lenderZero} onCheckedChange={v => set3006({ lenderZero: v })} />Lender confirmed $0 balance</label>
          </div>

          <div className="space-y-2 rounded-lg border bg-card/60 p-4 backdrop-blur lg:col-span-2">
            <h3 className="font-semibold">Loan 3006 monthly projection <span className="text-xs font-normal text-muted-foreground">(projected — not lender-confirmed)</span></h3>
            {sch.missing.length ? (
              <p className="flex items-start gap-2 text-sm text-muted-foreground"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Enter the {sch.missing.join(' and ')} to see the schedule and payoff month.</p>
            ) : s.l3006.lenderZero ? (
              <p className="text-sm text-primary">Lender confirmed a zero balance — no future payments planned.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm tabular-nums">
                    <thead className="text-xs text-muted-foreground"><tr className="text-right">
                      <th className="text-left">Month</th><th>Begin</th><th>Est. interest</th><th>Planned</th><th>Status</th><th>Posted</th><th>Projected end</th>
                    </tr></thead>
                    <tbody>
                      {sch.rows.map(r => {
                        const rec = s.l3006.payments[r.month];
                        const setPay = (p: Partial<{ status: PaymentStatus; amount: number | null }>) =>
                          set3006({ payments: { ...s.l3006.payments, [r.month]: { status: rec?.status || 'planned', amount: rec?.amount ?? null, ...p } } });
                        return (
                          <tr key={r.month} className="border-t text-right">
                            <td className="py-1 text-left">{r.month}{r.final && <Badge variant="secondary" className="ml-2 text-xs">Final</Badge>}</td>
                            <td>{f(r.begin)}</td><td>{f(r.interest)}</td>
                            <td>{f(r.payment)}{r.unused > 0 && <div className="text-xs text-primary">unused {f(r.unused)}</div>}</td>
                            <td>
                              <select aria-label={`Status ${r.month}`} className="rounded border bg-background px-1 py-0.5 text-xs" value={r.status} onChange={e => setPay({ status: e.target.value as PaymentStatus })}>
                                <option value="planned">Planned</option><option value="pending">Pending</option><option value="posted">Posted</option>
                              </select>
                            </td>
                            <td><Input aria-label={`Posted ${r.month}`} type="number" step="0.01" className="ml-auto h-7 w-24 text-right" value={rec?.amount ?? ''} onChange={e => setPay({ amount: num(e.target.value) })} /></td>
                            <td>{f(r.end)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground">Estimated payoff {sch.payoffMonth ?? 'beyond 24 months'} · est. interest {f(sch.totalInterest)}. Interest uses simple daily APR ÷ 365 — confirm the final amount with the lender. The $155.43 redirect is counted once, only after Loan 2306 is confirmed paid off.</p>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
