import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MoMIndicatorProps {
  percentageChange: number;
  direction: 'up' | 'down' | 'unchanged';
  inverted?: boolean; // For metrics where down is good (like expenses)
  className?: string;
  showPercentage?: boolean;
}

export default function MoMIndicator({ 
  percentageChange, 
  direction, 
  inverted = false,
  className,
  showPercentage = true,
}: MoMIndicatorProps) {
  const isPositive = inverted ? direction === 'down' : direction === 'up';
  const isNegative = inverted ? direction === 'up' : direction === 'down';

  if (direction === 'unchanged' || Math.abs(percentageChange) < 0.1) {
    return (
      <div className={cn('flex items-center gap-1 text-xs text-muted-foreground', className)}>
        <Minus className="h-3 w-3" />
        {showPercentage && <span>0%</span>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1 text-xs font-medium',
        isPositive && 'text-emerald-600 dark:text-emerald-400',
        isNegative && 'text-rose-600 dark:text-rose-400',
        className
      )}
    >
      {direction === 'up' ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {showPercentage && (
        <span>
          {direction === 'up' ? '+' : ''}
          {percentageChange.toFixed(1)}%
        </span>
      )}
    </div>
  );
}
