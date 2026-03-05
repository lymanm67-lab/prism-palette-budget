import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Subtle background mesh */}
      <div className="absolute inset-0 bg-mesh pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 text-center max-w-lg space-y-8"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl prism-gradient prism-glow"
        >
          <Search className="h-10 w-10 text-white" />
        </motion.div>

        {/* 404 Number */}
        <h1 className="font-display text-8xl font-extrabold tracking-tight prism-gradient-text">
          404
        </h1>

        <div>
          <h2 className="font-display text-2xl font-bold">Page not found</h2>
          <p className="mt-2 text-muted-foreground">
            The page <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">{location.pathname}</code> doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex gap-3 justify-center flex-wrap">
          <Button onClick={() => navigate(-1)} variant="outline" className="gap-2 rounded-xl">
            <ArrowLeft className="h-4 w-4" /> Go Back
          </Button>
          <Button onClick={() => navigate('/dashboard')} className="gap-2 rounded-xl prism-gradient hover:opacity-90">
            <Home className="h-4 w-4" /> Dashboard
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/50">
          <Zap className="h-3 w-3" />
          PrismBudget
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
