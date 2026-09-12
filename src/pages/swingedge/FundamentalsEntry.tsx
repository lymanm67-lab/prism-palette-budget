import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Loader2, Save, Search, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import SwingEdgeHeader from '@/components/swingedge/SwingEdgeHeader';
import HowToUse from '@/components/swingedge/HowToUse';
import NextStepsCard from '@/components/swingedge/NextStepsCard';
import { useTradingSettings, useTradingTitle } from '@/hooks/use-swingedge';
import {
  useFundamentalOverrideList,
  useFundamentalOverrides,
  useHybridAnalysis,
} from '@/hooks/use-swingedge-hybrid';

type FieldKind = 'number' | 'percent' | 'money' | 'boolean' | 'text';

interface FieldDef {
  key: string;
  label: string;
  help: string;
  kind: FieldKind;
}

interface GroupDef {
  title: string;
  description: string;
  fields: FieldDef[];
}

/** Fund figures. Liquidity, trading cost and volatility live at the top because
 * those three are the ones the data plan most often leaves blank. */
const ETF_GROUPS: GroupDef[] = [
  {
    title: 'Liquidity, trading cost and volatility',
    description: 'The three figures that decide whether a fund is tradable at all.',
    fields: [
      { key: 'avgDollarVolume', label: 'Average daily traded value', help: 'Dollars traded on a typical day.', kind: 'money' },
      { key: 'spreadPct', label: 'Typical bid/ask spread', help: 'Gap between buy and sell price, as a percent of price.', kind: 'percent' },
      { key: 'annualVolatilityPct', label: 'Annual volatility', help: 'How much the price swings over a year, in percent.', kind: 'percent' },
    ],
  },
  {
    title: 'Fund size and cost',
    description: 'Size and running cost figures from the fund page or fact sheet.',
    fields: [
      { key: 'netAssets', label: 'Fund size (net assets)', help: 'Total money in the fund, in dollars.', kind: 'money' },
      { key: 'expenseRatio', label: 'Running cost', help: 'Yearly fee as a percent, e.g. 0.09.', kind: 'percent' },
      { key: 'fundAgeYears', label: 'Fund age', help: 'Years since the fund launched.', kind: 'number' },
      { key: 'trackingErrorPct', label: 'Tracking difference', help: 'How far the fund drifts from its index, in percent.', kind: 'percent' },
      { key: 'benchmark', label: 'Index it follows', help: 'Name of the index, e.g. S&P 500.', kind: 'text' },
    ],
  },
  {
    title: 'Spread of holdings',
    description: 'How concentrated the fund is.',
    fields: [
      { key: 'holdingsCount', label: 'Number of holdings', help: 'How many positions the fund holds.', kind: 'number' },
      { key: 'topTenWeightPct', label: 'Top ten weight', help: 'Percent of the fund held in its ten biggest positions.', kind: 'percent' },
      { key: 'largestSectorWeightPct', label: 'Largest sector weight', help: 'Percent in the single biggest sector.', kind: 'percent' },
    ],
  },
  {
    title: 'Structure',
    description: 'Anything here changes how the fund is scored for risk.',
    fields: [
      { key: 'leveraged', label: 'Leveraged fund', help: 'Uses borrowing to multiply daily moves.', kind: 'boolean' },
      { key: 'inverse', label: 'Inverse fund', help: 'Designed to move opposite its index.', kind: 'boolean' },
      { key: 'singleStock', label: 'Single-stock fund', help: 'Tracks one company only.', kind: 'boolean' },
      { key: 'leverageFactor', label: 'Leverage factor', help: 'Multiplier, e.g. 2 or 3. Leave blank for plain funds.', kind: 'number' },
    ],
  },
];

