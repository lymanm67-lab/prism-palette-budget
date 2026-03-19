import { motion } from 'framer-motion';
import { AlertTriangle, Eye, Layers, Receipt, Calculator, GitBranch } from 'lucide-react';

const PAIN_POINTS = [
  { icon: Layers, text: 'Too many apps for one financial life' },
  { icon: Receipt, text: 'Hidden subscriptions and recurring charges' },
  { icon: Eye, text: 'Poor visibility into where money is going' },
  { icon: Calculator, text: 'Stress around tax prep and bill planning' },
  { icon: GitBranch, text: 'Confusion when personal and business money overlap' },
  { icon: AlertTriangle, text: 'No clear picture of cash flow or future expenses' },
];

const ProblemSection = () => (
  <section className="py-20 sm:py-28 bg-muted/30">
    <div className="mx-auto max-w-6xl px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="text-center mb-14">
        <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight">
          Most money apps show numbers.{' '}
          <span className="prism-gradient-text">Prism helps you take action.</span>
        </h2>
        <p className="mt-5 text-muted-foreground text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
          People are tired of bouncing between budgeting apps, subscription trackers, spreadsheets,
          business expense tools, and tax prep checklists. That scattered approach creates stress,
          confusion, and missed opportunities. Prism brings everything together into one financial
          control center.
        </p>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
        {PAIN_POINTS.map((p, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.06 }}
            className="flex items-start gap-3 rounded-xl border border-destructive/10 bg-destructive/5 p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 shrink-0">
              <p.icon className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-sm font-medium text-foreground leading-snug">{p.text}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default ProblemSection;
