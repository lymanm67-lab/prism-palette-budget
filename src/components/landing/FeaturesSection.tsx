import { motion } from 'framer-motion';
import {
  PiggyBank, Target, Bell, ScanSearch,
  TrendingUp, LineChart, CreditCard, FileText,
  LayoutDashboard, DollarSign, PieChart, Briefcase,
  FileUp, Camera,
} from 'lucide-react';

const GROUPS = [
  {
    label: 'Personal Finance',
    color: 'from-prism-teal to-prism-sky',
    features: [
      { icon: PiggyBank, name: 'Zero-sum budgeting & savings goals' },
      { icon: Target, name: 'Spending categories & monthly planning' },
      { icon: FileUp, name: 'Paycheck stub upload → auto-fill budgets' },
      { icon: Camera, name: 'Scan bills & receipts to categorize instantly' },
    ],
  },
  {
    label: 'Financial Control',
    color: 'from-prism-navy to-prism-indigo',
    features: [
      { icon: TrendingUp, name: 'Cash flow forecasting' },
      { icon: LineChart, name: 'Net worth tracking' },
      { icon: CreditCard, name: 'Credit guidance & bill negotiation' },
      { icon: FileText, name: 'Tax prep & AI monthly reconciliation' },
    ],
  },
  {
    label: 'Business Pro',
    color: 'from-prism-orange to-prism-amber',
    features: [
      { icon: LayoutDashboard, name: 'Personal & business dashboards' },
      { icon: DollarSign, name: 'Owner pay & profit planning' },
      { icon: PieChart, name: 'Business cash flow visibility' },
      { icon: Briefcase, name: 'Tax readiness & premium tools' },
    ],
  },
];

const FeaturesSection = () => (
  <section id="features" className="py-16 sm:py-24 bg-muted/20">
    <div className="mx-auto max-w-7xl px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="text-center mb-14">
        <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight">
          Everything you need,{' '}
          <span className="prism-gradient-text">without switching tools</span>
        </h2>
        <p className="mt-3 text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
          From households to side hustles to serious business owners — one platform covers it all.
        </p>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-3">
        {GROUPS.map((group, gi) => (
          <motion.div key={gi} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: gi * 0.12 }}
            className="rounded-2xl border border-border bg-card p-6">
            <div className={`inline-flex rounded-lg bg-gradient-to-r ${group.color} px-3 py-1 mb-5`}>
              <span className="text-xs font-bold text-primary-foreground tracking-wide uppercase">{group.label}</span>
            </div>
            <ul className="space-y-3">
              {group.features.map((f, fi) => (
                <li key={fi} className="flex items-center gap-3 text-sm">
                  <f.icon className="h-4 w-4 text-accent shrink-0" />
                  <span className="text-foreground">{f.name}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
