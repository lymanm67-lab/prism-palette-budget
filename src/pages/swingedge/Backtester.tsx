import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, FlaskConical, Info, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { loadCandles, useTradingSettings, useTradingTitle } from '@/hooks/use-swingedge';
import {
  DEFAULT_BACKTEST, overfitWarning, runBacktest,
  type BacktestRun, type BacktestSettings, type BacktestStats,
} from '@/lib/swingedge/backtest';

const usd = (n: number | null) =>
  n == null ? '—' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const pct = (n: number | null) => (n == null ? '—' : `${Math.round(n * 100)}%`);
const num = (n: number | null, d = 2) => (n == null ? '—' : n.toFixed(d));

function StatGrid({ s }: { s: BacktestStats }) {
  const items: [string, string][] = [
    ['Largest drawdown', usd(-s.maxDrawdown)],
    ['Trades', String(s.trades)],
    ['Win rate', pct(s.winRate)],
    ['Average win', usd(s.avgWin)],
    ['Average loss', usd(s.avgLoss)],
    ['Average R', num(s.avgR)],
    ['Profit factor', num(s.profitFactor)],
    ['Net result', usd(s.netPl)],
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map(([k, v]) => (
        <div key={k} className="rounded-md border border-border/50 bg-muted/30 p-2">
          <div className="text-xs text-muted-foreground">{k}</div>
          <div className="text-base font-semibold">{v}</div>
        </div>
      ))}
    </div>
  );
}

