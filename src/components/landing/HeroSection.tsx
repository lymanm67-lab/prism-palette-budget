import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useABTest } from '@/hooks/use-ab-test';
import heroProductShot from '@/assets/hero-product-shot.png';

const HeroSection = () => {
  const navigate = useNavigate();

  const headline = useABTest('hero_headline', 'control');
  const cta = useABTest('hero_cta', 'control');

  const headlineText = headline.variant.config?.headline as string ||
    "You're making money, but you still don't have a clear picture of where it's going.";
  const subheadlineText = headline.variant.config?.subheadline as string ||
    'Prism shows you exactly where your money is going and what you can safely spend.';
  const supportingText = headline.variant.config?.supporting as string ||
    'Know exactly what you can safely spend today, this week, and this month without guessing.';
  const ctaText = cta.variant.config?.text as string || 'Start Your Free Trial';

  const handleCtaClick = () => {
    cta.trackClick();
    headline.trackClick();
    navigate('/onboarding');
  };

  return (
    <header className="relative overflow-hidden auth-gradient-bg pt-24 sm:pt-28">
      {/* Background orbs */}
      <div className="orb w-[500px] h-[500px] bg-[hsl(var(--prism-teal))] -top-40 -left-40 opacity-30" style={{ animationDelay: '0s' }} />
      <div className="orb w-[400px] h-[400px] bg-[hsl(var(--prism-orange))] top-1/3 -right-32 opacity-20" style={{ animationDelay: '-5s' }} />

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-16 sm:py-24 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 mb-8">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            <span className="text-xs font-medium text-white/80">Your financial control system</span>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.1]">
            {headlineText.includes('clear picture') ? (
              <>
                You're making money, but you still don't have a{' '}
                <span className="prism-gradient-text">clear picture</span>{' '}
                of where it's going.
              </>
            ) : (
              headlineText
            )}
          </h1>

          <p className="mt-6 text-base sm:text-lg text-white/90 max-w-3xl mx-auto leading-relaxed font-medium">
            {subheadlineText}
          </p>

          <p className="mt-4 text-sm sm:text-base text-white/70 max-w-2xl mx-auto leading-relaxed">
            {supportingText}
          </p>

          <div className="mt-10 flex flex-col items-center gap-3">
            <Button size="lg" onClick={handleCtaClick}
              className="prism-gradient-teal hover:opacity-90 text-lg h-14 px-10 gap-2 font-bold rounded-2xl prism-glow-teal text-white">
              {ctaText} <ArrowRight className="h-5 w-5" />
            </Button>
            <p className="text-xs text-white/50 font-medium">
              See your full financial picture in the next 10 minutes.
            </p>
          </div>
        </motion.div>

        {/* Product screenshot */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mt-16 sm:mt-20 relative max-w-4xl mx-auto"
        >
          <img
            src={heroProductShot}
            alt="PrismMoney dashboard — your financial command center"
            className="w-full rounded-2xl"
            loading="eager"
          />
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[hsl(var(--prism-navy))] to-transparent pointer-events-none rounded-b-2xl" />
        </motion.div>
      </div>
    </header>
  );
};

export default HeroSection;
