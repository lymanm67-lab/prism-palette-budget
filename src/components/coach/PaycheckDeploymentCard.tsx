import { useEffect, useMemo, useState } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { CheckCircle2, ChevronDown, Flame, Info, Receipt, Wallet } from 'lucide-react';
import type { PaycheckDeployment } from '@/hooks/use-paycheck-deploy';
import { usePaycheckTree, type PaycheckBillItem } from '@/components/coach/usePaycheckTree';
import PaycheckCharts from '@/components/coach/PaycheckCharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const money = (n: number) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0,
}).format(n);

const PILLAR_COPY: Record<string, string> = {
  'Bills & Essentials': 'Personal household obligations due around this paycheck.',
  'Debt Freedom': 'Current minimums and any extra payoff, excluding paid-off and deferred debts.',
  'Savings & Buffer': 'Savings goals plus the cushion for timing gaps and surprises.',
  'Wealth & Investing': 'Investing from take-home plus payroll wealth contributions shown separately.',
  'Business Expenses': 'Business-side costs from the same monthly budget.',
  'Guilt-Free Spend': 'Money available after the plan protects its other priorities.',
};

type Coverage = { bills: string[]; debt: boolean; spend: boolean };

function safeDate(value: string) {
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, 'MMM d') : 'Date missing';
}

