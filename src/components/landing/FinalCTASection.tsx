import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import EditableText from '@/components/editor/EditableText';

const FinalCTASection = () => {
  const navigate = useNavigate();
  const { subscribed } = useAuth();

  return (
    <section className="py-20 sm:py-28 auth-gradient-bg relative overflow-hidden">
      <div className="orb w-72 h-72 bg-[hsl(var(--prism-teal))] bottom-0 left-1/4 opacity-25" style={{ animationDelay: '-3s' }} />
      <div className="orb w-56 h-56 bg-[hsl(var(--prism-orange))] top-10 right-1/4 opacity-15" style={{ animationDelay: '-7s' }} />

      <div className="relative z-10 mx-auto max-w-3xl text-center px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl prism-gradient-teal prism-glow-teal">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <EditableText contentKey="final_cta.heading" as="h2"
            className="font-display text-3xl sm:text-5xl font-extrabold text-white leading-tight"
            fallback="Your money needs more than another tracker" />
          <EditableText contentKey="final_cta.subheading" as="p"
            className="mt-4 text-base sm:text-lg text-white/80 max-w-xl mx-auto"
            fallback="Get clear, stay in control, and make confident decisions with your money — starting today." />
          <div className="mt-8">
            <Button size="lg" onClick={() => navigate(subscribed ? '/dashboard' : '/onboarding')}
              className="prism-gradient-teal hover:opacity-90 text-lg h-14 px-10 gap-2 font-bold rounded-2xl prism-glow-teal text-white">
              {subscribed ? 'Go to Dashboard' : <EditableText contentKey="final_cta.cta" fallback="Start Your Free Trial" />} <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTASection;
