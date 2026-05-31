import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Loader2, Bot, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useHousehold } from '@/contexts/HouseholdContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { STATE_DATA } from '@/lib/state-data';

interface Answers {
  state: string;
  city: string;
  income: number;
  monthlyDebt: number;
  debtCreditCards: number;
  debtAutoLoans: number;
  debtStudentLoans: number;
  debtPersonal: number;
  debtChildAlimony: number;
  debtOther: number;
  savings: number;
  targetPrice: number;
  timelineMonths: number;
  firstTime: 'yes' | 'no';
  creditRange: string;
  employment: string;
  familyPlans: string;
  veteranStatus: 'yes' | 'no';
}

const DEFAULT: Answers = {
  state: 'FL', city: '', income: 7500, monthlyDebt: 600, savings: 15000,
  debtCreditCards: 100, debtAutoLoans: 400, debtStudentLoans: 100,
  debtPersonal: 0, debtChildAlimony: 0, debtOther: 0,
  targetPrice: 350000, timelineMonths: 12, firstTime: 'yes', creditRange: '700-739',
  employment: 'W-2 employee', familyPlans: '', veteranStatus: 'no',
};

type StepDef = {
  title: string;
  subtitle: string;
  render: (a: Answers, update: <K extends keyof Answers>(k: K, v: Answers[K]) => void) => JSX.Element;
};

