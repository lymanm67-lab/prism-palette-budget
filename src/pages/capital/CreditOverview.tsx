import { useState, useMemo } from 'react';
import { Upload, FileText, Shield, Trash2, CreditCard, DollarSign, AlertTriangle, Gauge, Info, TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import PageOverview from '@/components/PageOverview';
import AddCreditAccountDialog from '@/components/capital/AddCreditAccountDialog';
import CreditReportImport from '@/components/capital/CreditReportImport';
import CreditScoreSimulator from '@/components/capital/CreditScoreSimulator';
import AiCreditAnalysis from '@/components/capital/AiCreditAnalysis';
import SixMonthScorePath from '@/components/capital/SixMonthScorePath';
import MultiModelScores from '@/components/capital/MultiModelScores';
import CreditBuilderPlaybook from '@/components/capital/CreditBuilderPlaybook';
import UtilizationGuardian from '@/components/capital/UtilizationGuardian';
import { useCreditAccounts, CreditAccount } from '@/hooks/use-credit-accounts';
import { format } from 'date-fns';

const BUREAUS = ['Equifax', 'Experian', 'TransUnion'] as const;

const statusColor = (status: string) => {
  const s = status.toLowerCase();
  if (s === 'open' || s === 'paid') return 'default';
  if (s === 'closed' || s === 'frozen') return 'secondary';
  return 'destructive';
};

const ACTUAL_SCORES_KEY = 'prism.actualCreditScores.v1';
const MULTI_MODEL_KEY = 'prism.multiModelScores.v1';
type ActualScores = { Equifax?: number; Experian?: number; TransUnion?: number; model?: string; asOf?: string };

const CreditOverview = () => {
  const { accounts, isLoading, deleteAccount, refetch } = useCreditAccounts();
  const [tab, setTab] = useState('all');
  const [actualScores, setActualScoresState] = useState<ActualScores>(() => {
    try { return JSON.parse(localStorage.getItem(ACTUAL_SCORES_KEY) || '{}'); } catch { return {}; }
  });
  const [editingScores, setEditingScores] = useState(false);
  const setActualScores = (s: ActualScores) => {
    setActualScoresState(s);
    localStorage.setItem(ACTUAL_SCORES_KEY, JSON.stringify(s));
    // If the user entered VantageScore 3.0 scores, mirror them into the multi-model matrix
    // so both score cards stay in sync.
    if (s.model === 'VantageScore 3.0') {
      try {
        const raw = localStorage.getItem(MULTI_MODEL_KEY);
        const multi: Record<string, any> = raw ? JSON.parse(raw) : {};
        const vs3 = { ...(multi.vs3 || {}) };
        (['Equifax', 'Experian', 'TransUnion'] as const).forEach(b => {
          if (typeof s[b] === 'number') vs3[b] = s[b];
          else if (s[b] === undefined) delete vs3[b];
        });
        localStorage.setItem(MULTI_MODEL_KEY, JSON.stringify({ ...multi, vs3 }));
      } catch { /* ignore */ }
    }
  };
  const hasActuals = !!(actualScores.Equifax || actualScores.Experian || actualScores.TransUnion);

  const filtered = tab === 'all' ? accounts : accounts.filter(a => a.bureau === tab);

  const revolving = accounts.filter(a => a.account_type === 'Revolving');
  const revolvingBalance = revolving.reduce((s, a) => s + Number(a.balance), 0);
  const totalLimit = revolving.reduce((s, a) => s + Number(a.credit_limit || 0), 0);
  const utilization = totalLimit > 0 ? (revolvingBalance / totalLimit) * 100 : 0;
  const negativeCount = accounts.filter(a =>
    ['Collection', 'Charge-Off', 'Foreclosure', 'Repossession'].includes(a.account_status)
  ).length;

  const bureauBalances = (['Equifax', 'Experian', 'TransUnion'] as const).map(bureau => {
    const ba = accounts.filter(a => a.bureau === bureau);
    return { bureau, balance: ba.reduce((s, a) => s + Number(a.balance), 0), count: ba.length };
  });

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const fmtDate = (d: string | null) => d ? format(new Date(d), 'MM/dd/yyyy') : '—';

  return (
    <div className="space-y-6 pb-8">
      <PageOverview
        title="Credit Overview"
        description="Import and analyze credit reports from all three major bureaus"
        icon={Shield}
        ttsScript="Welcome to Credit Overview. This is your central hub for monitoring credit health across all three bureaus — Equifax, Experian, and TransUnion. You can import credit reports in PDF, CSV, or JSON format, or manually add accounts. The dashboard shows your total balances, credit utilization ratio, and flags negative items like collections or charge-offs. Use the Credit Score Simulator to model how paying down balances or removing negatives could impact your estimated VantageScore. Scenario: Suppose you have three credit cards with a combined 60 percent utilization. Use the simulator to see how paying one card to zero could boost your score by 30 to 50 points, then prioritize that payoff in your budget."
        features={['Upload PDF, CSV, or JSON credit reports', 'Track balances and utilization across all three bureaus', 'Simulate score changes with the Credit Score Simulator', 'Identify negative items dragging your score down']}
      />

      <div className="grid gap-3 md:grid-cols-2">
        <a href="/capital/secondary-freeze" className="block">
          <Card className="hover:border-primary/50 transition-colors h-full">
            <CardContent className="flex items-start gap-3 p-4">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <div className="font-semibold text-sm">Secondary Bureau Freeze Hub</div>
                <div className="text-xs text-muted-foreground">Freeze LexisNexis, ChexSystems, SageStream, Innovis + 6 more</div>
              </div>
            </CardContent>
          </Card>
        </a>
        <a href="/capital/personal-info-correction" className="block">
          <Card className="hover:border-primary/50 transition-colors h-full">
            <CardContent className="flex items-start gap-3 p-4">
              <FileText className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <div className="font-semibold text-sm">Personal Info Correction Letters</div>
                <div className="text-xs text-muted-foreground">Fix wrong name, address, DOB, SSN, or aliases (FCRA § 611)</div>
              </div>
            </CardContent>
          </Card>
        </a>
      </div>

      {/* VantageScore Estimator + Quick Stats */}
      {accounts.length > 0 && (() => {
        // VantageScore 3.0 estimation based on credit data factors
        const openAccounts = accounts.filter(a => a.account_status.toLowerCase() === 'open');
        const avgAge = (() => {
          const withDates = accounts.filter(a => a.date_opened);
          if (withDates.length === 0) return 0;
          const now = new Date();
          const totalMonths = withDates.reduce((sum, a) => {
            const opened = new Date(a.date_opened!);
            return sum + ((now.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24 * 30));
          }, 0);
          return totalMonths / withDates.length;
        })();

        // Factor scores (VantageScore 3.0 weighting)
        const utilizationScore = utilization <= 10 ? 100 : utilization <= 30 ? 80 : utilization <= 50 ? 55 : utilization <= 75 ? 30 : 10;
        const negativeScore = negativeCount === 0 ? 100 : negativeCount <= 2 ? 40 : 15;
        const ageScore = avgAge >= 84 ? 100 : avgAge >= 48 ? 75 : avgAge >= 24 ? 55 : avgAge >= 12 ? 35 : 20;
        const mixScore = (() => {
          const types = new Set(accounts.map(a => a.account_type));
          return types.size >= 4 ? 100 : types.size >= 3 ? 75 : types.size >= 2 ? 50 : 30;
        })();
        const totalAcctsScore = openAccounts.length >= 10 ? 100 : openAccounts.length >= 5 ? 75 : openAccounts.length >= 3 ? 50 : 30;

        // Weighted estimate (VantageScore 3.0 approximate weights)
        const estimatedScore = Math.round(
          300 + (550 * (
            utilizationScore * 0.20 +
            negativeScore * 0.28 +
            ageScore * 0.13 +
            mixScore * 0.11 +
            totalAcctsScore * 0.08 +
            (100 * 0.20) // payment history placeholder (assume good if no negatives data)
          ) / 100)
        );
        const clampedScore = Math.min(850, Math.max(300, estimatedScore));

        const scorePercent = ((clampedScore - 300) / 550) * 100;
        const scoreColor = clampedScore >= 750 ? 'hsl(var(--accent))' : clampedScore >= 670 ? 'hsl(142 71% 45%)' : clampedScore >= 580 ? 'hsl(48 96% 53%)' : 'hsl(var(--destructive))';
        const scoreLabel = clampedScore >= 750 ? 'Excellent' : clampedScore >= 670 ? 'Good' : clampedScore >= 580 ? 'Fair' : 'Poor';

        const factors = [
          { label: 'Payment History', weight: '28%', score: negativeScore, icon: negativeScore >= 70 ? TrendingUp : negativeScore >= 40 ? Minus : TrendingDown },
          { label: 'Credit Utilization', weight: '20%', score: utilizationScore, icon: utilizationScore >= 70 ? TrendingUp : utilizationScore >= 40 ? Minus : TrendingDown },
          { label: 'Credit Age', weight: '13%', score: ageScore, icon: ageScore >= 70 ? TrendingUp : ageScore >= 40 ? Minus : TrendingDown },
          { label: 'Account Mix', weight: '11%', score: mixScore, icon: mixScore >= 70 ? TrendingUp : mixScore >= 40 ? Minus : TrendingDown },
          { label: 'Total Accounts', weight: '8%', score: totalAcctsScore, icon: totalAcctsScore >= 70 ? TrendingUp : totalAcctsScore >= 40 ? Minus : TrendingDown },
        ];

        // Per-bureau scores
        const computeBureauScore = (bureauAccts: typeof accounts) => {
          if (bureauAccts.length === 0) return 0;
          const bRevolving = bureauAccts.filter(a => a.account_type === 'Revolving');
          const bBalance = bRevolving.reduce((s, a) => s + Number(a.balance), 0);
          const bLimit = bRevolving.reduce((s, a) => s + Number(a.credit_limit || 0), 0);
          const bUtil = bLimit > 0 ? (bBalance / bLimit) * 100 : 0;
          const bNeg = bureauAccts.filter(a => ['Collection', 'Charge-Off', 'Foreclosure', 'Repossession'].includes(a.account_status)).length;
          const bOpen = bureauAccts.filter(a => a.account_status.toLowerCase() === 'open');
          const bWithDates = bureauAccts.filter(a => a.date_opened);
          const bAvgAge = bWithDates.length ? bWithDates.reduce((sum, a) => sum + ((Date.now() - new Date(a.date_opened!).getTime()) / (1000 * 60 * 60 * 24 * 30)), 0) / bWithDates.length : 0;
          const bTypes = new Set(bureauAccts.map(a => a.account_type));
          const uS = bUtil <= 10 ? 100 : bUtil <= 30 ? 80 : bUtil <= 50 ? 55 : bUtil <= 75 ? 30 : 10;
          const nS = bNeg === 0 ? 100 : bNeg <= 2 ? 40 : 15;
          const aS = bAvgAge >= 84 ? 100 : bAvgAge >= 48 ? 75 : bAvgAge >= 24 ? 55 : bAvgAge >= 12 ? 35 : 20;
          const mS = bTypes.size >= 4 ? 100 : bTypes.size >= 3 ? 75 : bTypes.size >= 2 ? 50 : 30;
          const tS = bOpen.length >= 10 ? 100 : bOpen.length >= 5 ? 75 : bOpen.length >= 3 ? 50 : 30;
          return Math.min(850, Math.max(300, Math.round(300 + (550 * (uS * 0.20 + nS * 0.28 + aS * 0.13 + mS * 0.11 + tS * 0.08 + 100 * 0.20) / 100))));
        };

        const bureauScores = (['Equifax', 'Experian', 'TransUnion'] as const).map(bureau => {
          const ba = accounts.filter(a => a.bureau === bureau);
          return { bureau, score: computeBureauScore(ba), count: ba.length };
        });

        return (
          <>
          <div className="grid gap-4 lg:grid-cols-3">

            {/* VantageScore Card */}
            <Card className="lg:col-span-1 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
              <CardHeader className="relative pb-2">
                <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                  <Gauge className="h-5 w-5 text-primary" />
                  {hasActuals ? 'Credit Score' : 'VantageScore® Estimate'}
                  <Badge variant={hasActuals ? 'default' : 'secondary'} className="text-[10px]">
                    {hasActuals ? (actualScores.model || 'Actual') : 'Estimate'}
                  </Badge>
                </CardTitle>
                <CardDescription className="flex items-center gap-1 text-xs">
                  {hasActuals
                    ? `From your reports${actualScores.asOf ? ` · as of ${actualScores.asOf}` : ''}`
                    : 'Educational estimate — not your real score'}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger><Info className="h-3 w-3" /></TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        {hasActuals
                          ? 'These are the scores you entered from your official credit reports. Update anytime.'
                          : 'Rough estimate using VantageScore 3.0 factor weights on your imported tradeline data. Actual scores use proprietary models and may differ by ±30–40 points. Enter your real scores for accuracy.'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardDescription>
              </CardHeader>
              <CardContent className="relative space-y-4">
                {(() => {
                  const displayScore = hasActuals
                    ? Math.round(
                        [actualScores.Equifax, actualScores.Experian, actualScores.TransUnion]
                          .filter((n): n is number => typeof n === 'number' && n > 0)
                          .reduce((a, b, _, arr) => a + b / arr.length, 0)
                      )
                    : clampedScore;
                  const dPercent = ((displayScore - 300) / 550) * 100;
                  const dColor = displayScore >= 750 ? 'hsl(var(--accent))' : displayScore >= 670 ? 'hsl(142 71% 45%)' : displayScore >= 580 ? 'hsl(48 96% 53%)' : 'hsl(var(--destructive))';
                  const dLabel = displayScore >= 750 ? 'Excellent' : displayScore >= 670 ? 'Good' : displayScore >= 580 ? 'Fair' : 'Poor';
                  return (
                    <div className="text-center">
                      <div className="relative inline-flex items-center justify-center">
                        <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
                          <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                          <circle cx="60" cy="60" r="50" fill="none" stroke={dColor} strokeWidth="10"
                            strokeDasharray={`${dPercent * 3.14} 314`} strokeLinecap="round" className="transition-all duration-1000" />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span className="text-3xl font-bold" style={{ color: dColor }}>{displayScore}</span>
                          <span className="text-xs font-medium text-muted-foreground">{dLabel}</span>
                        </div>
                      </div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-1">
                        {hasActuals ? 'Average of Actual' : 'Combined Estimate'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Range: 300 – 850</p>
                    </div>
                  );
                })()}

                {/* Per-Bureau Scores */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/50">
                  {bureauScores.map(b => {
                    const actual = actualScores[b.bureau];
                    const shown = actual ?? b.score;
                    const isActual = !!actual;
                    const color = shown === 0 ? 'text-muted-foreground' : shown >= 670 ? 'text-emerald-600' : shown >= 580 ? 'text-amber-600' : 'text-destructive';
                    return (
                      <div key={b.bureau} className="text-center space-y-0.5">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{b.bureau}</p>
                        <p className={`text-base font-bold ${color}`}>{shown > 0 ? shown : '—'}</p>
                        <p className="text-[9px] text-muted-foreground">{isActual ? 'Actual' : 'Est.'} · {b.count} acct{b.count !== 1 ? 's' : ''}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Enter actual scores */}
                <div className="pt-2 border-t border-border/50">
                  {!editingScores ? (
                    <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setEditingScores(true)}>
                      {hasActuals ? 'Update actual scores' : 'Enter actual scores from your reports'}
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[11px] text-muted-foreground">Enter scores from Equifax.com, Experian.com, or your monitoring service.</p>
                      <div className="grid grid-cols-3 gap-2">
                        {BUREAUS.map(bureau => (
                          <div key={bureau}>
                            <label className="text-[10px] text-muted-foreground">{bureau}</label>
                            <input
                              type="number" min={300} max={850}
                              defaultValue={actualScores[bureau] ?? ''}
                              className="w-full h-8 px-2 rounded-md border bg-background text-sm"
                              onChange={(e) => {
                                const v = parseInt(e.target.value);
                                setActualScores({ ...actualScores, [bureau]: isNaN(v) ? undefined : v });
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          className="h-8 px-2 rounded-md border bg-background text-xs"
                          defaultValue={actualScores.model || 'VantageScore 3.0'}
                          onChange={(e) => setActualScores({ ...actualScores, model: e.target.value })}
                        >
                          <option>VantageScore 3.0</option>
                          <option>VantageScore 4.0</option>
                          <option>FICO 8</option>
                          <option>FICO 9</option>
                          <option>Mortgage FICO</option>
                        </select>
                        <input
                          type="date"
                          defaultValue={actualScores.asOf || ''}
                          className="h-8 px-2 rounded-md border bg-background text-xs"
                          onChange={(e) => setActualScores({ ...actualScores, asOf: e.target.value })}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 text-xs" onClick={() => setEditingScores(false)}>Save</Button>
                        <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setActualScores({}); setEditingScores(false); }}>Clear</Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {factors.map(f => {
                    const Icon = f.icon;
                    const barColor = f.score >= 70 ? 'bg-accent' : f.score >= 40 ? 'bg-yellow-500' : 'bg-destructive';
                    return (
                      <div key={f.label} className="flex items-center gap-2 text-xs">
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${f.score >= 70 ? 'text-accent' : f.score >= 40 ? 'text-yellow-500' : 'text-destructive'}`} />
                        <span className="w-28 truncate">{f.label}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${barColor} transition-all duration-700`} style={{ width: `${f.score}%` }} />
                        </div>
                        <span className="text-muted-foreground w-7 text-right">{f.weight}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2">
              <Card>
                <CardContent className="pt-4 pb-3 flex items-center gap-3">
                  <CreditCard className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Accounts</p>
                    <p className="text-2xl font-bold">{accounts.length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-3 mb-3">
                    <DollarSign className="h-8 w-8 text-primary" />
                    <p className="text-xs text-muted-foreground">Balance by Bureau</p>
                  </div>
                  <div className="space-y-1.5">
                    {bureauBalances.map(b => (
                      <div key={b.bureau} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{b.bureau}</span>
                        <span className="font-semibold font-mono">{b.count > 0 ? fmt(b.balance) : '—'}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 flex items-center gap-3">
                  <DollarSign className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Credit Utilization</p>
                    <p className={`text-2xl font-bold ${utilization > 30 ? 'text-destructive' : ''}`}>
                      {totalLimit > 0 ? `${utilization.toFixed(1)}%` : 'N/A'}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 flex items-center gap-3">
                  <AlertTriangle className={`h-8 w-8 ${negativeCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                  <div>
                    <p className="text-xs text-muted-foreground">Negative Items</p>
                    <p className="text-2xl font-bold">{negativeCount}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          <SixMonthScorePath currentScore={clampedScore} utilization={utilization} negativeCount={negativeCount} revolvingBalance={revolvingBalance} />
          </>
        );
      })()}


      {/* Multi-model scores + industry usage reference */}
      <MultiModelScores />

      {/* Import Section */}
      <CreditReportImport onSuccess={refetch} />

      {/* AI Credit Analysis */}
      {accounts.length > 0 && <AiCreditAnalysis />}

      {/* Utilization Guardian (per-card <7% tracker) */}
      {accounts.length > 0 && <UtilizationGuardian accounts={accounts} />}

      {/* Credit Builder Playbook */}
      <CreditBuilderPlaybook />

      {/* Credit Score Simulator */}
      {accounts.length > 0 && <CreditScoreSimulator accounts={accounts} />}

      {/* Accounts Table */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <TabsList>
            <TabsTrigger value="all">All ({accounts.length})</TabsTrigger>
            {BUREAUS.map(b => (
              <TabsTrigger key={b} value={b}>
                {b} ({accounts.filter(a => a.bureau === b).length})
              </TabsTrigger>
            ))}
          </TabsList>
          <AddCreditAccountDialog onSuccess={refetch} defaultBureau={tab !== 'all' ? tab : undefined} />
        </div>

        {['all', ...BUREAUS].map(tabVal => (
          <TabsContent key={tabVal} value={tabVal} className="mt-4">
            {filtered.length === 0 ? (
              <Card className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold text-lg mb-2">
                  {accounts.length === 0 ? 'No Credit Reports Imported' : `No ${tabVal} Accounts`}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload a credit report or manually enter account details to get started
                </p>
              </Card>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bureau</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead className="text-right">Limit</TableHead>
                        <TableHead className="text-right">Payment</TableHead>
                        <TableHead>Opened</TableHead>
                        <TableHead>Responsibility</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(acct => (
                        <TableRow key={acct.id}>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{acct.bureau}</Badge>
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="font-medium cursor-help">
                                    {acct.account_name}
                                    {acct.account_number && (
                                      <span className="text-muted-foreground text-xs ml-1">
                                        ••{acct.account_number.slice(-4)}
                                      </span>
                                    )}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs text-xs space-y-1">
                                  {acct.payment_history && <p><strong>Payment History:</strong> {acct.payment_history}</p>}
                                  {acct.remarks_codes && <p><strong>Remarks:</strong> {acct.remarks_codes}</p>}
                                  {acct.date_of_first_delinquency && <p><strong>First Delinquency:</strong> {fmtDate(acct.date_of_first_delinquency)}</p>}
                                  {acct.notes && <p><strong>Notes:</strong> {acct.notes}</p>}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell className="text-xs">{acct.account_type}</TableCell>
                          <TableCell>
                            <Badge variant={statusColor(acct.account_status)} className="text-xs">
                              {acct.account_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">{fmt(acct.balance)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {acct.credit_limit ? fmt(acct.credit_limit) : '—'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {acct.monthly_payment ? fmt(acct.monthly_payment) : '—'}
                          </TableCell>
                          <TableCell className="text-xs">{fmtDate(acct.date_opened)}</TableCell>
                          <TableCell className="text-xs">{acct.responsibility || '—'}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteAccount(acct.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Credit Monitoring & Education Resources */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-primary" />
            Free Credit Monitoring & Education
          </CardTitle>
          <p className="text-xs text-muted-foreground">Monitor your credit and learn how to improve it with these free resources</p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[
            { name: 'AnnualCreditReport.com', url: 'https://www.annualcreditreport.com/', desc: 'Free annual reports from all 3 bureaus' },
            { name: 'Credit Karma', url: 'https://www.creditkarma.com/', desc: 'Free scores, monitoring & alerts' },
            { name: 'Credit Sesame', url: 'https://www.creditsesame.com/', desc: 'Free credit score & identity protection' },
            { name: 'NerdWallet Credit Score', url: 'https://www.nerdwallet.com/free-credit-score', desc: 'Free TransUnion score & report' },
            { name: 'Experian Free Score', url: 'https://www.experian.com/consumer-products/free-credit-report.html', desc: 'Free Experian credit report' },
            { name: 'myFICO Education', url: 'https://www.myfico.com/credit-education', desc: 'FICO score education center' },
            { name: 'CFPB Credit Resources', url: 'https://www.consumerfinance.gov/consumer-tools/credit-reports-and-scores/', desc: 'Government credit education' },
            { name: 'Credit.org', url: 'https://credit.org/', desc: 'Nonprofit credit counseling' },
            { name: 'Khan Academy Finance', url: 'https://www.khanacademy.org/college-careers-more/personal-finance', desc: 'Free financial literacy courses' },
          ].map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-lg border bg-background hover:bg-accent transition-colors group">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20">
                <ExternalLink className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm">{link.name}</p>
                <p className="text-xs text-muted-foreground truncate">{link.desc}</p>
              </div>
            </a>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        This system provides financial education and credit analysis tools. It does not provide credit repair services.
      </p>
    </div>
  );
};

export default CreditOverview;
