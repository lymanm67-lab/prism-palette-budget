import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard, Receipt, PiggyBank, Target, Wallet, Tags,
  TrendingUp, Calculator, BarChart3, RefreshCw, CreditCard,
  Settings, HelpCircle, FileText, Search, Calendar,
} from 'lucide-react';

const PAGES = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, keywords: ['home', 'overview'] },
  { name: 'Transactions', path: '/transactions', icon: Receipt, keywords: ['payments', 'spending'] },
  { name: 'Budgets', path: '/budgets', icon: PiggyBank, keywords: ['planning', 'limits'] },
  { name: 'Goals', path: '/goals', icon: Target, keywords: ['savings', 'targets'] },
  { name: 'Accounts', path: '/accounts', icon: Wallet, keywords: ['banks', 'balances'] },
  { name: 'Categories', path: '/categories', icon: Tags, keywords: ['organize', 'groups'] },
  { name: 'Net Worth', path: '/net-worth', icon: TrendingUp, keywords: ['assets', 'liabilities'] },
  { name: 'Calculators', path: '/calculators', icon: Calculator, keywords: ['tools', 'math'] },
  { name: 'Reports', path: '/reports', icon: BarChart3, keywords: ['analytics', 'charts'] },
  { name: 'Recurring', path: '/recurring', icon: RefreshCw, keywords: ['subscriptions', 'bills'] },
  { name: 'Subscriptions', path: '/subscriptions', icon: CreditCard, keywords: ['services', 'monthly'] },
  { name: 'Cash Flow', path: '/cash-flow', icon: TrendingUp, keywords: ['forecast', 'projection'] },
  { name: 'Forecast', path: '/forecast', icon: Calendar, keywords: ['future', 'prediction'] },
  { name: 'Settings', path: '/settings', icon: Settings, keywords: ['preferences', 'profile'] },
  { name: 'Spending Trends', path: '/spending-trends', icon: BarChart3, keywords: ['analysis', 'patterns'] },
  { name: 'Debt Payoff', path: '/debt-payoff', icon: CreditCard, keywords: ['loans', 'strategy'] },
  { name: 'Investments', path: '/investments', icon: TrendingUp, keywords: ['portfolio', 'stocks'] },
  { name: 'Tax Assistant', path: '/tax-assistant', icon: FileText, keywords: ['taxes', 'deductions'] },
  { name: 'Retirement Hub', path: '/retirement', icon: Layers, keywords: ['retirement', 'preservation', 'sequence risk', 'waterfall', 'withdrawal', 'crossover'] },
  { name: 'Health Dashboard', path: '/health', icon: HeartPulse, keywords: ['health', 'wellness', 'longevity', 'weight', 'vitals'] },
  { name: 'Longevity & Dividend', path: '/health?tab=longevity', icon: Sparkles, keywords: ['longevity', 'lifespan', 'horizon', 'dividend', 'legacy score'] },
  { name: 'Nutrition & Meals', path: '/health?tab=nutrition', icon: HeartPulse, keywords: ['meals', 'calories', 'protein', 'food', 'bowl'] },
  { name: 'Exercise & Coach Arty', path: '/health?tab=exercise', icon: Dumbbell, keywords: ['workout', 'total gym', 'cardio', 'walking', 'coach arty'] },
  { name: 'Energy Report', path: '/health?tab=energy', icon: BarChart3, keywords: ['calories burned', 'water', 'progress', 'energy balance'] },
  { name: 'Preventive Care', path: '/health?tab=preventive', icon: HeartPulse, keywords: ['doctor', 'labs', 'medical records', 'appointments'] },
];


const ACTIONS = [
  { name: 'Add Transaction', action: 'add-transaction', icon: Receipt, keywords: ['new', 'create'] },
  { name: 'Create Budget', action: 'create-budget', icon: PiggyBank, keywords: ['new', 'add'] },
  { name: 'New Goal', action: 'new-goal', icon: Target, keywords: ['add', 'create'] },
  { name: 'Import CSV', action: 'import-csv', icon: FileText, keywords: ['upload', 'data'] },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = useCallback((path: string) => {
    setOpen(false);
    navigate(path);
  }, [navigate]);

  const handleAction = useCallback((action: string) => {
    setOpen(false);
    switch (action) {
      case 'add-transaction':
        navigate('/transactions?action=add');
        break;
      case 'create-budget':
        navigate('/budgets?action=add');
        break;
      case 'new-goal':
        navigate('/goals?action=add');
        break;
      case 'import-csv':
        navigate('/transactions?action=import');
        break;
    }
  }, [navigate]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Quick Actions">
          {ACTIONS.map((item) => (
            <CommandItem
              key={item.action}
              onSelect={() => handleAction(item.action)}
              className="flex items-center gap-2"
            >
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <span>{item.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Pages">
          {PAGES.map((page) => (
            <CommandItem
              key={page.path}
              onSelect={() => handleSelect(page.path)}
              className="flex items-center gap-2"
            >
              <page.icon className="h-4 w-4 text-muted-foreground" />
              <span>{page.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
