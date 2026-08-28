import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Layers, RotateCcw, Plus, X, TrendingUp, TrendingDown, Minus, ShieldQuestion,
  Home, CreditCard, Search, CheckCircle2, XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CreditAccount } from '@/hooks/use-credit-accounts';
import { useCreditInquiries } from '@/hooks/use-credit-inquiries';
import {
  simulateTriBureau, buildCardTable, projectedMiddleScore, BUREAU_PROFILE, BUREAUS,
  DEROGATORY_STATUSES, loadMortgageFico,
  type ScenarioAction, type Bureau, type Tradeline,
} from '@/lib/credit/triBureauModel';
import { eligiblePrograms } from '@/lib/home-buying/mortgage-fico';
import { useFinancialProfile, profileNumbers } from '@/hooks/use-financial-profile';
import { calcMortgage, estimateRateForFico } from '@/lib/home-buying/mortgage-math';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const bandColor: Record<string, string> = {
  ideal: 'text-prism-lime',
  good: 'text-prism-teal',
  watch: 'text-prism-amber',
  high: 'text-prism-rose',
  maxed: 'text-prism-rose',
};

let seq = 0;
const nextId = () => `act-${++seq}`;

export default function TriBureauSimulator({ accounts }: { accounts: CreditAccount[] }) {
  const { inquiries } = useCreditInquiries() as any;
  const { profile } = useFinancialProfile();
  const [actions, setActions] = useState<ScenarioAction[]>([]);
  const [newCardLimit, setNewCardLimit] = useState('');
  const [homePrice, setHomePrice] = useState('185000');
  const [downPct, setDownPct] = useState('5');

  const tradelines = useMemo<Tradeline[]>(
    () =>
      accounts.map(a => ({
        id: a.id,
        bureau: a.bureau,
        account_name: a.account_name,
        account_type: a.account_type,
        account_status: a.account_status,
        balance: Number(a.balance) || 0,
        credit_limit: a.credit_limit != null ? Number(a.credit_limit) : null,
        date_opened: a.date_opened,
      })),
    [accounts],
  );

  const inquiriesByBureau = useMemo(() => {
    const map: Record<string, number[]> = { Equifax: [], Experian: [], TransUnion: [] };
    const now = Date.now();
    for (const i of (inquiries || []) as any[]) {
      if (i.inquiry_type !== 'hard') continue;
      if (i.dispute_status === 'removed') continue;
      const months = (now - new Date(i.inquiry_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
      if (map[i.bureau]) map[i.bureau].push(Math.max(0, months));
    }
    return map;
  }, [inquiries]);

  const reportedScores = useMemo(() => loadMortgageFico(), []);

  const estimates = useMemo(
    () => simulateTriBureau({ tradelines, inquiriesByBureau, actions, reportedScores }),
    [tradelines, inquiriesByBureau, actions, reportedScores],
  );
  const cards = useMemo(() => buildCardTable(tradelines, actions), [tradelines, actions]);
  const baseCards = useMemo(() => buildCardTable(tradelines, []), [tradelines]);

  const baseMiddle = useMemo(() => {
    const f: Record<string, number> = {};
    for (const e of estimates) if (e.base != null) f[e.bureau] = e.base;
    const vals = Object.values(f).sort((a, b) => a - b);
    return vals.length === 3 ? vals[1] : vals[0] ?? null;
  }, [estimates]);
  const simMiddle = projectedMiddleScore(estimates);

  const derogs = tradelines.filter(t => DEROGATORY_STATUSES.includes(t.account_status));

  // ─── action helpers ───
  const add = (a: ScenarioAction) => setActions(p => [...p, a]);
  const remove = (id: string) => setActions(p => p.filter(a => ('id' in a ? a.id : '') !== id));
  const reset = () => setActions([]);

  const paydownFor = (accountId: string) =>
    actions.filter(a => a.kind === 'paydown' && a.accountId === accountId)
      .reduce((s, a: any) => s + a.amount, 0);

  const setPaydown = (accountId: string, amount: number) => {
    setActions(p => [
      ...p.filter(a => !(a.kind === 'paydown' && a.accountId === accountId)),
      ...(amount > 0 ? [{ kind: 'paydown' as const, id: nextId(), accountId, amount }] : []),
    ]);
  };

  const isDisputed = (accountId: string) => actions.some(a => a.kind === 'dispute' && a.accountId === accountId);
  const toggleDispute = (accountId: string) => {
    setActions(p =>
      isDisputed(accountId)
        ? p.filter(a => !(a.kind === 'dispute' && a.accountId === accountId))
        : [...p, { kind: 'dispute', id: nextId(), accountId }],
    );
  };

  const inquiryWait = actions.find(a => a.kind === 'ageInquiries') as any;
  const setInquiryWait = (months: number) =>
    setActions(p => [
      ...p.filter(a => a.kind !== 'ageInquiries'),
      ...(months > 0 ? [{ kind: 'ageInquiries' as const, id: nextId(), months }] : []),
    ]);

  const newInquiries = actions.find(a => a.kind === 'newInquiry') as any;
  const setNewInquiries = (count: number) =>
    setActions(p => [
      ...p.filter(a => a.kind !== 'newInquiry'),
      ...(count > 0 ? [{ kind: 'newInquiry' as const, id: nextId(), count }] : []),
    ]);

  // ─── mortgage drivers ───
  const nums = profileNumbers(profile);
  const price = parseFloat(homePrice) || 0;
  const dp = parseFloat(downPct) || 0;
  const rateNow = estimateRateForFico(baseMiddle ?? 0);
  const rateSim = estimateRateForFico(simMiddle ?? 0);
  const pitiNow = price > 0
    ? calcMortgage({ price, downPct: dp, ratePct: rateNow, termYears: 30, propertyTaxPct: 1.6, insurancePct: 0.5, pmiPct: 0.55 })
    : null;
  const pitiSim = price > 0
    ? calcMortgage({ price, downPct: dp, ratePct: rateSim, termYears: 30, propertyTaxPct: 1.6, insurancePct: 0.5, pmiPct: 0.55 })
    : null;
  const backEndNow = nums.totalIncome > 0 && pitiNow ? ((nums.debts + pitiNow.monthlyPITI) / nums.totalIncome) * 100 : 0;
  const backEndSim = nums.totalIncome > 0 && pitiSim ? ((nums.debts + pitiSim.monthlyPITI) / nums.totalIncome) * 100 : 0;
  const frontEndSim = nums.totalIncome > 0 && pitiSim ? (pitiSim.monthlyPITI / nums.totalIncome) * 100 : 0;
  const ltv = 100 - dp;

  if (accounts.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* ─── Three-score panel ─── */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Tri-Bureau Score Simulator
              </CardTitle>
              <CardDescription>
                Each bureau scored on the tradelines it actually reports — with the mortgage model
                lenders pull from that bureau.
              </CardDescription>
            </div>
            {actions.length > 0 && (
              <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" /> Clear scenario
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            {estimates.map(e => {
              const p = BUREAU_PROFILE[e.bureau as Bureau];
              return (
                <div key={e.bureau} className="rounded-xl border border-border/40 bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={cn('text-sm font-semibold', p.color)}>{e.bureau}</span>
                    <Badge variant="secondary" className="text-[10px]">{p.mortgageModel}</Badge>
                  </div>

                  {e.base == null ? (
                    <p className="text-xs text-muted-foreground py-3">
                      No tradelines imported for this bureau yet.
                    </p>
                  ) : (
                    <>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold tabular-nums">{e.base}</span>
                        {e.delta !== 0 && (
                          <>
                            <span className="text-muted-foreground text-sm mb-1">→</span>
                            <span className={cn('text-2xl font-bold tabular-nums', e.delta > 0 ? 'text-prism-lime' : 'text-prism-rose')}>
                              {e.projected}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        {e.delta > 0 ? <TrendingUp className="h-3.5 w-3.5 text-prism-lime" />
                          : e.delta < 0 ? <TrendingDown className="h-3.5 w-3.5 text-prism-rose" />
                          : <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span className={e.delta > 0 ? 'text-prism-lime' : e.delta < 0 ? 'text-prism-rose' : 'text-muted-foreground'}>
                          {e.delta > 0 ? '+' : ''}{e.delta} pts
                        </span>
                        {e.delta !== 0 && (
                          <span className="text-muted-foreground">
                            (range {Math.max(300, (e.projected ?? 0) - e.margin)}–{Math.min(850, (e.projected ?? 0) + e.margin)})
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                        <span>Util {e.aggregateUtil.toFixed(0)}% → <span className="text-foreground">{e.simAggregateUtil.toFixed(0)}%</span></span>
                        <span>{e.tradelineCount} tradelines</span>
                        <span>Derogs {e.derogCount} → <span className="text-foreground">{e.simDerogCount}</span></span>
                        <span>Inquiries {e.inquiries12mo} → <span className="text-foreground">{e.simInquiries12mo}</span></span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* middle score */}
          <div className="rounded-xl border border-prism-amber/30 bg-prism-amber/5 p-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Qualifying score (middle of three — what underwriting uses)</p>
              <p className="text-xl font-bold tabular-nums">
                {baseMiddle ?? '—'}
                {simMiddle != null && simMiddle !== baseMiddle && (
                  <span className={cn('ml-2', (simMiddle ?? 0) > (baseMiddle ?? 0) ? 'text-prism-lime' : 'text-prism-rose')}>
                    → {simMiddle}
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {eligiblePrograms(simMiddle ?? 0).map(pr => (
                <Badge key={pr.program} variant={pr.ok ? 'default' : 'outline'} className="text-[10px] gap-1">
                  {pr.ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {pr.program}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Scenario stacking ─── */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4 text-prism-teal" /> Stack Actions
          </CardTitle>
          <CardDescription>Combine pay-downs, disputes and inquiry timing — all three scores update together.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* per-card paydown */}
          {baseCards.some(c => c.balance > 0) && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" /> Pay down by card
              </h4>
              {baseCards.filter(c => c.balance > 0).map(c => {
                const paid = paydownFor(c.id);
                return (
                  <div key={c.id} className="rounded-lg border border-border/40 p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-medium">{c.name} <span className="text-[10px] text-muted-foreground">{c.bureau}</span></span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {fmt(c.balance)} / {fmt(c.limit)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Slider
                        min={0}
                        max={Math.max(1, Math.round(c.balance))}
                        step={Math.max(1, Math.round(c.balance / 50))}
                        value={[paid]}
                        onValueChange={([v]) => setPaydown(c.id, v)}
                        className="flex-1"
                      />
                      <span className="text-xs font-mono w-24 text-right shrink-0">
                        pay {fmt(paid)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* disputes */}
          {derogs.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Dispute / remove negatives</h4>
              <div className="flex flex-wrap gap-2">
                {derogs.map(d => (
                  <Button
                    key={d.id}
                    size="sm"
                    variant={isDisputed(d.id) ? 'default' : 'outline'}
                    onClick={() => toggleDispute(d.id)}
                    className="text-xs h-8"
                  >
                    {isDisputed(d.id) && <X className="h-3 w-3 mr-1" />}
                    {d.account_name} · {d.account_status}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* inquiry timing */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5" /> Wait before applying (months)
              </Label>
              <div className="flex items-center gap-3">
                <Slider min={0} max={24} step={1} value={[inquiryWait?.months ?? 0]} onValueChange={([v]) => setInquiryWait(v)} className="flex-1" />
                <span className="text-sm font-mono w-10 text-right">{inquiryWait?.months ?? 0}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Ages existing hard inquiries out of the 12-month window.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">New hard inquiries you plan to take</Label>
              <div className="flex items-center gap-3">
                <Slider min={0} max={6} step={1} value={[newInquiries?.count ?? 0]} onValueChange={([v]) => setNewInquiries(v)} className="flex-1" />
                <span className="text-sm font-mono w-10 text-right">{newInquiries?.count ?? 0}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Each costs 3–5 pts depending on the bureau's model.</p>
            </div>
          </div>

          {/* new card / limit increase */}
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Add a new limit (new card or CLI)</Label>
              <Input
                value={newCardLimit}
                onChange={e => setNewCardLimit(e.target.value)}
                placeholder="5000"
                inputMode="numeric"
                className="h-9 w-32"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const v = parseFloat(newCardLimit);
                if (v > 0) { add({ kind: 'newCard', id: nextId(), limit: v }); setNewCardLimit(''); }
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add limit
            </Button>
          </div>

          {/* stack list */}
          {actions.length > 0 && (
            <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-1.5">
              <p className="text-xs font-semibold">Scenario stack ({actions.length})</p>
              {actions.map(a => {
                const name = 'accountId' in a
                  ? tradelines.find(t => t.id === (a as any).accountId)?.account_name ?? 'Account'
                  : '';
                const label =
                  a.kind === 'paydown' ? `Pay down ${fmt((a as any).amount)} on ${name}`
                  : a.kind === 'dispute' ? `Remove negative on ${name}`
                  : a.kind === 'limitIncrease' ? `+${fmt((a as any).amount)} limit on ${name}`
                  : a.kind === 'ageInquiries' ? `Wait ${(a as any).months} months before applying`
                  : a.kind === 'newInquiry' ? `Take ${(a as any).count} new hard inquiries`
                  : `Add ${fmt((a as any).limit)} of new credit limit`;
                return (
                  <div key={a.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground truncate">{label}</span>
                    <button onClick={() => remove(a.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Utilization by card ─── */}
      {cards.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-prism-amber" /> Utilization by Card
            </CardTitle>
            <CardDescription>
              FICO scores both aggregate and per-card utilization — one maxed card drags you down even
              when the total looks fine.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {cards.map(c => (
              <div key={c.id} className="rounded-lg border border-border/40 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">
                    {c.name} <span className="text-[10px] text-muted-foreground">{c.bureau}</span>
                  </span>
                  <div className="flex items-center gap-2 shrink-0 text-xs">
                    <span className="text-muted-foreground">{c.util.toFixed(0)}%</span>
                    {c.simUtil !== c.util && (
                      <>
                        <span className="text-muted-foreground">→</span>
                        <span className={cn('font-semibold', bandColor[c.band])}>{c.simUtil.toFixed(0)}%</span>
                      </>
                    )}
                    <Badge variant="outline" className={cn('text-[10px] capitalize', bandColor[c.band])}>{c.band}</Badge>
                  </div>
                </div>
                <Progress value={Math.min(100, c.simUtil)} className="h-1.5" />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{fmt(c.simBalance)} of {fmt(c.simLimit)}</span>
                  <span>
                    Directional effect: <span className={c.simEffect > c.effect ? 'text-prism-lime' : 'text-foreground'}>{c.simEffect} pts</span>
                    {c.simEffect !== c.effect && <span className="text-muted-foreground"> (was {c.effect})</span>}
                  </span>
                </div>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">
              Sweet spot is under 9% per card and in aggregate. Balances reported at statement cut —
              pay before the statement date, not the due date.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ─── Mortgage decision drivers ─── */}
      <Card className="glass-card border-prism-teal/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Home className="h-4 w-4 text-prism-teal" /> How This Maps to Lender Decisions
          </CardTitle>
          <CardDescription>Score is one of three levers. DTI, LTV and PITI decide the rest.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Target price</Label>
              <Input value={homePrice} onChange={e => setHomePrice(e.target.value)} inputMode="numeric" className="h-9 w-32" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Down payment %</Label>
              <Input value={downPct} onChange={e => setDownPct(e.target.value)} inputMode="numeric" className="h-9 w-24" />
            </div>
          </div>

          <div className="grid sm:grid-cols-4 gap-3">
            <Driver label="Qualifying score" value={simMiddle != null ? String(simMiddle) : '—'}
              note={simMiddle != null && baseMiddle != null && simMiddle !== baseMiddle ? `from ${baseMiddle}` : 'middle of three'} />
            <Driver label="Est. rate" value={`${rateSim.toFixed(2)}%`}
              note={rateSim !== rateNow ? `from ${rateNow.toFixed(2)}%` : '30-yr fixed'}
              tone={rateSim < rateNow ? 'good' : undefined} />
            <Driver label="PITI" value={pitiSim ? fmt(pitiSim.monthlyPITI) : '—'}
              note={pitiNow && pitiSim && pitiSim.monthlyPITI !== pitiNow.monthlyPITI ? `from ${fmt(pitiNow.monthlyPITI)}` : 'incl. tax/ins/PMI'}
              tone={pitiSim && pitiNow && pitiSim.monthlyPITI < pitiNow.monthlyPITI ? 'good' : undefined} />
            <Driver label="LTV" value={`${ltv.toFixed(0)}%`} note={ltv > 80 ? 'PMI required' : 'no PMI'}
              tone={ltv > 95 ? 'bad' : ltv > 80 ? 'warn' : 'good'} />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Back-end DTI (all debt + PITI)</p>
              <p className={cn('text-lg font-bold tabular-nums',
                backEndSim > 45 ? 'text-prism-rose' : backEndSim > 43 ? 'text-prism-amber' : 'text-prism-lime')}>
                {nums.totalIncome > 0 ? `${backEndSim.toFixed(0)}%` : '—'}
                {backEndNow !== backEndSim && nums.totalIncome > 0 && (
                  <span className="text-xs text-muted-foreground ml-2">from {backEndNow.toFixed(0)}%</span>
                )}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Conventional guideline 43–45%; FHA allows up to 56.9% with compensating factors.
                {nums.totalIncome <= 0 && ' Add income and monthly debts in your Financial Profile for a real number.'}
              </p>
            </div>
            <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Front-end DTI (housing only)</p>
              <p className={cn('text-lg font-bold tabular-nums', frontEndSim > 31 ? 'text-prism-amber' : 'text-prism-lime')}>
                {nums.totalIncome > 0 ? `${frontEndSim.toFixed(0)}%` : '—'}
              </p>
              <p className="text-[11px] text-muted-foreground">Target 28–31% of gross income.</p>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Note: paying down revolving balances helps your score <em>and</em> your DTI — it's the only
            action on this page that moves both levers at once.
          </p>
        </CardContent>
      </Card>

      {/* ─── Confidence & assumptions ─── */}
      <Card className="glass-card border-prism-sky/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldQuestion className="h-4 w-4 text-prism-sky" /> Confidence &amp; Assumptions
          </CardTitle>
          <CardDescription>Why these are directional estimates, and exactly what they're built from.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-1.5 text-xs text-muted-foreground">
            <p className="text-foreground font-semibold text-sm">These are not FICO scores.</p>
            <p>
              Real FICO and VantageScore numbers can only be produced by licensees running the actual
              algorithms against live bureau data (that's what myFICO sells). This simulator is a
              rules-based model that reproduces the published factor weights and directional behavior —
              so it's reliable about <em>which action helps most and roughly how much</em>, not about
              landing on an exact number.
            </p>
            <p>
              Where we have a reported bureau score on file, we anchor to it and apply our modeled delta.
              Where we don't, the absolute level is our own estimate and the range widens accordingly.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            {estimates.map(e => (
              <div key={e.bureau} className="rounded-lg border border-border/40 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={cn('text-sm font-semibold', BUREAU_PROFILE[e.bureau as Bureau].color)}>{e.bureau}</span>
                  <Badge variant="outline" className="text-[10px]">±{e.margin} pts</Badge>
                </div>
                <ul className="space-y-0.5">
                  {e.dataInputs.map(d => (
                    <li key={d.label} className="flex items-center gap-1.5 text-[11px]">
                      {d.present
                        ? <CheckCircle2 className="h-3 w-3 text-prism-lime shrink-0" />
                        : <XCircle className="h-3 w-3 text-muted-foreground shrink-0" />}
                      <span className={d.present ? 'text-foreground/80' : 'text-muted-foreground line-through'}>{d.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold">Modeling assumptions</p>
            <ul className="text-[11px] text-muted-foreground space-y-0.5">
              <li>• Factor weights: derogatory marks 35%, utilization 30%, credit age 15%, mix 10%, file depth 10%.</li>
              <li>• Per-bureau sensitivity differs because each bureau is scored under a different model
                ({BUREAUS.map(b => `${b} = ${BUREAU_PROFILE[b].mortgageModel}`).join(', ')}).</li>
              <li>• Hard inquiries cost 3–5 pts each and only count for 12 months.</li>
              <li>• A single card above 75% utilization applies an extra 8–12 pt drag regardless of aggregate.</li>
              <li>• Dispute simulations assume the item is fully deleted, not just marked "disputed" — partial outcomes score lower.</li>
              <li>• Nothing here models payment-history recency beyond derogatory status, so a recent 30-day late may not be fully captured.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Driver({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: 'good' | 'warn' | 'bad' }) {
  return (
    <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn('text-lg font-bold tabular-nums',
        tone === 'good' ? 'text-prism-lime' : tone === 'warn' ? 'text-prism-amber' : tone === 'bad' ? 'text-prism-rose' : 'text-foreground')}>
        {value}
      </p>
      {note && <p className="text-[10px] text-muted-foreground">{note}</p>}
    </div>
  );
}
