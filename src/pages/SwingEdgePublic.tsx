import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  CalendarClock,
  Check,
  FlaskConical,
  LineChart,
  Menu,
  ScanSearch,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import LandingFooter from '@/components/landing/LandingFooter';
import prismLogo from '@/assets/prism-money-logo.png';
import tradingDesk from '@/assets/swingedge-trading-desk.jpg';

const WORKFLOW = [
  { label: 'Scan', detail: 'Find technically qualified candidates.', icon: ScanSearch },
  { label: 'Analyze', detail: 'Read trend, momentum, volatility and structure.', icon: LineChart },
  { label: 'Qualify', detail: 'Check bias, event risk and readiness gates.', icon: ShieldCheck },
  { label: 'Plan', detail: 'Set entry, stop, target and position risk.', icon: BarChart3 },
  { label: 'Practice', detail: 'Paper-trade the plan before risking capital.', icon: FlaskConical },
  { label: 'Review', detail: 'Journal decisions and improve the process.', icon: BookOpenCheck },
];

const DECISION_TOOLS = [
  {
    icon: LineChart,
    label: 'Directional Bias',
    title: 'Know what the evidence favors',
    body: 'Similar historical setups support an UP, SIDEWAYS or DOWN bias—with confidence and sample context.',
  },
  {
    icon: CalendarClock,
    label: 'Event Risk',
    title: 'See risk before the calendar moves',
    body: 'Earnings, macro and sector events can trigger WAIT or REVIEW instead of letting a score override real risk.',
  },
  {
    icon: ShieldCheck,
    label: 'Trade Readiness',
    title: 'A score cannot bypass a hard rule',
    body: 'Fourteen readiness checks work alongside hard gates for tradability, event exposure and risk limits.',
  },
  {
    icon: BrainCircuit,
    label: 'AI Mentor',
    title: 'Challenge emotion before it becomes action',
    body: 'Review chasing, revenge sizing, stop changes and other rule drift against your recorded plan and history.',
  },
  {
    icon: FlaskConical,
    label: 'Monte Carlo Risk Lab',
    title: 'Stress-test the path, not just the average',
    body: 'Replay your own closed practice trades 10,000 times to study drawdowns, losing streaks and position size.',
  },
  {
    icon: BookOpenCheck,
    label: 'Practice & Learn',
    title: 'Build skill before confidence outruns evidence',
    body: 'Use backtesting, paper trading, a trade journal and the structured six-week course as one feedback loop.',
  },
];

const ECOSYSTEM = [
  'Household cash flow and Safe-to-Spend',
  'Emergency savings and reserve planning',
  'Investment and retirement projections',
  'Credit, debt and home-buying readiness',
  'Personal and business financial controls',
];

