import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Sparkles, Target, BarChart3, ShieldCheck, Bot,
  Wallet, ArrowRight, CheckCircle2, Zap, Star, Quote,
} from 'lucide-react';
import prismLogo from '@/assets/prism-budget-logo.png';

const FEATURES = [
  { icon: ShieldCheck, title: 'Smart Spend Guardrails', desc: 'Real-time spending limits with color-coded alerts that coach you in the moment of decision.' },
  { icon: Target, title: 'Zero-Based Budgeting', desc: 'Give every dollar a job with intuitive envelope budgeting.' },
  { icon: Bot, title: 'AI Subscription Guard', desc: 'Auto-detect zombie charges from canceled subscriptions and score cancellation difficulty.' },
  { icon: BarChart3, title: 'Smart Reports', desc: 'Net worth, cash flow, spending trends, and predictive insights at a glance.' },
  { icon: Wallet, title: 'Multi-Account Tracking', desc: 'Checking, savings, credit, investments — one unified view.' },
  { icon: Zap, title: 'Business + Personal', desc: 'Separate business finances with dedicated profiles and AI tax assistance.' },
];

const PRICING = [
  { name: 'Free', price: '$0', period: '/forever', features: ['5 accounts', 'Basic budgeting', 'Transaction tracking', 'Monthly reports'], cta: 'Get Started', popular: false },
  { name: 'Pro', price: '$9', period: '/month', features: ['Unlimited accounts', 'AI Tax Assistant', 'Business profiles', 'CSV import', 'Advanced reports', 'Financial goals'], cta: 'Start Free Trial', popular: true },
  { name: 'Business', price: '$19', period: '/month', features: ['Everything in Pro', 'Multiple businesses', 'Team collaboration', 'Priority support', 'API access'], cta: 'Contact Sales', popular: false },
];

const TESTIMONIALS = [
  { name: 'Sarah M.', role: 'Freelance Designer', quote: 'PrismBudget finally made budgeting click for me. The zero-based approach keeps every dollar accountable.', avatar: 'SM' },
  { name: 'James K.', role: 'Small Business Owner', quote: 'Separating business and personal finances in one app is a game-changer. The AI tax assistant saves me hours.', avatar: 'JK' },
  { name: 'Priya R.', role: 'Software Engineer', quote: 'I paid off $18k in debt using the debt payoff planner. The visualizations kept me motivated every step.', avatar: 'PR' },
];

