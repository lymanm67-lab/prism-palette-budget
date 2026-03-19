import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

const BULLETS = [
  'Fewer apps to manage',
  'Fewer money leaks',
  'More peace of mind',
  'Better business visibility',
  'Stronger financial planning',
  'Year-round organization, not last-minute panic',
];

const WhyUpgradeSection = () => (
  <section className="py-20 sm:py-28 bg-background">
    <div className="mx-auto max-w-4xl px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="text-center mb-10">
        <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight">
          Why people choose Prism{' '}
          <span className="prism-gradient-text">over cheaper apps</span>
        </h2>
        <p className="mt-5 text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Cheap apps usually do one thing. Prism helps you do what actually matters — organize your
          financial life, catch problems early, make better decisions, and plan ahead.
        </p>
      </motion.div>

      <div className="grid gap-3 sm:grid-cols-2 max-w-2xl mx-auto">
        {BULLETS.map((b, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.06 }}
            className="flex items-center gap-3 rounded-xl bg-card border border-border p-4">
            <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
            <span className="text-sm font-medium text-foreground">{b}</span>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default WhyUpgradeSection;
