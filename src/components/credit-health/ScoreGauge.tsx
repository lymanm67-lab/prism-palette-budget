import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ScoreGaugeProps {
  score: number;
  maxScore?: number;
  minScore?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const getScoreColor = (score: number) => {
  if (score >= 750) return 'hsl(142 71% 45%)';
  if (score >= 670) return 'hsl(142 71% 45%)';
  if (score >= 580) return 'hsl(48 96% 53%)';
  return 'hsl(0 84% 60%)';
};

const getScoreLabel = (score: number) => {
  if (score >= 750) return 'Excellent';
  if (score >= 670) return 'Good';
  if (score >= 580) return 'Fair';
  if (score >= 300) return 'Needs Work';
  return '—';
};

const sizes = {
  sm: { svg: 'w-24 h-24', text: 'text-xl', label: 'text-[9px]' },
  md: { svg: 'w-40 h-40', text: 'text-4xl', label: 'text-xs' },
  lg: { svg: 'w-52 h-52', text: 'text-5xl', label: 'text-sm' },
};

export default function ScoreGauge({ score, maxScore = 850, minScore = 300, size = 'md', showLabel = true, className }: ScoreGaugeProps) {
  const range = maxScore - minScore;
  const pct = Math.max(0, Math.min(100, ((score - minScore) / range) * 100));
  const color = getScoreColor(score);
  const label = getScoreLabel(score);
  const s = sizes[size];

  // Semi-circle arc (180 degrees)
  const radius = 45;
  const circumference = Math.PI * radius;
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="relative">
        <svg className={cn(s.svg)} viewBox="0 0 120 70">
          {/* Background arc */}
          <path
            d="M 10 65 A 50 50 0 0 1 110 65"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Score arc */}
          <motion.path
            d="M 10 65 A 50 50 0 0 1 110 65"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <motion.span
            className={cn(s.text, 'font-bold leading-none')}
            style={{ color }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {score > 0 ? score : '—'}
          </motion.span>
          {showLabel && (
            <span className={cn(s.label, 'font-medium text-muted-foreground mt-0.5')}>{label}</span>
          )}
        </div>
      </div>
      <div className="flex justify-between w-full px-2 mt-1">
        <span className="text-[10px] text-muted-foreground">{minScore}</span>
        <span className="text-[10px] text-muted-foreground">{maxScore}</span>
      </div>
    </div>
  );
}
