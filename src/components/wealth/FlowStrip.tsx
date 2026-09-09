import { Card, CardContent } from '@/components/ui/card';

const STAGES = [
  { key: 'earn', label: 'Earn', hint: 'Only money assigned to the plan' },
  { key: 'free', label: 'Free', hint: 'Spending you stopped' },
  { key: 'protect', label: 'Protect', hint: 'Buffer first' },
  { key: 'pay', label: 'Pay', hint: 'Debts still owed' },
  { key: 'redirect', label: 'Redirect', hint: 'Payments that ended' },
  { key: 'invest', label: 'Invest', hint: 'Retirement, HSA, taxable' },
  { key: 'compound', label: 'Compound', hint: 'Growth, never a source' },
];

export function FlowStrip() {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-stretch gap-2">
          {STAGES.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div className="rounded-lg border border-primary/30 bg-card/60 px-3 py-2">
                <p className="text-sm font-semibold">{s.label}</p>
                <p className="text-[11px] text-muted-foreground">{s.hint}</p>
              </div>
              {i < STAGES.length - 1 && <span className="text-muted-foreground">&rarr;</span>}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Core retirement and HSA contributions continue while the Buffer is being built. Flexible cash
          follows the waterfall.
        </p>
        <p className="text-xs text-muted-foreground">
          The goal is not to maximise the projected number. The goal is to model your actual financial
          strategy accurately, transparently, and without double counting.
        </p>
      </CardContent>
    </Card>
  );
}
