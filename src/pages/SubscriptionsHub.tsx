import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CreditCard, RepeatIcon, Scissors, PiggyBank, Wallet, TrendingDown } from 'lucide-react';
import RelatedToolsBar from '@/components/RelatedToolsBar';
import Subscriptions from './Subscriptions';
import Recurring from './Recurring';

const SubscriptionsHub = () => {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'recurring' ? 'recurring' : 'subscriptions';

  const onChange = (v: string) => {
    const next = new URLSearchParams(params);
    if (v === 'recurring') next.set('tab', 'recurring');
    else next.delete('tab');
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
