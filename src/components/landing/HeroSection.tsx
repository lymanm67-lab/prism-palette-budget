import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Wallet, ShieldAlert, CalendarClock, BarChart3 } from 'lucide-react';

const BENEFITS_STRIP = [
  { icon: Wallet, text: 'Budget smarter' },
  { icon: ShieldAlert, text: 'Catch waste faster' },
  { icon: CalendarClock, text: 'Plan with confidence' },
  { icon: BarChart3, text: 'Manage personal & business in one app' },
];

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <header className="relative overflow-hidden auth-gradient-bg pt-24 sm:pt-28">
      {/* Background orbs */}
      <div className="orb w-[500px] h-[500px] bg-[hsl(var(--prism-teal))] -top-40 -left-40 opacity-30" style={{ animationDelay: '0s' }} />
      <div className="orb w-[400px] h-[400px] bg-[hsl(var(--prism-orange))] top-1/3 -right-32 opacity-20" style={{ animationDelay: '-5s' }} />
      <div className="orb w-[300px] h-[300px] bg-[hsl(var(--prism-sky))] bottom-0 left-1/3 opacity-15" style={{ animationDelay: '-8s' }} />

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-16 sm:py-24 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/10 bg-primary-foreground/5 px-4 py-1.5 mb-8">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            <span className="text-xs font-medium text-primary-foreground/70">Your all-in-one financial command center</span>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold text-primary-foreground tracking-tight leading-[1.1]">
            Take Control of Your Money,{' '}
            <span className="block sm:inline">Personal Life, and</span>{' '}
            <span className="prism-gradient-text">Business</span>{' '}
            <span className="block sm:inline">in One Place</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-primary-foreground/50 max-w-3xl mx-auto leading-relaxed">
            Prism is more than a budgeting app. It helps you track spending, catch waste, organize your finances,
            plan ahead, and manage both personal and business money — with clarity and confidence.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/onboarding')}
              className="prism-gradient-teal hover:opacity-90 text-lg h-14 px-10 gap-2 font-bold rounded-2xl prism-glow-teal text-primary-foreground">
              Start Your Free Trial <ArrowRight className="h-5 w-5" />
            </Button>
            <Button size="lg" variant="ghost" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-primary-foreground/40 hover:text-primary-foreground hover:bg-primary-foreground/5 h-14 px-8 rounded-2xl">
              See Pricing
            </Button>
          </div>
        </motion.div>

        {/* Benefit strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto"
        >
          {BENEFITS_STRIP.map((b, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl bg-primary-foreground/5 border border-primary-foreground/10 px-4 py-3">
              <b.icon className="h-4 w-4 text-accent shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-primary-foreground/70">{b.text}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </header>
  );
};

export default HeroSection;
