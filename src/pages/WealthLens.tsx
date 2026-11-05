import { useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';

/** Card with a chevron that hides everything except its header. */
function FoldCard({ className = '', children }: { className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <Card className={`relative ${className} ${open ? '' : '[&>*:not(:first-child)]:hidden'}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? 'Collapse section' : 'Expand section'}
        className="absolute right-3 top-3 z-10 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
        <ChevronDown className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {children}
    </Card>
  );
}
import { QUESTIONS, PERSONAS, personaById, scoreAnswers, resolveResult, PersonaId } from '@/lib/wealthLens/persona';
import { LEAK_AREAS, LeakArea, LeakCheck, LeakStatus, leakTotals, leakAdjustment } from '@/lib/wealthLens/fiveIs';
import { evaluate, futureDollars, missingInputs, FreedomInputs } from '@/lib/wealthLens/freedom';

const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const YEAR = new Date().getFullYear();

type PathId = 'down' | 'up' | 'steady';
const PATHS: { id: PathId; name: string; blurb: string }[] = [
  { id: 'down', name: 'Live Large, Land Light (Spend Down)', blurb: 'More experiences now, a simpler, lower-cost lifestyle later.' },
  { id: 'up', name: 'Build First, Live Bigger (Spend Up)', blurb: 'Leaner now to make room for the lifestyle you want later.' },
  { id: 'steady', name: 'Live Well, Stay Steady (Steady Lifestyle)', blurb: 'A comfortable lifestyle now that you would keep later.' },
];

const SCENARIOS: { title: string; who: string; story: string; pitfalls: string[] }[] = [
  {
    title: 'Live Large, Land Light',
    who: 'Example: Dana, 55 — travels now, plans to downsize at 67.',
    story: 'Spends $6,000/mo while healthy and active (trips, hobbies, family visits), then plans to drop to $4,000/mo after selling the house and moving somewhere cheaper.',
    pitfalls: [
      'Counting on the "later" cut that never happens — spending habits are sticky.',
      'Forgetting healthcare and long-term care costs often rise with age.',
      'Assuming the house sale will cover everything; prices and timing can disappoint.',
    ],
  },
  {
    title: 'Build First, Live Bigger',
    who: 'Example: Marcus, 45 — lean now, bigger lifestyle at 60.',
    story: 'Keeps spending at $3,500/mo and invests hard so freedom life can be $6,500/mo — more travel, a nicer home, generous giving.',
    pitfalls: [
      'Burnout from saving so hard that today feels deprived.',
      'Delaying joy for health years you may not get back.',
      'Planning a bigger lifestyle without pricing it (taxes, upkeep, insurance).',
    ],
  },
  {
    title: 'Live Well, Stay Steady',
    who: 'Example: Priya, 50 — same comfortable life, now and later.',
    story: 'Spends about $5,000/mo today and expects to keep that same lifestyle in freedom years, funded by investments, Social Security and some part-time work.',
    pitfalls: [
      'Ignoring inflation — "the same life" costs more every year.',
      'Lifestyle creep quietly raising the "steady" number.',
      'No buffer for surprises like a roof, car or medical bill.',
    ],
  },
];

interface Shared {
  targetYear: number; endYear: number; monthlyTaxes: number; currentAssets: number; monthlyContribution: number;
  inflation: number; nominalReturn: number; endingGoal: number; currentBudget: number; currentTakeHome: number;
  ssMonthly: number; ssStart: number; pensionMonthly: number; pensionStart: number;
  workMonthly: number; workEnd: number; rentMonthly: number;
  useHomeSale: boolean; homeSaleNet: number; homeSaleYear: number;
}
interface PathIn { budgetBefore: number; changeYear: number; budgetAfter: number; oneTimeCost: number; targetYear: number; monthlyContribution: number }

const DEFAULT_SHARED: Shared = {
  targetYear: YEAR + 8, endYear: YEAR + 38, monthlyTaxes: 0, currentAssets: 0, monthlyContribution: 0,
  inflation: 3, nominalReturn: 6, endingGoal: 0, currentBudget: 0, currentTakeHome: 0,
  ssMonthly: 0, ssStart: YEAR + 8, pensionMonthly: 0, pensionStart: YEAR + 8, workMonthly: 0, workEnd: YEAR + 10, rentMonthly: 0,
  useHomeSale: false, homeSaleNet: 0, homeSaleYear: YEAR + 10,
};
const DEFAULT_PATHS: Record<PathId, PathIn> = {
  down: { budgetBefore: 0, changeYear: YEAR + 15, budgetAfter: 0, oneTimeCost: 0, targetYear: 0, monthlyContribution: -1 },
  up: { budgetBefore: 0, changeYear: YEAR + 10, budgetAfter: 0, oneTimeCost: 0, targetYear: 0, monthlyContribution: -1 },
  steady: { budgetBefore: 0, changeYear: 0, budgetAfter: 0, oneTimeCost: 0, targetYear: 0, monthlyContribution: -1 },
};

// Fictional example household used only by the "Fill in a sample" button.
const SAMPLE_SHARED: Shared = {
  targetYear: YEAR + 10, endYear: YEAR + 40, monthlyTaxes: 600, currentAssets: 150000, monthlyContribution: 1000,
  inflation: 3, nominalReturn: 6, endingGoal: 50000, currentBudget: 4000, currentTakeHome: 5500,
  ssMonthly: 2200, ssStart: YEAR + 12, pensionMonthly: 0, pensionStart: YEAR + 10, workMonthly: 800, workEnd: YEAR + 13, rentMonthly: 0,
  useHomeSale: false, homeSaleNet: 0, homeSaleYear: YEAR + 15,
};
const SAMPLE_PATHS: Record<PathId, PathIn> = {
  down: { budgetBefore: 5000, changeYear: YEAR + 20, budgetAfter: 3500, oneTimeCost: 10000, targetYear: 0, monthlyContribution: -1 },
  up: { budgetBefore: 3500, changeYear: YEAR + 15, budgetAfter: 5000, oneTimeCost: 15000, targetYear: 0, monthlyContribution: -1 },
  steady: { budgetBefore: 4200, changeYear: 0, budgetAfter: 0, oneTimeCost: 0, targetYear: 0, monthlyContribution: -1 },
};

function Num({ label, value, onChange, step = 1, hint }: { label: string; value: number; onChange: (n: number) => void; step?: number; hint?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input type="number" step={step} value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />
      {hint && <p className="text-[11px] leading-snug text-muted-foreground/80">{hint}</p>}
    </div>
  );
}

export default function WealthLens() {
  const [tab, setTab] = useState('start');
  // Quiz
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<Record<number, PersonaId>>({});
  const [tieBreak, setTieBreak] = useState<PersonaId | 'skip' | undefined>();
  const done = Object.keys(answers).length === QUESTIONS.length;
  const result = useMemo(() => (done ? resolveResult(scoreAnswers(answers), tieBreak) : null), [done, answers, tieBreak]);
  // Leaks
  const [leaks, setLeaks] = useState<LeakCheck>({});
  const [focus, setFocus] = useState<LeakArea | undefined>();
  const [applyLeak, setApplyLeak] = useState(false);
  const totals = leakTotals(leaks);
  // Freedom
  const [shared, setShared] = useState<Shared>(DEFAULT_SHARED);
  const [paths, setPaths] = useState(DEFAULT_PATHS);
  const [showMath, setShowMath] = useState<PathId | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const S = (k: keyof Shared) => (n: number) => setShared((s) => ({ ...s, [k]: n }));
  const P = (id: PathId, k: keyof PathIn) => (n: number) => setPaths((p) => ({ ...p, [id]: { ...p[id], [k]: n } }));

  const inputsFor = (id: PathId): FreedomInputs => {
    const p = paths[id];
    const adj = applyLeak ? leakAdjustment(leaks, focus) : { spendingCut: 0, incomeGain: 0 };
    const other = [
      shared.ssMonthly ? { label: 'Social Security', monthly: shared.ssMonthly, startYear: shared.ssStart } : null,
      shared.pensionMonthly ? { label: 'Pension', monthly: shared.pensionMonthly, startYear: shared.pensionStart } : null,
      shared.workMonthly ? { label: 'Planned work', monthly: shared.workMonthly, startYear: YEAR, endYear: shared.workEnd } : null,
      shared.rentMonthly ? { label: 'Net rental', monthly: shared.rentMonthly, startYear: YEAR } : null,
    ].filter(Boolean) as FreedomInputs['otherIncome'];
    const hasChange = id !== 'steady' && p.changeYear > 0;
    return {
      currentYear: YEAR,
      targetYear: p.targetYear || shared.targetYear,
      endYear: shared.endYear,
      budgetBefore: p.budgetBefore,
      changeYear: hasChange ? p.changeYear : undefined,
      budgetAfter: hasChange ? p.budgetAfter : undefined,
      oneTimeCost: p.oneTimeCost,
      monthlyTaxes: shared.monthlyTaxes,
      otherIncome: other,
      currentAssets: shared.currentAssets,
      monthlyContribution: p.monthlyContribution >= 0 ? p.monthlyContribution : shared.monthlyContribution,
      homeSaleNet: shared.useHomeSale ? shared.homeSaleNet : undefined,
      homeSaleYear: shared.useHomeSale ? shared.homeSaleYear : undefined,
      inflation: shared.inflation / 100,
      nominalReturn: shared.nominalReturn / 100,
      endingGoal: shared.endingGoal,
      currentBudget: shared.currentBudget || undefined,
      currentTakeHome: shared.currentTakeHome || undefined,
      ...adj,
    };
  };

  const saveFile = () => {
    const blob = new Blob([JSON.stringify({ answers, tieBreak, leaks, focus, applyLeak, shared, paths, savedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `freedom-plan-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    toast.success('Freedom Plan saved to this device');
  };
  const loadFile = async (f: File) => {
    try {
      const d = JSON.parse(await f.text());
      setAnswers(d.answers ?? {}); setTieBreak(d.tieBreak); setLeaks(d.leaks ?? {}); setFocus(d.focus);
      setApplyLeak(!!d.applyLeak); setShared({ ...DEFAULT_SHARED, ...d.shared }); setPaths({ ...DEFAULT_PATHS, ...d.paths });
      toast.success('Freedom Plan loaded');
    } catch { toast.error('That file could not be read'); }
  };

  const q = QUESTIONS[qi];

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">The Wealth Lens</h1>
        <p className="text-muted-foreground">What drives your money, where it may leak, and what freedom could cost.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="start">Start</TabsTrigger>
          <TabsTrigger value="quiz">1. Persona Quiz</TabsTrigger>
          <TabsTrigger value="leaks">2. The 5 Is</TabsTrigger>
          <TabsTrigger value="freedom">3. Freedom Number</TabsTrigger>
          <TabsTrigger value="results">4. Results</TabsTrigger>
        </TabsList>

        <TabsContent value="start">
          <Card className="glass-card">
            <CardContent className="py-10 text-center space-y-6">
              <p className="text-2xl font-semibold max-w-2xl mx-auto">You probably know what you earn. Do you know what it would take to live life on your terms?</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button size="lg" onClick={() => setTab('quiz')}>Find My Wealth Persona</Button>
                <Button size="lg" variant="outline" onClick={() => setTab('freedom')}>Calculate My Freedom Number</Button>
              </div>
              <div className="grid md:grid-cols-3 gap-3 text-left text-sm">
                <div className="p-4 rounded-lg bg-muted/40"><b>1.</b> What drives my money decisions?</div>
                <div className="p-4 rounded-lg bg-muted/40"><b>2.</b> Where might my money be leaking?</div>
                <div className="p-4 rounded-lg bg-muted/40"><b>3.</b> Do I know my Financial Freedom Number?</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quiz">
          <FoldCard className="glass-card">
            <CardHeader>
              <CardTitle>Wealth Building Persona Quiz</CardTitle>
              <Progress value={(Object.keys(answers).length / QUESTIONS.length) * 100} />
              <p className="text-xs text-muted-foreground">{Object.keys(answers).length} of {QUESTIONS.length} answered</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {!done || qi < QUESTIONS.length ? (
                <>
                  <p className="text-lg font-medium">Question {q.id}. {q.prompt}</p>
                  <div className="grid gap-2">
                    {q.answers.map((a) => (
                      <Button key={a.text} variant={answers[q.id] === a.persona ? 'default' : 'outline'} className="justify-start h-auto py-3 whitespace-normal text-left"
                        onClick={() => { setAnswers((s) => ({ ...s, [q.id]: a.persona })); setTieBreak(undefined); if (qi < QUESTIONS.length - 1) setQi(qi + 1); }}>
                        {a.text}
                      </Button>
                    ))}
                  </div>
                  <div className="flex justify-between">
                    <Button variant="ghost" disabled={qi === 0} onClick={() => setQi(qi - 1)}>Back</Button>
                    {qi < QUESTIONS.length - 1
                      ? <Button variant="ghost" disabled={!answers[q.id]} onClick={() => setQi(qi + 1)}>Next</Button>
                      : <Button disabled={!done} onClick={() => setQi(QUESTIONS.length)}>See my result</Button>}
                  </div>
                </>
              ) : null}
              {done && qi >= QUESTIONS.length && result && (
                <div className="space-y-4">
                  {result.needsTieBreaker ? (
                    <div className="space-y-2">
                      <p className="font-medium">It's a tie. Which sounds more like you?</p>
                      {result.primary.map((id) => (
                        <Button key={id} variant="outline" className="w-full justify-start h-auto py-3 whitespace-normal text-left" onClick={() => setTieBreak(id)}>
                          {personaById(id).drives}
                        </Button>
                      ))}
                      <Button variant="ghost" onClick={() => setTieBreak('skip')}>Skip — show a blended result</Button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <Badge>Primary Wealth Persona</Badge>
                        <h3 className="text-2xl font-bold mt-2">{result.primary.map((id) => personaById(id).name).join(' + ')}</h3>
                        {result.primary.map((id) => {
                          const p = personaById(id);
                          return (
                            <div key={id} className="grid md:grid-cols-3 gap-3 mt-3 text-sm">
                              <div className="p-3 rounded-lg bg-muted/40"><b>Strength:</b> {p.strength}</div>
                              <div className="p-3 rounded-lg bg-muted/40"><b>Blind spot:</b> {p.watch}</div>
                              <div className="p-3 rounded-lg bg-muted/40"><b>Try this:</b> {p.action}</div>
                            </div>
                          );
                        })}
                      </div>
                      {result.secondary.length > 0 && (
                        <div><Badge variant="secondary">Secondary Wealth Persona</Badge>
                          <p className="font-semibold mt-1">{result.secondary.map((id) => personaById(id).name).join(' & ')}</p></div>
                      )}
                      <p className="text-xs text-muted-foreground">These are habits you can work with, not fixed labels.</p>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setQi(0)}>Revise answers</Button>
                        <Button onClick={() => setTab('leaks')}>Next: The 5 Is</Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </FoldCard>
        </TabsContent>

        <TabsContent value="leaks">
          <FoldCard className="glass-card">
            <CardHeader><CardTitle>The 5 Is Money Leak Check</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {LEAK_AREAS.map((a) => {
                const e = leaks[a.id] ?? { status: 'unsure' as LeakStatus, period: 'monthly' as const };
                const set = (patch: Partial<typeof e>) => setLeaks((l) => ({ ...l, [a.id]: { ...e, ...patch } }));
                return (
                  <div key={a.id} className="p-4 rounded-lg border space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div><p className="font-semibold">{a.name}</p><p className="text-xs text-muted-foreground">{a.check}</p></div>
                      <Badge variant="outline">{a.kind === 'income' ? 'Possible income gain' : 'Possible savings'}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {([['working', 'Working Well'], ['leak', 'Potential Leak'], ['unsure', 'Unsure'], ['na', 'Not Applicable']] as [LeakStatus, string][]).map(([s, l]) => (
                        <Button key={s} size="sm" variant={leaks[a.id]?.status === s ? 'default' : 'outline'} onClick={() => set({ status: s })}>{l}</Button>
                      ))}
                    </div>
                    {leaks[a.id]?.status === 'leak' && (
                      <div className="flex flex-wrap items-end gap-2">
                        <div className="w-40"><Num label="Estimate (optional)" value={e.amount ?? 0} onChange={(n) => set({ amount: n })} /></div>
                        <Button size="sm" variant="outline" onClick={() => set({ period: e.period === 'monthly' ? 'annual' : 'monthly' })}>{e.period === 'monthly' ? 'per month' : 'per year'}</Button>
                        <Button size="sm" variant={focus === a.id ? 'default' : 'ghost'} onClick={() => setFocus(a.id)}>{focus === a.id ? 'Addressing first' : 'Address this first'}</Button>
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-4 rounded-lg bg-muted/40">Possible savings: <b>{usd(totals.savings)}/mo</b></div>
                <div className="p-4 rounded-lg bg-muted/40">Possible income gains: <b>{usd(totals.income)}/mo</b></div>
              </div>
              {focus && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={applyLeak} onChange={(e) => setApplyLeak(e.target.checked)} />
                  Add the "{LEAK_AREAS.find((a) => a.id === focus)?.name}" fix to my Freedom Number as an optional scenario (applied once)
                </label>
              )}
              <Button onClick={() => setTab('freedom')}>Next: Freedom Number</Button>
            </CardContent>
          </FoldCard>
        </TabsContent>

        <TabsContent value="freedom" className="space-y-4">
          <Card className="glass-card">
            <CardContent className="py-6">
              <p className="italic text-muted-foreground">Imagine waking up on a Tuesday and knowing you can choose how to spend it. What would that life cost each month? Start with the life you want, pick when you want it, and see how much your investments would need to cover.</p>
            </CardContent>
          </Card>
          <FoldCard className="glass-card">
            <CardHeader>
              <CardTitle>Three example lifestyles — and pitfalls to avoid</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Made-up households to show how each path plays out. Pick the one that sounds most like you.</p>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4">
              {SCENARIOS.map((s) => (
                <div key={s.title} className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                  <div>
                    <p className="font-semibold text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.who}</p>
                  </div>
                  <p className="text-sm text-foreground">{s.story}</p>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">Pitfalls to avoid</p>
                    <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                      {s.pitfalls.map((p) => <li key={p}>{p}</li>)}
                    </ul>
                  </div>
                </div>
              ))}
            </CardContent>
          </FoldCard>
          <FoldCard className="glass-card">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>When, and what's working for you</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Not sure what to enter? Load a made-up example to see how it works, then replace it with your numbers.</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setShared(SAMPLE_SHARED); setPaths(SAMPLE_PATHS); toast.success('Sample filled in — replace with your own numbers'); }}>Fill in a sample</Button>
                <Button size="sm" variant="ghost" onClick={() => { setShared(DEFAULT_SHARED); setPaths(DEFAULT_PATHS); }}>Clear</Button>
              </div>
            </CardHeader>
            <CardContent className="grid md:grid-cols-4 gap-3">
              <Num label="Target freedom year" hint={`Year work becomes optional. Example: ${YEAR + 10}`} value={shared.targetYear} onChange={S('targetYear')} />
              <Num label="Plan through year" hint={`Last year the money must last, e.g. age 95. Example: ${YEAR + 40}`} value={shared.endYear} onChange={S('endYear')} />
              <Num label="Monthly taxes still to cover" hint="From last year's tax return: 'total tax' ÷ 12. No return handy? Use ~15% of your planned freedom spending. Example: 600" value={shared.monthlyTaxes} onChange={S('monthlyTaxes')} />
              <Num label="Ending balance goal (optional)" hint="Money you want left at the end — for heirs or a legacy gift. 0 means spend it all. Example: 50000" value={shared.endingGoal} onChange={S('endingGoal')} />
              <Num label="Current investable assets" hint="Total on your latest retirement + brokerage statements (or the Investments page total). Exclude home equity and emergency fund. Example: 150000" value={shared.currentAssets} onChange={S('currentAssets')} />
              <Num label="Planned monthly contribution" hint="What you actually invest each month — check automatic transfers or paycheck deductions (401k/457/Roth). Example: 1000" value={shared.monthlyContribution} onChange={S('monthlyContribution')} />
              <Num label="Today's monthly take-home" hint="Net pay straight from your paystub. Example: 5500" value={shared.currentTakeHome} onChange={S('currentTakeHome')} />
              <Num label="Today's monthly spending" hint="Use your Budgets page total, or last month's bank/credit-card spending. Example: 4000" value={shared.currentBudget} onChange={S('currentBudget')} />
              <Num label="Social Security /mo" hint="From your ssa.gov statement, in today's dollars. Example: 2200" value={shared.ssMonthly} onChange={S('ssMonthly')} />
              <Num label="Social Security starts (year)" hint={`Year you plan to claim. Example: ${YEAR + 12}`} value={shared.ssStart} onChange={S('ssStart')} />
              <Num label="Pension /mo" hint="From your plan's annual benefit statement or HR. If unknown, leave 0 and skip." value={shared.pensionMonthly} onChange={S('pensionMonthly')} />
              <Num label="Pension starts (year)" hint="Year the pension begins." value={shared.pensionStart} onChange={S('pensionStart')} />
              <Num label="Planned work income /mo" hint="Consulting or part-time pay you plan to keep working for — like your quarterly AI Services fee. 0 if fully retired." value={shared.workMonthly} onChange={S('workMonthly')} />
              <Num label="Work income ends (year)" hint="Year that extra work stops." value={shared.workEnd} onChange={S('workEnd')} />
              <Num label="Net rental income /mo" hint="Rent received minus mortgage, taxes, insurance and repairs — from your rental bank deposits and property bills. 0 if none." value={shared.rentMonthly} onChange={S('rentMonthly')} />
              <div />
              <Num label="Inflation %" hint="Yearly price growth. 3 is a common long-run guess." step={0.1} value={shared.inflation} onChange={S('inflation')} />
              <Num label="Return after fees %" hint="Yearly investment growth after fees. 6 is a moderate guess." step={0.1} value={shared.nominalReturn} onChange={S('nominalReturn')} />
              <label className="flex items-center gap-2 text-sm col-span-2">
                <input type="checkbox" checked={shared.useHomeSale} onChange={(e) => setShared((s) => ({ ...s, useHomeSale: e.target.checked }))} />
                Model a home sale or downsize (net after costs and replacement housing)
              </label>
              {shared.useHomeSale && <>
                <Num label="Net home proceeds" hint="Ask a realtor for a sale price, then subtract ~7% selling costs and what your next home costs. Keep it a rough guess." value={shared.homeSaleNet} onChange={S('homeSaleNet')} />
                <Num label="Sale year" hint="Year you expect to sell." value={shared.homeSaleYear} onChange={S('homeSaleYear')} />
              </>}
              <p className="text-xs text-muted-foreground md:col-span-4">Enter amounts in today's purchasing power. Results also show future dollars adjusted for your inflation assumption. Keep spending and income on the same tax basis.</p>
            </CardContent>
          </FoldCard>
          <div className="grid lg:grid-cols-3 gap-4">
            {PATHS.map((path) => {
              const p = paths[path.id];
              return (
                <FoldCard key={path.id} className="glass-card">
                  <CardHeader><CardTitle className="text-base">{path.name}</CardTitle><p className="text-xs text-muted-foreground">{path.blurb}</p></CardHeader>
                  <CardContent className="space-y-2">
                    <Num label="Monthly Freedom Budget (first phase)" hint="Monthly spending for the life you want, in today's dollars. Example: 4200" value={p.budgetBefore} onChange={P(path.id, 'budgetBefore')} />
                    {path.id !== 'steady' && <>
                      <Num label={path.id === 'down' ? 'Downsizing year' : 'Year lifestyle grows'} hint="Year your spending changes."  value={p.changeYear} onChange={P(path.id, 'changeYear')} />
                      <Num label="Monthly budget after change" hint="Monthly spending after the change. Example: 3500 (down) or 5000 (up)" value={p.budgetAfter} onChange={P(path.id, 'budgetAfter')} />
                      <Num label="One-time transition cost" hint="Moving, remodel or big purchase at the change. Example: 10000" value={p.oneTimeCost} onChange={P(path.id, 'oneTimeCost')} />
                    </>}
                    <Num label="Target year (0 = shared)" hint="Leave 0 to use the target freedom year above." value={p.targetYear} onChange={P(path.id, 'targetYear')} />
                    <Num label="Monthly contribution (-1 = shared)" hint="Leave -1 to use the planned monthly contribution above." value={p.monthlyContribution} onChange={P(path.id, 'monthlyContribution')} />
                  </CardContent>
                </FoldCard>
              );
            })}
          </div>
          <Button onClick={() => setTab('results')}>See my results</Button>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <div className="grid lg:grid-cols-3 gap-4">
            {PATHS.map((path) => {
              const inp = inputsFor(path.id);
              const miss = missingInputs(inp);
              if (miss.length) return (
                <FoldCard key={path.id} className="glass-card"><CardHeader><CardTitle className="text-base">{path.name}</CardTitle></CardHeader>
                  <CardContent className="text-sm">Still needed: {miss.join(', ')}.</CardContent></FoldCard>
              );
              const r = evaluate(inp);
              return (
                <FoldCard key={path.id} className="glass-card">
                  <CardHeader><CardTitle className="text-base">{path.name}</CardTitle><p className="text-xs text-muted-foreground">Target {inp.targetYear} · projection</p></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs tabular-nums">
                        <thead><tr className="border-b text-muted-foreground"><th className="text-left py-2 font-medium">Amount</th><th className="text-right px-2 font-medium">Today ({YEAR})</th><th className="text-right font-medium">Future ({inp.targetYear})</th></tr></thead>
                        <tbody>
                          {[
                            ['Freedom Budget /mo', r.freedomBudget, r.future.freedomBudget],
                            ...(inp.budgetAfter != null && inp.changeYear != null ? [[`Budget /mo from ${inp.changeYear}¹`, inp.budgetAfter, futureDollars(inp.budgetAfter, inp.inflation, YEAR, inp.changeYear)]] : []),
                            ['Monthly Freedom Gap', r.monthlyGap, r.future.monthlyGap],
                            ['Financial Freedom Number', r.needed, r.future.needed],
                            ['Projected assets', r.projected, r.future.projected],
                            [r.surplus >= 0 ? 'Estimated surplus' : 'Funding gap', Math.abs(r.surplus), Math.abs(r.future.surplus)],
                          ].map(([label, today, future]) => (
                            <tr key={String(label)} className="border-b border-border/50"><th className="py-3 text-left font-medium">{label}</th><td className="text-right px-2 whitespace-nowrap">{usd(Number(today))}</td><td className="text-right font-semibold whitespace-nowrap text-primary">{usd(Number(future))}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {inp.budgetAfter != null && <p className="text-xs text-muted-foreground">¹ Later lifestyle budget uses inflation through {inp.changeYear}, not the target year.</p>}
                    <p className="text-xs text-muted-foreground">Future dollars reflect {shared.inflation}% annual inflation, not extra purchasing power.</p>
                    <p>Monthly contribution in today's dollars: <b>{usd(inp.monthlyContribution + (inp.incomeGain ?? 0))}</b></p>
                    <div className="pt-2 space-y-1">
                      <p className="font-medium">Lower-return stress test: {Number((r.low.nominalReturn * 100).toFixed(2))}% versus {shared.nominalReturn}%</p>
                      <p className="text-xs text-muted-foreground">Two percentage points lower; same {shared.inflation}% inflation. Not a worst-case guarantee.</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs tabular-nums">
                          <thead><tr className="text-muted-foreground"><th className="text-left py-2 font-medium">Backup case</th><th className="text-right px-2 font-medium">Today</th><th className="text-right font-medium">{inp.targetYear}</th></tr></thead>
                          <tbody>{[
                            ['Portfolio needed', r.low.needed, r.future.low.needed],
                            ['Projected assets', r.low.projected, r.future.low.projected],
                            [r.low.surplus >= 0 ? 'Estimated surplus' : 'Funding gap', Math.abs(r.low.surplus), Math.abs(r.future.low.surplus)],
                          ].map(([label, today, future]) => <tr key={String(label)}><th className="text-left py-2 font-medium">{label}</th><td className="text-right px-2 whitespace-nowrap">{usd(Number(today))}</td><td className="text-right whitespace-nowrap">{usd(Number(future))}</td></tr>)}</tbody>
                        </table>
                      </div>
                    </div>
                    {r.peakYears.length > 0 && <p className="text-xs">Highest-gap years: {r.peakYears.slice(0, 6).join(', ')}{r.peakYears.length > 6 ? '…' : ''}</p>}
                    {r.contributionTooHigh && <p className="text-xs text-destructive">Your current budget leaves {usd(r.room ?? 0)}/mo to invest, less than you plan to contribute.</p>}
                    <Button size="sm" variant="ghost" onClick={() => setShowMath(showMath === path.id ? null : path.id)}>Show My Math</Button>
                    {showMath === path.id && (
                      <div className="max-h-64 overflow-auto text-xs">
                        <p className="mb-1">Inflation {shared.inflation}% · return after fees {shared.nominalReturn}%. Each cell: today / that year's dollars. Annual totals.</p>
                        <table className="w-full"><thead><tr className="text-left"><th>Year</th><th>Spend</th><th>Other inc.</th><th>Gap</th></tr></thead>
                          <tbody>{r.rows.map((row) => <tr key={row.year}><td className="align-top py-2">{row.year}</td>{[row.spending, row.otherIncome, row.gap].map((amount, index) => <td key={index} className="py-2 align-top"><div>{usd(amount)}</div><div className="text-muted-foreground">{usd(futureDollars(amount, inp.inflation, YEAR, row.year))}</div></td>)}</tr>)}</tbody></table>
                      </div>
                    )}
                  </CardContent>
                </FoldCard>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={saveFile}>Save My Freedom Plan</Button>
            <Button variant="outline" onClick={() => setTab('freedom')}>Compare Another Lifestyle</Button>
            <Button variant="ghost" onClick={() => fileRef.current?.click()}>Open a saved plan</Button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
          </div>
          <p className="text-xs text-muted-foreground">Saved plans go to a private file on your device. Nothing is sent online.</p>
          <Card className="glass-card"><CardContent className="py-6 text-lg font-medium">
            If your Freedom Number feels out of reach, what would you rather change first: when you get there, what you spend, or how much you set aside?
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
