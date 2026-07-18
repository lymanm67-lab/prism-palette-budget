import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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
  },
  {
    id: 'graduate',
    title: '6. Graduate to a high-limit unsecured card',
    timing: 'Month 6–12',
    why: 'High limit = easier to keep utilization under 7% on any single card.',
    how: 'Once score ≥ 680, apply for Chase Freedom Unlimited, Amex Blue Cash Everyday, or Capital One Quicksilver. Request the secured card deposit back.',
  },
];

export default function CreditBuilderPlaybook() {
  const { household } = useHousehold();
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [detected, setDetected] = useState<{ merchant: string; amount: number; count: number } | null>(null);

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
        .or('merchant.ilike.%self inc%,merchant.ilike.%self lender%,merchant.ilike.%self financial%,merchant.ilike.%self credit%,merchant.ilike.%kikoff%');
      if (!data || data.length === 0) return;
      const first = data[0];
      setDetected({ merchant: first.merchant || 'Credit builder', amount: Math.abs(Number(first.amount) || 0), count: data.length });
    })();
  }, [household?.id]);

  const autoDone = useMemo(() => ({ ...done, ...(detected ? { 'credit-builder-loan': true } : {}) }), [done, detected]);
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
        {STEPS.map(step => (
          <div key={step.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-start gap-3">
              <Checkbox
                checked={!!done[step.id]}
                onCheckedChange={(v) => setDone(d => ({ ...d, [step.id]: !!v }))}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-semibold text-sm ${done[step.id] ? 'line-through text-muted-foreground' : ''}`}>
                    {step.title}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">{step.timing}</Badge>
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
        ))}
      </CardContent>
    </Card>
  );
}
