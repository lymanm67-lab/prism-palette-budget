import { motion } from 'framer-motion';
import { Quote, Star, ShieldCheck, Lock, BadgeCheck } from 'lucide-react';

const TESTIMONIALS = [
  {
    name: 'Sarah M.',
    role: 'Freelance Designer',
    quote: 'I found three forgotten subscriptions totaling $47/month in my first week. Prism literally paid for itself on day one.',
    avatar: 'SM',
    rating: 5,
  },
  {
    name: 'James K.',
    role: 'Small Business Owner',
    quote: 'Having personal and business finances in one dashboard changed everything. Tax season went from two weeks of chaos to a single afternoon.',
    avatar: 'JK',
    rating: 5,
  },
  {
    name: 'Priya R.',
    role: 'Marketing Consultant',
    quote: 'The cash flow forecasting caught a potential shortfall 6 weeks before it would have hit. That alone saved me from a very stressful situation.',
    avatar: 'PR',
    rating: 5,
  },
];

const TRUST_BADGES = [
  { icon: Lock, label: '256-bit SSL Encryption' },
  { icon: ShieldCheck, label: 'Bank-Level Security' },
  { icon: BadgeCheck, label: '14-Day Money-Back Guarantee' },
];

const TestimonialsSection = () => (
  <section className="py-20 sm:py-28 bg-muted/30">
    <div className="mx-auto max-w-7xl px-6">
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

      <div className="grid gap-6 sm:grid-cols-3 max-w-5xl mx-auto">
        {TESTIMONIALS.map((t, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.1 }}
            className="rounded-2xl border border-border bg-card p-6 space-y-4 relative">
            <Quote className="h-8 w-8 text-accent/15 absolute top-4 right-4" />

            {/* Star rating */}
            <div className="flex gap-0.5">
              {Array.from({ length: t.rating }).map((_, j) => (
                <Star key={j} className="h-4 w-4 fill-[hsl(var(--prism-amber))] text-[hsl(var(--prism-amber))]" />
              ))}
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed italic">"{t.quote}"</p>
            <div className="flex items-center gap-3 pt-2">
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

      {/* Trust badges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
        className="mt-14 flex flex-wrap items-center justify-center gap-6 sm:gap-10"
      >
        {TRUST_BADGES.map((badge, i) => (
          <div key={i} className="flex items-center gap-2 text-muted-foreground">
            <badge.icon className="h-5 w-5 text-accent" />
            <span className="text-xs sm:text-sm font-medium">{badge.label}</span>
          </div>
        ))}
      </motion.div>
    </div>
  </section>
);

export default TestimonialsSection;
