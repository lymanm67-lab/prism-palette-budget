import { ReactNode, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  iconColor?: string;
  defaultOpen?: boolean;
  accent?: boolean;
  badge?: ReactNode;
  children: ReactNode;
}

/**
 * Reusable collapsible section with chevron-down (rotates on open).
 * Used to break long calculators into space-saving expandable blocks.
 */
export default function CollapsibleSection({
  title,
  subtitle,
  icon: Icon,
  iconColor = 'text-primary',
  defaultOpen = false,
  accent = false,
  badge,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className={cn(
          'w-full flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors text-left',
          accent
            ? 'border-primary/30 bg-primary/5 hover:bg-primary/10'
            : 'border-border/40 bg-muted/20 hover:bg-muted/30'
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {Icon && <Icon className={cn('h-4 w-4 flex-shrink-0', iconColor)} />}
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{title}</div>
            {subtitle && <div className="text-xs text-muted-foreground truncate">{subtitle}</div>}
          </div>
          {badge && <div className="ml-2 flex-shrink-0">{badge}</div>}
        </div>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform flex-shrink-0', open && 'rotate-180')} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">{children}</CollapsibleContent>
    </Collapsible>
  );
}
