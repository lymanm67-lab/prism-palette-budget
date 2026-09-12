import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  /** Stable id so the open/closed choice is remembered between visits. */
  id: string;
  title: ReactNode;
  description?: ReactNode;
  /** Extra content rendered on the right of the header row (badges etc.). */
  headerRight?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Card-like section that opens and closes with a chevron, so long pages stay
 * short. The choice is remembered in localStorage per section id.
 */
export default function CollapsibleSection({
  id,
  title,
  description,
  headerRight,
  defaultOpen = true,
  children,
  className,
}: Props) {
  const storageKey = `swingedge-collapsed:${id}`;
  const [open, setOpen] = useState<boolean>(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      return stored === null ? defaultOpen : stored === 'open';
    } catch {
      return defaultOpen;
    }
  });

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(storageKey, next ? 'open' : 'closed');
      } catch {
        /* private mode — state only */
      }
      return next;
    });
  };

  return (
    <section className={cn('rounded-xl border bg-card text-card-foreground shadow-sm', className)}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-6 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
      >
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
            !open && '-rotate-90',
          )}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold leading-tight">{title}</span>
          {description ? (
            <span className="mt-0.5 block text-sm text-muted-foreground">{description}</span>
          ) : null}
        </span>
        {headerRight ? <span className="shrink-0">{headerRight}</span> : null}
      </button>
      {open ? <div className="px-6 pb-6">{children}</div> : null}
    </section>
  );
}
