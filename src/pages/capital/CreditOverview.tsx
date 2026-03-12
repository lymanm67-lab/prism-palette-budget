import { useState } from 'react';
import { Upload, FileText, Shield, Trash2, CreditCard, DollarSign, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import PageOverview from '@/components/PageOverview';
import AddCreditAccountDialog from '@/components/capital/AddCreditAccountDialog';
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

      {/* Quick Stats */}
      {accounts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
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
      )}

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Import Credit Report
          </CardTitle>
          <CardDescription>Upload your credit report as PDF, CSV, or JSON from any major bureau</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {BUREAUS.map(bureau => (
              <div key={bureau} className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/20 p-6 hover:border-primary/40 transition-colors cursor-pointer">
                <Shield className="h-8 w-8 text-muted-foreground" />
                <span className="font-medium text-sm">{bureau}</span>
                <Button variant="outline" size="sm" disabled>
                  Upload Report (Coming Soon)
                </Button>
                <p className="text-[10px] text-muted-foreground">PDF, CSV, JSON</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Or enter account details manually below
          </p>
        </CardContent>
      </Card>

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
