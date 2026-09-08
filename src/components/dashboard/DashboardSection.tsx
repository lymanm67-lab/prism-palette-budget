import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'prism_dash_sections';

function readState(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeState(id: string, open: boolean) {
  try {
    const next = { ...readState(), [id]: open };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch { /* noop */ }
}

interface DashboardSectionProps {
  id: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function DashboardSection({ id, title, subtitle, icon, defaultOpen = false, children }: DashboardSectionProps) {
  const [open, setOpen] = useState<boolean>(() => {
    const saved = readState()[id];
    return typeof saved === 'boolean' ? saved : defaultOpen;
  });

  const toggle = () => {
    const next = !open;
    setOpen(next);
    writeState(id, next);
  };

  return (
    <section className="space-y-4">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/50 bg-card/40 px-4 py-3 text-left transition-colors hover:bg-card/70"
      >
        <span className="flex items-center gap-2.5 min-w-0">
          {icon}
          <span className="min-w-0">
            <span className="block font-display text-base font-semibold truncate">{title}</span>
            {subtitle && <span className="block text-xs text-muted-foreground truncate">{subtitle}</span>}
          </span>
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && <div className="space-y-6">{children}</div>}
    </section>
  );
}

export default DashboardSection;
