import { useEffect, useMemo, useState } from 'react';
import { FreedCashSummary } from '@/components/freed-cash/FreedCashSummary';
import { FreedCashSourceList } from '@/components/freed-cash/FreedCashSourceList';
import { VerificationQueue } from '@/components/freed-cash/VerificationQueue';
import { RenewalWatch } from '@/components/freed-cash/RenewalWatch';
import { SubscriptionGate } from '@/components/freed-cash/SubscriptionGate';
import { RedirectLedger } from '@/components/freed-cash/RedirectLedger';
import { SweepWaterfall } from '@/components/freed-cash/SweepWaterfall';
import { MonthlyFreedCashReview } from '@/components/freed-cash/MonthlyFreedCashReview';
import { FreedCashTimeline } from '@/components/freed-cash/FreedCashTimeline';
import { VendorHistory } from '@/components/freed-cash/VendorHistory';
import { KeepScoreBoard } from '@/components/freed-cash/KeepScoreBoard';
import { FreedCashImpactReport } from '@/components/freed-cash/FreedCashImpactReport';
import { SavingsTiming } from '@/components/freed-cash/SavingsTiming';
import { UtilitySavings } from '@/components/freed-cash/UtilitySavings';
import { LifetimeSavings } from '@/components/freed-cash/LifetimeSavings';
import { RedirectEffectiveness } from '@/components/freed-cash/RedirectEffectiveness';
import { ForwardLook } from '@/components/freed-cash/ForwardLook';
import { CohortReport } from '@/components/freed-cash/CohortReport';


import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { summarizeFreedCash, useFreedCashSources, useFreedCashRedirects, useGateRequests } from '@/hooks/use-freed-cash';
import { NetRecurringPanel } from '@/components/freed-cash/NetRecurringPanel';
import {
  filterGateRequests,
  filterRedirects,
  filterSources,
  type EntityScope,
} from '@/lib/freed-cash/netRecurring';

const SCOPES: { value: EntityScope; label: string }[] = [
  { value: 'all', label: 'Everything' },
  { value: 'personal', label: 'Personal' },
  { value: 'business', label: 'Business' },
];


const GROUPS = [
  {
    id: 'find',
    label: '1. Find & log',
    hint: 'Log what changed, decide on new subscriptions, and watch for renewals before they hit.',
    tabs: [
      { value: 'sources', label: 'Sources' },
      { value: 'gate', label: 'Subscription Gate' },
      { value: 'renewals', label: 'Renewals' },
      { value: 'vendors', label: 'Vendors' },
    ],
  },
  {
    id: 'confirm',
    label: '2. Confirm savings',
    hint: 'Prove each saving on a statement, then see how it builds month by month.',
    tabs: [
      { value: 'verify', label: 'Verify' },
      { value: 'timing', label: 'Timing' },
      { value: 'utilities', label: 'Utility savings' },
      { value: 'keep', label: 'Keep Score' },
    ],
  },
  {
    id: 'redirect',
    label: '3. Put it to work',
    hint: 'Give every freed dollar a job, move it, and check the money actually landed.',
    tabs: [
      { value: 'redirects', label: 'Redirects' },
      { value: 'conversion', label: 'Conversion' },
      { value: 'sweep', label: 'Sweep' },
      { value: 'review', label: 'Monthly review' },
    ],
  },

  {
    id: 'results',
    label: '4. Results',
    hint: 'The long view: what is coming, what could slip away, and the full printable report.',
    tabs: [
      { value: 'forward', label: 'Forward look' },
      { value: 'cohorts', label: 'Cohorts' },
      { value: 'lifetime', label: 'Lifetime' },
      { value: 'history', label: 'History' },
      { value: 'report', label: 'Report' },
    ],
  },

] as const;

