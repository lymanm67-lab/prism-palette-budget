import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Shield, Check, AlertTriangle } from 'lucide-react';

type ReadinessLevel = 'not_ready' | 'improving' | 'nearly_ready' | 'ready';

interface ReadinessMeterProps {
  level: ReadinessLevel;
  className?: string;
}

const levels: { key: ReadinessLevel; label: string; color: string }[] = [
  { key: 'not_ready', label: 'Not Ready', color: 'bg-destructive' },
  { key: 'improving', label: 'Improving', color: 'bg-amber-500' },
  { key: 'nearly_ready', label: 'Nearly Ready', color: 'bg-blue-500' },
  { key: 'ready', label: 'Ready', color: 'bg-emerald-500' },
];

export default function ReadinessMeter({ level, className }: ReadinessMeterProps) {
  const activeIdx = levels.findIndex(l => l.key === level);
  const activeLevel = levels[activeIdx] || levels[0];

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        <Shield className={cn('h-5 w-5', activeIdx >= 3 ? 'text-emerald-500' : activeIdx >= 2 ? 'text-blue-500' : activeIdx >= 1 ? 'text-amber-500' : 'text-destructive')} />
        <span className="text-sm font-bold">{activeLevel.label}</span>
      </div>
      <div className="flex gap-1.5">
        {levels.map((l, i) => (
          <motion.div
            key={l.key}
            className={cn(
              'h-2.5 flex-1 rounded-full transition-colors',
              i <= activeIdx ? l.color : 'bg-muted'
            )}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: i * 0.15, duration: 0.4 }}
            style={{ transformOrigin: 'left' }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        {levels.map(l => (
          <span key={l.key} className={cn(l.key === level && 'font-bold text-foreground')}>
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