const STOCK_GROUPS: GroupDef[] = [
  {
    title: 'Growth',
    description: 'Year-over-year changes, in percent.',
    fields: [
      { key: 'revenueGrowthYoY', label: 'Revenue growth (year)', help: 'Percent change in sales vs a year ago.', kind: 'percent' },
      { key: 'revenueGrowthPriorYoY', label: 'Revenue growth (prior year)', help: 'The same figure one year earlier.', kind: 'percent' },
      { key: 'revenueGrowthQoQ', label: 'Revenue growth (quarter)', help: 'Percent change vs the previous quarter.', kind: 'percent' },
      { key: 'epsGrowthYoY', label: 'Earnings per share growth', help: 'Percent change in earnings per share.', kind: 'percent' },
      { key: 'epsGrowthPriorYoY', label: 'Earnings growth (prior year)', help: 'The same figure one year earlier.', kind: 'percent' },
      { key: 'netIncomeGrowthYoY', label: 'Net income growth', help: 'Percent change in profit.', kind: 'percent' },
      { key: 'oneOffEarningsEvent', label: 'One-off item in earnings', help: 'Tick when a sale or charge distorted the last result.', kind: 'boolean' },
    ],
  },
  {
    title: 'Profitability',
    description: 'Margins and returns, in percent.',
    fields: [
      { key: 'grossMargin', label: 'Gross margin', help: 'Profit after direct costs, as a percent of sales.', kind: 'percent' },
      { key: 'operatingMargin', label: 'Operating margin', help: 'Profit from operations, as a percent of sales.', kind: 'percent' },
      { key: 'operatingMarginPrior', label: 'Operating margin (prior year)', help: 'The same figure a year earlier.', kind: 'percent' },
      { key: 'netMargin', label: 'Net margin', help: 'Final profit as a percent of sales.', kind: 'percent' },
      { key: 'returnOnEquity', label: 'Return on equity', help: 'Profit against shareholder money, in percent.', kind: 'percent' },
      { key: 'returnOnAssets', label: 'Return on assets', help: 'Profit against everything owned, in percent.', kind: 'percent' },
      { key: 'returnOnInvestedCapital', label: 'Return on invested capital', help: 'Profit against all capital used, in percent.', kind: 'percent' },
    ],
  },
  {
    title: 'Cash flow',
    description: 'Dollar amounts straight from the cash flow statement.',
    fields: [
      { key: 'operatingCashFlow', label: 'Operating cash flow', help: 'Cash generated by the business.', kind: 'money' },
      { key: 'freeCashFlow', label: 'Free cash flow', help: 'Cash left after spending on the business.', kind: 'money' },
      { key: 'freeCashFlowPrior', label: 'Free cash flow (prior year)', help: 'The same figure a year earlier.', kind: 'money' },
      { key: 'netIncome', label: 'Net income', help: 'Reported profit.', kind: 'money' },
    ],
  },
  {
    title: 'Balance sheet',
    description: 'Debt and cushion figures.',
    fields: [
      { key: 'debtToEquity', label: 'Debt to equity', help: 'Debt divided by shareholder money, e.g. 0.8.', kind: 'number' },
      { key: 'debtToEquityPrior', label: 'Debt to equity (prior year)', help: 'The same figure a year earlier.', kind: 'number' },
      { key: 'currentRatio', label: 'Current ratio', help: 'Short-term assets divided by short-term bills.', kind: 'number' },
      { key: 'cashAndEquivalents', label: 'Cash on hand', help: 'Cash and near-cash, in dollars.', kind: 'money' },
      { key: 'totalDebt', label: 'Total debt', help: 'All borrowings, in dollars.', kind: 'money' },
      { key: 'interestCoverage', label: 'Interest coverage', help: 'How many times profit covers interest.', kind: 'number' },
    ],
  },
  {
    title: 'Valuation',
    description: 'Price comparisons. Sector figures are optional.',
    fields: [
      { key: 'peRatio', label: 'Price to earnings', help: 'Share price divided by earnings per share.', kind: 'number' },
      { key: 'forwardPe', label: 'Forward price to earnings', help: 'The same using expected earnings.', kind: 'number' },
      { key: 'pegRatio', label: 'PEG ratio', help: 'Price to earnings divided by growth.', kind: 'number' },
      { key: 'priceToSales', label: 'Price to sales', help: 'Company value divided by sales.', kind: 'number' },
      { key: 'priceToBook', label: 'Price to book', help: 'Company value divided by book value.', kind: 'number' },
      { key: 'evToEbitda', label: 'Value to operating profit', help: 'Enterprise value divided by EBITDA.', kind: 'number' },
      { key: 'freeCashFlowYield', label: 'Free cash flow yield', help: 'Free cash flow as a percent of value.', kind: 'percent' },
      { key: 'sectorPe', label: 'Sector price to earnings', help: 'Typical figure for the sector.', kind: 'number' },
      { key: 'sectorPriceToSales', label: 'Sector price to sales', help: 'Typical figure for the sector.', kind: 'number' },
      { key: 'sectorEvToEbitda', label: 'Sector value to operating profit', help: 'Typical figure for the sector.', kind: 'number' },
      { key: 'ownFiveYearPe', label: 'Own five-year average price to earnings', help: 'This company’s own long-run average.', kind: 'number' },
    ],
  },
];

