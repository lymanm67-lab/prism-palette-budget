import { motion } from 'framer-motion';
import {
  PiggyBank, Target, Bell, ScanSearch,
  TrendingUp, LineChart, CreditCard, FileText,
  LayoutDashboard, DollarSign, PieChart, Briefcase,
  FileUp, Camera, Milestone, ShieldCheck,
  Calculator, Plane, Heart, Car, Tag, Receipt,
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
    label: '18 Financial Calculators',
    color: 'from-prism-violet to-prism-indigo',
    features: [
      { icon: Calculator, name: 'Mortgage, auto loan, credit card & debt payoff' },
      { icon: Plane, name: 'Vacation planner, wedding budget & honeymoon fund' },
      { icon: Car, name: 'Car affordability, baby costs & big purchase planner' },
      { icon: Tag, name: 'Pricing calculator for products, services & bundles' },
      { icon: Receipt, name: 'True cost loan analyzer with opportunity cost' },
      { icon: Heart, name: 'Holiday gift budget & wealth multiplier' },
    ],
  },
  {
    label: 'Wealth & Retirement',
    color: 'from-prism-navy to-prism-indigo',
    features: [
      { icon: TrendingUp, name: 'Household investment growth projector (8–12% ROI)' },
      { icon: Milestone, name: 'Retirement readiness assessment with gap analysis' },
      { icon: LineChart, name: 'Inflation, tax & Social Security impact modeling' },
      { icon: ShieldCheck, name: 'Spouse pension & deferred comp integration' },
    ],
  },
  {
    label: 'Business Pro',
    color: 'from-prism-orange to-prism-amber',
    features: [
      { icon: LayoutDashboard, name: 'Personal & business dashboards' },
      { icon: DollarSign, name: 'Cash flow forecasting & net worth tracking' },
      { icon: PieChart, name: 'Credit guidance & AI monthly reconciliation' },
      { icon: Briefcase, name: 'Tax readiness & capital planning tools' },
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
          From households to side hustles to serious business owners — 18 calculators and a complete financial control system in one platform.
        </p>
      </motion.div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
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
