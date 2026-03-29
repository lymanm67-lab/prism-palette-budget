import { motion } from 'framer-motion';
import { LayoutDashboard, Eye, Lightbulb, Briefcase, ShieldCheck, BadgeDollarSign, Camera, TrendingUp } from 'lucide-react';

const BENEFITS = [
  { icon: LayoutDashboard, title: 'All-in-one financial command center', desc: 'Budgeting, investments, retirement planning, subscriptions, and forecasting — one place.' },
  { icon: TrendingUp, title: 'Household retirement projections', desc: 'See yours, your spouse\'s, and combined portfolios with Social Security, pensions, and inflation-adjusted returns.' },
  { icon: Eye, title: 'Clarity instead of chaos', desc: 'See where your money is leaking and when you can realistically retire.' },
  { icon: Lightbulb, title: 'Better decisions, not just more data', desc: 'Know exactly how much more to save, when to retire, and what income to expect.' },
  { icon: Briefcase, title: 'Personal & business in one ecosystem', desc: 'Stop juggling disconnected tools for your money.' },
  { icon: ShieldCheck, title: 'Less stress around bills & taxes', desc: 'Stay organized year-round so nothing sneaks up on you.' },
  { icon: BadgeDollarSign, title: 'AI monthly audit & reconciliation', desc: 'Automatically catches duplicates, missing categories, balance errors, and tax-readiness gaps every month.' },
  { icon: Camera, title: 'Smart document scanning', desc: 'Upload a paycheck stub or scan a bill — PrismMoney™ auto-fills your categories, deductions, and budgets.' },
];

const BenefitsSection = () => (
  <section id="benefits" className="py-16 sm:py-24 bg-background">
    <div className="mx-auto max-w-7xl px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="text-center mb-4">
        <p className="text-sm sm:text-base text-muted-foreground font-medium max-w-2xl mx-auto mb-6">
          Prism replaces all of that with one clear system you can actually trust.
        </p>
        <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight">
          Why Prism Is Worth More Than a{' '}
          <span className="prism-gradient-text">Basic Budget App</span>
        </h2>
      </motion.div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
        {BENEFITS.map((b, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.08 }}
            className="rounded-2xl border border-border bg-card p-6 hover:border-accent/30 hover:shadow-lg transition-all group">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-prism-teal to-prism-sky transition-transform group-hover:scale-110">
              <b.icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <h3 className="font-display text-base font-bold">{b.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default BenefitsSection;
