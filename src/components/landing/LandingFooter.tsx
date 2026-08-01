import { useNavigate } from 'react-router-dom';
import prismLogo from '@/assets/prism-money-logo.png';
import EditableText from '@/components/editor/EditableText';
import EditableImage from '@/components/editor/EditableImage';

const LandingFooter = () => {
  const navigate = useNavigate();

  return (
    <footer className="py-8 border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <EditableImage contentKey="footer.logo_image" fallbackSrc={prismLogo} alt="PrismMoney™" className="h-10 w-10 rounded-lg object-contain" wrapperClassName="h-10 w-10 rounded-lg" />
          <EditableText contentKey="footer.brand" fallback="PrismMoney™" className="font-display font-bold text-foreground" />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <button onClick={() => navigate('/legal')} className="hover:text-foreground transition-colors"><EditableText contentKey="footer.link_privacy" fallback="Privacy Policy" /></button>
          <span className="hidden sm:inline text-border">·</span>
          <button onClick={() => navigate('/legal')} className="hover:text-foreground transition-colors"><EditableText contentKey="footer.link_terms" fallback="Terms of Service" /></button>
          <span className="hidden sm:inline text-border">·</span>
          <button onClick={() => navigate('/legal')} className="hover:text-foreground transition-colors"><EditableText contentKey="footer.link_cookie" fallback="Cookie Policy" /></button>
          <span className="hidden sm:inline text-border">·</span>
          <button onClick={() => navigate('/changelog')} className="hover:text-foreground transition-colors"><EditableText contentKey="footer.link_whats_new" fallback="What's New" /></button>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} <EditableText contentKey="footer.copyright" fallback="PrismMoney™. All rights reserved." /></p>
      </div>
    </footer>
  );
};

export default LandingFooter;
