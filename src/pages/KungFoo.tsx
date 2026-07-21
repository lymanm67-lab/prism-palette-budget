import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Circle, TrendingUp, Sparkles, Lock, HelpCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useKungFooPlan, useSaveKungFooPlan, useFinancialFreedom } from '@/hooks/use-financial-os';

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export default function KungFoo() {
  const [paycheck, setPaycheck] = useState<number>(2500);
  const { data, isLoading } = useKungFooPlan(paycheck);
  const save = useSaveKungFooPlan();
  const ff = useFinancialFreedom();

  const nextIdx = useMemo(() => data?.steps.findIndex(s => !s.done) ?? -1, [data]);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          KUNG FOO™ <span className="text-sm font-normal text-muted-foreground">— Financial Order of Operations</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every paycheck has marching orders. The order below is dynamically ranked from your age, tax bracket, cash, debt, and legacy goals.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">This paycheck</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label className="text-xs">Net paycheck amount</Label>
              <Input type="number" value={paycheck} onChange={e => setPaycheck(Number(e.target.value) || 0)} />
            </div>
            <Button onClick={() => data && save.mutate({ steps: data.steps, context: data.context, nextAction: data.steps[nextIdx]?.label })} disabled={!data || save.isPending}>
              {save.isPending ? 'Saving…' : 'Save plan'}
            </Button>
          </div>
          {ff.data && (
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5" />
              At current pace, Financial Freedom in {ff.data.yearsUntilOptional?.toFixed(1) ?? '—'} years
              {ff.data.daysUntilFreedom != null && <> · <b>{ff.data.daysUntilFreedom.toLocaleString()}</b> days</>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* How this works */}
      <Card className="border-prism-sky/30 bg-prism-sky/5">
        <CardContent className="p-4">
          <Accordion type="single" collapsible defaultValue="how">
            <AccordionItem value="how" className="border-0">
              <AccordionTrigger className="py-1 hover:no-underline">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <HelpCircle className="h-4 w-4 text-prism-sky" />
                  How to read this page (with examples)
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground space-y-3 pt-2">
                <div>
                  <p className="font-semibold text-foreground">The two numbers are different things:</p>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li><b className="text-foreground">Net paycheck amount</b> — one paycheck (e.g. $4,357). Used to size <i>this paycheck's</i> marching orders below.</li>
                    <li><b className="text-foreground">Financial Freedom in X years</b> — timeline to hit your retirement target. Uses your <i>annual</i> contribution from your Investment Plan + current portfolio + 7% growth. It is <b>not</b> derived from this paycheck field.</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-foreground">Scenarios — what changes each number:</p>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li><b className="text-foreground">Change the paycheck field to $3,000</b> → step dollar amounts shrink (23% of $3,000 = $690 to emergency fund). Freedom years <i>don't</i> change.</li>
                    <li><b className="text-foreground">Raise annual contribution in Investment Plan</b> (e.g. +$500/mo) → freedom years drop; paycheck steps unchanged.</li>
                    <li><b className="text-foreground">Grow portfolio $50k (deposit, market gains)</b> → freedom years drop.</li>
                    <li><b className="text-foreground">Lower retirement target</b> in Investment Plan → freedom years drop.</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-foreground">To edit your freedom timeline:</p>
                  <p className="pl-1">Go to <b>Planning → Investments</b> and update annual contribution, target portfolio, or current age. Freedom years recompute automatically.</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground">To edit this paycheck plan:</p>
                  <p className="pl-1">Change the "Net paycheck amount" field above. Steps re-rank instantly. Click <b>Save plan</b> to lock it in.</p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>


      {data && (
        <div className="space-y-3">
          {data.steps.map((s, i) => {
            const isNext = i === nextIdx;
            const isLocked = nextIdx >= 0 && i > nextIdx;
            return (
              <Card key={s.key} className={
                isNext ? 'border-prism-amber/70 shadow-lg shadow-prism-amber/10' :
                s.done ? 'opacity-70' : ''
              }>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {s.done ? <CheckCircle2 className="h-5 w-5 text-prism-teal" /> :
                       isNext ? <Sparkles className="h-5 w-5 text-prism-amber" /> :
                       isLocked ? <Lock className="h-5 w-5 text-muted-foreground/50" /> :
                       <Circle className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-muted-foreground">Step {i + 1}</span>
                        <h3 className="text-sm font-semibold">{s.label}</h3>
                        {isNext && <Badge className="text-[10px] bg-prism-amber text-black">Next</Badge>}
                        {s.done && <Badge variant="outline" className="text-[10px]">Complete</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{s.rationale}</p>
                      <p className="text-[11px] text-muted-foreground/80 mt-1 italic">Unlock next: {s.unlockWhen}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold">{fmt(s.allocationAmt)}</div>
                      <div className="text-[10px] text-muted-foreground">{(s.allocationPct * 100).toFixed(1)}% of paycheck</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="rounded-md border border-border/40 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
        Educational guidance. Adjust employer match, HSA eligibility, and bracket in your profile for a more accurate plan.
      </div>
    </div>
  );
}