const SwingEdgePublic = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const previousTitle = document.title;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = description?.content;
    document.title = 'SwingEdge™ — Rule-Based Swing Trading | PrismMoney™';
    if (description) {
      description.content = 'Analyze, plan, practice and review swing trades with event risk, readiness gates, AI mentoring and Monte Carlo risk inside PrismMoney™.';
    }
    return () => {
      document.title = previousTitle;
      if (description && previousDescription) description.content = previousDescription;
    };
  }, []);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl" aria-label="SwingEdge public navigation">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-3" aria-label="PrismMoney home">
            <img src={prismLogo} alt="" className="h-10 w-10 rounded-md object-contain" />
            <div>
              <div className="font-display text-sm font-extrabold">SwingEdge™</div>
              <div className="text-[10px] font-semibold uppercase text-muted-foreground">by PrismMoney™</div>
            </div>
          </Link>
          <div className="hidden items-center gap-7 text-sm font-semibold md:flex">
            <button onClick={() => scrollTo('workflow')} className="text-muted-foreground transition-colors hover:text-foreground">Workflow</button>
            <button onClick={() => scrollTo('risk-tools')} className="text-muted-foreground transition-colors hover:text-foreground">Risk tools</button>
            <button onClick={() => scrollTo('ecosystem')} className="text-muted-foreground transition-colors hover:text-foreground">Ecosystem</button>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <Button variant="ghost" onClick={() => navigate('/auth')}>Sign in</Button>
            <Button onClick={() => navigate('/onboarding')}>Start free trial <ArrowRight /></Button>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? 'Close menu' : 'Open menu'}>
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>
        {menuOpen && (
          <div className="border-t border-border bg-background px-5 py-4 md:hidden">
            <div className="grid gap-2">
              <Button variant="ghost" className="justify-start" onClick={() => scrollTo('workflow')}>Workflow</Button>
              <Button variant="ghost" className="justify-start" onClick={() => scrollTo('risk-tools')}>Risk tools</Button>
              <Button variant="ghost" className="justify-start" onClick={() => scrollTo('ecosystem')}>Ecosystem</Button>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => navigate('/auth')}>Sign in</Button>
                <Button onClick={() => navigate('/onboarding')}>Start trial</Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      <main>
        <header className="relative flex min-h-[760px] items-end overflow-hidden pt-20 lg:min-h-[820px]">
          <img src={tradingDesk} alt="Trading desk with candlestick charts and a financial overview" width={1600} height={1000} className="absolute inset-0 h-full w-full object-cover object-[62%_center]" loading="eager" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--background))_0%,hsl(var(--background)/0.96)_32%,hsl(var(--background)/0.58)_58%,hsl(var(--background)/0.08)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,hsl(var(--background))_0%,transparent_42%)]" />
          <div className="relative mx-auto w-full max-w-7xl px-5 pb-24 sm:px-6 lg:pb-28">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }} className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 border border-primary/30 bg-background/70 px-3 py-1.5 text-xs font-bold uppercase text-primary backdrop-blur">
                <ShieldCheck className="h-4 w-4" /> Process before prediction
              </div>
              <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-6xl lg:text-7xl">
                Swing trading built around <span className="text-primary">discipline.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-xl">
                SwingEdge™ helps you scan, analyze, qualify, plan, practice and review every trade—without letting a signal, headline or emotion skip the rules.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" onClick={() => navigate('/onboarding')} className="h-12 px-6 font-bold">Start your free trial <ArrowRight /></Button>
                <Button size="lg" variant="outline" onClick={() => scrollTo('workflow')} className="h-12 bg-background/70 px-6 backdrop-blur">See the process</Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">Educational decision support and practice tools. Not investment advice or a promise of results.</p>
            </motion.div>
          </div>
        </header>

        <section id="workflow" className="border-y border-border bg-card py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-6">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase text-primary">One repeatable loop</p>
              <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-5xl">A workflow that slows down bad decisions</h2>
              <p className="mt-4 text-muted-foreground">Price structure stays primary. The 20 EMA, 50 SMA, RSI 14 and ATR 14 support the decision instead of replacing it.</p>
            </div>
            <ol className="mt-12 grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
              {WORKFLOW.map((step, index) => (
                <li key={step.label} className="bg-background p-6 sm:p-7">
                  <div className="flex items-center justify-between">
                    <step.icon className="h-6 w-6 text-primary" />
                    <span className="font-display text-3xl font-extrabold text-muted-foreground/40">0{index + 1}</span>
                  </div>
                  <h3 className="mt-8 text-lg font-bold">{step.label}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="risk-tools" className="py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-6">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <p className="text-xs font-bold uppercase text-primary">Decision support</p>
                <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-5xl">More than a chart and a score</h2>
                <p className="mt-5 leading-relaxed text-muted-foreground">A setup can look attractive and still be unready. SwingEdge™ puts the calendar, risk limits, historical context and your own behavior beside the chart.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {DECISION_TOOLS.map((tool) => (
                  <article key={tool.label} className="border border-border bg-card p-6">
                    <div className="flex h-10 w-10 items-center justify-center border border-primary/30 bg-primary/10 text-primary"><tool.icon className="h-5 w-5" /></div>
                    <p className="mt-6 text-xs font-bold uppercase text-primary">{tool.label}</p>
                    <h3 className="mt-2 text-lg font-bold">{tool.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{tool.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="ecosystem" className="border-y border-border bg-card py-20 sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-6 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase text-accent">The PrismMoney™ advantage</p>
              <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-5xl">Your trading risk does not live in isolation</h2>
              <p className="mt-5 max-w-xl leading-relaxed text-muted-foreground">Standalone trading tools see a setup. PrismMoney™ is built to help you see the rest of your financial life too—so trading remains one part of a complete system.</p>
              <ul className="mt-8 grid gap-3">
                {ECOSYSTEM.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm font-medium"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-accent"><Check className="h-4 w-4" /></span>{item}</li>
                ))}
              </ul>
            </div>
            <div className="border border-border bg-background p-7 sm:p-10">
              <p className="text-sm font-bold text-primary">COMPLETE FINANCIAL ECOSYSTEM</p>
              <div className="mt-8 grid grid-cols-2 gap-px bg-border">
                {['Budgeting', 'Trading', 'Retirement', 'Credit', 'Business', 'Legacy'].map((label) => (
                  <div key={label} className="bg-background px-4 py-5 text-center text-sm font-bold">{label}</div>
                ))}
              </div>
              <div className="mt-8 border-l-2 border-accent pl-4">
                <p className="text-sm leading-relaxed text-muted-foreground">Not just budgeting. Not just charts. One place to connect today’s decisions with long-term financial direction.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 text-center sm:py-28">
          <div className="mx-auto max-w-3xl px-5 sm:px-6">
            <h2 className="font-display text-3xl font-extrabold sm:text-5xl">Trade the plan. Review the evidence. Improve the process.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-muted-foreground">Use SwingEdge™ inside PrismMoney™ to practice a rule-based process while keeping the rest of your financial priorities in view.</p>
            <Button size="lg" onClick={() => navigate('/onboarding')} className="mt-8 h-12 px-7 font-bold">Start your free trial <ArrowRight /></Button>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
};

export default SwingEdgePublic;