import { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BufferPanel from '@/components/budget/BufferPanel';
import BusinessLedgerPanel from '@/components/budget/BusinessLedgerPanel';
import MoneyRedirectsPanel from '@/components/budget/MoneyRedirectsPanel';
import ZeroBasedForecastPanel from '@/components/budget/ZeroBasedForecastPanel';
import PrintInfographicButton from '@/components/reports/PrintInfographicButton';
import { useBufferMonths, useBufferOneTime, useBufferSettings, useMoneyRedirects } from '@/hooks/use-zero-based';
import { useHouseholdDebts } from '@/hooks/use-household-debts';
import { rollBuffer } from '@/lib/budgeting/bufferLedger';
import { buildRedirectFlows, redirectTotals } from '@/lib/budgeting/redirects';
import { bufferInfographic, redirectsInfographic } from '@/lib/reports/zeroBasedInfographics';

const currentMonth = () => new Date().toISOString().slice(0, 7);

export default function ZeroBasedPlan() {
  const months = useBufferMonths();
  const oneTimes = useBufferOneTime();
  const { settings } = useBufferSettings();
  const redirects = useMoneyRedirects();
  const { data: debts } = useHouseholdDebts();

  const rolled = useMemo(
    () =>
      rollBuffer(
        (months.rows || []).map((m) => ({
          month: m.month,
          startingBalance: Number(m.starting_balance || 0),
          additions: Number(m.additions || 0),
          withdrawals: Number(m.withdrawals || 0),
          oneTimes: (oneTimes.rows || []).map((o) => ({
            id: o.id,
            label: o.label,
            amount: Number(o.amount || 0),
            dueDate: o.due_date,
          })),
        })),
        settings,
      ),
    [months.rows, oneTimes.rows, settings],
  );

  const vacationBalance = useMemo(
    () =>
      (debts || [])
        .filter((d: any) => /vacation/i.test(d.name || ''))
        .reduce((s: number, d: any) => s + Number(d.balance || 0), 0),
    [debts],
  );

  const flows = useMemo(
    () => buildRedirectFlows((redirects.rows || []) as any, { currentMonth: currentMonth(), vacationBalance }),
    [redirects.rows, vacationBalance],
  );

  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Zero-Based Plan</h1>
        <p className="text-muted-foreground">
          Buffer thresholds, the business ledger, freed-cash redirects and the long-range forecast.
        </p>
      </header>

      <Tabs defaultValue="buffer">
        <TabsList className="flex-wrap">
          <TabsTrigger value="buffer">Buffer</TabsTrigger>
          <TabsTrigger value="business">Business Ledger</TabsTrigger>
          <TabsTrigger value="redirects">Money Redirects</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
        </TabsList>

        <TabsContent value="buffer" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <PrintInfographicButton
              buildSpec={() => (rolled.length ? bufferInfographic(rolled) : null)}
              label="Buffer infographic"
              filename="prism-buffer"
            />
          </div>
          <BufferPanel />
        </TabsContent>

        <TabsContent value="business" className="mt-6">
          <BusinessLedgerPanel />
        </TabsContent>

        <TabsContent value="redirects" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <PrintInfographicButton
              buildSpec={() => (flows.length ? redirectsInfographic(flows, redirectTotals(flows)) : null)}
              label="Redirects infographic"
              filename="prism-money-redirects"
            />
          </div>
          <MoneyRedirectsPanel />
        </TabsContent>

        <TabsContent value="forecast" className="mt-6">
          <ZeroBasedForecastPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
