import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Rocket, ExternalLink, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';

type Step = {
  id: string;
  title: string;
  timing: string;
  why: string;
  how: string;
  links?: { label: string; url: string }[];
};

const STEPS: Step[] = [
  {
    id: 'secured-card',
    title: '1. Open a secured credit card',
    timing: 'Month 1',
    why: 'Reports to all 3 bureaus. Adds a positive revolving tradeline with no credit check.',
    how: 'Deposit $200–$500. Use it for ONE recurring bill (e.g., Netflix). Autopay in full monthly. Never carry a balance.',
    links: [
      { label: 'Capital One Platinum Secured', url: 'https://www.capitalone.com/credit-cards/platinum-secured/' },
      { label: 'Discover it® Secured', url: 'https://www.discover.com/credit-cards/secured/' },
    ],
  },
  {
    id: 'credit-builder-loan',
    title: '2. Add a credit-builder loan',
    timing: 'Month 1–2',
    why: 'Adds an installment tradeline (boosts credit mix, ~11% of score). You "borrow" from yourself.',
    how: 'Open with Self, Kikoff, or your local credit union. Payment goes into a locked savings account you receive at the end.',
    links: [
      { label: 'Self Credit Builder', url: 'https://www.self.inc/' },
      { label: 'Kikoff', url: 'https://kikoff.com/' },
    ],
  },
  {
    id: 'authorized-user',
    title: '3. Become an authorized user',
    timing: 'Month 2',
    why: 'Instantly inherits the primary user\'s age, limit, and payment history on that account.',
    how: 'Ask a family member with a 10+ year old card, <10% utilization, and perfect payment history. Confirm the issuer reports AU activity (Amex, Chase, Discover do).',
  },
  {
    id: 'rent-reporting',
    title: '4. Report your rent & utilities',
    timing: 'Month 2',
    why: 'Adds positive payment history for bills you\'re already paying.',
    how: 'Enroll in Experian Boost (free) for utilities/phone. Use RentReporters or Boom for rent (~$5–10/mo).',
    links: [
      { label: 'Experian Boost (free)', url: 'https://www.experian.com/consumer-products/score-boost.html' },
      { label: 'RentReporters', url: 'https://www.rentreporters.com/' },
    ],
  },
  {
    id: 'second-card',
    title: '5. Add a second revolving tradeline',
    timing: 'Month 4–6',
    why: 'FICO rewards 2–3 revolving accounts. Increases total available credit → lowers utilization.',
    how: 'Apply for a store card (Target, Amazon) or a starter unsecured card (Petal, Mission Lane). Keep balance under 7%.',
    links: [
      { label: 'Target Circle™ Card', url: 'https://www.target.com/circle-card' },
      { label: 'Mason Easy Pay', url: 'https://www.masoneasypay.com/' },
    ],
  },
  {
    id: 'graduate',
    title: '6. Graduate to a high-limit unsecured card',
    timing: 'Month 6–12',
    why: 'High limit = easier to keep utilization under 7% on any single card.',
    how: 'Once score ≥ 680, apply for Chase Freedom Unlimited, Amex Blue Cash Everyday, or Capital One Quicksilver. Request the secured card deposit back.',
  },
];

const LS_KEY = 'prism.creditBuilderPlaybook.v1';
const LS_RENT_KEY = 'prism.rentReportingActive.v1';

