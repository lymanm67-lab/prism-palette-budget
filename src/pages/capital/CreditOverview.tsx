import { useState, useMemo } from 'react';
import { Upload, FileText, Shield, Trash2, CreditCard, DollarSign, AlertTriangle, Gauge, Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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
import { useCreditAccounts, CreditAccount } from '@/hooks/use-credit-accounts';
import { format } from 'date-fns';

const BUREAUS = ['Equifax', 'Experian', 'TransUnion'] as const;

const statusColor = (status: string) => {
  const s = status.toLowerCase();
  if (s === 'open' || s === 'paid') return 'default';
  if (s === 'closed' || s === 'frozen') return 'secondary';
  return 'destructive';
};

const CreditOverview = () => {
  const { accounts, isLoading, deleteAccount, refetch } = useCreditAccounts();
  const [tab, setTab] = useState('all');

  const filtered = tab === 'all' ? accounts : accounts.filter(a => a.bureau === tab);

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);
  const totalLimit = accounts.reduce((s, a) => s + Number(a.credit_limit || 0), 0);
  const utilization = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;
  const negativeCount = accounts.filter(a =>
    ['Collection', 'Charge-Off', 'Foreclosure', 'Repossession'].includes(a.account_status)
  ).length;

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const fmtDate = (d: string | null) => d ? format(new Date(d), 'MM/dd/yyyy') : '—';

  return (
    <div className="space-y-6 pb-8">
      <PageOverview
        title="Credit Overview"
        description="Import and analyze credit reports from all three major bureaus"
        icon={Shield}
        ttsScript="Import and analyze credit reports from all three major bureaus."
        features={['Upload PDF, CSV, or JSON', 'Equifax, Experian, TransUnion', 'Structured account dashboard']}
      />

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

        return (
          <div className="grid gap-4 lg:grid-cols-3">
            {/* VantageScore Card */}
            <Card className="lg:col-span-1 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
              <CardHeader className="relative pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-primary" />
                  VantageScore® Estimate
                </CardTitle>
                <CardDescription className="flex items-center gap-1">
                  Based on your imported credit data
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger><Info className="h-3 w-3" /></TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        This is an educational estimate using VantageScore 3.0 factor weights applied to your imported credit report data. It is not an official credit score.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardDescription>
              </CardHeader>
              <CardContent className="relative space-y-4">
                <div className="text-center">
                  <div className="relative inline-flex items-center justify-center">
                    <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                      <circle cx="60" cy="60" r="50" fill="none" stroke={scoreColor} strokeWidth="10"
                        strokeDasharray={`${scorePercent * 3.14} 314`} strokeLinecap="round" className="transition-all duration-1000" />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-3xl font-bold" style={{ color: scoreColor }}>{clampedScore}</span>
                      <span className="text-xs font-medium text-muted-foreground">{scoreLabel}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Range: 300 – 850</p>
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
                <CardContent className="pt-4 pb-3 flex items-center gap-3">
                  <DollarSign className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Balance</p>
                    <p className="text-2xl font-bold">{fmt(totalBalance)}</p>
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
        );
      })()}

      {/* Import Section */}
      <CreditReportImport onSuccess={refetch} />

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

      <p className="text-xs text-muted-foreground text-center">
        This system provides financial education and credit analysis tools. It does not provide credit repair services.
      </p>
    </div>
  );
};

export default CreditOverview;
