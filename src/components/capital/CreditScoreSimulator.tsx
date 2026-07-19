import { useState, useMemo } from 'react';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SlidersHorizontal, TrendingUp, TrendingDown, Minus, Info, RotateCcw, Sparkles, Zap, CreditCard, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreditAccount } from '@/hooks/use-credit-accounts';
import SimulatorExtras from './SimulatorExtras';

interface SimulatedAccount {
  id: string;
  account_name: string;
  account_type: string;
  account_status: string;
  balance: number;
  credit_limit: number | null;
  date_opened: string | null;
  simBalance: number;
  removed: boolean;
}

interface QuickWin {
  id: string;
  label: string;
  action: string;
  points: number;
  type: 'paydown' | 'remove';
  detail: string;
}

function computeScore(accounts: SimulatedAccount[]) {
  const active = accounts.filter(a => !a.removed);
  if (active.length === 0) return { score: 300, utilization: 0, negativeCount: 0, factors: [] };

  const totalBalance = active.reduce((s, a) => s + a.simBalance, 0);
  const totalLimit = active.reduce((s, a) => s + (a.credit_limit || 0), 0);
  const utilization = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;

  const negativeStatuses = ['Collection', 'Charge-Off', 'Foreclosure', 'Repossession'];
  const negativeCount = active.filter(a => negativeStatuses.includes(a.account_status)).length;

  const openAccounts = active.filter(a => a.account_status.toLowerCase() === 'open');
  const now = new Date();
  const withDates = active.filter(a => a.date_opened);
  const avgAge = withDates.length > 0
    ? withDates.reduce((sum, a) => sum + ((now.getTime() - new Date(a.date_opened!).getTime()) / (1000 * 60 * 60 * 24 * 30)), 0) / withDates.length
    : 0;

  const utilizationScore = utilization <= 10 ? 100 : utilization <= 30 ? 80 : utilization <= 50 ? 55 : utilization <= 75 ? 30 : 10;
  const negativeScore = negativeCount === 0 ? 100 : negativeCount <= 2 ? 40 : 15;
  const ageScore = avgAge >= 84 ? 100 : avgAge >= 48 ? 75 : avgAge >= 24 ? 55 : avgAge >= 12 ? 35 : 20;
  const types = new Set(active.map(a => a.account_type));
  const mixScore = types.size >= 4 ? 100 : types.size >= 3 ? 75 : types.size >= 2 ? 50 : 30;
  const totalAcctsScore = openAccounts.length >= 10 ? 100 : openAccounts.length >= 5 ? 75 : openAccounts.length >= 3 ? 50 : 30;
  const paymentScore = negativeCount === 0 ? 100 : negativeCount <= 1 ? 60 : negativeCount <= 3 ? 35 : 15;

  const raw = 300 + (550 * (
    utilizationScore * 0.20 +
    negativeScore * 0.28 +
    ageScore * 0.13 +
    mixScore * 0.11 +
    totalAcctsScore * 0.08 +
    paymentScore * 0.20
  ) / 100);
  const score = Math.min(850, Math.max(300, Math.round(raw)));

  const factors = [
    { label: 'Payment History', weight: 28, score: paymentScore },
    { label: 'Credit Utilization', weight: 20, score: utilizationScore },
    { label: 'Negative Items', weight: 28, score: negativeScore },
    { label: 'Credit Age', weight: 13, score: ageScore },
    { label: 'Account Mix', weight: 11, score: mixScore },
  ];

  return { score, utilization, negativeCount, factors };
}

