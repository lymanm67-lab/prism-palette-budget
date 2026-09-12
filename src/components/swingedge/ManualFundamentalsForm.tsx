import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useFundamentalOverrides } from '@/hooks/use-swingedge-hybrid';

const STOCK_FIELDS: { key: string; label: string; hint: string }[] = [
  { key: 'revenueGrowthYoY', label: 'Revenue growth, year on year (%)', hint: 'From the latest report' },
  { key: 'revenueGrowthPriorYoY', label: 'Revenue growth, prior period (%)', hint: 'Lets the trend be judged' },
  { key: 'epsGrowthYoY', label: 'Earnings per share growth (%)', hint: 'Year on year' },
  { key: 'epsGrowthPriorYoY', label: 'Earnings growth, prior period (%)', hint: 'Optional' },
  { key: 'operatingMargin', label: 'Operating margin (%)', hint: '' },
  { key: 'netMargin', label: 'Net margin (%)', hint: '' },
  { key: 'returnOnEquity', label: 'Return on equity (%)', hint: '' },
  { key: 'operatingCashFlow', label: 'Operating cash flow', hint: 'In millions is fine, be consistent' },
  { key: 'freeCashFlow', label: 'Free cash flow', hint: '' },
  { key: 'freeCashFlowPrior', label: 'Free cash flow, prior period', hint: '' },
  { key: 'netIncome', label: 'Net income', hint: '' },
  { key: 'debtToEquity', label: 'Debt to equity', hint: 'As a ratio or percent, consistently' },
  { key: 'currentRatio', label: 'Current ratio', hint: '' },
  { key: 'interestCoverage', label: 'Interest cover (times)', hint: '' },
  { key: 'peRatio', label: 'Price to earnings', hint: '' },
  { key: 'forwardPe', label: 'Forward price to earnings', hint: '' },
  { key: 'priceToSales', label: 'Price to sales', hint: '' },
  { key: 'priceToBook', label: 'Price to book', hint: '' },
  { key: 'evToEbitda', label: 'Enterprise value to EBITDA', hint: '' },
  { key: 'sectorPe', label: 'Typical sector price to earnings', hint: 'For a fair comparison' },
];

const ETF_FIELDS: { key: string; label: string; hint: string }[] = [
  { key: 'avgDollarVolume', label: 'Average daily traded value ($)', hint: '' },
  { key: 'spreadPct', label: 'Typical buy/sell gap (% of price)', hint: '' },
  { key: 'netAssets', label: 'Fund size ($)', hint: '' },
  { key: 'expenseRatio', label: 'Annual cost (%)', hint: '' },
  { key: 'holdingsCount', label: 'Number of holdings', hint: '' },
  { key: 'topTenWeightPct', label: 'Weight of the ten largest holdings (%)', hint: '' },
  { key: 'annualVolatilityPct', label: 'Yearly price swing (%)', hint: '' },
  { key: 'trackingErrorPct', label: 'Tracking difference (%)', hint: '' },
  { key: 'fundAgeYears', label: 'Years since launch', hint: '' },
];

export default function ManualFundamentalsForm({
  symbol,
  assetType,
  sector,
}: {
  symbol: string;
  assetType: 'STOCK' | 'ETF';
  sector?: string | null;
}) {
  const { row, save, remove, isSaving } = useFundamentalOverrides(symbol);
  const fields = assetType === 'ETF' ? ETF_FIELDS : STOCK_FIELDS;
  const [values, setValues] = useState<Record<string, string>>({});
  const [asOf, setAsOf] = useState('');
  const [sectorInput, setSectorInput] = useState(sector ?? '');

  useEffect(() => {
    const stored = (assetType === 'ETF' ? row?.etf_metrics : row?.metrics) as Record<string, number> | undefined;
    setValues(
      Object.fromEntries(Object.entries(stored ?? {}).map(([k, v]) => [k, v === null ? '' : String(v)])),
    );
    setAsOf((row?.as_of as string | null) ?? '');
    setSectorInput((row?.sector as string | null) ?? sector ?? '');
  }, [row, assetType, sector]);

  const submit = async () => {
    const parsed: Record<string, number | null> = {};
    for (const [k, v] of Object.entries(values)) {
      if (v.trim() === '') continue;
      const n = Number(v);
      if (!Number.isFinite(n)) {
        toast.error(`${k} needs to be a number.`);
        return;
      }
      parsed[k] = n;
    }
    if (!Object.keys(parsed).length) {
      toast.error('Enter at least one figure.');
      return;
    }
    await save({
      assetType,
      sector: sectorInput || null,
      metrics: assetType === 'ETF' ? {} : parsed,
      etfMetrics: assetType === 'ETF' ? parsed : null,
      asOf: asOf || null,
    });
    toast.success('Your figures were saved and the score was recalculated.');
  };

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Enter the figures yourself</CardTitle>
        <p className="text-xs text-muted-foreground">
          Your data plan does not supply company or fund figures, and nothing is ever invented to fill the gap. Type in
          what you read from the report and the score will say the values came from you. Leave anything blank and it is
          simply left out rather than counted as zero.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="manual-as-of" className="text-xs">
              Reporting date
            </Label>
            <Input id="manual-as-of" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
          </div>
          {assetType === 'STOCK' && (
            <div className="space-y-1">
              <Label htmlFor="manual-sector" className="text-xs">
                Sector or industry
              </Label>
              <Input
                id="manual-sector"
                placeholder="Technology, Banks, Utilities…"
                value={sectorInput}
                onChange={(e) => setSectorInput(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label htmlFor={`manual-${f.key}`} className="text-xs">
                {f.label}
              </Label>
              <Input
                id={`manual-${f.key}`}
                inputMode="decimal"
                value={values[f.key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              />
              {f.hint && <p className="text-[11px] text-muted-foreground">{f.hint}</p>}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={submit} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save my figures'}
          </Button>
          {row && (
            <Button
              variant="outline"
              onClick={async () => {
                await remove();
                toast.success('Your figures were removed.');
              }}
            >
              Remove my figures
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
