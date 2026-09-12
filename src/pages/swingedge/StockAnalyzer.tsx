import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Save, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import CandlePatternCard from '@/components/swingedge/CandlePatternCard';
import CollapsibleSection from '@/components/swingedge/CollapsibleSection';
import HowToUse from '@/components/swingedge/HowToUse';
import HybridSignalCard from '@/components/swingedge/HybridSignalCard';
import ManualFundamentalsForm from '@/components/swingedge/ManualFundamentalsForm';
import QualityScoreCard from '@/components/swingedge/QualityScoreCard';
import { RiskQualityCard, TechnicalCard } from '@/components/swingedge/TechnicalRiskCards';
import { useTradingSettings, useTradingTitle } from '@/hooks/use-swingedge';
import { useHybridAnalysis, useHybridSignalHistory } from '@/hooks/use-swingedge-hybrid';

const money = (n: number | null) =>
  n === null ? '—' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function StockAnalyzer() {
  useTradingTitle('Stock Analyzer');
  const [params, setParams] = useSearchParams();
  const initial = (params.get('symbol') ?? '').toUpperCase();
  const [input, setInput] = useState(initial);
  const [symbol, setSymbol] = useState(initial || null);

  const { analysis, isLoading, isFetching, save, isSaving, refreshFigures, isRefreshingFigures } =
    useHybridAnalysis(symbol);
  const { data: history } = useHybridSignalHistory(symbol ?? undefined);
  const { settings } = useTradingSettings();

  const run = () => {
    const next = input.trim().toUpperCase();
    if (!next) return;
    setSymbol(next);
    setParams({ symbol: next });
  };

  const levels = analysis?.technical.levels ?? null;
  const coveragePct = analysis
    ? Math.round(((analysis.assetType === 'ETF' ? analysis.etf?.coverage : analysis.fundamental?.coverage) ?? 0) * 100)
    : null;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Stock Analyzer</h1>
        <p className="text-sm text-muted-foreground">
          One name, read properly: what the business or fund is like, what the chart is doing, and whether the risk side
          holds up. The three come together into one signal.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          placeholder="Symbol, for example QQQ"
          className="w-48"
          aria-label="Symbol"
        />
        <Button onClick={run} disabled={!input.trim()}>
          <Search className="mr-2 h-4 w-4" /> Analyze
        </Button>
        {analysis && (
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await save();
                toast.success('Signal saved to your history.');
              } catch {
                toast.error('The signal could not be saved just now.');
              }
            }}
            disabled={isSaving}
          >
            <Save className="mr-2 h-4 w-4" /> Save this reading
          </Button>
        )}
        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <HowToUse
        title="How to use the Stock Analyzer"
        steps={[
          'Type a symbol and read the combined signal first, then the three cards behind it.',
          'GO means every layer clears your minimums. WAIT means nothing is wrong yet. REVIEW needs a judgement call from you. STOP means a rule is broken.',
          'Open a candlestick pattern to read where it formed, whether volume agreed, and why it might not matter.',
          'Check the data confidence line. A score built on half the figures is not the same as a complete one.',
          'If figures are missing, type them in yourself lower down the page — they will be labelled as yours.',
          'When you are happy, send the idea to the Trade Planner and set your own entry, stop and target there.',
        ]}
        tips={[
          'Confirmed readings only use completed candles. Anything marked DEVELOPING can still change by the close.',
          'A weak set of figures with a strong chart is a REVIEW, not a green light.',
        ]}
      />

      {!symbol && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Enter a symbol above to see the combined signal.
          </CardContent>
        </Card>
      )}

      {symbol && isLoading && (
        <Card>
          <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Reading {symbol}…
          </CardContent>
        </Card>
      )}

      {analysis && (
        <div className="space-y-6">
          {analysis.notice && (
            <p className="rounded-md border border-prism-amber/40 bg-prism-amber/10 p-3 text-xs text-prism-amber">
              {analysis.notice}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="secondary">{analysis.symbol}</Badge>
            <Badge variant="outline">{analysis.assetType === 'ETF' ? 'Fund' : 'Company'}</Badge>
            <Badge variant="outline">Price {money(analysis.technical.price)}</Badge>
            <Badge variant="outline">Data source: {analysis.source}</Badge>
            <Badge variant="outline">
              Compared with {analysis.sectorSymbol} and {analysis.marketTrendSymbol}
            </Badge>
          </div>

          <HybridSignalCard
            result={analysis.hybrid}
            qualityLabel={analysis.assetType === 'ETF' ? 'Fund quality' : 'Company quality'}
            qualityScore={analysis.qualityScore}
            technicalScore={analysis.technical.score}
            riskScore={analysis.risk.score}
            coveragePct={coveragePct}
            validUntil={analysis.validUntil}
            dataSources={analysis.dataSources}
          />

          <div className="grid gap-4 lg:grid-cols-3">
            <QualityScoreCard assetType={analysis.assetType} fundamental={analysis.fundamental} etf={analysis.etf} />
            <TechnicalCard score={analysis.technical} />
            <RiskQualityCard risk={analysis.risk} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <MarketRegimeCard regime={analysis.regime} />
            <RelativeStrengthCard rs={analysis.relativeStrength} />
            <TradabilityCard t={analysis.tradability} />
          </div>

          <CandlePatternCard analysis={analysis.candles} advanced={settings.advanced_mode} />


          {levels && (
            <Card className="border-border/60 bg-card/60 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Estimated levels — not a plan</CardTitle>
                <p className="text-xs text-muted-foreground">
                  These are scanner-grade estimates used to grade the risk side. Your real entry, stop, target and
                  position size are set in the Trade Planner.
                </p>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Estimated entry</div>
                  <div className="font-semibold tabular-nums">{money(levels.estimatedEntry)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Estimated stop</div>
                  <div className="font-semibold tabular-nums">{money(levels.estimatedStop)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Estimated target</div>
                  <div className="font-semibold tabular-nums">{money(levels.estimatedTarget)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Entry zone</div>
                  <div className="font-semibold tabular-nums">
                    {analysis.entryZone ? `${money(analysis.entryZone.low)} – ${money(analysis.entryZone.high)}` : '—'}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Company &amp; fund figures</CardTitle>
              <p className="text-xs text-muted-foreground">
                Figures come from your market data service and are saved so the same lookup is not paid for twice.
                Source: {analysis.bundle.sources.join(', ') || 'none yet'}
                {analysis.bundle.asOf ? ` · as of ${analysis.bundle.asOf}` : ''}.
                {analysis.bundle.unavailableReason ? ` ${analysis.bundle.unavailableReason}` : ''}
              </p>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isRefreshingFigures}
                onClick={() => refreshFigures('basic')}
              >
                Refresh figures
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isRefreshingFigures || analysis.assetType === 'ETF'}
                onClick={() => refreshFigures('full')}
              >
                Get full statements
              </Button>
              <span className="self-center text-xs text-muted-foreground">
                Full statements add debt, cash flow and multi-year trend, and use more of the daily allowance.
              </span>
            </CardContent>
          </Card>

          <CollapsibleSection
            id="analyzer-manual-figures"
            title="Missing figures — enter by hand if needed"
            defaultOpen={false}
          >
            <ManualFundamentalsForm
              symbol={analysis.symbol}
              assetType={analysis.assetType}
              sector={analysis.fundamental?.profile.label ?? null}
            />
          </CollapsibleSection>

          <CollapsibleSection id="analyzer-signal-history" title="Signal changes for this symbol" defaultOpen={false}>
            {history && history.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {history.map((h) => (
                  <li key={h.id} className="flex flex-wrap items-baseline gap-2 border-b border-border/50 pb-2">
                    <Badge variant="outline">{h.to_signal}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {h.from_signal ? `was ${h.from_signal}, ` : ''}
                      {new Date(h.created_at as string).toLocaleString()}
                    </span>
                    <span className="text-xs">{h.reason ?? ''}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No saved readings yet. Use "Save this reading" to start a history for this symbol.
              </p>
            )}
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
}
