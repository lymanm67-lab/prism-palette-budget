import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { CreditCard, RepeatIcon, Scissors, PiggyBank, Wallet, TrendingDown, Receipt, Layers } from 'lucide-react';
import RelatedToolsBar from '@/components/RelatedToolsBar';
import Subscriptions from './Subscriptions';
import Recurring from './Recurring';
import { cn } from '@/lib/utils';

const SubscriptionsHub = () => {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'recurring' ? 'recurring' : 'subscriptions';

  const onChange = (v: string) => {
    const next = new URLSearchParams(params);
    if (v === 'recurring') next.set('tab', 'recurring');
    else next.delete('tab');
    setParams(next, { replace: true });
  };

  const chips: Array<{ id: 'all' | 'bills' | 'subs'; label: string; icon: any; target: 'subscriptions' | 'recurring' | null }> = [
    { id: 'all', label: 'All', icon: Layers, target: null },
    { id: 'bills', label: 'Bills only', icon: Receipt, target: 'recurring' },
    { id: 'subs', label: 'Subscriptions only', icon: CreditCard, target: 'subscriptions' },
  ];
  const activeChip: 'all' | 'bills' | 'subs' = params.get('filter') === 'bills'
    ? 'bills'
    : params.get('filter') === 'subs'
      ? 'subs'
      : 'all';

  const onChip = (id: 'all' | 'bills' | 'subs', target: string | null) => {
    const next = new URLSearchParams(params);
    if (id === 'all') next.delete('filter');
    else next.set('filter', id);
    if (target === 'recurring') next.set('tab', 'recurring');
    else if (target === 'subscriptions') next.delete('tab');
    setParams(next, { replace: true });
  };

  return (
    <div className="container max-w-7xl mx-auto px-4 pt-4">
      <RelatedToolsBar
        className="mb-3"
        tools={[
          { to: '/bill-negotiation', icon: Scissors, label: 'Bill Negotiation' },
          { to: '/budgets', icon: PiggyBank, label: 'Budgets' },
          { to: '/cash-flow', icon: Wallet, label: 'Cash Flow' },
          { to: '/debt-payoff', icon: TrendingDown, label: 'Debt Payoff' },
        ]}
      />

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground mr-1">Bills &amp; Subscriptions:</span>
        {chips.map(c => {
          const Icon = c.icon;
          const isActive = activeChip === c.id;
          return (
            <Button
              key={c.id}
              size="sm"
              variant={isActive ? 'default' : 'outline'}
              className={cn('h-7 rounded-full text-xs gap-1.5', isActive && 'shadow-sm')}
              onClick={() => onChip(c.id, c.target)}
            >
              <Icon className="h-3.5 w-3.5" /> {c.label}
            </Button>
          );
        })}
      </div>

      <Tabs value={tab} onValueChange={onChange} className="w-full">
        <TabsList className="mb-2">
          <TabsTrigger value="subscriptions" className="gap-2">
            <CreditCard className="h-4 w-4" /> Subscriptions
          </TabsTrigger>
          <TabsTrigger value="recurring" className="gap-2">
            <RepeatIcon className="h-4 w-4" /> Recurring Bills
          </TabsTrigger>
        </TabsList>
        <TabsContent value="subscriptions" className="mt-0">
          <Subscriptions />
        </TabsContent>
        <TabsContent value="recurring" className="mt-0">
          <Recurring />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SubscriptionsHub;
