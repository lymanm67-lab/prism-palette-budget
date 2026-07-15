import { useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Home, Zap, TrendingDown, Trophy, Sparkles, Loader2, RefreshCw, Info, ChevronDown, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useFinancialProfile, profileNumbers } from '@/hooks/use-financial-profile';
import { useCurrency } from '@/hooks/use-currency';
import AnimatedNumber from '@/components/AnimatedNumber';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Legend, AreaChart, Area,
} from 'recharts';
import { runAllStrategies, type StrategyResult } from '@/lib/mortgage-freedom/simulators';
import { computeFreedomScore } from '@/lib/mortgage-freedom/freedom-score';
import { recommend } from '@/lib/mortgage-freedom/recommender';
import AffordabilityPlanner from './AffordabilityPlanner';
import StressTest from './StressTest';
import ScenarioLab from './ScenarioLab';
import DashboardGauges from './DashboardGauges';
import HomebuyerAssistance from './HomebuyerAssistance';
import WealthIntegration from './WealthIntegration';
import SmartNotifications from './SmartNotifications';
import AiCoachChat from './AiCoachChat';
import AdvancedCharts from './AdvancedCharts';
import PayoffGoalCalculator from './PayoffGoalCalculator';
import RefinanceCheck from './RefinanceCheck';
import PmiDropoff from './PmiDropoff';
import RecastCard from './RecastCard';