const STEPS: StepDef[] = [
  {
    title: 'Where are you buying?',
    subtitle: 'We use this to surface state-specific assistance and price ranges.',
    render: (a, u) => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">State</Label>
          <Select value={a.state} onValueChange={(v) => u('state', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              {Object.entries(STATE_DATA).filter(([k]) => k).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">City / Area</Label>
          <Input value={a.city} onChange={(e) => u('city', e.target.value)} placeholder="e.g., Tampa" />
        </div>
      </div>
    ),
  },
  {
    title: 'What does your income & debt look like?',
    subtitle: 'Itemize every recurring debt — lenders count all of these in your DTI. Do not include rent or utilities.',
    render: (a, u) => {
      const items: { key: keyof Answers; label: string; hint: string }[] = [
        { key: 'debtCreditCards', label: 'Credit cards (min. payments)', hint: 'Sum of all card minimums' },
        { key: 'debtAutoLoans', label: 'Auto loans / leases', hint: 'All vehicles' },
        { key: 'debtStudentLoans', label: 'Student loans', hint: 'Federal + private (even if deferred)' },
        { key: 'debtPersonal', label: 'Personal / installment loans', hint: 'Affirm, Klarna, SoFi, etc.' },
        { key: 'debtChildAlimony', label: 'Child support / alimony', hint: 'Court-ordered only' },
        { key: 'debtOther', label: 'Other recurring debt', hint: 'HELOC, 401k loan, IRS plan' },
      ];
      const total = items.reduce((sum, it) => sum + (Number(a[it.key]) || 0), 0);
      return (
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Gross Monthly Income ($)</Label>
            <Input type="number" value={a.income} onChange={(e) => u('income', +e.target.value)} />
          </div>
          <div className="rounded-lg border border-border/50 p-3 space-y-2 bg-muted/20">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Monthly Debt Breakdown</Label>
              <span className="text-xs text-muted-foreground">Total: <span className="font-semibold text-prism-teal">${total.toLocaleString()}</span>/mo</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {items.map((it) => (
                <div key={it.key as string}>
                  <Label className="text-[11px] text-muted-foreground">{it.label}</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={(a[it.key] as number) || ''}
                    onChange={(e) => {
                      const next = +e.target.value || 0;
                      u(it.key, next as never);
                      const newTotal = items.reduce((s, x) => s + (x.key === it.key ? next : (Number(a[x.key]) || 0)), 0);
                      u('monthlyDebt', newTotal);
                    }}
                  />
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">{it.hint}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    },
  },
  {
    title: 'How much have you saved & what\'s your target?',
    subtitle: 'Used for down payment and closing cost gap analysis.',
    render: (a, u) => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><Label className="text-xs">Current Savings ($)</Label><Input type="number" value={a.savings} onChange={(e) => u('savings', +e.target.value)} /></div>
        <div><Label className="text-xs">Target Home Price ($)</Label><Input type="number" value={a.targetPrice} onChange={(e) => u('targetPrice', +e.target.value)} /></div>
        <div className="md:col-span-2"><Label className="text-xs">Buying Timeline (months)</Label><Input type="number" value={a.timelineMonths} onChange={(e) => u('timelineMonths', +e.target.value)} /></div>
      </div>
    ),
  },
  {
    title: 'Tell us about your credit & buyer status',
    subtitle: 'Determines which loan programs you likely qualify for.',
    render: (a, u) => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">First-time Buyer?</Label>
          <Select value={a.firstTime} onValueChange={(v) => u('firstTime', v as 'yes' | 'no')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Credit Range</Label>
          <Select value={a.creditRange} onValueChange={(v) => u('creditRange', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['<620', '620-659', '660-699', '700-739', '740-779', '780+'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Veteran / Active Military?</Label>
          <Select value={a.veteranStatus} onValueChange={(v) => u('veteranStatus', v as 'yes' | 'no')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="no">No</SelectItem><SelectItem value="yes">Yes</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
    ),
  },
  {
    title: 'Employment & lifestyle',
    subtitle: 'Lenders weight self-employed income differently. Lifestyle helps tailor recommendations.',
    render: (a, u) => (
      <div className="grid grid-cols-1 gap-3">
        <div>
          <Label className="text-xs">Employment</Label>
          <Select value={a.employment} onValueChange={(v) => u('employment', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['W-2 employee', 'Self-employed', '1099 contractor', 'Retired', 'Other'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Family / lifestyle plans (optional)</Label>
          <Input value={a.familyPlans} onChange={(e) => u('familyPlans', e.target.value)} placeholder="e.g., planning kids in 2-3 yrs, work from home, need a yard" />
        </div>
      </div>
    ),
  },
];

export default function AiHomeBuyingCoach() {
  const { household } = useHousehold();
  const [answers, setAnswers] = useState<Answers>(DEFAULT);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string>('');

  const update = <K extends keyof Answers>(k: K, v: Answers[K]) => setAnswers((p) => ({ ...p, [k]: v }));

  const total = STEPS.length;
  const isLast = step === total - 1;
  const pct = ((step + 1) / total) * 100;

  const runCoach = async () => {
    if (!household) return;
    setLoading(true);
    setReport('');
    try {
      const { data, error } = await supabase.functions.invoke('home-buying-coach', { body: { answers } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setReport(data?.report ?? '');

      await supabase.from('home_buying_coach_sessions').insert({
        household_id: household.id,
        user_id: (await supabase.auth.getUser()).data.user!.id,
        answers: answers as never,
        report: { markdown: data?.report } as never,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Coach failed');
    } finally {
      setLoading(false);
    }
  };

  const restart = () => { setReport(''); setStep(0); };

  if (report) {
    return (
      <Card className="prism-card-shine border-prism-teal/30">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="font-display flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-prism-teal" /> Your Personalized Report
          </CardTitle>
          <Button variant="outline" size="sm" onClick={restart}>Start Over</Button>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{report}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    );
  }

  const current = STEPS[step];

  return (
    <Card className="prism-card-shine border-border/50">
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-display">
            <Bot className="h-5 w-5 text-prism-teal" />
            AI Home-Buying Coach
          </CardTitle>
          <span className="text-xs text-muted-foreground">Step {step + 1} of {total}</span>
        </div>
        <Progress value={pct} className="h-1.5" />
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-prism-teal" />
            {current.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">{current.subtitle}</p>
        </div>

        <div>{current.render(answers, update)}</div>

        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || loading}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          {!isLast ? (
            <Button size="sm" onClick={() => setStep((s) => Math.min(total - 1, s + 1))}>
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={runCoach} disabled={loading} className="gap-1.5">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? 'Analyzing…' : 'Get My Readiness Report'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
