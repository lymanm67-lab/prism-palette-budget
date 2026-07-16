import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { PiggyBank, Lightbulb } from 'lucide-react';
import { fmt$ } from '@/lib/home-buying/mortgage-math';

const SAVING_TECHNIQUES = [
  { title: 'Automate transfers on payday', detail: 'Set up an auto-transfer to a high-yield savings (HYSA) the day your paycheck hits. You save before you spend.' },
  { title: 'Open a dedicated HYSA', detail: 'Online banks pay 4–5% APY. On a $30k goal that\'s ~$1,200/year for free.' },
  { title: 'Cut 1 big subscription cluster', detail: 'Audit subscriptions in Prism — most users find $80–150/mo they don\'t use.' },
  { title: 'Use windfalls intentionally', detail: 'Tax refund, bonus, gifts → 100% to the down-payment fund. No "treat yourself" carve-out.' },
  { title: 'Side income → down payment only', detail: 'Pick one side gig and route ALL of it to the goal. Hide the money from yourself.' },
  { title: 'IRA first-home exemption', detail: 'IRS allows up to $10k from a traditional/Roth IRA penalty-free for a first home (taxes may still apply). Confirm with a CPA.' },
  { title: 'Employer assistance', detail: 'Ask HR if your company has a homebuyer benefit. ~10% of large employers offer matched contributions or forgivable loans.' },
  { title: 'State / city DPA grants', detail: 'Check the State Assistance tab — many programs are forgivable if you stay in the home 5+ years.' },
];

export default function DownPaymentPlanner({ price: priceProp, onPriceChange }: { price?: number; onPriceChange?: (n: number) => void } = {}) {
  const [priceLocal, setPriceLocal] = useState(350000);
  const price = priceProp ?? priceLocal;
  const setPrice = (n: number) => { onPriceChange ? onPriceChange(n) : setPriceLocal(n); };
  const [downPct, setDownPct] = useState(10);
  const [currentSaved, setCurrentSaved] = useState(8000);
  const [monthly, setMonthly] = useState(800);
  const [apy, setApy] = useState(4.5);

  const result = useMemo(() => {
    const target = price * (downPct / 100);
    const remaining = Math.max(0, target - currentSaved);
    const r = apy / 100 / 12;
    let balance = currentSaved;
    let months = 0;
    while (balance < target && months < 600) {
      balance = balance * (1 + r) + monthly;
      months++;
    }
    return { target, remaining, months, years: months / 12 };
  }, [price, downPct, currentSaved, monthly, apy]);

  return (
    <Card className="prism-card-shine border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-display">
          <PiggyBank className="h-5 w-5 text-prism-teal" />
          Down Payment Planner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <Label className="text-xs">Home Price</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(+e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Down %</Label>
            <Input type="number" value={downPct} onChange={(e) => setDownPct(+e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Already Saved</Label>
            <Input type="number" value={currentSaved} onChange={(e) => setCurrentSaved(+e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Monthly</Label>
            <Input type="number" value={monthly} onChange={(e) => setMonthly(+e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Savings APY %</Label>
            <Input type="number" step="0.1" value={apy} onChange={(e) => setApy(+e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border/40 bg-card/40 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Target</p>
            <p className="font-display text-lg font-bold">{fmt$(result.target)}</p>
          </div>
          <div className="rounded-lg border border-border/40 bg-card/40 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Still Need</p>
            <p className="font-display text-lg font-bold">{fmt$(result.remaining)}</p>
          </div>
          <div className="rounded-lg border border-prism-teal/30 bg-prism-teal/5 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Time to Goal</p>
            <p className="font-display text-lg font-bold prism-gradient-text">
              {result.months >= 600 ? '50+ yrs' : `${result.years.toFixed(1)} yrs`}
            </p>
          </div>
        </div>

        <Accordion type="single" collapsible>
          <AccordionItem value="techniques" className="border-border/40">
            <AccordionTrigger className="text-sm">
              <span className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-prism-amber" />
                8 ways to save for a down payment faster
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-3 text-sm">
                {SAVING_TECHNIQUES.map((t) => (
                  <li key={t.title}>
                    <p className="font-semibold">{t.title}</p>
                    <p className="text-muted-foreground text-xs">{t.detail}</p>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
