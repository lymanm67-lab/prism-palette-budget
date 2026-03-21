import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calculator, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AnimatedNumber from '@/components/AnimatedNumber';
import { useNavigate } from 'react-router-dom';

const fmt = (n: number) => '$' + Math.round(n).toLocaleString();

const SafeToSpendCalculator = () => {
  const navigate = useNavigate();
  const [income, setIncome] = useState('');
  const [calculated, setCalculated] = useState(false);

  const monthlyIncome = parseFloat(income) || 0;
  // Approximate: 50% fixed obligations, 10% savings buffer → 40% safe
  const dailySafe = Math.round((monthlyIncome * 0.4) / 30);
  const weeklySafe = dailySafe * 7;
  const monthlySafe = Math.round(monthlyIncome * 0.4);

  const handleCalculate = () => {
    if (monthlyIncome > 0) setCalculated(true);
  };

  return (
    <section className="py-16 sm:py-24 bg-muted/20">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-4">Your Safe-to-Spend Right Now</p>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight">
            Know exactly what you can{' '}
            <span className="prism-gradient-text">safely spend</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            Enter your monthly income to see your estimated Safe-to-Spend.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 max-w-md mx-auto"
        >
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
              <Input
                type="number"
                placeholder="Monthly income"
                value={income}
                onChange={(e) => { setIncome(e.target.value); setCalculated(false); }}
                onKeyDown={(e) => e.key === 'Enter' && handleCalculate()}
                className="pl-7 h-12 text-lg rounded-xl"
              />
            </div>
            <Button onClick={handleCalculate} size="lg" className="h-12 px-6 rounded-xl prism-gradient-teal text-white font-bold">
              <Calculator className="h-5 w-5 mr-2" /> Calculate
            </Button>
          </div>
        </motion.div>

        {calculated && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-10"
          >
            <div className="grid gap-6 sm:grid-cols-3 max-w-3xl mx-auto">
              {[
                { label: 'Today', amount: dailySafe, color: 'from-prism-teal to-prism-sky' },
                { label: 'This Week', amount: weeklySafe, color: 'from-prism-sky to-prism-indigo' },
                { label: 'This Month', amount: monthlySafe, color: 'from-prism-indigo to-prism-navy' },
              ].map((tf, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.12 }}
                  className="rounded-2xl border-2 border-accent/30 bg-card p-6 space-y-2 shadow-lg"
                >
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{tf.label}</p>
                  <p className={`text-3xl sm:text-4xl font-extrabold bg-gradient-to-r ${tf.color} bg-clip-text text-transparent`}>
                    <AnimatedNumber value={tf.amount} formatFn={fmt} />
                  </p>
                  <p className="text-xs text-muted-foreground">safe to spend</p>
                </motion.div>
              ))}
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              This is an estimate. Prism calculates your exact Safe-to-Spend using your real transactions.
            </p>

            <div className="mt-6">
              <Button size="lg" onClick={() => navigate('/onboarding')}
                className="prism-gradient-teal hover:opacity-90 h-12 px-8 gap-2 font-bold rounded-2xl prism-glow-teal text-white">
                Get My Exact Number <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </motion.div>
        )}

        {!calculated && (
          <p className="mt-6 text-xs text-muted-foreground max-w-xl mx-auto">
            Updated in real time based on your income, expenses, and upcoming obligations.
          </p>
        )}
      </div>
    </section>
  );
};

export default SafeToSpendCalculator;
