import { useEffect, useRef } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import type { StepProps } from './index';
import { useLastMonthSnapshot } from '@/hooks/use-last-month-snapshot';

const FEELING = [
  { v: 'on_track', label: 'On track', sub: 'Spending matched the plan' },
  { v: 'a_little_off', label: 'A little off', sub: 'A category or two went over' },
  { v: 'way_off', label: 'Way off', sub: 'Several budgets blew up' },
];

const CAUSE = [
  { v: 'one_time', label: 'One-time event', sub: 'Travel, repair, gift, etc.' },
  { v: 'lifestyle_creep', label: 'Lifestyle creep', sub: 'Spending crept up gradually' },
  { v: 'income_timing', label: 'Income timing', sub: 'Paycheck arrived late or off-cycle' },
  { v: 'unrealistic_budget', label: 'Budget was unrealistic', sub: 'The number was never going to fit' },
];

export function Step02({ value, onChange }: StepProps) {
  const snap = useLastMonthSnapshot();
  const prefilled = useRef(false);

  // Auto-prefill once when data arrives and user hasn't answered yet.
  useEffect(() => {
    if (snap.loading || prefilled.current) return;
    if (!snap.hasData) return;
    if (value?.feeling || value?.cause) { prefilled.current = true; return; }
    prefilled.current = true;
    onChange({ ...value, feeling: snap.feeling, cause: snap.cause, _suggested: true });
  }, [snap.loading, snap.hasData]); // eslint-disable-line react-hooks/exhaustive-deps

  const overColor = snap.overBy > 0 ? 'text-prism-rose' : 'text-prism-positive';
  const OverIcon = snap.overBy > 0 ? TrendingUp : TrendingDown;

  return (
    <div className="space-y-5">
      {/* Data-driven snapshot */}
      {snap.hasData && (
        <div className="rounded-lg border border-prism-violet/30 bg-prism-violet/5 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-prism-violet" />
              <span className="text-xs font-semibold uppercase tracking-wider text-prism-violet">
                {snap.monthLabel} from your data
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 text-[11px]"
              onClick={() => onChange({ ...value, feeling: snap.feeling, cause: snap.cause, _suggested: true })}
            >
              Use suggestion
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase">Budgeted</div>
              <div className="text-sm font-semibold">${snap.budgeted.toFixed(0)}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase">Spent</div>
              <div className="text-sm font-semibold">${snap.spent.toFixed(0)}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase">
                {snap.overBy >= 0 ? 'Over' : 'Under'}
              </div>
              <div className={`text-sm font-semibold inline-flex items-center gap-1 ${overColor}`}>
                <OverIcon className="h-3 w-3" />${Math.abs(snap.overBy).toFixed(0)}
                {snap.budgeted > 0 && (
                  <span className="text-[10px] font-normal text-muted-foreground">
                    ({snap.overPct >= 0 ? '+' : ''}{snap.overPct.toFixed(0)}%)
                  </span>
                )}
              </div>
            </div>
          </div>
          {snap.topCategories.filter(c => c.over > 0).length > 0 && (
            <div className="text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground/80">Biggest overages: </span>
              {snap.topCategories
                .filter(c => c.over > 0)
                .slice(0, 3)
                .map(c => `${c.name} (+$${c.over.toFixed(0)})`)
                .join(' · ')}
            </div>
          )}
          <div className="text-[11px] text-muted-foreground italic">{snap.rationale}</div>
        </div>
      )}

      {!snap.loading && !snap.hasData && (
        <div className="rounded-lg border border-border/40 bg-muted/30 p-3 text-[11px] text-muted-foreground">
          No transactions or budgets recorded for {snap.monthLabel} yet — answer below from memory.
        </div>
      )}

      <div>
        <Label className="text-sm font-semibold">How did last month feel?</Label>
        <RadioGroup
          value={value?.feeling || ''}
          onValueChange={(v) => onChange({ ...value, feeling: v, _suggested: false })}
          className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2"
        >
          {FEELING.map(o => (
            <label key={o.v} className="flex items-start gap-2 rounded-lg border border-border/40 p-2.5 cursor-pointer hover:bg-muted/40">
              <RadioGroupItem value={o.v} id={`s2f-${o.v}`} className="mt-0.5" />
              <div>
                <div className="text-sm font-medium flex items-center gap-1">
                  {o.label}
                  {snap.hasData && snap.feeling === o.v && (
                    <span className="text-[9px] px-1 rounded bg-prism-violet/20 text-prism-violet">data</span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground">{o.sub}</div>
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div>
        <Label className="text-sm font-semibold">What drove it?</Label>
        <RadioGroup
          value={value?.cause || ''}
          onValueChange={(v) => onChange({ ...value, cause: v, _suggested: false })}
          className="mt-2 space-y-2"
        >
          {CAUSE.map(o => {
            const isSuggested = snap.hasData && snap.cause === o.v;
            let detail: string | null = null;
            if (isSuggested) {
              const overCats = snap.topCategories.filter(c => c.over > 0);
              if (o.v === 'one_time' && snap.largestExpense) {
                detail = `${snap.largestExpense.merchant} — $${snap.largestExpense.amount.toFixed(0)}${snap.largestExpense.category ? ` (${snap.largestExpense.category})` : ''}`;
              } else if (o.v === 'lifestyle_creep' && overCats.length > 0) {
                detail = overCats.slice(0, 3).map(c => `${c.name} +$${c.over.toFixed(0)}`).join(' · ');
              } else if (o.v === 'unrealistic_budget' && overCats[0]?.budgeted > 0) {
                const c = overCats[0];
                detail = `${c.name}: $${c.spent.toFixed(0)} spent vs $${c.budgeted.toFixed(0)} budgeted (${Math.round((c.over / c.budgeted) * 100)}% over)`;
              } else if (o.v === 'income_timing') {
                detail = `Spent $${snap.spent.toFixed(0)} vs $${snap.budgeted.toFixed(0)} budgeted — check paycheck dates`;
              }
            }
            return (
              <label key={o.v} className="flex items-start gap-3 rounded-lg border border-border/40 p-3 cursor-pointer hover:bg-muted/40">
                <RadioGroupItem value={o.v} id={`s2c-${o.v}`} className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium flex items-center gap-1">
                    {o.label}
                    {isSuggested && (
                      <span className="text-[9px] px-1 rounded bg-prism-violet/20 text-prism-violet">data</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{o.sub}</div>
                  {detail && (
                    <div className="text-[11px] text-prism-violet/90 mt-1 font-medium break-words">{detail}</div>
                  )}
                </div>
              </label>
            );
          })}

        </RadioGroup>
      </div>

      <div>
        <Label className="text-sm font-semibold">Anything specific worth noting? (optional)</Label>
        <Textarea
          value={value?.notes || ''}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
          placeholder="e.g. dining out got out of hand the last two weeks"
          className="mt-2"
          rows={2}
        />
      </div>
    </div>
  );
}
