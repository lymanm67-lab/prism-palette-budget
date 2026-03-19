import { motion } from 'framer-motion';
import { LayoutDashboard, Eye, Lightbulb, Briefcase, ShieldCheck, BadgeDollarSign } from 'lucide-react';

const BENEFITS = [
  { icon: LayoutDashboard, title: 'All-in-one financial command center', desc: 'Prism brings budgeting, subscription awareness, forecasting, net worth visibility, bill organization, and financial planning into one place.' },
  { icon: Eye, title: 'Clarity instead of chaos', desc: 'See what is happening with your money, where it is leaking, and what needs attention next.' },
  { icon: Lightbulb, title: 'Better decisions, not just more data', desc: 'Prism helps users take action — cut waste, prepare for upcoming expenses, and plan more confidently.' },
  { icon: Briefcase, title: 'Personal & business money in one ecosystem', desc: 'For entrepreneurs and business professionals, Prism reduces the frustration of managing money across disconnected tools.' },
  { icon: ShieldCheck, title: 'Less stress around bills, taxes & planning', desc: 'Stay organized year-round so important dates, documents, and expenses don\'t sneak up on you.' },
  { icon: BadgeDollarSign, title: 'Premium value that pays for itself', desc: 'When users catch wasteful subscriptions, reduce avoidable spending, or stay organized for taxes, Prism quickly returns more value than it costs.' },
];

const BenefitsSection = () => (
  <section id="benefits" className="py-20 sm:py-28 bg-background">
    <div className="mx-auto max-w-7xl px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="text-center mb-16">
        <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight">
          Why Prism Is Worth More Than a{' '}
          <span className="prism-gradient-text">Basic Budget App</span>
        </h2>
      </motion.div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
        {BENEFITS.map((b, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.08 }}
            className="rounded-2xl border border-border bg-card p-7 hover:border-accent/30 hover:shadow-lg transition-all group">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-prism-teal to-prism-sky transition-transform group-hover:scale-110">
              <b.icon className="h-6 w-6 text-primary-foreground" />
            </div>
            <h3 className="font-display text-lg font-bold">{b.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default BenefitsSection;
