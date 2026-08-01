import { motion } from 'framer-motion';
import { Layers, ScanSearch, Eye } from 'lucide-react';
import EditableText from '@/components/editor/EditableText';

const GROUPS = [
  {
    icon: Layers,
    title: 'Too many tools',
    items: ['Budgeting apps', 'Spreadsheets', 'Business expense tools'],
  },
  {
    icon: ScanSearch,
    title: 'Hidden problems',
    items: ['Forgotten subscriptions', 'Missed recurring expenses'],
  },
  {
    icon: Eye,
    title: 'Lack of clarity',
    items: ['Cash flow confusion', 'Personal & business money overlap'],
  },
];

const ProblemSection = () => (
  <section className="py-16 sm:py-24 bg-muted/30">
    <div className="mx-auto max-w-5xl px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="text-center mb-14">
        <EditableText contentKey="problem.heading" as="h2" fallback="Why managing money still feels harder than it should"
          className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight">
          Why managing money still feels{' '}
          <span className="prism-gradient-text">harder than it should</span>
        </EditableText>
      </motion.div>

      <div className="grid gap-6 sm:grid-cols-3 max-w-4xl mx-auto">
        {GROUPS.map((g, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.1 }}
            className="rounded-2xl border border-destructive/10 bg-destructive/5 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 mb-4">
              <g.icon className="h-5 w-5 text-destructive" />
            </div>
            <h3 className="font-display text-base font-bold mb-3">{g.title}</h3>
            <ul className="space-y-2">
              {g.items.map((item, j) => (
                <li key={j} className="text-sm text-muted-foreground leading-snug">• {item}</li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default ProblemSection;
