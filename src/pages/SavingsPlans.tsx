import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const FiftyPercentPlan = lazy(() => import('./FiftyPercentPlan'));
const FiveBucketPlan = lazy(() => import('./FiveBucketPlan'));
const ZeroBasedPlan = lazy(() => import('./ZeroBasedPlan'));

const TABS = [
  { id: 'fifty-percent', label: 'Live on 50%', El: FiftyPercentPlan },
  { id: 'five-bucket', label: 'Five-Bucket', El: FiveBucketPlan },
  { id: 'zero-based', label: 'Zero-Based', El: ZeroBasedPlan },
];

export default function SavingsPlans() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab')! : 'fifty-percent';

  return (
    <div className="space-y-2">
      <div className="container mx-auto px-4 pt-6">
        <h1 className="text-2xl font-bold tracking-tight">Savings Plans</h1>
        <p className="text-sm text-muted-foreground">Three ways to plan your money — pick a tab.</p>
      </div>
      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })}>
        <div className="container mx-auto px-4">
          <TabsList>
            {TABS.map((t) => <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>)}
          </TabsList>
        </div>
        {TABS.map(({ id, El }) => (
          <TabsContent key={id} value={id}>
            <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}><El /></Suspense>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
