import { motion } from 'framer-motion';
import { ShieldCheck, TrendingUp, Unlock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useABTest } from '@/hooks/use-ab-test';

const STEPS = [
  { icon: ShieldCheck, title: 'Start with guardrails', desc: 'Protect your spending with conservative limits that keep you on track.' },
  { icon: TrendingUp, title: 'Build consistency', desc: 'Track your progress daily. Stay within your Safe-to-Spend to build habits.' },
  { icon: Unlock, title: 'Unlock flexibility', desc: 'After 90 days of consistency, your limits loosen and you gain more freedom.' },
];

const GuardrailSystemSection = () => {
  const navigate = useNavigate();
  const { variant } = useABTest('guardrail_visibility', 'control');
  const visibility = (variant.config?.visibility as string) || 'normal';

  if (visibility === 'reduced') {
    return (
      <section className="py-10 sm:py-14 bg-background">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <p className="text-sm text-muted-foreground">
              Start with guardrails. Build discipline. Unlock more financial freedom in 90 days.
            </p>
          </motion.div>
        </div>
      </section>
    );
  }

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

        {visibility === 'prominent' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-md mx-auto mb-10 rounded-2xl border border-accent/20 bg-accent/5 p-6 text-center"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-2">90-Day Journey</p>
            <Progress value={33} className="h-3 mb-2" />
            <p className="text-sm text-muted-foreground">Build habits → Gain control → Unlock flexibility</p>
          </motion.div>
        )}

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
