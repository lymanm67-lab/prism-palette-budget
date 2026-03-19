import { motion } from 'framer-motion';
import {
  PiggyBank, Target, Tags, CalendarDays, Bell, ScanSearch, RotateCcw,
  TrendingUp, LineChart, Handshake, CreditCard, FileText, Search,
  LayoutDashboard, DollarSign, Receipt, PieChart, BarChart3, Repeat, Wrench, Briefcase,
} from 'lucide-react';

const GROUPS = [
  {
    label: 'Personal Finance',
    color: 'from-prism-teal to-prism-sky',
    features: [
      { icon: PiggyBank, name: 'Zero-sum budgeting' },
      { icon: Target, name: 'Savings goals' },
      { icon: Tags, name: 'Spending categories' },
      { icon: CalendarDays, name: 'Monthly planning' },
      { icon: Bell, name: 'Alerts & reminders' },
      { icon: ScanSearch, name: 'Subscription detection' },
      { icon: RotateCcw, name: 'Recurring expense awareness' },
    ],
  },
  {
    label: 'Financial Control',
    color: 'from-prism-navy to-prism-indigo',
    features: [
      { icon: TrendingUp, name: 'Cash flow forecasting' },
      { icon: LineChart, name: 'Net worth tracking' },
      { icon: Handshake, name: 'Bill negotiation workflows' },
      { icon: CreditCard, name: 'Credit issue tracking & guidance' },
      { icon: FileText, name: 'Tax prep organization' },
      { icon: Search, name: 'Expense review tools' },
    ],
  },
  {
    label: 'Business Pro',
    color: 'from-prism-orange to-prism-amber',
    features: [
      { icon: LayoutDashboard, name: 'Personal & business dashboards' },
      { icon: DollarSign, name: 'Owner pay planning' },
      { icon: Receipt, name: 'Business expense tracking & review' },
      { icon: PieChart, name: 'Profit planning' },
      { icon: BarChart3, name: 'Business cash flow visibility' },
      { icon: Briefcase, name: 'Tax readiness support' },
      { icon: Repeat, name: 'Recurring business expense monitoring' },
      { icon: Wrench, name: 'Premium planning tools' },
    ],
  },
];

const FeaturesSection = () => (
  <section id="features" className="py-20 sm:py-28 bg-muted/20">
    <div className="mx-auto max-w-7xl px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="text-center mb-16">
        <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight">
          Everything you need to stay{' '}
          <span className="prism-gradient-text">financially focused</span>
        </h2>
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

      <p className="text-center text-sm text-muted-foreground mt-10 italic">
        Prism is built for real life — from households to side hustles to serious business owners.
      </p>
    </div>
  </section>
);

export default FeaturesSection;
