import { useState, useEffect, type ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  /** Overrides the auto key derived from the title. */
  storageKey?: string;
  children: ReactNode;
}

export function CollapsibleSection({ title, defaultOpen = false, storageKey, children }: CollapsibleSectionProps) {
  const key = `prism:section:${storageKey ?? title}`;
  const [open, setOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved === null ? defaultOpen : saved === '1';
    } catch {
      return defaultOpen;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, open ? '1' : '0');
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  }, [key, open]);


  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-accent/40 transition-colors"
      >
        <span className="text-sm font-semibold">{title}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && <div className="border-t border-border p-4">{children}</div>}
    </Card>
  );
}
