import { useNavigate } from 'react-router-dom';
import prismLogo from '@/assets/prism-budget-logo.png';

const LandingFooter = () => {
  const navigate = useNavigate();

  return (
    <footer className="py-8 border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <img src={prismLogo} alt="PrismMoney™" className="h-10 w-10 rounded-lg object-contain" />
          <span className="font-display font-bold text-foreground">PrismMoney™</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <button onClick={() => navigate('/legal')} className="hover:text-foreground transition-colors">Privacy Policy</button>
          <span className="hidden sm:inline text-border">·</span>
          <button onClick={() => navigate('/legal')} className="hover:text-foreground transition-colors">Terms of Service</button>
          <span className="hidden sm:inline text-border">·</span>
          <button onClick={() => navigate('/legal')} className="hover:text-foreground transition-colors">Cookie Policy</button>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} PrismMoney™. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default LandingFooter;
