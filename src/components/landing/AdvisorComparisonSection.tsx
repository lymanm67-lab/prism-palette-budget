import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

const ROWS: { feature: string; advisor: boolean | string; prism: boolean | string }[] = [
  { feature: 'Monthly cost', advisor: '~$98+/mo', prism: 'From $9/mo' },
  { feature: 'Available 24/7', advisor: false, prism: true },
  { feature: 'Personalized money plan', advisor: true, prism: true },
  { feature: 'Safe-to-Spend engine', advisor: false, prism: true },
  { feature: 'Subscription cleanup', advisor: false, prism: true },
  { feature: 'Credit health roadmap', advisor: false, prism: true },
  { feature: 'Business & multi-entity', advisor: false, prism: true },
  { feature: 'Cash flow forecasting', advisor: false, prism: true },
  { feature: 'AI insights & tax help', advisor: false, prism: true },
  { feature: 'You stay in control', advisor: false, prism: true },
];

const Cell = ({ value, accent }: { value: boolean | string; accent?: boolean }) => {
  if (typeof value === 'string') {
    return (
      <span className={`text-sm font-semibold ${accent ? 'text-accent' : 'text-muted-foreground'}`}>
        {value}
      </span>
    );
  }
  return value ? (
    <Check className={`h-5 w-5 mx-auto ${accent ? 'text-accent' : 'text-muted-foreground'}`} />
  ) : (
    <X className="h-5 w-5 mx-auto text-border" />
  );
};

const AdvisorComparisonSection = () => (
  <section className="py-20 sm:py-28 bg-muted/20">
    <div className="mx-auto max-w-5xl px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-14"
      >
        <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight">
          A human advisor in a box —{' '}
          <span className="prism-gradient-text">at a fraction of the cost.</span>
        </h2>
        <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
          Services like Fruitful pair you with a CFP® for ~$98/month. PrismMoney™ gives you the
          same clarity and structure — plus tools they don't touch — without giving up control.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="overflow-x-auto rounded-2xl border border-border bg-card"
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-4 font-medium text-muted-foreground w-[260px]">
                What you get
              </th>
              <th className="p-4 text-center font-semibold text-muted-foreground">
                Human Advisor Service
              </th>
              <th className="p-4 text-center font-semibold text-accent bg-accent/10">
                Prism
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0">
                <td className="p-4 font-medium text-foreground">{row.feature}</td>
                <td className="p-4 text-center">
                  <Cell value={row.advisor} />
                </td>
                <td className="p-4 text-center bg-accent/5">
                  <Cell value={row.prism} accent />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      <p className="text-xs text-muted-foreground text-center mt-6 max-w-2xl mx-auto">
        Comparison reflects publicly listed features of advisor membership services as of 2026.
        Prism is software, not personalized financial advice.
      </p>
    </div>
  </section>
);

export default AdvisorComparisonSection;