function BillsList({ items, checked, onToggle }: {
  items: PaycheckBillItem[];
  checked: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (!items.length) return null;
  return (
    <div className="rounded-md border border-border/40 bg-background/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bills covered ({items.length})</div>
          <p className="mt-0.5 text-xs text-muted-foreground">Personal shares only; business shares appear under Business Expenses and debts under Debt Freedom.</p>
        </div>
      </div>
      <ul className="divide-y divide-border/30">
        {items.map(item => {
          const done = checked.has(item.id);
          return (
            <li key={item.id} className="flex items-center gap-3 py-2 text-sm">
              <Checkbox checked={done} onCheckedChange={() => onToggle(item.id)} aria-label={`Mark ${item.label} covered`} />
              <div className="min-w-0 flex-1">
                <div className={cn('truncate font-medium', done && 'text-muted-foreground line-through')}>{item.label}</div>
                <div className="text-xs text-muted-foreground">
                  {safeDate(item.dueDate)}
                  {item.businessValue > 0.5 && ` · Business share ${money(item.businessValue)}`}
                </div>
              </div>
              <span className="shrink-0 font-mono font-semibold text-prism-sky">{money(item.value)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function PaycheckDeploymentCard({ deployment, onUpdate, historical = false }: {
  deployment: PaycheckDeployment;
  onUpdate: (id: string, status: PaycheckDeployment['status']) => void;
  historical?: boolean;
}) {
  const { net, pillars, billItems } = usePaycheckTree(deployment, { all: true });
  const storageKey = `prism:paycheck-coverage:${deployment.id || deployment.pay_date}`;
  const [coverage, setCoverage] = useState<Coverage>({ bills: [], debt: false, spend: false });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setCoverage(JSON.parse(saved));
    } catch { /* local progress is optional */ }
  }, [storageKey]);

  const saveCoverage = (next: Coverage) => {
    setCoverage(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* local progress is optional */ }
  };

  const byLabel = (label: string) => pillars.find(p => p.label === label);
  const bills = byLabel('Bills & Essentials')?.takeHome || 0;
  const debt = byLabel('Debt Freedom')?.takeHome || 0;
  const business = byLabel('Business Expenses')?.takeHome || 0;
  const guiltFree = byLabel('Guilt-Free Spend')?.takeHome || 0;
  const paidBills = billItems.filter(b => coverage.bills.includes(b.id)).reduce((sum, b) => sum + b.value, 0);
  const progress = [
    { label: 'Bills', icon: Receipt, value: paidBills, total: bills, color: 'bg-prism-sky' },
    { label: 'Debt', icon: Flame, value: coverage.debt ? debt : 0, total: debt, color: 'bg-prism-rose', toggle: 'debt' as const },
    { label: 'Guilt-free', icon: Wallet, value: coverage.spend ? guiltFree : 0, total: guiltFree, color: 'bg-prism-amber', toggle: 'spend' as const },
  ];

  const splitTotal = bills + business;
  const statusApplied = deployment.status === 'applied';
  const dateLabel = safeDate(deployment.pay_date);

  return (
    <Card className="overflow-hidden border-border/60 bg-card/60 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-border/40 bg-gradient-to-r from-prism-navy/40 to-transparent p-3 sm:p-4">
        <div><div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pay date</div><div className="font-display text-lg font-bold">{dateLabel}</div></div>
        <div><div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Net amount</div><div className="font-mono text-lg font-bold text-prism-teal">{money(net)}</div></div>
        <Badge variant="outline" className="ml-auto text-[10px]">{deployment.confidence} confidence</Badge>
        {statusApplied ? (
          <Badge variant="outline" className="border-prism-teal/30 bg-prism-teal/10 text-[10px] text-prism-teal"><CheckCircle2 className="mr-1 h-3 w-3" /> Applied</Badge>
        ) : deployment.id && !historical ? (
          <div className="flex gap-1.5">
            <Button size="sm" className="h-7 text-[11px]" onClick={() => onUpdate(deployment.id || '', 'applied')}>Mark applied</Button>
            <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => onUpdate(deployment.id || '', 'skipped')}>Skip</Button>
          </div>
        ) : null}
      </div>

      <CardContent className="space-y-4 p-3 sm:p-4">
        <PaycheckCharts deployment={deployment} />

        <section>
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Plan summary</div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {pillars.map(p => (
              <div key={p.label} className="rounded-md border border-border/40 bg-background/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{p.label}</span>
                  <span className="font-mono text-base font-bold" style={{ color: `hsl(${p.color})` }}>{money(p.value)}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{net > 0 ? Math.round((p.takeHome / net) * 100) : 0}% of take-home{p.value > p.takeHome ? ' plus payroll contributions' : ''}</div>
                <p className="mt-2 text-xs leading-relaxed text-foreground/75">{PILLAR_COPY[p.label]}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-border/40 bg-background/40 p-3">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Budget expense split</div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div><div className="text-xs text-muted-foreground">Personal bills</div><div className="font-mono font-bold text-prism-sky">{money(bills)}</div></div>
            <div><div className="text-xs text-muted-foreground">Business</div><div className="font-mono font-bold text-prism-orange">{money(business)}</div></div>
            <div><div className="text-xs text-muted-foreground">Combined</div><div className="font-mono font-bold text-foreground">{money(splitTotal)}</div></div>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">Debt is shown separately so it is never counted twice.</p>
        </section>

        <section className="rounded-md border border-border/40 bg-background/40 p-3">
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Covered so far</div>
          <div className="grid gap-4 md:grid-cols-3">
            {progress.map(item => {
              const pct = item.total > 0 ? Math.min(100, Math.round((item.value / item.total) * 100)) : 0;
              const Icon = item.icon;
              return (
                <div key={item.label}>
                  <div className="mb-1.5 flex items-center gap-2 text-xs">
                    {item.toggle ? <Checkbox checked={coverage[item.toggle]} onCheckedChange={v => saveCoverage({ ...coverage, [item.toggle as 'debt' | 'spend']: Boolean(v) })} aria-label={`Mark ${item.label} covered`} /> : <Icon className="h-4 w-4 text-muted-foreground" />}
                    <span className="font-semibold">{item.label}</span>
                    <span className="ml-auto font-mono text-muted-foreground">{money(item.value)} / {money(item.total)}</span>
                  </div>
                  <Progress value={pct} indicatorClassName={item.color} className="h-2" />
                  <div className="mt-1 text-right text-[10px] text-muted-foreground">{pct}% covered</div>
                </div>
              );
            })}
          </div>
        </section>

        <BillsList
          items={billItems}
          checked={new Set(coverage.bills)}
          onToggle={id => saveCoverage({ ...coverage, bills: coverage.bills.includes(id) ? coverage.bills.filter(x => x !== id) : [...coverage.bills, id] })}
        />

        {deployment.rationale && <p className="flex gap-1.5 text-xs italic text-muted-foreground"><Info className="mt-0.5 h-3 w-3 shrink-0" /><span>{deployment.rationale}</span></p>}
      </CardContent>
    </Card>
  );
}

export function PastDeploymentList({ deployments, onUpdate }: {
  deployments: PaycheckDeployment[];
  onUpdate: (id: string, status: PaycheckDeployment['status']) => void;
}) {
  const [open, setOpen] = useState(false);
  const sorted = useMemo(() => [...deployments].sort((a, b) => b.pay_date.localeCompare(a.pay_date)), [deployments]);
  if (!sorted.length) return null;
  return (
    <section className="space-y-3">
      <Button variant="outline" className="w-full justify-between" onClick={() => setOpen(v => !v)} aria-expanded={open}>
        <span>Past deployments ({sorted.length})</span><ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </Button>
      {open && <div className="space-y-3">{sorted.map(d => <PaycheckDeploymentCard key={d.id || d.pay_date} deployment={d} onUpdate={onUpdate} historical />)}</div>}
    </section>
  );
}