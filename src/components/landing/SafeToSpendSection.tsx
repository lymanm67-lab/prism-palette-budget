import { motion } from 'framer-motion';
import AnimatedNumber from '@/components/AnimatedNumber';

const TIMEFRAMES = [
  { label: 'Today', amount: 182, color: 'from-prism-teal to-prism-sky' },
  { label: 'This Week', amount: 847, color: 'from-prism-sky to-prism-indigo' },
  { label: 'This Month', amount: 2340, color: 'from-prism-indigo to-prism-navy' },
];

const fmt = (n: number) => '$' + Math.round(n).toLocaleString();

const SafeToSpendSection = () => (
  <section className="py-16 sm:py-24 bg-muted/20">
    <div className="mx-auto max-w-5xl px-6 text-center">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight">
          Know exactly what you can{' '}
          <span className="prism-gradient-text">safely spend</span>
        </h2>
        <p className="mt-4 text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
          No guessing. No spreadsheets. Just a clear number you can trust.
        </p>
      </motion.div>

      <div className="mt-12 grid gap-6 sm:grid-cols-3 max-w-3xl mx-auto">
        {TIMEFRAMES.map((tf, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12 }}
            className="rounded-2xl border border-border bg-card p-6 space-y-2"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{tf.label}</p>
            <p className={`text-3xl sm:text-4xl font-extrabold bg-gradient-to-r ${tf.color} bg-clip-text text-transparent`}>
              <AnimatedNumber value={tf.amount} formatFn={fmt} />
            </p>
            <p className="text-xs text-muted-foreground">safe to spend</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default SafeToSpendSection;
