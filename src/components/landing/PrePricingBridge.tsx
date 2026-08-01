import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import EditableText from '@/components/editor/EditableText';

const PrePricingBridge = () => {
  const navigate = useNavigate();

  return (
    <section className="py-14 sm:py-20 bg-background">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <EditableText contentKey="bridge.headline" as="p"
            className="font-display text-xl sm:text-2xl font-bold text-foreground leading-snug max-w-2xl mx-auto"
            fallback="You can see exactly where your money is going and what you can safely spend — in the next 10 minutes." />
          <div className="mt-6">
            <Button size="lg" onClick={() => navigate('/onboarding')}
              className="prism-gradient-teal hover:opacity-90 h-12 px-8 gap-2 font-bold rounded-2xl prism-glow-teal text-white">
              <EditableText contentKey="bridge.cta" fallback="Start Your Free Trial" /> <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PrePricingBridge;