const COACH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mortgage-freedom-coach`;

const STRATEGY_META: Record<StrategyResult['strategy'], { icon: any; label: string; blurb: string; color: string }> = {
  'traditional':      { icon: Home,        label: 'Traditional',       blurb: 'Fixed payment, no changes.',       color: 'from-slate-500/20 to-slate-500/5' },
  'extra-principal':  { icon: TrendingDown, label: 'Extra Principal',   blurb: 'Pay more toward principal.',       color: 'from-emerald-500/20 to-emerald-500/5' },
  'heloc-accel':      { icon: Zap,          label: 'HELOC Acceleration', blurb: 'Chunk mortgage with HELOC.',       color: 'from-amber-500/20 to-amber-500/5' },
  'first-lien-heloc': { icon: Trophy,       label: '1st-Lien HELOC',    blurb: 'All-in-one primary loan.',         color: 'from-rose-500/20 to-rose-500/5' },
};

export default function FreedomCenter() {
  const { profile } = useFinancialProfile();
  const p = profileNumbers(profile);
  const { formatCurrency } = useCurrency();

  // ─── Page-local mortgage inputs (rate, term, payment aren't in profile) ───
  const [mortgageRate, setMortgageRate] = useState(6.5);
  const [remainingYears, setRemainingYears] = useState(28);
  const [monthlyPayment, setMonthlyPayment] = useState(() => {
    const bal = p.mortgageBalance || 350000;
    const r = 6.5 / 100 / 12;
    const n = 28 * 12;
    return Math.round((bal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
  });

  // Simulator inputs
  const [extraMonthly, setExtraMonthly] = useState(0);
  const [quarterlyExtra, setQuarterlyExtra] = useState(0);
  const [annualLump, setAnnualLump] = useState(0);
  const [taxRefund, setTaxRefund] = useState(0);
  const [annualBonus, setAnnualBonus] = useState(0);
  const [biweekly, setBiweekly] = useState(false);
  const [helocRate, setHelocRate] = useState(8.5);
  const [helocLimit, setHelocLimit] = useState(50000);
  const [sweepPct, setSweepPct] = useState(100);

  const inputs = useMemo(() => ({
    mortgageBalance: p.mortgageBalance || 350000,
    mortgageRate,
    remainingMonths: remainingYears * 12,
    monthlyPayment,
    monthlySurplus: Math.max(0, p.netSurplus),
    homeValue: p.homeValue || 500000,
    extraMonthly, quarterlyExtra, annualLump, taxRefund, annualBonus, biweekly,
    helocRate, helocLimit, helocSweepPct: sweepPct,
  }), [p.mortgageBalance, p.homeValue, p.netSurplus, mortgageRate, remainingYears, monthlyPayment,
      extraMonthly, quarterlyExtra, annualLump, taxRefund, annualBonus, biweekly,
      helocRate, helocLimit, sweepPct]);

  const strategies = useMemo(() => runAllStrategies(inputs), [inputs]);

  const score = useMemo(() => computeFreedomScore({
    monthlyIncome: p.totalIncome,
    monthlyDebts: p.debts,
    monthlyExpenses: p.expenses,
    monthlyHousingPayment: monthlyPayment,
    creditScore: parseInt(profile.creditScore) || 0,
    homeValue: p.homeValue,
    mortgageBalance: p.mortgageBalance,
    monthlySurplus: p.netSurplus,
    mortgageRate,
    marketRate: 7.0,
  }), [p, monthlyPayment, profile.creditScore, mortgageRate]);

  const rec = useMemo(() => recommend(strategies, {
    mortgageRate,
    helocRate,
    monthlySurplus: p.netSurplus,
    creditScore: parseInt(profile.creditScore) || 0,
    emergencyMonths: (p.netSurplus * 3) / Math.max(p.expenses, 1),
  }), [strategies, mortgageRate, helocRate, p.netSurplus, profile.creditScore, p.expenses]);

  const equity = Math.max(0, p.homeValue - p.mortgageBalance);
  const ltv = p.homeValue > 0 ? (p.mortgageBalance / p.homeValue) * 100 : 0;
  const remainingInterest = strategies.traditional.totalInterest;
  const dti = p.totalIncome > 0 ? ((p.debts + monthlyPayment) / p.totalIncome) * 100 : 0;
  const emergencyMonths = p.expenses > 0
    ? Math.max(0, p.netSurplus * 3) / p.expenses
    : 0;

  const currentAge = 40;
  const retirementAge = 65;
  const winnerResult: StrategyResult =
    rec.winner === 'traditional' ? strategies.traditional :
    rec.winner === 'extra-principal' ? strategies.extraPrincipal :
    rec.winner === 'heloc-accel' ? strategies.helocAccel :
    strategies.firstLien;
  const freedomAge = winnerResult.years ? Math.round(currentAge + winnerResult.years) : null;

  // Naive HELOC shock sensitivity proxy for Smart Alerts
  const helocShockSensitivity = Math.round(
    Math.min(100, Math.max(0,
      50 + (emergencyMonths - 3) * 10 + (p.netSurplus > 0 ? 20 : -30)
    ))
  );

  const chartData = useMemo(() => {
    const step = 6;
    const maxLen = Math.max(
      strategies.traditional.schedule.length,
      strategies.extraPrincipal.schedule.length,
      strategies.helocAccel.schedule.length,
      strategies.firstLien.schedule.length,
    );
    const out: any[] = [];
    for (let i = 0; i < maxLen; i += step) {
      out.push({
        month: i,
        year: (i / 12).toFixed(1),
        Traditional: strategies.traditional.schedule[i]?.balance ?? 0,
        'Extra Principal': strategies.extraPrincipal.schedule[i]?.balance ?? 0,
        'HELOC Accel': strategies.helocAccel.schedule[i]?.balance ?? 0,
        '1st-Lien': strategies.firstLien.schedule[i]?.balance ?? 0,
      });
    }
    return out;
  }, [strategies]);

  const coachSnapshot = {
    recommendation: rec.label,
    freedomScore: score.total,
    grade: score.grade,
    inputs: {
      mortgageBalance: inputs.mortgageBalance,
      mortgageRate,
      monthlyPayment,
      monthlySurplus: p.netSurplus,
      helocRate,
      homeValue: p.homeValue,
      creditScore: profile.creditScore,
    },
    metrics: { dti, ltv, equity, emergencyMonths },
  };

  const loadScenario = (saved: any) => {
    if (typeof saved.mortgageRate === 'number') setMortgageRate(saved.mortgageRate);
    if (typeof saved.remainingMonths === 'number') setRemainingYears(saved.remainingMonths / 12);
    if (typeof saved.monthlyPayment === 'number') setMonthlyPayment(saved.monthlyPayment);
    if (typeof saved.extraMonthly === 'number') setExtraMonthly(saved.extraMonthly);
    if (typeof saved.quarterlyExtra === 'number') setQuarterlyExtra(saved.quarterlyExtra);
    if (typeof saved.annualLump === 'number') setAnnualLump(saved.annualLump);
    if (typeof saved.taxRefund === 'number') setTaxRefund(saved.taxRefund);
    if (typeof saved.annualBonus === 'number') setAnnualBonus(saved.annualBonus);
    if (typeof saved.biweekly === 'boolean') setBiweekly(saved.biweekly);
    if (typeof saved.helocRate === 'number') setHelocRate(saved.helocRate);
    if (typeof saved.helocLimit === 'number') setHelocLimit(saved.helocLimit);
    if (typeof saved.helocSweepPct === 'number') setSweepPct(saved.helocSweepPct);
  };

  return (
    <div className="space-y-10">
      {/* ─── Step 1 · Can I buy? ─────────────────────────────── */}
      <JourneyStep
        step={1}
        title="Can I buy? — Readiness & affordability"
        blurb="Start here if you're pre-purchase or want a readiness gauge. Programs, max price, and your Freedom Score."
      >
        <HomebuyerAssistance />
        <AffordabilityPlanner />
        <FreedomScoreCard score={score} formatCurrency={formatCurrency} />
      </JourneyStep>

      {/* ─── Step 2 · Where do I stand today? ────────────────── */}
      <JourneyStep
        step={2}
        title="Where do I stand today? — Current snapshot"
        blurb="Your mortgage overview, real-time health gauges, and any smart alerts based on your numbers."
      >
        <OverviewDashboard
          balance={p.mortgageBalance || 350000}
          homeValue={p.homeValue || 500000}
          equity={equity}
          ltv={ltv}
          rate={mortgageRate}
          remainingYears={remainingYears}
          payment={monthlyPayment}
          payoffDate={strategies.traditional.payoffDate}
          remainingInterest={remainingInterest}
          score={score.total}
          grade={score.grade}
          formatCurrency={formatCurrency}
        />
        <DashboardGauges
          dti={dti}
          ltv={ltv}
          emergencyMonths={emergencyMonths}
          freedomAge={freedomAge}
          currentAge={currentAge}
        />
        <SmartNotifications
          freedomScore={score.total}
          dti={dti}
          ltv={ltv}
          emergencyMonths={emergencyMonths}
          mortgageRate={mortgageRate}
          marketRate={7.0}
          monthlySurplus={p.netSurplus}
          creditScore={parseInt(profile.creditScore as any) || 0}
          helocRateShockSensitivity={helocShockSensitivity}
        />
      </JourneyStep>

      {/* ─── Step 3 · How fast can I pay it off? ─────────────── */}
      <JourneyStep
        step={3}
        title="How fast can I pay it off? — Payoff acceleration"
        blurb="Your core goal. Set a target timeline, see the surplus needed, compare Extra Principal vs HELOC, and stress-test the plan."
      >
        <PayoffGoalCalculator />

        <AiRecommendationCard
          recommendation={rec}
          strategies={strategies}
          score={score}
          inputs={inputs}
          formatCurrency={formatCurrency}
        />

        <StrategyGrid
          strategies={strategies}
          recommended={rec.winner}
          formatCurrency={formatCurrency}
          extraMonthly={extraMonthly} setExtraMonthly={setExtraMonthly}
          quarterlyExtra={quarterlyExtra} setQuarterlyExtra={setQuarterlyExtra}
          annualLump={annualLump} setAnnualLump={setAnnualLump}
          taxRefund={taxRefund} setTaxRefund={setTaxRefund}
          annualBonus={annualBonus} setAnnualBonus={setAnnualBonus}
          biweekly={biweekly} setBiweekly={setBiweekly}
          helocRate={helocRate} setHelocRate={setHelocRate}
          helocLimit={helocLimit} setHelocLimit={setHelocLimit}
          sweepPct={sweepPct} setSweepPct={setSweepPct}
        />

        <PayoffRaceChart data={chartData} formatCurrency={formatCurrency} />

        <AdvancedCharts
          homeValue={p.homeValue || 500000}
          schedule={strategies.traditional.schedule}
          winnerSchedule={winnerResult.schedule}
          winnerLabel={rec.label}
          monthlyIncome={p.totalIncome}
        />

        <FreedomSimulator
          mortgageRate={mortgageRate} setMortgageRate={setMortgageRate}
          remainingYears={remainingYears} setRemainingYears={setRemainingYears}
          monthlyPayment={monthlyPayment} setMonthlyPayment={setMonthlyPayment}
          helocRate={helocRate} setHelocRate={setHelocRate}
          sweepPct={sweepPct} setSweepPct={setSweepPct}
          extraMonthly={extraMonthly} setExtraMonthly={setExtraMonthly}
        />

        <StressTest
          helocRate={helocRate}
          helocBalance={Math.min(helocLimit, p.mortgageBalance * 0.15)}
          monthlySurplus={p.netSurplus}
          monthlyExpenses={p.expenses}
        />

        <ScenarioLab
          currentInputs={inputs}
          currentSummary={{
            winner: rec.label,
            yearsSaved: winnerResult.yearsSaved,
            interestSaved: winnerResult.interestSaved,
            freedomScore: score.total,
          }}
          onLoad={loadScenario}
        />
      </JourneyStep>

      {/* ─── Step 4 · Is payoff the right move? ──────────────── */}
      <JourneyStep
        step={4}
        title="Is payoff the right move? — Wealth tradeoff"
        blurb="Before you funnel every dollar at the mortgage, compare payoff vs tax-advantaged investing."
      >
        <WealthIntegration
          monthlySurplus={p.netSurplus}
          mortgageRate={mortgageRate}
          yearsToPayoff={remainingYears}
          currentAge={currentAge}
          retirementAge={retirementAge}
        />
      </JourneyStep>

      {/* ─── Step 5 · Ask the coach ──────────────────────────── */}
      <JourneyStep
        step={5}
        title="Ask the coach — Personalized guidance"
        blurb="Context-aware AI chat with your full snapshot loaded. Ask anything about your specific situation."
      >
        <AiCoachChat snapshot={coachSnapshot} />
      </JourneyStep>
    </div>
  );
}

// ─── Journey step wrapper ───
function JourneyStep({ step, title, blurb, children }: { step: number; title: string; blurb: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="space-y-1 border-l-2 border-primary/40 pl-4">
        <div className="flex items-baseline gap-3">
          <span className="text-xs font-mono uppercase tracking-widest text-primary">Step {step}</span>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{blurb}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}


// ─── Overview Dashboard ───
function OverviewDashboard({ balance, homeValue, equity, ltv, rate, remainingYears, payment, payoffDate, remainingInterest, score, grade, formatCurrency }: any) {
  const scoreColor = score >= 80 ? 'text-emerald-500' : score >= 60 ? 'text-amber-500' : 'text-rose-500';
  return (
    <Card className="glass-card border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Home className="h-5 w-5 text-primary" />
          Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <Stat label="Mortgage Balance" value={<AnimatedNumber value={balance} formatFn={formatCurrency} />} />
          <Stat label="Home Value" value={<AnimatedNumber value={homeValue} formatFn={formatCurrency} />} />
          <Stat label="Equity" value={<AnimatedNumber value={equity} formatFn={formatCurrency} />} accent />
          <Stat label="LTV" value={`${ltv.toFixed(0)}%`} />
          <Stat label="Rate" value={`${rate.toFixed(2)}%`} />
          <Stat label="Remaining Term" value={`${remainingYears.toFixed(1)} yr`} />
          <Stat label="Monthly Payment" value={<AnimatedNumber value={payment} formatFn={formatCurrency} />} />
          <Stat label="Payoff Date" value={payoffDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} />
          <Stat label="Remaining Interest" value={<AnimatedNumber value={remainingInterest} formatFn={formatCurrency} />} />
          <div className="col-span-2 md:col-span-1 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Freedom Score</div>
            <div className={cn("text-3xl font-bold mt-1", scoreColor)}>
              {score}<span className="text-lg text-muted-foreground">/100</span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Grade {grade}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, accent }: { label: string; value: any; accent?: boolean }) {
  return (
    <div className={cn("rounded-lg border border-border/50 bg-card/50 p-3", accent && "border-emerald-500/40 bg-emerald-500/5")}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}

// ─── AI Recommendation ───
function AiRecommendationCard({ recommendation, strategies, score, inputs, formatCurrency }: any) {
  const [narrative, setNarrative] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const winnerResult: StrategyResult =
    recommendation.winner === 'traditional' ? strategies.traditional :
    recommendation.winner === 'extra-principal' ? strategies.extraPrincipal :
    recommendation.winner === 'heloc-accel' ? strategies.helocAccel :
    strategies.firstLien;

  const generate = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setNarrative('');
    setError(null);

    try {
      const resp = await fetch(COACH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          mode: 'narrative',
          snapshot: {
            recommendation: recommendation.label,
            confidence: recommendation.confidence,
            winner: {
              interestSaved: winnerResult.interestSaved,
              yearsSaved: winnerResult.yearsSaved,
              payoffMonths: winnerResult.months,
              totalInterest: winnerResult.totalInterest,
            },
            inputs: {
              mortgageBalance: inputs.mortgageBalance,
              mortgageRate: inputs.mortgageRate,
              monthlyPayment: inputs.monthlyPayment,
              monthlySurplus: inputs.monthlySurplus,
              helocRate: inputs.helocRate,
              homeValue: inputs.homeValue,
            },
            freedomScore: score.total,
          },
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'AI unavailable');
      }
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const j = line.slice(6).trim();
          if (j === '[DONE]') break;
          try {
            const parsed = JSON.parse(j);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) { acc += c; setNarrative(acc); }
          } catch { /* ignore */ }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-card border-primary/40 bg-gradient-to-br from-primary/5 via-primary/10 to-transparent">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs uppercase tracking-wider text-primary font-semibold">Recommended Strategy</span>
            </div>
            <div className="text-2xl font-bold">{recommendation.label}</div>
            <div className="text-sm text-muted-foreground mt-2 leading-relaxed">{recommendation.reasoning}</div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Confidence</div>
              <div className="text-3xl font-bold text-primary">{recommendation.confidence}%</div>
            </div>
            <Button size="sm" variant="outline" onClick={generate} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {narrative ? 'Regenerate' : 'Explain in detail'}
            </Button>
          </div>
        </div>
        {(narrative || error) && (
          <div className="mt-4 pt-4 border-t border-border/50">
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1">
                <ReactMarkdown>{narrative}</ReactMarkdown>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Strategy Grid ───
function StrategyGrid({ strategies, recommended, formatCurrency, ...editors }: any) {
  const cards = [
    { key: 'traditional' as const, result: strategies.traditional, editable: false },
    { key: 'extra-principal' as const, result: strategies.extraPrincipal, editable: 'extra' },
    { key: 'heloc-accel' as const, result: strategies.helocAccel, editable: 'heloc' },
    { key: 'first-lien-heloc' as const, result: strategies.firstLien, editable: 'heloc' },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      {cards.map(({ key, result, editable }) => {
        const meta = STRATEGY_META[key];
        const Icon = meta.icon;
        const isWinner = key === recommended;
        return (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'rounded-2xl border p-4 bg-gradient-to-br relative',
              meta.color,
              isWinner ? 'border-primary/60 shadow-lg shadow-primary/10' : 'border-border/50'
            )}
          >
            {isWinner && (
              <Badge className="absolute -top-2 -right-2 bg-primary text-primary-foreground">
                <Trophy className="h-3 w-3 mr-1" /> Best
              </Badge>
            )}
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-4 w-4 text-primary" />
              <div className="font-semibold text-sm">{meta.label}</div>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{meta.blurb}</p>

            <div className="space-y-1.5 text-xs">
              <Row label="Years" value={`${result.years.toFixed(1)}`} />
              <Row label="Total Interest" value={formatCurrency(result.totalInterest)} />
              <Row label="Payoff" value={result.payoffDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} />
              {result.yearsSaved > 0 && (
                <Row label="Years Saved" value={`${result.yearsSaved.toFixed(1)}`} accent />
              )}
              {result.interestSaved > 0 && (
                <Row label="Interest Saved" value={formatCurrency(result.interestSaved)} accent />
              )}
              <Row label="Risk" value={`${result.riskScore}/100`} />
            </div>

            {editable === 'extra' && (
              <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
                <MiniInput label="Extra / mo" value={editors.extraMonthly} setValue={editors.setExtraMonthly} />
                <MiniInput label="Annual lump" value={editors.annualLump} setValue={editors.setAnnualLump} />
                <MiniInput label="Bonus / yr" value={editors.annualBonus} setValue={editors.setAnnualBonus} />
                <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                  <input type="checkbox" checked={editors.biweekly} onChange={e => editors.setBiweekly(e.target.checked)} />
                  Biweekly payments
                </label>
              </div>
            )}

            {editable === 'heloc' && (
              <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
                <MiniInput label="HELOC rate %" value={editors.helocRate} setValue={editors.setHelocRate} step="0.1" />
                <MiniInput label="HELOC limit" value={editors.helocLimit} setValue={editors.setHelocLimit} />
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-medium', accent && 'text-emerald-500')}>{value}</span>
    </div>
  );
}

function MiniInput({ label, value, setValue, step = '1' }: any) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input
        type="number"
        value={value}
        step={step}
        onChange={e => setValue(parseFloat(e.target.value) || 0)}
        className="h-7 text-xs mt-0.5"
      />
    </div>
  );
}

// ─── Payoff Race Chart ───
function PayoffRaceChart({ data, formatCurrency }: any) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-primary" /> Payoff Race
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="year" tick={{ fontSize: 10 }} label={{ value: 'Years', position: 'insideBottom', offset: -5, fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} width={50} />
              <RTooltip
                formatter={(v: any) => formatCurrency(v)}
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Traditional" stroke="#94a3b8" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Extra Principal" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="HELOC Accel" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="1st-Lien" stroke="#f43f5e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Simulator ───
function FreedomSimulator({
  mortgageRate, setMortgageRate,
  remainingYears, setRemainingYears,
  monthlyPayment, setMonthlyPayment,
  helocRate, setHelocRate,
  sweepPct, setSweepPct,
  extraMonthly, setExtraMonthly,
}: any) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" /> Freedom Simulator
        </CardTitle>
        <p className="text-xs text-muted-foreground">Move any slider — every card and chart above updates instantly.</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SimSlider label="Mortgage Rate" value={mortgageRate} setValue={setMortgageRate} min={2} max={12} step={0.1} suffix="%" />
          <SimSlider label="Remaining Term" value={remainingYears} setValue={setRemainingYears} min={1} max={30} step={0.5} suffix=" yr" />
          <SimSlider label="Monthly Payment" value={monthlyPayment} setValue={setMonthlyPayment} min={500} max={10000} step={50} prefix="$" />
          <SimSlider label="HELOC Rate" value={helocRate} setValue={setHelocRate} min={4} max={15} step={0.1} suffix="%" />
          <SimSlider label="Extra Monthly" value={extraMonthly} setValue={setExtraMonthly} min={0} max={3000} step={25} prefix="$" />
          <SimSlider label="Cash Sweep %" value={sweepPct} setValue={setSweepPct} min={0} max={100} step={5} suffix="%" />
        </div>
      </CardContent>
    </Card>
  );
}

function SimSlider({ label, value, setValue, min, max, step, prefix = '', suffix = '' }: any) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs font-semibold text-primary">{prefix}{value.toLocaleString(undefined, { maximumFractionDigits: 1 })}{suffix}</span>
      </div>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={(v) => setValue(v[0])} />
    </div>
  );
}

// ─── Freedom Score Card ───
function FreedomScoreCard({ score, formatCurrency }: any) {
  const [open, setOpen] = useState(false);
  const [improving, setImproving] = useState(false);
  const [improveText, setImproveText] = useState('');
  const [improveError, setImproveError] = useState<string | null>(null);

  const improveScore = async () => {
    setImproving(true);
    setImproveText('');
    setImproveError(null);
    try {
      const weakFactors = [...score.factors].sort((a: any, b: any) => a.score - b.score).slice(0, 4);
      const resp = await fetch(COACH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          mode: 'score-improve',
          snapshot: { score: score.total, grade: score.grade, weakFactors },
        }),
      });
      if (!resp.ok) throw new Error('AI unavailable');
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const j = line.slice(6).trim();
          if (j === '[DONE]') break;
          try {
            const parsed = JSON.parse(j);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) { acc += c; setImproveText(acc); }
          } catch { /* ignore */ }
        }
      }
    } catch (e: any) {
      setImproveError(e.message);
    } finally {
      setImproving(false);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" /> Mortgage Freedom Score
          </CardTitle>
          <Button size="sm" variant="outline" onClick={improveScore} disabled={improving} className="gap-2">
            {improving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Improve my score
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground">
            <span>Show factor breakdown</span>
            <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-2">
            {score.factors.map((f: any) => (
              <div key={f.key} className="rounded-lg border border-border/40 p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{f.label}</span>
                  <span className="text-xs text-muted-foreground">{Math.round(f.score)}/100 · {f.weight}%</span>
                </div>
                <Progress value={f.score} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground mt-1">{f.detail}</p>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {(improveText || improveError) && (
          <div className="mt-4 pt-4 border-t border-border/50">
            {improveError ? (
              <p className="text-sm text-destructive">{improveError}</p>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1">
                <ReactMarkdown>{improveText}</ReactMarkdown>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
