import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import prismLogo from '@/assets/prism-budget-logo.png';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

const LandingNav = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-card/95 backdrop-blur-lg border-b border-border shadow-sm' : 'bg-transparent'}`}>
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src={prismLogo} alt="PrismBudget™" className="h-10 w-10 rounded-lg object-contain" />
          <span className={`font-display text-lg font-extrabold tracking-tight ${scrolled ? 'text-foreground' : 'text-primary-foreground'}`}>
            PrismBudget™
          </span>
        </div>

        {/* Desktop nav links */}
        <div className={`hidden md:flex items-center gap-6 text-sm font-semibold ${scrolled ? 'text-muted-foreground' : 'text-white/90'}`}>
          <button onClick={() => scrollTo('benefits')} className="hover:text-accent transition-colors">Benefits</button>
          <button onClick={() => scrollTo('features')} className="hover:text-accent transition-colors">Features</button>
          <button onClick={() => scrollTo('pricing')} className="hover:text-accent transition-colors">Pricing</button>
          <button onClick={() => scrollTo('faq')} className="hover:text-accent transition-colors">FAQ</button>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/auth')}
            className={scrolled ? 'text-muted-foreground hover:text-foreground' : 'text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10'}>
            Sign In
          </Button>
          <Button onClick={() => navigate('/onboarding')} className="prism-gradient-teal text-primary-foreground font-semibold hover:opacity-90 rounded-xl">
            Start Free Trial
          </Button>
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2">
          {mobileOpen
            ? <X className={`h-6 w-6 ${scrolled ? 'text-foreground' : 'text-primary-foreground'}`} />
            : <Menu className={`h-6 w-6 ${scrolled ? 'text-foreground' : 'text-primary-foreground'}`} />
          }
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden bg-card border-b border-border px-6 pb-4 space-y-3">
          <button onClick={() => scrollTo('benefits')} className="block w-full text-left text-sm font-medium text-foreground py-2">Benefits</button>
          <button onClick={() => scrollTo('features')} className="block w-full text-left text-sm font-medium text-foreground py-2">Features</button>
          <button onClick={() => scrollTo('pricing')} className="block w-full text-left text-sm font-medium text-foreground py-2">Pricing</button>
          <button onClick={() => scrollTo('faq')} className="block w-full text-left text-sm font-medium text-foreground py-2">FAQ</button>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => { setMobileOpen(false); navigate('/auth'); }} className="flex-1">Sign In</Button>
            <Button onClick={() => { setMobileOpen(false); navigate('/onboarding'); }} className="flex-1 prism-gradient-teal text-primary-foreground">Start Free Trial</Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default LandingNav;
