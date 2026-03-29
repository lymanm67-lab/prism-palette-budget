import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { CheckCircle2, Star, Briefcase, Loader2, Users, TrendingUp, Star as StarIcon, RefreshCw, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { STRIPE_PLANS } from '@/lib/stripe-plans';
import { toast } from 'sonner';
import { useABTest } from '@/hooks/use-ab-test';

const PLANS = [
  {
    key: 'personal' as const,
    name: 'Prism Personal',
    monthly: 12.99,
    yearly: 99,
    yearlySavings: 56,
    bestFor: 'Individuals who want better budgeting and personal financial organization',
    tagline: null,
    features: [
      'Personal financial control systems',
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
    key: 'premium' as const,
    name: 'Prism Premium',
    monthly: 19.99,
    yearly: 149,
    yearlySavings: 90,
    bestFor: 'Users who want deeper financial control and premium planning tools',
    tagline: 'Full control. Better decisions. Less financial stress.',
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
    key: 'business' as const,
    name: 'Prism Business Pro',
    monthly: 39.99,
    yearly: 349,
    yearlySavings: 130,
    bestFor: 'Entrepreneurs and business owners who need personal and business financial clarity',
    tagline: 'Replaces multiple apps, spreadsheets, and manual tracking.',
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

const TRUST_STATS = [
  { icon: Users, value: '4,200+', label: 'Active Users' },
  { icon: TrendingUp, value: '$2.1M', label: 'Waste Identified' },
  { icon: StarIcon, value: '4.9/5', label: 'Average Rating' },
  { icon: RefreshCw, value: '92%', label: 'Retention Rate' },
];

const PricingSection = () => {
  const navigate = useNavigate();
  const { user, subscribed, subscriptionTier } = useAuth();
  const [annual, setAnnual] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const headlineTest = useABTest('pricing_headline', 'control');
  const guidanceTest = useABTest('pricing_guidance', 'control');

  const headlineText = headlineTest.variant.config?.headline as string || 'Choose the plan that gives you full control';
  const showGuidance = (guidanceTest.variant.config?.showGuidance as boolean) !== false;

  const handleCheckout = async (planKey: 'personal' | 'premium' | 'business') => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const plan = STRIPE_PLANS[planKey];
    const priceId = annual ? plan.annual_price_id : plan.monthly_price_id;

    setLoadingPlan(planKey);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to start checkout');
    } finally {
      setLoadingPlan(null);
    }
  };

  const isCurrentPlan = (planKey: string) => subscribed && subscriptionTier === planKey;

  return (
    <section id="pricing" className="py-20 sm:py-28 bg-muted/20">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-4">
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            {headlineText.includes('full control') ? (
              <>
                Choose the plan that gives you{' '}
                <span className="prism-gradient-text">full control</span>
              </>
            ) : headlineText}
          </h2>
          {showGuidance && (
            <p className="mt-3 text-foreground/70 text-base sm:text-lg">
              Most users start with Premium for full financial clarity.
            </p>
          )}
          <p className="mt-1.5 text-sm text-foreground/50">
            Most users recover the cost within the first 30 days.
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
          {PLANS.map((plan, i) => {
            const current = isCurrentPlan(plan.key);
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={`rounded-2xl border p-8 relative ${plan.highlight ? 'border-accent shadow-xl lg:scale-105 bg-card ring-2 ring-accent/20' : 'border-border bg-card'} ${current ? 'ring-2 ring-green-500/50 border-green-500' : ''}`}>

                {current && (
                  <div className="absolute -top-3 right-4 flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold bg-green-500 text-white">
                    ✓ Your Plan
                  </div>
                )}

                {plan.badge && plan.badgeIcon && !current && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold text-primary-foreground ${plan.highlight ? 'prism-gradient-teal' : 'prism-gradient'}`}>
                    <plan.badgeIcon className="h-3 w-3" /> {plan.badge}
                  </div>
                )}

                <h3 className="font-display text-xl font-bold">{plan.name}</h3>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-extrabold">
                    ${annual ? plan.yearly : plan.monthly.toFixed(2)}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {annual ? '/year' : '/month'}
                  </span>
                </div>

                {annual && (
                  <div className="mt-1.5 space-y-0.5">
                    <p className="text-xs text-muted-foreground">
                      Only <span className="font-semibold text-foreground">${(plan.yearly / 12).toFixed(2)}/month</span>
                    </p>
                    <p className="text-xs font-semibold text-accent">
                      Save ${plan.yearlySavings} annually
                    </p>
                  </div>
                )}

                {!annual && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Switch to annual and save <span className="font-semibold text-accent">${plan.yearlySavings}/year</span>
                  </p>
                )}

                <p className="mt-1 text-[11px] text-muted-foreground italic">
                  Less than the cost of one forgotten subscription.
                </p>

                {plan.tagline && (
                  <p className="mt-3 text-xs font-semibold text-accent">{plan.tagline}</p>
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

                <Button
                  onClick={() => current ? null : handleCheckout(plan.key)}
                  disabled={!!loadingPlan || current}
                  className={`w-full mt-8 rounded-xl h-11 font-semibold ${plan.highlight && !current ? 'prism-gradient-teal text-primary-foreground hover:opacity-90 prism-glow-teal' : ''}`}
                  variant={plan.highlight ? 'default' : 'outline'}>
                  {loadingPlan === plan.key ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Starting checkout…</>
                  ) : current ? (
                    'Current Plan'
                  ) : (
                    plan.cta
                  )}
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Trust bar */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-14 max-w-3xl mx-auto"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {TRUST_STATS.map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-xl sm:text-2xl font-extrabold prism-gradient-text">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-foreground/60 font-medium">
            14-day free trial · Cancel anytime · No credit card charged until trial ends
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