export default function FreedCash() {
  const [groupId, setGroupId] = useState<string>('find');
  const [tab, setTab] = useState<string>('sources');
  const [scope, setScope] = useState<EntityScope>('all');
  const group = GROUPS.find((g) => g.id === groupId) ?? GROUPS[0];

  const { data: sources, isLoading } = useFreedCashSources();
  const { data: redirects } = useFreedCashRedirects();
  const { data: gateRequests } = useGateRequests();


  useEffect(() => {
    document.title = 'Freed Cash Engine | PrismMoney';
  }, []);

  const rawSources = sources ?? [];
  const rawRedirects = redirects ?? [];
  const rawGates = gateRequests ?? [];

  // Personal and business money are kept strictly apart: business savings must
  // never count toward household cash, and vice versa.
  const all = useMemo(() => filterSources(rawSources, scope), [rawSources, scope]);
  const scopedRedirects = useMemo(
    () => filterRedirects(rawRedirects, rawSources, scope),
    [rawRedirects, rawSources, scope],
  );
  const scopedGates = useMemo(() => filterGateRequests(rawGates, scope), [rawGates, scope]);

  // Historical (already-cancelled) items only count toward lifetime savings.
  const list = useMemo(() => all.filter((s) => s.status !== 'historical'), [all]);
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
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Showing:</span>
            {SCOPES.map((s) => (
              <Button
                key={s.value}
                variant={s.value === scope ? 'default' : 'outline'}
                size="sm"
                onClick={() => setScope(s.value)}
              >
                {s.label}
              </Button>
            ))}
          </div>

          <FreedCashSummary totals={totals} sources={list} redirects={scopedRedirects} />

          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {GROUPS.map((g) => (
                <Button
                  key={g.id}
                  variant={g.id === groupId ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setGroupId(g.id);
                    setTab(g.tabs[0].value);
                  }}
                >
                  {g.label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{group.hint}</p>
          </div>

          {groupId === 'results' && (
            <NetRecurringPanel
              sources={list}
              redirects={scopedRedirects}
              gateRequests={scopedGates}
              allSources={rawSources.filter((s) => s.status !== 'historical')}
              allRedirects={rawRedirects}
              allGateRequests={rawGates}
              scope={scope}
            />
          )}


          <Tabs value={tab} onValueChange={setTab} className="space-y-4">
            <TabsList className="flex w-full flex-wrap">
              {group.tabs.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>


            <TabsContent value="sources">
              <FreedCashSourceList sources={all} />
            </TabsContent>
            <TabsContent value="forward">
              <ForwardLook sources={list} redirects={scopedRedirects} />
            </TabsContent>
            <TabsContent value="cohorts">
              <CohortReport sources={list} />
            </TabsContent>

            <TabsContent value="lifetime">
              <LifetimeSavings sources={all} />
            </TabsContent>
            <TabsContent value="timing">
              <SavingsTiming sources={list} redirects={scopedRedirects} />
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
              <RedirectLedger sources={list} redirects={scopedRedirects} />
            </TabsContent>
            <TabsContent value="conversion">
              <RedirectEffectiveness sources={list} redirects={scopedRedirects} />
            </TabsContent>
            <TabsContent value="sweep">

              <SweepWaterfall sources={list} redirects={scopedRedirects} />
            </TabsContent>
            <TabsContent value="review">
              <MonthlyFreedCashReview sources={list} redirects={scopedRedirects} />
            </TabsContent>
            <TabsContent value="utilities">
              <UtilitySavings sources={list} redirects={scopedRedirects} />
            </TabsContent>
            <TabsContent value="keep">
              <KeepScoreBoard sources={list} />
            </TabsContent>
            <TabsContent value="history">
              <FreedCashTimeline sources={list} redirects={scopedRedirects} />
            </TabsContent>
            <TabsContent value="vendors">
              <VendorHistory sources={list} />
            </TabsContent>
            <TabsContent value="report">
              <FreedCashImpactReport sources={list} redirects={scopedRedirects} />
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
