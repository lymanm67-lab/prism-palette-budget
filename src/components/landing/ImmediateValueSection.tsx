import { motion } from 'framer-motion';
import { MapPin, ScanSearch, Wallet, AlertCircle } from 'lucide-react';

const ITEMS = [
  { icon: MapPin, text: 'Where your money is actually going' },
  { icon: ScanSearch, text: 'Hidden subscriptions and wasted spending' },
  { icon: Wallet, text: 'What you can safely spend today' },
  { icon: AlertCircle, text: 'What needs your attention next' },
];

const ImmediateValueSection = () => (
  <section className="py-16 sm:py-24 bg-background">
    <div className="mx-auto max-w-4xl px-6 text-center">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight">
          What you'll see in the{' '}
          <span className="prism-gradient-text">first 10 minutes</span>
        </h2>
      </motion.div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 max-w-3xl mx-auto">
        {ITEMS.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 shrink-0">
              <item.icon className="h-5 w-5 text-accent" />
            </div>
            <span className="text-sm sm:text-base font-medium text-foreground">{item.text}</span>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default ImmediateValueSection;