function computeQuickWins(baseAccounts: SimulatedAccount[]): QuickWin[] {
  const baseScore = computeScore(baseAccounts).score;
  const wins: QuickWin[] = [];
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  // Test paying each revolving account to $0
  for (const acct of baseAccounts) {
    if (acct.credit_limit && acct.credit_limit > 0 && acct.balance > 0) {
      const modified = baseAccounts.map(a => a.id === acct.id ? { ...a, simBalance: 0 } : a);
      const newScore = computeScore(modified).score;
      const diff = newScore - baseScore;
      if (diff > 0) {
        wins.push({
          id: acct.id,
          label: acct.account_name,
          action: `Pay off ${fmt(acct.balance)}`,
          points: diff,
          type: 'paydown',
          detail: `Paying this balance to $0 could boost your score by ~${diff} points`,
        });
      }
    }
  }

  // Test removing each negative
  const negativeStatuses = ['Collection', 'Charge-Off', 'Foreclosure', 'Repossession'];
  for (const acct of baseAccounts) {
    if (negativeStatuses.includes(acct.account_status)) {
      const modified = baseAccounts.map(a => a.id === acct.id ? { ...a, removed: true } : a);
      const newScore = computeScore(modified).score;
      const diff = newScore - baseScore;
      if (diff > 0) {
        wins.push({
          id: acct.id,
          label: acct.account_name,
          action: `Remove ${acct.account_status.toLowerCase()}`,
          points: diff,
          type: 'remove',
          detail: `Removing this ${acct.account_status.toLowerCase()} could boost your score by ~${diff} points`,
        });
      }
    }
  }

  return wins.sort((a, b) => b.points - a.points);
}

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export default function CreditScoreSimulator({ accounts }: { accounts: CreditAccount[] }) {
  const revolving = accounts.filter(a => a.credit_limit && Number(a.credit_limit) > 0);
  const negatives = accounts.filter(a => ['Collection', 'Charge-Off', 'Foreclosure', 'Repossession'].includes(a.account_status));

  const initialSim: SimulatedAccount[] = useMemo(() => accounts.map(a => ({
    id: a.id,
    account_name: a.account_name,
    account_type: a.account_type,
    account_status: a.account_status,
    balance: Number(a.balance),
    credit_limit: a.credit_limit ? Number(a.credit_limit) : null,
    date_opened: a.date_opened,
    simBalance: Number(a.balance),
    removed: false,
  })), [accounts]);

  const [simAccounts, setSimAccounts] = useState<SimulatedAccount[]>(initialSim);

  const currentResult = useMemo(() => computeScore(initialSim), [initialSim]);
  const simResult = useMemo(() => computeScore(simAccounts), [simAccounts]);
  const scoreDiff = simResult.score - currentResult.score;
  const quickWins = useMemo(() => computeQuickWins(initialSim), [initialSim]);

  const updateBalance = (id: string, val: number) => {
    setSimAccounts(prev => prev.map(a => a.id === id ? { ...a, simBalance: val } : a));
  };

  const toggleRemove = (id: string) => {
    setSimAccounts(prev => prev.map(a => a.id === id ? { ...a, removed: !a.removed } : a));
  };

  const applyQuickWin = (win: QuickWin) => {
    if (win.type === 'paydown') {
      setSimAccounts(prev => prev.map(a => a.id === win.id ? { ...a, simBalance: 0 } : a));
    } else {
      setSimAccounts(prev => prev.map(a => a.id === win.id ? { ...a, removed: true } : a));
    }
  };

  const reset = () => setSimAccounts(initialSim.map(a => ({ ...a })));

  if (accounts.length === 0) return null;

  const scoreColor = (s: number) => s >= 750 ? 'text-accent' : s >= 670 ? 'text-green-500' : s >= 580 ? 'text-yellow-500' : 'text-destructive';
  const scoreLabel = (s: number) => s >= 750 ? 'Excellent' : s >= 670 ? 'Good' : s >= 580 ? 'Fair' : 'Poor';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              Credit Score Simulator
            </CardTitle>
            <CardDescription>
              Adjust balances or remove negative items to see estimated VantageScore® impact
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Wins */}
        {quickWins.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Quick Wins
              <Badge variant="secondary" className="text-[10px]">Top actions ranked by impact</Badge>
            </h4>
            <div className="space-y-1.5">
              {quickWins.slice(0, 5).map((win, i) => (
                <button
                  key={win.id + win.type}
                  onClick={() => applyQuickWin(win)}
                  className="w-full flex items-center gap-3 rounded-lg border border-border/50 p-2.5 text-left hover:bg-accent/10 transition-colors group"
                >
                  <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {win.type === 'paydown' ? (
                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ShieldX className="h-3.5 w-3.5 text-destructive" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{win.label}</p>
                    <p className="text-xs text-muted-foreground">{win.action}</p>
                  </div>
                  <Badge className="shrink-0 bg-accent/15 text-accent border-accent/30 hover:bg-accent/20">
                    +{win.points} pts
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Score Comparison */}
        <div className="flex items-center justify-center gap-8 flex-wrap">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Current Estimate</p>
            <p className={`text-3xl font-bold ${scoreColor(currentResult.score)}`}>{currentResult.score}</p>
            <p className="text-xs text-muted-foreground">{scoreLabel(currentResult.score)}</p>
          </div>
          <div className="text-center">
            {scoreDiff !== 0 && (
              <div className={`flex items-center gap-1 text-sm font-semibold ${scoreDiff > 0 ? 'text-accent' : 'text-destructive'}`}>
                {scoreDiff > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {scoreDiff > 0 ? '+' : ''}{scoreDiff} pts
              </div>
            )}
            {scoreDiff === 0 && <Minus className="h-4 w-4 text-muted-foreground mx-auto" />}
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Simulated</p>
            <p className={`text-3xl font-bold ${scoreColor(simResult.score)}`}>{simResult.score}</p>
            <p className="text-xs text-muted-foreground">{scoreLabel(simResult.score)}</p>
          </div>
        </div>

        {/* Utilization comparison */}
        <div className="flex items-center justify-center gap-4 text-xs">
          <span className="text-muted-foreground">Utilization:</span>
          <span className="font-mono">{currentResult.utilization.toFixed(1)}%</span>
          <span className="text-muted-foreground">→</span>
          <span className={`font-mono font-semibold ${simResult.utilization <= 30 ? 'text-accent' : simResult.utilization <= 50 ? 'text-yellow-500' : 'text-destructive'}`}>
            {simResult.utilization.toFixed(1)}%
          </span>
        </div>

        {/* Revolving Account Sliders */}
        {revolving.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Pay Down Revolving Balances
            </h4>
            <div className="space-y-4">
              {revolving.map(acct => {
                const sim = simAccounts.find(s => s.id === acct.id)!;
                const limit = Number(acct.credit_limit);
                const pctUsed = limit > 0 ? (sim.simBalance / limit) * 100 : 0;
                return (
                  <div key={acct.id} className="space-y-1.5 rounded-lg border border-border/50 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate max-w-[200px]">{acct.account_name}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Limit: {fmt(limit)}</span>
                        <Badge variant={pctUsed <= 30 ? 'default' : pctUsed <= 50 ? 'secondary' : 'destructive'} className="text-[10px]">
                          {pctUsed.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono w-20 text-right shrink-0">{fmt(sim.simBalance)}</span>
                      <Slider
                        min={0}
                        max={Number(acct.balance)}
                        step={Math.max(1, Math.round(Number(acct.balance) / 100))}
                        value={[sim.simBalance]}
                        onValueChange={([v]) => updateBalance(acct.id, v)}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-20 shrink-0">{fmt(Number(acct.balance))}</span>
                    </div>
                    {sim.simBalance < Number(acct.balance) && (
                      <p className="text-xs text-accent">
                        Pay {fmt(Number(acct.balance) - sim.simBalance)} to reach {pctUsed.toFixed(0)}% utilization
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Negative Item Toggles */}
        {negatives.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Remove Negative Items
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    Simulate the impact of successfully disputing and removing negative tradelines from your report.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </h4>
            <div className="space-y-2">
              {negatives.map(acct => {
                const sim = simAccounts.find(s => s.id === acct.id)!;
                return (
                  <div key={acct.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block">{acct.account_name}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="destructive" className="text-[10px]">{acct.account_status}</Badge>
                        <span className="text-xs text-muted-foreground">{fmt(Number(acct.balance))}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`remove-${acct.id}`} className="text-xs text-muted-foreground">
                        {sim.removed ? 'Removed' : 'Remove'}
                      </Label>
                      <Switch
                        id={`remove-${acct.id}`}
                        checked={sim.removed}
                        onCheckedChange={() => toggleRemove(acct.id)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {revolving.length === 0 && negatives.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No revolving accounts with balances or negative items to simulate. Your credit profile looks clean! 🎉
          </p>
        )}

        <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
          This simulator provides educational estimates only using VantageScore® 3.0 factor weights. 
          It is not an official credit score and actual results may vary.
        </p>
      </CardContent>
    </Card>
  );
}