const money = (v: unknown) => {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const providerLabel = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  if (typeof v === 'number') return money(v);
  return String(v);
};

export default function FundamentalsEntry() {
  useTradingTitle('Company & Fund Figures');
  const { settings } = useTradingSettings();
  const [params, setParams] = useSearchParams();

  const [symbolInput, setSymbolInput] = useState(params.get('symbol')?.toUpperCase() ?? '');
  const [symbol, setSymbol] = useState(params.get('symbol')?.toUpperCase() ?? '');
  const [assetType, setAssetType] = useState<'STOCK' | 'ETF'>('STOCK');

  const analysis = useHybridAnalysis(symbol || null, assetType);
  const override = useFundamentalOverrides(symbol || null);
  const list = useFundamentalOverrideList();

  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [asOf, setAsOf] = useState('');
  const [note, setNote] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [sector, setSector] = useState('');
  const [industry, setIndustry] = useState('');

  const bundle = analysis.data?.bundle ?? null;
  const detectedType = analysis.data?.assetType ?? null;

  // Known fund/ETF directory wins over the provider, which often mislabels funds
  // as companies when the data plan is rate limited.
  const directory = useQuery({
    queryKey: ['se-market-symbol-type', symbol],
    enabled: !!symbol,
    queryFn: async () => {
      const { data } = await supabase
        .from('se_market_symbols')
        .select('asset_type')
        .eq('symbol', symbol)
        .maybeSingle();
      const raw = (data?.asset_type ?? '').toString().toUpperCase();
      return raw === 'ETF' ? 'ETF' : raw === 'STOCK' ? 'STOCK' : null;
    },
  });

  const directoryType = directory.data ?? null;

  // Follow the directory first, then the provider.
  useEffect(() => {
    const next = directoryType ?? detectedType;
    if (next && next !== assetType) setAssetType(next);
  }, [directoryType, detectedType, assetType]);

  // Load whatever is already saved for this symbol.
  useEffect(() => {
    const row = override.row;
    if (!symbol) return;
    const merged: Record<string, string | boolean> = {};
    const metrics = (row?.metrics ?? {}) as Record<string, unknown>;
    const etf = (row?.etf_metrics ?? {}) as Record<string, unknown>;
    for (const [k, v] of Object.entries({ ...metrics, ...etf })) {
      if (v === null || v === undefined) continue;
      merged[k] = typeof v === 'boolean' ? v : String(v);
    }
    setValues(merged);
    setAsOf((row?.as_of as string | null) ?? '');
    setNote((row?.note as string | null) ?? '');
    setCompanyName((row?.company_name as string | null) ?? '');
    setSector((row?.sector as string | null) ?? '');
    setIndustry((row?.industry as string | null) ?? '');
    if (row?.asset_type)
      setAssetType(String(row.asset_type).toUpperCase() === 'ETF' ? 'ETF' : 'STOCK');
  }, [override.row, symbol]);

  const groups = assetType === 'ETF' ? ETF_GROUPS : STOCK_GROUPS;

  const providerValues = useMemo(() => {
    const base: Record<string, unknown> = { ...(bundle?.metrics ?? {}) };
    if (bundle?.etf) Object.assign(base, bundle.etf);
    // The analyzer measures fund liquidity, spread and volatility from price
    // history when the data plan omits them, so those count as "app has it".
    if (analysis.data?.etfInputs) Object.assign(base, analysis.data.etfInputs);
    return base;
  }, [bundle, analysis.data?.etfInputs]);

  const blanks = useMemo(
    () =>
      groups
        .flatMap((g) => g.fields)
        .filter((f) => providerValues[f.key] === null || providerValues[f.key] === undefined)
        .filter((f) => values[f.key] === undefined || values[f.key] === ''),
    [groups, providerValues, values],
  );

  const load = () => {
    const next = symbolInput.trim().toUpperCase();
    if (!next) return;
    setSymbol(next);
    setParams({ symbol: next }, { replace: true });
  };

  const handleSave = async () => {
    if (!symbol) return;
    const metrics: Record<string, number | boolean | string | null> = {};
    const etfMetrics: Record<string, number | boolean | string | null> = {};
    for (const group of groups) {
      for (const field of group.fields) {
        const raw = values[field.key];
        const target = assetType === 'ETF' ? etfMetrics : metrics;
        if (field.kind === 'boolean') {
          if (raw === true) target[field.key] = true;
          continue;
        }
        if (raw === undefined || raw === '' || raw === null) continue;
        if (field.kind === 'text') {
          target[field.key] = String(raw);
          continue;
        }
        const num = Number(raw);
        if (!Number.isFinite(num)) continue;
        target[field.key] = num;
      }
    }
    try {
      await override.save({
        assetType,
        companyName: companyName.trim() || null,
        sector: sector.trim() || null,
        industry: industry.trim() || null,
        metrics,
        etfMetrics: assetType === 'ETF' ? etfMetrics : null,
        asOf: asOf || null,
        periodsAvailable: 1,
        note: note.trim() || null,
      });
      await analysis.refetch();
      toast.success(`Saved your figures for ${symbol}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save those figures');
    }
  };

  const handleClear = async () => {
    if (!symbol) return;
    try {
      await override.remove();
      setValues({});
      setAsOf('');
      setNote('');
      toast.success(`Removed your saved figures for ${symbol}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove those figures');
    }
  };

  const coverage =
    assetType === 'ETF' ? analysis.data?.etf?.coverage ?? null : analysis.data?.fundamental?.coverage ?? null;
  const coveragePct = typeof coverage === 'number' ? Math.round(coverage * 100) : null;

  return (
    <div className="space-y-6">
      <SwingEdgeHeader
        title="Company & Fund Figures"
        subtitle="Type in the figures your data plan does not supply, so the scanner and analyzer stop showing blanks."
        mode={settings.data_mode}
        fetchedAt={analysis.data?.lastCompletedCandleAt ?? null}
      />

      <HowToUse
        id="how-to-fundamentals-entry"
        steps={[
          'Type a symbol and press Load. The app shows which figures it already has and which are blank.',
          'Fill in only the blank ones, using the fund fact sheet or the company results page.',
          'Add the date those figures were published so the app knows how fresh they are.',
          'Press Save. The analyzer and scanner pick the figures up straight away and label them as entered by you.',
        ]}
        tips={[
          'Percent fields take plain numbers: type 0.09 for a 0.09% running cost, 18.4 for an 18.4% margin.',
          'Never guess. A blank figure is left out of the score; a wrong one quietly changes the answer.',
          'If your figure disagrees with the provider by more than 10%, the app keeps the provider value and flags the disagreement.',
        ]}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pick a symbol</CardTitle>
          <CardDescription>Enter figures one symbol at a time.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="fund-symbol">Symbol</Label>
              <Input
                id="fund-symbol"
                value={symbolInput}
                onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && load()}
                placeholder="XLK"
                className="w-32 font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={assetType} onValueChange={(v) => setAssetType(v as 'STOCK' | 'ETF')}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STOCK">Company</SelectItem>
                  <SelectItem value="ETF">Fund / ETF</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={load} disabled={!symbolInput.trim()}>
              <Search className="mr-2 h-4 w-4" />
              Load
            </Button>
          </div>

          {symbol ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline" className="font-mono">
                {symbol}
              </Badge>
              {analysis.isLoading ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Checking what the app already has…
                </span>
              ) : (
                <>
                  {coveragePct !== null ? (
                    <span className="text-muted-foreground">
                      Figures the app has: <span className="font-medium text-foreground">{coveragePct}%</span>
                    </span>
                  ) : null}
                  {analysis.data?.confidence ? (
                    <span className="text-muted-foreground">
                      Data confidence: <span className="font-medium text-foreground">{analysis.data.confidence}</span>
                    </span>
                  ) : null}
                  <span className="text-muted-foreground">
                    Still blank: <span className="font-medium text-foreground">{blanks.length}</span>
                  </span>
                </>
              )}
            </div>
          ) : null}

          {symbol && blanks.length ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>These are the blanks worth filling first</AlertTitle>
              <AlertDescription className="text-sm">
                {blanks.slice(0, 8).map((f) => f.label).join(', ')}
                {blanks.length > 8 ? ` and ${blanks.length - 8} more` : ''}.
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      {symbol ? (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">About this symbol</CardTitle>
              <CardDescription>Optional, but it helps the app compare like with like.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="fund-name">Name</Label>
                <Input id="fund-name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder={bundle?.profile?.name ?? 'Technology Select Sector SPDR'} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="fund-sector">Sector</Label>
                <Input id="fund-sector" value={sector} onChange={(e) => setSector(e.target.value)} placeholder={bundle?.profile?.sector ?? 'Technology'} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="fund-industry">Industry</Label>
                <Input id="fund-industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder={bundle?.profile?.industry ?? 'Software'} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="fund-asof">Figures published on</Label>
                <Input id="fund-asof" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {groups.map((group) => (
            <Card key={group.title}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{group.title}</CardTitle>
                <CardDescription>{group.description}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.fields.map((field) => {
                  const provided = providerLabel(providerValues[field.key]);
                  if (field.kind === 'boolean') {
                    return (
                      <div key={field.key} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <Label htmlFor={`f-${field.key}`} className="text-sm">
                            {field.label}
                          </Label>
                          <p className="text-xs text-muted-foreground">{field.help}</p>
                        </div>
                        <Switch
                          id={`f-${field.key}`}
                          checked={values[field.key] === true}
                          onCheckedChange={(checked) => setValues((v) => ({ ...v, [field.key]: checked }))}
                        />
                      </div>
                    );
                  }
                  return (
                    <div key={field.key} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`f-${field.key}`} className="text-sm">
                          {field.label}
                        </Label>
                        {provided ? (
                          <Badge variant="outline" className="border-prism-lime/50 text-[10px] text-prism-lime">
                            app has {provided}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-prism-amber/50 text-[10px] text-prism-amber">
                            blank
                          </Badge>
                        )}
                      </div>
                      <Input
                        id={`f-${field.key}`}
                        inputMode={field.kind === 'text' ? 'text' : 'decimal'}
                        value={typeof values[field.key] === 'string' ? (values[field.key] as string) : ''}
                        onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                        placeholder={provided ?? '—'}
                      />
                      <p className="text-xs text-muted-foreground">{field.help}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Where these came from</CardTitle>
              <CardDescription>A short note so you can check the source later.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Taken from the fund fact sheet dated 30 June 2026."
                rows={3}
              />
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleSave} disabled={override.isSaving}>
                  {override.isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save figures for {symbol}
                </Button>
                {override.row ? (
                  <Button variant="outline" onClick={handleClear} disabled={override.isRemoving}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove my figures
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Saved figures are labelled as entered by you wherever they appear, and never presented as official
                provider data.
              </p>
            </CardContent>
          </Card>
        </>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Symbols you have filled in</CardTitle>
          <CardDescription>Click one to edit its figures.</CardDescription>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !list.data?.length ? (
            <p className="text-sm text-muted-foreground">Nothing saved yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {list.data.map((row) => {
                const count =
                  Object.keys((row.metrics ?? {}) as Record<string, unknown>).length +
                  Object.keys((row.etf_metrics ?? {}) as Record<string, unknown>).length;
                return (
                  <Button
                    key={row.symbol}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSymbolInput(row.symbol);
                      setSymbol(row.symbol);
                      setParams({ symbol: row.symbol }, { replace: true });
                    }}
                  >
                    <span className="font-mono">{row.symbol}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{count} figures</span>
                  </Button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <NextStepsCard
        summary={
          symbol
            ? `You have filled in figures for ${symbol}. Check the score changed, then carry on with the routine.`
            : 'Load a symbol, fill the blanks, then carry on with the routine.'
        }
        steps={[
          {
            label: 'Re-run the reading so the new figures count',
            to: symbol ? `/swingedge/analyzer?symbol=${symbol}` : '/swingedge/analyzer',
            cta: 'Open Analyzer',
          },
          { label: 'Re-scan your list with the fuller data', to: '/swingedge/scanner', cta: 'Open Scanner' },
          { label: 'Plan the trade if the reading now qualifies', to: '/swingedge/planner', cta: 'Open Trade Planner' },
        ]}
      />
    </div>
  );
}
