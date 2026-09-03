import { useEffect, useMemo } from 'react';
import { FreedCashSummary } from '@/components/freed-cash/FreedCashSummary';
import { FreedCashSourceList } from '@/components/freed-cash/FreedCashSourceList';
import { VerificationQueue } from '@/components/freed-cash/VerificationQueue';
import { RenewalWatch } from '@/components/freed-cash/RenewalWatch';
import { SubscriptionGate } from '@/components/freed-cash/SubscriptionGate';
import { RedirectLedger } from '@/components/freed-cash/RedirectLedger';
import { SweepWaterfall } from '@/components/freed-cash/SweepWaterfall';
import { MonthlyFreedCashReview } from '@/components/freed-cash/MonthlyFreedCashReview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { summarizeFreedCash, useFreedCashSources, useFreedCashRedirects } from '@/hooks/use-freed-cash';


export default function FreedCash() {
  const { data: sources, isLoading } = useFreedCashSources();
  const { data: redirects } = useFreedCashRedirects();


  useEffect(() => {
    document.title = 'Freed Cash Engine | PrismMoney';
  }, []);

  const list = sources ?? [];
  const totals = useMemo(() => summarizeFreedCash(list), [list]);

  return (
    <div className="container max-w-6xl space-y-6 py-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Freed Cash Engine</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Money that becomes available when a recurring expense is canceled, reduced, replaced, negotiated or
          ends. Every freed dollar needs a new job — it is not automatic discretionary spending.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <FreedCashSummary totals={totals} />

          <Tabs defaultValue="sources" className="space-y-4">
            <TabsList className="flex w-full flex-wrap">
              <TabsTrigger value="sources">Sources</TabsTrigger>
              <TabsTrigger value="verify">Verify</TabsTrigger>
              <TabsTrigger value="renewals">Renewals</TabsTrigger>
              <TabsTrigger value="gate">Subscription Gate</TabsTrigger>
              <TabsTrigger value="redirects">Redirects</TabsTrigger>
              <TabsTrigger value="sweep">Sweep</TabsTrigger>
              <TabsTrigger value="review">Monthly review</TabsTrigger>
            </TabsList>

            <TabsContent value="sources">
              <FreedCashSourceList sources={list} />
            </TabsContent>
            <TabsContent value="verify">
              <VerificationQueue sources={list} />
            </TabsContent>
            <TabsContent value="renewals">
              <RenewalWatch sources={list} />
            </TabsContent>
            <TabsContent value="gate">
              <SubscriptionGate sources={list} />
            </TabsContent>
            <TabsContent value="redirects">
              <RedirectLedger sources={list} redirects={redirects ?? []} />
            </TabsContent>
            <TabsContent value="sweep">
              <SweepWaterfall sources={list} redirects={redirects ?? []} />
            </TabsContent>
            <TabsContent value="review">
              <MonthlyFreedCashReview sources={list} redirects={redirects ?? []} />
            </TabsContent>

          </Tabs>
        </>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">How freed cash is counted</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs text-muted-foreground">
          <p>True savings = original amount − new amount − added fees, normalized to a monthly figure.</p>
          <p>Only savings verified on a statement count toward your capture rate and redirect capacity.</p>
          <p>Reversed or reactivated expenses are removed from verified savings so nothing is double-counted.</p>
        </CardContent>
      </Card>
    </div>
  );
}
