import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog, DialogContent,
} from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import {
  LayoutDashboard, Landmark, ArrowLeftRight, PiggyBank, BarChart3, Tags, Target,
  Settings, Bot, TrendingDown, TrendingUp, Calculator, Scale, Map, Heart, Home,
  Wallet, RepeatIcon, GraduationCap, CreditCard, LineChart, Zap,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', group: 'Pages' },
  { to: '/getting-started', icon: GraduationCap, label: 'Getting Started', group: 'Pages' },
  { to: '/accounts', icon: Landmark, label: 'Accounts', group: 'Pages' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions', group: 'Pages' },
  { to: '/cash-flow', icon: Wallet, label: 'Cash Flow', group: 'Pages' },
  { to: '/budgets', icon: PiggyBank, label: 'Budgets', group: 'Pages' },
  { to: '/recurring', icon: RepeatIcon, label: 'Recurring', group: 'Pages' },
  { to: '/subscriptions', icon: CreditCard, label: 'Subscriptions', group: 'Pages' },
  { to: '/categories', icon: Tags, label: 'Categories', group: 'Pages' },
  { to: '/goals', icon: Target, label: 'Goals', group: 'Pages' },
  { to: '/debt-payoff', icon: TrendingDown, label: 'Debt Payoff', group: 'Pages' },
  { to: '/investments', icon: TrendingUp, label: 'Investments', group: 'Pages' },
  { to: '/net-worth', icon: Scale, label: 'Net Worth', group: 'Pages' },
  { to: '/forecast', icon: LineChart, label: 'Forecast', group: 'Pages' },
  { to: '/roadmap', icon: Map, label: 'Prism Roadmap', group: 'Pages' },
  { to: '/home-buying', icon: Home, label: 'Home Buying', group: 'Pages' },
  { to: '/calculators', icon: Calculator, label: 'Calculators', group: 'Pages' },
  { to: '/reports', icon: BarChart3, label: 'Reports', group: 'Pages' },
  { to: '/spending-trends', icon: TrendingUp, label: 'Spending Trends', group: 'Pages' },
  { to: '/tax-assistant', icon: Bot, label: 'Tax Assistant', group: 'Pages' },
  { to: '/about', icon: Heart, label: 'About', group: 'Pages' },
  { to: '/settings', icon: Settings, label: 'Settings', group: 'Pages' },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CommandPalette = ({ open, onOpenChange }: CommandPaletteProps) => {
  const navigate = useNavigate();

  const handleSelect = useCallback((to: string) => {
    navigate(to);
    onOpenChange(false);
  }, [navigate, onOpenChange]);

  const groups = NAV_ITEMS.reduce<Record<string, typeof NAV_ITEMS>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-xl overflow-hidden rounded-2xl border border-border/50 shadow-2xl">
        <Command className="rounded-2xl">
          <div className="flex items-center border-b border-border px-4 py-3 gap-3">
            <div className="h-6 w-6 rounded-lg prism-gradient flex items-center justify-center shrink-0">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <CommandInput
              placeholder="Search pages, features…"
              className="border-none p-0 focus:ring-0 text-sm h-auto shadow-none"
            />
            <kbd className="hidden sm:flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
              ESC
            </kbd>
          </div>
          <CommandList className="max-h-[400px] overflow-y-auto p-2">
            <CommandEmpty className="py-10 text-center text-sm text-muted-foreground">
              No results found.
            </CommandEmpty>
            {Object.entries(groups).map(([group, items], i) => (
              <CommandGroup key={group} heading={group} className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-muted-foreground/50 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                {items.map((item) => (
                  <CommandItem
                    key={item.to}
                    value={item.label}
                    onSelect={() => handleSelect(item.to)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer aria-selected:bg-accent"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/50 shrink-0">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                    </span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </CommandItem>
                ))}
                {i < Object.keys(groups).length - 1 && <CommandSeparator className="my-1" />}
              </CommandGroup>
            ))}
          </CommandList>
          <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-[10px] text-muted-foreground/60">
            <span className="flex items-center gap-1"><kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono">↑↓</kbd> Navigate</span>
            <span className="flex items-center gap-1"><kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono">↵</kbd> Select</span>
            <span className="flex items-center gap-1"><kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono">ESC</kbd> Close</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
};

export default CommandPalette;