const TRUST_STATS = [
  { value: '10,000+', label: 'Active Users' },
  { value: '4.9/5', label: 'User Rating' },
  { value: '$2M+', label: 'Debt Paid Off' },
  { value: '99.9%', label: 'Uptime' },
];

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="relative overflow-hidden auth-gradient-bg">
        <div className="orb w-96 h-96 bg-[hsl(var(--prism-teal))] -top-20 -left-20" style={{ animationDelay: '0s' }} />
        <div className="orb w-80 h-80 bg-[hsl(var(--prism-orange))] top-1/3 -right-20" style={{ animationDelay: '-5s' }} />

        <nav className="relative z-10 mx-auto max-w-7xl px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={prismLogo} alt="PrismBudget™" className="h-16 w-16 rounded-xl object-contain" />
            <span className="font-display text-xl font-extrabold text-white tracking-tight">PrismBudget™</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/auth')} className="text-white/60 hover:text-white hover:bg-white/10">
              Sign In
            </Button>
            <Button onClick={() => navigate('/onboarding')} className="prism-gradient hover:opacity-90 font-semibold">
              Get Started
            </Button>
          </div>
        </nav>

        <div className="relative z-10 mx-auto max-w-4xl px-6 py-20 sm:py-32 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="font-display text-5xl sm:text-7xl font-extrabold text-white tracking-tight leading-tight">
              Spend Smarter, <br />
              <span className="prism-gradient-text">Not Less</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-white/50 max-w-2xl mx-auto">
              Smart Spend Guardrails coach you in real time. AI catches zombie subscriptions. Your money finally has a brain.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate('/onboarding')} className="prism-gradient hover:opacity-90 text-lg h-14 px-10 gap-2 font-bold rounded-2xl prism-glow">
                Start Free <ArrowRight className="h-5 w-5" />
              </Button>
              <Button size="lg" variant="ghost" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-white/40 hover:text-white hover:bg-white/5 h-14 px-8 rounded-2xl">
                See Features
              </Button>
            </div>

            {/* Trust stats bar */}
            <div className="mt-16 flex flex-wrap justify-center gap-8 sm:gap-12">
              {TRUST_STATS.map((stat, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.1 }} className="text-center">
                  <p className="font-display text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-white/30 mt-0.5">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </header>

      {/* Features */}
      <section id="features" className="py-20 sm:py-28 bg-background">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight">
              Everything you need to <span className="prism-gradient-text">succeed</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
              Built for people who want real control over their money.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="rounded-2xl border border-border p-6 hover:border-primary/30 hover:shadow-lg transition-all group">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-prism-teal to-prism-sky transition-transform group-hover:scale-110">
                  <feat.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-display text-lg font-bold">{feat.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Testimonials */}
      <section className="py-20 sm:py-28 bg-muted/20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight">
              Loved by <span className="prism-gradient-text">real people</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">See what our users have to say.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3 max-w-5xl mx-auto">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-border bg-card p-6 space-y-4 relative">
                <Quote className="h-8 w-8 text-prism-teal/20 absolute top-4 right-4" />
                <p className="text-sm text-muted-foreground leading-relaxed italic">"{t.quote}"</p>
                <div className="flex items-center gap-3 pt-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-prism-teal to-prism-sky text-xs font-bold text-white">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 sm:py-28 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight">
              Simple, transparent <span className="prism-gradient-text">pricing</span>
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-3 max-w-4xl mx-auto">
            {PRICING.map((plan, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={`rounded-2xl border p-8 relative ${plan.popular ? 'border-primary shadow-xl scale-105 bg-card' : 'border-border bg-card'}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold prism-gradient text-white">
                    <Star className="h-3 w-3" /> Most Popular
                  </div>
                )}
                <h3 className="font-display text-xl font-bold">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-extrabold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-prism-teal shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button onClick={() => navigate('/onboarding')} className={`w-full mt-8 ${plan.popular ? 'prism-gradient text-white hover:opacity-90' : ''}`} variant={plan.popular ? 'default' : 'outline'}>
                  {plan.cta}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28 auth-gradient-bg relative overflow-hidden">
        <div className="orb w-64 h-64 bg-[hsl(var(--prism-teal))] bottom-0 left-1/4" style={{ animationDelay: '-3s' }} />
        <div className="relative z-10 mx-auto max-w-3xl text-center px-6">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl prism-gradient prism-glow">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-extrabold text-white">Ready to take control?</h2>
          <p className="mt-4 text-lg text-white/50">Join thousands building real wealth with PrismBudget™.</p>
          <Button size="lg" onClick={() => navigate('/onboarding')} className="mt-8 prism-gradient hover:opacity-90 text-lg h-14 px-10 gap-2 font-bold rounded-2xl prism-glow">
            Get Started Free <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={prismLogo} alt="PrismBudget™" className="h-14 w-14 rounded-lg object-contain" />
            <span className="font-display font-bold">PrismBudget™</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <button onClick={() => navigate('/legal')} className="hover:text-foreground transition-colors">Privacy Policy</button>
            <span className="hidden sm:inline text-border">·</span>
            <button onClick={() => navigate('/legal')} className="hover:text-foreground transition-colors">Terms of Service</button>
            <span className="hidden sm:inline text-border">·</span>
            <button onClick={() => navigate('/legal')} className="hover:text-foreground transition-colors">Cookie Policy</button>
            <span className="hidden sm:inline text-border">·</span>
            <button onClick={() => navigate('/legal')} className="hover:text-foreground transition-colors">Legal & Compliance</button>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} PrismBudget™. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
