import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';

const FinalCTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 sm:py-28 auth-gradient-bg relative overflow-hidden">
      <div className="orb w-72 h-72 bg-[hsl(var(--prism-teal))] bottom-0 left-1/4 opacity-25" style={{ animationDelay: '-3s' }} />
      <div className="orb w-56 h-56 bg-[hsl(var(--prism-orange))] top-10 right-1/4 opacity-15" style={{ animationDelay: '-7s' }} />

      <div className="relative z-10 mx-auto max-w-3xl text-center px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl prism-gradient-teal prism-glow-teal">
            <Sparkles className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-primary-foreground leading-tight">
            Your money needs more than another tracker
          </h2>
          <p className="mt-4 text-base sm:text-lg text-primary-foreground/50 max-w-xl mx-auto">
            Get the clarity, control, and confidence to manage your finances in one place with Prism.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/onboarding')}
              className="prism-gradient-teal hover:opacity-90 text-lg h-14 px-10 gap-2 font-bold rounded-2xl prism-glow-teal text-primary-foreground">
              Start Your Free Trial <ArrowRight className="h-5 w-5" />
            </Button>
            <Button size="lg" variant="ghost" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-primary-foreground/40 hover:text-primary-foreground hover:bg-primary-foreground/5 h-14 px-8 rounded-2xl">
              Choose Your Plan
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTASection;
