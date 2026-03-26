import { motion } from 'framer-motion';
import { Check, Minus } from 'lucide-react';

const ROWS = [
  'Monthly budgeting',
  'Subscription monitoring',
  'Financial planning',
  'Cash flow forecasting',
  'Credit & bill support workflows',
  'Tax organization',
  'AI audit & reconciliation',
  'Personal & business management',
  'All-in-one visibility',
];

const COLS = ['Basic Budget App', 'Subscription Tracker', 'Business Expense Tool', 'Prism'];

const DATA: number[][] = [
  [1, 0, 0, 1],
  [0, 1, 0, 1],
  [0, 0, 0, 1],
  [0, 0, 0, 1],
  [0, 0, 0, 1],
  [0, 0, 0, 1],
  [0, 0, 0, 1],
  [0, 0, 1, 1],
  [0, 0, 0, 1],
];

const ComparisonSection = () => (
  <section className="py-20 sm:py-28 bg-background">
    <div className="mx-auto max-w-5xl px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="text-center mb-14">
        <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight">
          Not another finance app.{' '}
          <span className="prism-gradient-text">A system for real control.</span>
        </h2>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-4 font-medium text-muted-foreground w-[200px]">Feature</th>
              {COLS.map((col, i) => (
                <th key={i} className={`p-4 text-center font-semibold ${i === 3 ? 'bg-accent/10 text-accent' : 'text-muted-foreground'}`}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, ri) => (
              <tr key={ri} className="border-b border-border/50 last:border-0">
                <td className="p-4 font-medium text-foreground">{row}</td>
                {DATA[ri].map((val, ci) => (
                  <td key={ci} className={`p-4 text-center ${ci === 3 ? 'bg-accent/5' : ''}`}>
                    {val ? (
                      <Check className={`h-5 w-5 mx-auto ${ci === 3 ? 'text-accent' : 'text-muted-foreground'}`} />
                    ) : (
                      <Minus className="h-5 w-5 mx-auto text-border" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  </section>
);

export default ComparisonSection;