function RunCard({ title, run }: { title: string; run: BacktestRun }) {
  const [open, setOpen] = useState<number | null>(null);
  const warn = overfitWarning(run);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <StatGrid s={run.stats} />
        <div className="text-sm text-muted-foreground">
          Earlier 70%: {run.inSample.trades} trades, avg R {num(run.inSample.avgR)} · Later 30%: {run.outSample.trades} trades, avg R {num(run.outSample.avgR)}
        </div>
        {warn && (
          <div className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" /> {warn}
          </div>
        )}
        {run.skipped.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Skipped by liquidity check: {run.skipped.length} setups (
            {run.skipped.filter((x) => x.reason === 'Thin trading').length} thin trading,{' '}
            {run.skipped.filter((x) => x.reason === 'Sellers in control').length} sellers in control)
          </div>
        )}
        <div className="max-h-80 overflow-auto rounded-md border border-border/50">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
              <tr><th className="p-2">Entry</th><th className="p-2">Exit</th><th className="p-2">Result</th><th className="p-2 text-right">P/L</th><th className="p-2 text-right">R</th></tr>
            </thead>
            <tbody>
              {run.trades.map((t, idx) => (
                <>
                  <tr key={idx} className="cursor-pointer border-t border-border/40 hover:bg-muted/40" onClick={() => setOpen(open === idx ? null : idx)}>
                    <td className="p-2">{t.entryDate.slice(0, 10)}</td>
                    <td className="p-2">{t.exitDate?.slice(0, 10) ?? 'still open'}</td>
                    <td className="p-2"><Badge variant="outline">{t.kind}</Badge></td>
                    <td className={`p-2 text-right ${(t.netPl ?? 0) > 0 ? 'text-prism-teal' : 'text-destructive'}`}>{usd(t.netPl)}</td>
                    <td className="p-2 text-right">{num(t.rMultiple)}</td>
                  </tr>
                  {open === idx && (
                    <tr key={`${idx}-d`} className="bg-muted/20">
                      <td colSpan={5} className="p-2 text-xs text-muted-foreground">
                        Filled {usd(t.entryPrice)} × {t.shares} shares · stop {t.stop.toFixed(2)} · target {t.target.toFixed(2)} · exit {t.exitPrice?.toFixed(2)}. {t.notes.join(' ')}
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {run.trades.length === 0 && (
                <tr><td colSpan={5} className="p-3 text-center text-muted-foreground">No setups met the rules in this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Backtester() {
  useTradingTitle('Historical Testing');
  const { settings } = useTradingSettings();
  const [symbol, setSymbol] = useState('SPY');
  const [bars, setBars] = useState('750');
  const [cfg, setCfg] = useState<BacktestSettings>(DEFAULT_BACKTEST);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ a: BacktestRun; b: BacktestRun; range: string; notice: string | null } | null>(null);

  const run = async () => {
    setLoading(true); setError(null);
    try {
      const res = await loadCandles(symbol.trim().toUpperCase(), '1day', settings.data_mode, Number(bars));
      if (res.candles.length < 120) {
        setError(`Only ${res.candles.length} daily candles available — at least 120 are needed for a meaningful test.`);
        setResult(null);
      } else {
        const c = res.candles;
        setResult({
          a: runBacktest(c, cfg, false),
          b: runBacktest(c, cfg, true),
          range: `${c[0].datetime.slice(0, 10)} → ${c[c.length - 1].datetime.slice(0, 10)} (${c.length} candles, ${res.source})`,
          notice: res.notice,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load price history.');
    } finally {
      setLoading(false);
    }
  };

  const merged = (() => {
    if (!result) return [];
    const map = new Map<string, { date: string; rules?: number; liquidity?: number }>();
    result.a.equity.forEach((p) => map.set(p.date, { ...(map.get(p.date) ?? { date: p.date }), rules: p.equity }));
    result.b.equity.forEach((p) => map.set(p.date, { ...(map.get(p.date) ?? { date: p.date }), liquidity: p.equity }));
    return [...map.values()].sort((x, y) => x.date.localeCompare(y.date));
  })();

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-6 w-6 text-prism-teal" />
        <h1 className="text-2xl font-bold">Historical Testing</h1>
        <Badge variant="outline">Phase 4</Badge>
      </div>

      <div className="flex gap-2 rounded-md border border-prism-amber/40 bg-prism-amber/10 p-3 text-sm">
        <Info className="h-4 w-4 shrink-0 text-prism-amber" />
        Past results do not predict future results. This is a study exercise, not a forecast or a signal.
      </div>

      <Card>
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-2 lg:grid-cols-6">
          <div><Label>Symbol</Label><Input value={symbol} onChange={(e) => setSymbol(e.target.value)} /></div>
          <div>
            <Label>History</Label>
            <Select value={bars} onValueChange={setBars}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="260">~1 year</SelectItem>
                <SelectItem value="500">~2 years</SelectItem>
                <SelectItem value="750">~3 years</SelectItem>
                <SelectItem value="1250">~5 years</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Stop (× ATR)</Label><Input type="number" step="0.25" value={cfg.atrStopMult} onChange={(e) => setCfg({ ...cfg, atrStopMult: Number(e.target.value) || 1.5 })} /></div>
          <div>
            <Label>Target</Label>
            <Select value={String(cfg.targetR)} onValueChange={(v) => setCfg({ ...cfg, targetR: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1.5">1.5R</SelectItem>
                <SelectItem value="2">2R (Beginner)</SelectItem>
                <SelectItem value="2.5">2.5R</SelectItem>
                <SelectItem value="3">3R</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Risk per trade ($)</Label><Input type="number" value={cfg.riskPerTrade} onChange={(e) => setCfg({ ...cfg, riskPerTrade: Number(e.target.value) || 250 })} /></div>
          <div className="flex items-end">
            <Button className="w-full" onClick={run} disabled={loading || !symbol.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Run test
            </Button>
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-6">
            Rules: uptrend (close above the 20 EMA, 20 EMA above the 50 SMA), a pullback to within 1% of the 20 EMA, and a green close. Entry fills next candle;
            gaps fill at the open, {cfg.slippagePct}% slippage each side, and a candle touching both stop and target counts as a loss. One trade at a time.
          </p>
        </CardContent>
      </Card>

      {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">{error}</div>}

      {result && (
        <>
          <div className="text-sm text-muted-foreground">Tested {result.range}{result.notice ? ` · ${result.notice}` : ''}</div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-lg">Growth: rules only vs rules + liquidity check</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={merged}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }} formatter={(v: number) => usd(v)} />
                  <Legend />
                  <Line type="stepAfter" dataKey="rules" name="Rules only" stroke="hsl(var(--muted-foreground))" dot={false} connectNulls strokeWidth={2} />
                  <Line type="stepAfter" dataKey="liquidity" name="Rules + liquidity" stroke="hsl(var(--primary))" dot={false} connectNulls strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <div className="grid gap-4 xl:grid-cols-2">
            <RunCard title="A · Rules only" run={result.a} />
            <RunCard title="B · Rules + liquidity check" run={result.b} />
          </div>
          <p className="text-xs text-muted-foreground">
            Read the largest drawdown before the win rate. The same inputs always produce the same trades. The liquidity check estimates pressure from where candles closed in their range — it is not real order flow.
          </p>
        </>
      )}
    </div>
  );
}
