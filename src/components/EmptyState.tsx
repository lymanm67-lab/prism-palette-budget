import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        className
      )}
    >
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl animate-pulse" />
        <div className="relative bg-gradient-to-br from-primary/20 to-primary/5 p-6 rounded-2xl border border-primary/20">
          <Icon className="h-12 w-12 text-primary" strokeWidth={1.5} />
        </div>
      </div>
      
      <h3 className="text-2xl font-semibold mb-2 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
        {title}
      </h3>
      
      <p className="text-muted-foreground max-w-md mb-6 leading-relaxed">
        {description}
      </p>
      
      {actionLabel && onAction && (
        <Button onClick={onAction} size="lg" className="shadow-lg shadow-primary/25">
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
};
