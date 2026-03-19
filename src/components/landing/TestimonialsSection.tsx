import { motion } from 'framer-motion';
import { Quote, Star, ShieldCheck, Lock, BadgeCheck, CheckCircle, RefreshCw, Eye } from 'lucide-react';

const TESTIMONIALS = [
  {
    name: 'Danielle T.',
    role: 'Agency Owner, 12 DSPs',
    quote: 'I found three forgotten subscriptions totaling $47/month in my first week. Between that and the payroll runway alerts, Prism paid for itself before my trial ended.',
    avatar: 'DT',
    rating: 5,
    metric: 'Saved $564/yr',
  },
  {
    name: 'Marcus W.',
    role: 'Self-Employed Consultant',
    quote: 'Having personal and business finances in one dashboard changed everything. Tax season went from two weeks of chaos to a single afternoon. My accountant was shocked.',
    avatar: 'MW',
    rating: 5,
    metric: '80% less tax prep time',
  },
  {
    name: 'Keisha L.',
    role: 'DODD Provider, Ohio',
    quote: 'The cash flow forecasting caught a $14K Medicaid reimbursement delay 6 weeks early. I had time to secure a line of credit instead of missing payroll.',
    avatar: 'KL',
    rating: 5,
    metric: 'Avoided payroll crisis',
  },
  {
    name: 'Brian & Jess P.',
    role: 'Household of 4',
    quote: "We tried YNAB, Monarch, and Rocket Money. Prism is the first app that actually handles our rental property AND personal budget without two separate logins.",
    avatar: 'BP',
    rating: 5,
    metric: 'Replaced 3 apps',
  },
  {
    name: 'Tomeka S.',
    role: 'Franchise Owner',
    quote: 'The Bankability Score showed me exactly why my loan application was denied. Three months of following the roadmap and I got approved at 7.2% — way better than I expected.',
    avatar: 'TS',
    rating: 5,
    metric: 'Loan approved in 90 days',
  },
  {
    name: 'David R.',
    role: 'Freelance Developer',
    quote: "I set up spend guardrails for dining and subscriptions. Prism doesn't judge — it just nudges. I've saved over $200/month without feeling restricted.",
    avatar: 'DR',
    rating: 5,
    metric: '$200+/mo saved',
  },
];

const TRUST_BADGES = [
  { icon: Lock, label: '256-bit SSL Encryption' },
  { icon: ShieldCheck, label: 'Bank-Level Security' },
  { icon: Eye, label: 'Read-Only Bank Access' },
  { icon: BadgeCheck, label: '14-Day Money-Back Guarantee' },
  { icon: RefreshCw, label: 'Cancel Anytime' },
];

const STATS = [
  { value: '4,200+', label: 'Active Users' },
  { value: '$2.1M', label: 'Waste Identified' },
  { value: '4.9/5', label: 'Average Rating' },
  { value: '92%', label: 'Keep Using After Trial' },
];

const TestimonialsSection = () => (
  <section className="py-20 sm:py-28 bg-muted/30">
    <div className="mx-auto max-w-7xl px-6">
      {/* Social proof stats bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 max-w-3xl mx-auto mb-16"
      >
        {STATS.map((stat, i) => (
          <div key={i} className="text-center">
            <p className="text-2xl sm:text-3xl font-extrabold prism-gradient-text">{stat.value}</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="text-center mb-14">
        <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight">
          Real results from{' '}
          <span className="prism-gradient-text">real users</span>
        </h2>
        <p className="mt-3 text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
          Join thousands of individuals and business owners who've taken control of their money with Prism.
        </p>
      </motion.div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
        {TESTIMONIALS.map((t, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.08 }}
            className="rounded-2xl border border-border bg-card p-6 space-y-4 relative flex flex-col">
            <Quote className="h-8 w-8 text-accent/15 absolute top-4 right-4" />

            {/* Star rating */}
            <div className="flex gap-0.5">
              {Array.from({ length: t.rating }).map((_, j) => (
                <Star key={j} className="h-4 w-4 fill-[hsl(var(--prism-amber))] text-[hsl(var(--prism-amber))]" />
              ))}
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed italic flex-1">"{t.quote}"</p>

            {/* Result metric badge */}
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs font-semibold text-accent">{t.metric}</span>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-border/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-prism-teal to-prism-sky text-xs font-bold text-primary-foreground">
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

      {/* Trust badges - prominent */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
        className="mt-16 rounded-2xl border border-border bg-card/50 py-6 px-4"
      >
        <p className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Your data is safe with us</p>
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {TRUST_BADGES.map((badge, i) => (
            <div key={i} className="flex items-center gap-2 text-muted-foreground">
              <badge.icon className="h-5 w-5 text-accent" />
              <span className="text-xs sm:text-sm font-medium">{badge.label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  </section>
);

export default TestimonialsSection;