export default function CreditBuilderPlaybook() {
  const { household } = useHousehold();
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
  });
  const [detected, setDetected] = useState<{ merchant: string; amount: number; count: number } | null>(null);
  const [secondCard, setSecondCard] = useState<{ merchant: string; amount: number } | null>(null);
  const [rentReported, setRentReported] = useState<{ source: 'manual' | 'detected'; label: string } | null>(() => {
    try {
      const v = localStorage.getItem(LS_RENT_KEY);
      return v ? JSON.parse(v) : null;
    } catch { return null; }
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(done));
  }, [done]);

  useEffect(() => {
    if (!household?.id) return;
    (async () => {
      const since = new Date();
      since.setMonth(since.getMonth() - 3);
      const { data } = await supabase
        .from('transactions')
        .select('merchant, amount, date')
        .eq('household_id', household.id)
        .gte('date', since.toISOString().slice(0, 10))
        .or('merchant.ilike.%self inc%,merchant.ilike.%self lender%,merchant.ilike.%self financial%,merchant.ilike.%self credit%,merchant.ilike.%kikoff%,merchant.ilike.%rentreporters%,merchant.ilike.%rent report%,merchant.ilike.%experian boost%,merchant.ilike.%esusu%,merchant.ilike.%piñata%,merchant.ilike.%pinata%,merchant.ilike.%rental kharma%,merchant.ilike.%boom pay%,merchant.ilike.%target%,merchant.ilike.%mason%');
      if (!data || data.length === 0) return;
      const rentSvc = data.find(t => /rent|boost|esusu|piñata|pinata|kharma|boom/i.test(t.merchant || ''));
      const builder = data.find(t => /self|kikoff/i.test(t.merchant || ''));
      const storeCard = data.find(t => /target|mason/i.test(t.merchant || ''));
      if (builder) setDetected({ merchant: builder.merchant || 'Credit builder', amount: Math.abs(Number(builder.amount) || 0), count: data.length });
      if (storeCard) setSecondCard({ merchant: storeCard.merchant || 'Store card', amount: Math.abs(Number(storeCard.amount) || 0) });
      if (rentSvc) {
        const info = { source: 'detected' as const, label: rentSvc.merchant || 'Rent reporting service' };
        setRentReported(info);
        localStorage.setItem(LS_RENT_KEY, JSON.stringify(info));
      }
    })();
  }, [household?.id]);

  const setRentSource = (label: string) => {
    const info = { source: 'manual' as const, label };
    setRentReported(info);
    localStorage.setItem(LS_RENT_KEY, JSON.stringify(info));
  };
  const clearRentReported = () => {
    setRentReported(null);
    localStorage.removeItem(LS_RENT_KEY);
  };

  const autoDone = useMemo(() => ({
    ...done,
    ...(detected ? { 'credit-builder-loan': true } : {}),
    ...(secondCard ? { 'second-card': true } : {}),
    ...(rentReported ? { 'rent-reporting': true } : {}),
  }), [done, detected, secondCard, rentReported]);
  const completed = STEPS.filter(s => autoDone[s.id]).length;
  const pct = Math.round((completed / STEPS.length) * 100);


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          Credit Builder Playbook
        </CardTitle>
        <CardDescription>
          6-step roadmap to build new positive credit — {completed}/{STEPS.length} done ({pct}%)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {STEPS.map(step => {
          const isDetected = (step.id === 'credit-builder-loan' && !!detected) || (step.id === 'rent-reporting' && !!rentReported);
          const isRent = step.id === 'rent-reporting';
          const isDone = !!autoDone[step.id];
          return (
          <div key={step.id} className={`rounded-lg border p-3 space-y-2 ${isDetected ? 'border-emerald-500/40 bg-emerald-500/5' : ''}`}>
            <div className="flex items-start gap-3">
              <Checkbox
                checked={isDone}
                disabled={isDetected}
                onCheckedChange={(v) => setDone(d => ({ ...d, [step.id]: !!v }))}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-semibold text-sm ${isDone ? 'line-through text-muted-foreground' : ''}`}>
                    {step.title}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">{step.timing}</Badge>
                  {step.id === 'credit-builder-loan' && detected && (
                    <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Detected: {detected.merchant} · ${detected.amount}/mo
                    </Badge>
                  )}
                  {isRent && rentReported && (
                    <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {rentReported.source === 'detected' ? `Detected: ${rentReported.label}` : rentReported.label}
                    </Badge>
                  )}
                  {isRent && !rentReported && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => setRentSource('Experian Boost active')}>
                        I use Experian Boost
                      </Button>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => setRentSource('Rent reported to bureaus')}>
                        Other rent reporting
                      </Button>
                    </div>
                  )}
                  {isRent && rentReported && (
                    <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={clearRentReported}>
                      Unmark
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1"><strong>Why:</strong> {step.why}</p>
                <p className="text-xs text-muted-foreground mt-1"><strong>How:</strong> {step.how}</p>
                {step.links && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {step.links.map(l => (
                      <a
                        key={l.url}
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {l.label} <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
