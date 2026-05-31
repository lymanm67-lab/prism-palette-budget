import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface RelatedTool {
  to: string;
  icon: LucideIcon;
  label: string;
}

interface Props {
  tools: RelatedTool[];
  label?: string;
  className?: string;
}

const RelatedToolsBar = ({ tools, label = 'Related tools', className }: Props) => {
  if (!tools.length) return null;
  return (
    <div className={cn('flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-muted/30 px-3 py-2', className)}>
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-1">
        {label}
      </span>
      {tools.map(t => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) => cn(
            'inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background px-2.5 py-1 text-xs font-medium text-foreground/80 transition-colors hover:bg-primary/10 hover:text-primary hover:border-primary/40',
            isActive && 'bg-primary/10 text-primary border-primary/40'
          )}
        >
          <t.icon className="h-3.5 w-3.5" />
          {t.label}
        </NavLink>
      ))}
    </div>
  );
};

export default RelatedToolsBar;
