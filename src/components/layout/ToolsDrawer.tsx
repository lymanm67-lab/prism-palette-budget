import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Wrench, Calculator, Target, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const TOOLS = [
  { to: '/calculators', icon: Calculator, label: 'Calculators', desc: 'Investment, retirement, currency', color: 'text-prism-indigo' },
  { to: '/crossover-tracker', icon: Target, label: 'Crossover Tracker', desc: 'When investments cover expenses', color: 'text-prism-lime' },
  { to: '/spending-trends', icon: TrendingUp, label: 'Spending Trends', desc: 'Category trend explorer', color: 'text-prism-lime' },
];

interface Props { collapsed?: boolean }

const ToolsDrawer = ({ collapsed }: Props) => {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {collapsed ? (
          <button
            className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            title="Tools"
          >
            <Wrench className="h-4 w-4 text-prism-amber" />
          </button>
        ) : (
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <Wrench className="h-4 w-4 shrink-0 text-prism-amber" />
            <span className="flex-1 text-left">Tools</span>
            <span className="text-[10px] font-medium rounded-full bg-prism-amber/15 text-prism-amber px-2 py-0.5">
              {TOOLS.length}
            </span>
          </button>
        )}
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <SheetHeader>
          <SheetTitle>Tools</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {TOOLS.map(t => (
            <NavLink
              key={t.to}
              to={t.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) => cn(
                'flex items-start gap-3 rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50',
                isActive && 'bg-muted border-primary/40'
              )}
            >
              <t.icon className={cn('h-5 w-5 mt-0.5 shrink-0', t.color)} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{t.label}</div>
                <div className="text-xs text-muted-foreground">{t.desc}</div>
              </div>
            </NavLink>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ToolsDrawer;
