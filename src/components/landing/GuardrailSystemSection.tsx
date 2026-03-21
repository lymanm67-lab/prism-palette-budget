import { motion } from 'framer-motion';
import { ShieldCheck, TrendingUp, Unlock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const STEPS = [
  { icon: ShieldCheck, title: 'Start with guardrails', desc: 'Protect your spending with conservative limits that keep you on track.' },
  { icon: TrendingUp, title: 'Build consistency', desc: 'Track your progress daily. Stay within your Safe-to-Spend to build habits.' },
  { icon: Unlock, title: 'Unlock flexibility', desc: 'After 90 days of consistency, your limits loosen and you gain more freedom.' },
];

const GuardrailSystemSection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 sm:py-24 bg-background">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-14">
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight">
            A system that helps you{' '}
            <span className="prism-gradient-text">improve, not just track</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            This is not just tracking. This is a system for real financial control.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-3 max-w-4xl mx-auto">
          {STEPS.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative rounded-2xl border border-border bg-card p-7 text-center"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-prism-teal to-prism-sky">
                <step.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5">
                <span className="text-[10px] font-bold text-accent-foreground uppercase tracking-wider">Step {i + 1}</span>
              </div>
              <h3 className="font-display text-lg font-bold mt-1">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <Button size="lg" onClick={() => navigate('/onboarding')}
            className="prism-gradient-teal hover:opacity-90 h-12 px-8 gap-2 font-bold rounded-2xl prism-glow-teal text-white">
            Start Your Free Trial <ArrowRight className="h-5 w-5" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default GuardrailSystemSection;
