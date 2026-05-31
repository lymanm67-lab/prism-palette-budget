import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Loader2, Bot, ArrowLeft, ArrowRight, CheckCircle2, Printer, Download, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { renderToStaticMarkup } from 'react-dom/server';
import remarkGfm from 'remark-gfm';
import { useHousehold } from '@/contexts/HouseholdContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { STATE_DATA } from '@/lib/state-data';

interface Answers {
  state: string;
  city: string;
  income: number;
  coBorrowerIncome: number;
  monthlyDebt: number;
  debtCreditCards: number;
  debtAutoLoans: number;
  debtStudentLoans: number;
  debtPersonal: number;
  debtChildAlimony: number;
  debtOther: number;
  savings: number;
  giftFunds: number;
  targetPrice: number;
  timelineMonths: number;
  firstTime: 'yes' | 'no';
  creditRange: string;
  derogatories24mo: 'yes' | 'no';
  employment: string;
  incomeType: string;
  veteranStatus: 'yes' | 'no';
  propertyType: string;
  ownerOccupy: 'yes' | 'no';
  planToStay: string;
  familyPlans: string;
}

const DEFAULT: Answers = {
  state: 'OH', city: 'Akron', income: 7500, coBorrowerIncome: 0,
  monthlyDebt: 600,
  debtCreditCards: 100, debtAutoLoans: 400, debtStudentLoans: 100,
  debtPersonal: 0, debtChildAlimony: 0, debtOther: 0,
  savings: 15000, giftFunds: 0,
  targetPrice: 150000, timelineMonths: 24,
  firstTime: 'yes', creditRange: '700-739', derogatories24mo: 'no',
  employment: 'W-2 employee', incomeType: 'W-2 only',
  veteranStatus: 'no',
  propertyType: 'Single-family home', ownerOccupy: 'yes', planToStay: '3–7 years',
  familyPlans: '',
};

type StepDef = {
  title: string;
  subtitle: string;
  render: (a: Answers, update: <K extends keyof Answers>(k: K, v: Answers[K]) => void) => JSX.Element;
};

