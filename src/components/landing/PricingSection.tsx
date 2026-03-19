import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { CheckCircle2, Star, Briefcase } from 'lucide-react';

const PLANS = [
  {
    name: 'Prism Personal',
    monthly: 12.99,
    yearly: 99,
    yearlySavings: 56,
    bestFor: 'Individuals who want better budgeting, planning, and personal financial organization',
    features: [
      'Personal budgeting tools',
      'Spending categories',
      'Savings tracking',
      'Alerts & reminders',
      'Subscription awareness',
      'Financial organization tools',
    ],
    cta: 'Start Personal Plan',
    badge: null,
    badgeIcon: null,
    highlight: false,
  },
  {
    name: 'Prism Premium',
    monthly: 19.99,
    yearly: 149,
    yearlySavings: 90,
    bestFor: 'Users who want deeper financial control and premium planning tools',
    features: [
      'Everything in Personal, plus:',
      'Cash flow forecasting',
      'Net worth tracking',
      'Bill negotiation workflows',
      'Credit issue guidance',
      'Tax prep organization',
      'Deeper insights & planning tools',
    ],
    cta: 'Start Premium Plan',
    badge: 'Most Popular',
    badgeIcon: Star,
    highlight: true,
  },
  {
    name: 'Prism Business Pro',
    monthly: 39.99,
    yearly: 349,
    yearlySavings: 130,
    bestFor: 'Entrepreneurs, consultants, and business professionals who need personal and business financial clarity',
    features: [
      'Everything in Premium, plus:',
      'Personal & business dashboards',
      'Business expense planning',
      'Owner pay planning',
      'Profit & cash flow visibility',
      'Recurring business expense reviews',
      'Business tax readiness support',
      'Advanced planning tools',
    ],
    cta: 'Start Business Pro',
    badge: 'Best for Business',
    badgeIcon: Briefcase,
    highlight: false,
  },
];

const PricingSection = () => {
  const navigate = useNavigate();
  const [annual, setAnnual] = useState(true);

  return (
    <section id="pricing" className="py-20 sm:py-28 bg-muted/20">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-6">
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight">
            Choose the Prism plan that{' '}
            <span className="prism-gradient-text">fits your life</span>
          </h2>
          <p className="mt-3 text-muted-foreground text-base sm:text-lg">
            Save more with annual billing. Annual plans are the best value.
          </p>
        </motion.div>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 mb-14">
          <span className={`text-sm font-medium ${!annual ? 'text-foreground' : 'text-muted-foreground'}`}>Monthly</span>
          <button onClick={() => setAnnual(!annual)}
            className={`relative w-14 h-7 rounded-full transition-colors ${annual ? 'bg-accent' : 'bg-border'}`}>
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-primary-foreground shadow transition-transform ${annual ? 'translate-x-7' : 'translate-x-0.5'}`} />
          </button>
          <span className={`text-sm font-medium ${annual ? 'text-foreground' : 'text-muted-foreground'}`}>
            Annual
            <span className="ml-1.5 inline-flex items-center rounded-full bg-accent/10 text-accent text-xs font-bold px-2 py-0.5">
              Save up to $130
            </span>
          </span>
        </div>

        <div className="grid gap-8 lg:grid-cols-3 max-w-5xl mx-auto items-start">
          {PLANS.map((plan, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className={`rounded-2xl border p-8 relative ${plan.highlight ? 'border-accent shadow-xl lg:scale-105 bg-card ring-2 ring-accent/20' : 'border-border bg-card'}`}>

              {plan.badge && plan.badgeIcon && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold text-primary-foreground ${plan.highlight ? 'prism-gradient-teal' : 'prism-gradient'}`}>
                  <plan.badgeIcon className="h-3 w-3" /> {plan.badge}
                </div>
              )}

              <h3 className="font-display text-xl font-bold">{plan.name}</h3>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-4xl font-extrabold">
                  ${annual ? (plan.yearly / 12).toFixed(2) : plan.monthly.toFixed(2)}
                </span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>

              {annual && (
                <div className="mt-1.5 space-y-0.5">
                  <p className="text-xs text-muted-foreground">
                    Billed annually at <span className="font-semibold text-foreground">${plan.yearly}/year</span>
                  </p>
                  <p className="text-xs font-semibold text-accent">
                    Save ${plan.yearlySavings} per year
                  </p>
                </div>
              )}

              {!annual && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Switch to annual and save <span className="font-semibold text-accent">${plan.yearlySavings}/year</span>
                </p>
              )}

              <p className="mt-4 text-xs text-muted-foreground leading-relaxed border-t border-border pt-4">
                <span className="font-semibold text-foreground">Best for:</span> {plan.bestFor}
              </p>

              <ul className="mt-5 space-y-2.5">
                {plan.features.map((f, j) => (
                  <li key={j} className={`flex items-start gap-2 text-sm ${f.endsWith(':') ? 'font-semibold text-foreground mt-1' : ''}`}>
                    {!f.endsWith(':') && <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />}
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Button onClick={() => navigate('/onboarding')}
                className={`w-full mt-8 rounded-xl h-11 font-semibold ${plan.highlight ? 'prism-gradient-teal text-primary-foreground hover:opacity-90 prism-glow-teal' : ''}`}
                variant={plan.highlight ? 'default' : 'outline'}>
                {plan.cta}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
