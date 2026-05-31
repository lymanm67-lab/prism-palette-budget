import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface RelatedTool {
  to: string;
  label: string;
  icon: LucideIcon;
  description?: string;
}

interface RelatedToolsBarProps {
  title?: string;
  tools: RelatedTool[];
}

/**
 * Compact horizontal bar linking to related planning surfaces.
 * Use at top of pages that overlap conceptually (debt, goals, investment planning).
 */
export function RelatedToolsBar({ title = 'Related tools', tools }: RelatedToolsBarProps) {
  if (!tools.length) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap rounded-lg border border-border bg-card/40 backdrop-blur px-3 py-2 text-xs">
      <span className="text-muted-foreground font-medium uppercase tracking-wider">{title}</span>
      <div className="flex items-center gap-1.5 flex-wrap">
        {tools.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              title={t.description}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/40 hover:bg-primary/10 hover:text-primary transition-colors border border-transparent hover:border-primary/30"
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
              <ArrowRight className="h-3 w-3 opacity-60" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
