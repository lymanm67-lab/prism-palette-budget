import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';

const TESTIMONIALS = [
  {
    name: 'Sarah M.',
    role: 'Everyday User',
    quote: 'I finally see where my money goes every month. Prism helped me find three subscriptions I forgot about and cut over $40 in monthly waste.',
    avatar: 'SM',
  },
  {
    name: 'James K.',
    role: 'Premium User',
    quote: 'The forecasting and net worth tools helped me plan for tax season without the usual last-minute scramble. I actually feel organized for once.',
    avatar: 'JK',
  },
  {
    name: 'Priya R.',
    role: 'Small Business Owner',
    quote: 'Having personal and business finances in one app cut my weekly admin time in half. The business dashboards and cash flow tools are worth every penny.',
    avatar: 'PR',
  },
];

const TestimonialsSection = () => (
  <section className="py-20 sm:py-28 bg-muted/30">
    <div className="mx-auto max-w-7xl px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="text-center mb-14">
        <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight">
          Built for people who want{' '}
          <span className="prism-gradient-text">clarity, not confusion</span>
        </h2>
      </motion.div>

      <div className="grid gap-6 sm:grid-cols-3 max-w-5xl mx-auto">
        {TESTIMONIALS.map((t, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.1 }}
            className="rounded-2xl border border-border bg-card p-6 space-y-4 relative">
            <Quote className="h-8 w-8 text-accent/15 absolute top-4 right-4" />
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
    </div>
  </section>
);

export default TestimonialsSection;