const STEPS: StepDef[] = [
  {
    title: 'Where & when are you buying?',
    subtitle: 'We use this to surface state-specific assistance and listings.',
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
        <div>
          <Label className="text-xs">Buying timeline (months)</Label>
          <Input type="number" value={a.timelineMonths} onChange={(e) => u('timelineMonths', +e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Plan to stay in the home</Label>
          <Select value={a.planToStay} onValueChange={(v) => u('planToStay', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['<3 years', '3–7 years', '7+ years'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    ),
  },
  {
    title: 'Income & employment',
    subtitle: 'Lenders weigh W-2 and self-employed income very differently.',
    render: (a, u) => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Your gross monthly income ($)</Label>
          <Input type="number" value={a.income} onChange={(e) => u('income', +e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Co-borrower monthly income ($)</Label>
          <Input type="number" value={a.coBorrowerIncome || ''} placeholder="0" onChange={(e) => u('coBorrowerIncome', +e.target.value || 0)} />
        </div>
        <div>
          <Label className="text-xs">Income type</Label>
          <Select value={a.incomeType} onValueChange={(v) => u('incomeType', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['W-2 only', '1099 / contractor', 'Self-employed (Sch C / S-Corp)', 'Mixed W-2 + 1099', 'Retired / fixed'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Employment status</Label>
          <Select value={a.employment} onValueChange={(v) => u('employment', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['W-2 employee', 'Self-employed', '1099 contractor', 'Retired', 'Other'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    ),
  },
  {
    title: 'Monthly debts (itemized)',
    subtitle: 'Enter monthly payments (not balances). Lenders count all of these in your DTI. Skip rent & utilities.',
    render: (a, u) => {
      const items: { key: keyof Answers; label: string; hint: string }[] = [
        { key: 'debtCreditCards', label: 'Credit cards (min. payments)', hint: 'Sum of all card minimums' },
        { key: 'debtAutoLoans', label: 'Auto loans / leases', hint: 'All vehicles' },
        { key: 'debtStudentLoans', label: 'Student loans', hint: 'If deferred & no payment shows: use 1% of balance (Conv/FHA) or 0.5% (VA/USDA)' },
        { key: 'debtPersonal', label: 'Personal / installment loans', hint: 'Affirm, Klarna, SoFi, etc.' },
        { key: 'debtChildAlimony', label: 'Child support / alimony', hint: 'Court-ordered only' },
        { key: 'debtOther', label: 'Other recurring debt', hint: 'HELOC, 401k loan, IRS plan. SBA/business loan: $0 if business-paid 12+ mo (need proof), else monthly payment' },
      ];
      const total = items.reduce((sum, it) => sum + (Number(a[it.key]) || 0), 0);
      return (
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
      );
    },
  },
  {
    title: 'Cash on hand & target',
    subtitle: 'Used for down payment, closing costs, and reserve analysis.',
    render: (a, u) => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><Label className="text-xs">Current savings ($)</Label><Input type="number" value={a.savings} onChange={(e) => u('savings', +e.target.value)} /></div>
        <div><Label className="text-xs">Gift funds available ($)</Label><Input type="number" placeholder="0" value={a.giftFunds || ''} onChange={(e) => u('giftFunds', +e.target.value || 0)} /></div>
        <div className="md:col-span-2"><Label className="text-xs">Target home price ($)</Label><Input type="number" value={a.targetPrice} onChange={(e) => u('targetPrice', +e.target.value)} /></div>
      </div>
    ),
  },
  {
    title: 'Credit & buyer status',
    subtitle: 'Determines which loan programs and assistance you qualify for.',
    render: (a, u) => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">First-time buyer?</Label>
          <Select value={a.firstTime} onValueChange={(v) => u('firstTime', v as 'yes' | 'no')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Credit range</Label>
          <Select value={a.creditRange} onValueChange={(v) => u('creditRange', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['<620', '620-659', '660-699', '700-739', '740-779', '780+'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Derogatories in last 24mo?</Label>
          <Select value={a.derogatories24mo} onValueChange={(v) => u('derogatories24mo', v as 'yes' | 'no')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="no">No</SelectItem><SelectItem value="yes">Yes (collections, late, BK, FC)</SelectItem></SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Veteran / Active military?</Label>
          <Select value={a.veteranStatus} onValueChange={(v) => u('veteranStatus', v as 'yes' | 'no')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="no">No</SelectItem><SelectItem value="yes">Yes</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
    ),
  },
  {
    title: 'Property & lifestyle',
    subtitle: 'Property type affects loan options. Lifestyle helps tailor recommendations.',
    render: (a, u) => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Property type</Label>
          <Select value={a.propertyType} onValueChange={(v) => u('propertyType', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['Single-family home', 'Condo', 'Townhouse', 'Multi-family 2-4 unit', 'Manufactured'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Will you owner-occupy?</Label>
          <Select value={a.ownerOccupy} onValueChange={(v) => u('ownerOccupy', v as 'yes' | 'no')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="yes">Yes (primary residence)</SelectItem><SelectItem value="no">No (investment)</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label className="text-xs">Family / lifestyle plans (optional)</Label>
          <textarea
            value={a.familyPlans}
            onChange={(e) => u('familyPlans', e.target.value)}
            placeholder="Tell us what matters: family size & changes, work-from-home, pets, schools, commute, accessibility, hobbies, yard/space needs…"
            className="flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <details open className="group rounded-md border border-prism-teal/20 bg-prism-teal/5 p-2.5 space-y-2 [&[open]>summary>svg.chev]:rotate-180">
            <summary className="flex items-center justify-between cursor-pointer list-none select-none">
              <span className="text-[11px] font-semibold text-prism-teal flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Quick-add lifestyle factors (tap to append)
              </span>
              <ChevronDown className="chev h-4 w-4 text-prism-teal transition-transform" />
            </summary>
            <div className="flex flex-wrap gap-1.5 pt-2">
              {[
                'Planning kids in 2–3 years — need 3+ bedrooms',
                'Already have kids — top-rated school district is critical',
                'Work from home full-time — need a dedicated office',
                'Both spouses WFH — need 2 offices / quiet spaces',
                'Have pets — need fenced yard',
                'Aging parent may move in — single-story or in-law suite',
                'Short commute (<30 min) matters more than size',
                'Want walkability to shops/parks',
                'Plan to entertain — open kitchen / outdoor space',
                'Prefer turnkey — no major renovations',
                'Open to fixer-upper for the right price',
                'Need garage / workshop / storage',
                'Low-maintenance lifestyle — HOA is fine',
                'Want acreage / privacy / rural feel',
              ].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    const current = a.familyPlans.trim();
                    u('familyPlans', current ? `${current}; ${s}` : s);
                  }}
                  className="text-[11px] px-2 py-1 rounded-full bg-background border border-border hover:border-prism-teal hover:bg-prism-teal/10 transition-colors"
                >
                  + {s}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground/80 pt-1">
              <strong>Prompt ideas:</strong> mention <em>timeline for life changes</em> (kids, marriage, retirement), <em>must-haves vs nice-to-haves</em>, <em>deal-breakers</em> (e.g., HOA, stairs, busy road), and <em>5-year plan</em> (stay vs upgrade). The more specific, the better your tailored report.
            </p>
          </details>
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
        report: { markdown: data?.report, context: data?.context, listings: data?.listings } as never,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Coach failed');
    } finally {
      setLoading(false);
    }
  };

  const restart = () => { setReport(''); setStep(0); };

  const handlePrint = () => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>My Home-Buying Plan</title>
<style>
@page { size: letter; margin: 0.75in; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111827; line-height: 1.55; max-width: 720px; margin: 0 auto; padding: 24px; }
h1,h2,h3 { color: #0f766e; }
h1 { border-bottom: 3px solid #14b8a6; padding-bottom: 8px; }
table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 12px; }
th, td { border: 1px solid #e5e7eb; padding: 6px 10px; text-align: left; }
th { background: #f0fdfa; }
a { color: #0d9488; }
.header { font-size: 11px; color: #6b7280; text-align: right; margin-bottom: 12px; }
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<div class="header">PrismMoney — Home-Buying Plan · ${new Date().toLocaleDateString()}</div>
<h1>My Home-Buying Plan</h1>
${renderToStaticMarkup(<ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>)}
</body></html>`;
    const w = window.open('', '_blank', 'width=820,height=900');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  const handleDownload = () => {
    const blob = new Blob([`# My Home-Buying Plan\n\n_Generated ${new Date().toLocaleDateString()}_\n\n${report}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `home-buying-plan-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Plan downloaded');
  };

  if (report) {
    return (
      <Card className="prism-card-shine border-prism-teal/30">
        <CardHeader className="pb-4 flex flex-row items-center justify-between flex-wrap gap-2 border-b border-prism-teal/20">
          <CardTitle className="font-display flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-prism-teal" /> Your Personalized Report
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Save
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
              <Printer className="h-3.5 w-3.5" /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={restart}>Start Over</Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 px-6 sm:px-8">
          <div className="max-w-none text-[15px] leading-relaxed
            [&_h1]:font-display [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-prism-teal [&_h1]:mt-8 [&_h1]:mb-3 [&_h1]:pb-2 [&_h1]:border-b [&_h1]:border-prism-teal/20 [&_h1:first-child]:mt-0
            [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-prism-teal [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:flex [&_h2]:items-center [&_h2]:gap-2 [&_h2]:before:content-[''] [&_h2]:before:w-1 [&_h2]:before:h-5 [&_h2]:before:bg-prism-teal [&_h2]:before:rounded-full [&_h2:first-child]:mt-0
            [&_h3]:font-display [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2
            [&_p]:my-3 [&_p]:text-foreground/90
            [&_strong]:text-foreground [&_strong]:font-semibold
            [&_ul]:my-3 [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ul]:list-disc [&_ul]:marker:text-prism-teal
            [&_ol]:my-3 [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_ol]:list-decimal [&_ol]:marker:text-prism-teal
            [&_li]:pl-1
            [&_a]:text-prism-teal [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-prism-teal/80
            [&_blockquote]:border-l-4 [&_blockquote]:border-prism-teal/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-4
            [&_hr]:my-8 [&_hr]:border-border/50">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ node, ...props }) => (
                  <div className="my-5 overflow-x-auto rounded-lg border border-border/60 bg-card/50">
                    <table className="w-full text-sm border-collapse" {...props} />
                  </div>
                ),
                thead: ({ node, ...props }) => (
                  <thead className="bg-prism-teal/10 border-b border-prism-teal/30" {...props} />
                ),
                tr: ({ node, ...props }) => (
                  <tr className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors" {...props} />
                ),
                th: ({ node, ...props }) => (
                  <th className="text-left font-semibold text-foreground px-4 py-3 text-xs uppercase tracking-wide" {...props} />
                ),
                td: ({ node, ...props }) => (
                  <td className="px-4 py-3 text-foreground/90 align-top" {...props} />
                ),
              }}
            >{report}</ReactMarkdown>
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
              {loading ? 'Analyzing your full plan…' : 'Get My Unified Report'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
