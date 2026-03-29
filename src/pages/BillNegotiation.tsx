import { useState } from 'react';
import { DollarSign, Scissors, ArrowRightLeft, XCircle, ArrowDown, Package, Sparkles, Phone, ChevronDown, ChevronUp, Loader2, Info, BadgeDollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import PageOverview from '@/components/PageOverview';
import { useSubscriptions } from '@/hooks/use-subscriptions';
import { useRecurringTransactions } from '@/hooks/use-recurring';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Recommendation {
  merchant: string;
  current_cost: number;
  potential_savings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  action_type: 'negotiate' | 'switch' | 'cancel' | 'downgrade' | 'bundle';
  recommendation: string;
  negotiation_script?: string;
  alternatives?: string[];
}

interface Analysis {
  total_potential_monthly_savings: number;
  recommendations: Recommendation[];
}

const actionIcons: Record<string, React.ElementType> = {
  negotiate: Phone,
  switch: ArrowRightLeft,
  cancel: XCircle,
  downgrade: ArrowDown,
  bundle: Package,
};

const actionLabels: Record<string, string> = {
  negotiate: 'Negotiate',
  switch: 'Switch Provider',
  cancel: 'Cancel',
  downgrade: 'Downgrade',
  bundle: 'Bundle',
};

const difficultyColors: Record<string, string> = {
  easy: 'bg-emerald-500/15 text-emerald-600',
  medium: 'bg-amber-500/15 text-amber-600',
  hard: 'bg-destructive/15 text-destructive',
};

const BillNegotiation = () => {
  const { data: subscriptions, isLoading: subsLoading } = useSubscriptions();
  const { data: recurring, isLoading: recLoading } = useRecurringTransactions();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  // Normalize subscription amounts to monthly
  const toMonthly = (amount: number, frequency: string) => {
    switch (frequency) {
      case 'weekly': return amount * 4.33;
      case 'biweekly': return amount * 2.17;
      case 'quarterly': return amount / 3;
      case 'semi-annual': return amount / 6;
      case 'annual': case 'yearly': return amount / 12;
      default: return amount; // monthly
    }
  };

  // Filter out non-subscription items (same logic as Subscriptions page)
  const NON_SUB_KEYWORDS = ['rent', 'mortgage', 'insurance', 'utilit', 'electric', 'gas', 'water', 'sewer', 'trash', 'debt', 'loan', 'transfer', 'payment'];
  const isNonSubscription = (sub: any) => {
    const merchant = (sub.merchant || '').toLowerCase();
    return NON_SUB_KEYWORDS.some(kw => merchant.includes(kw));
  };

  const allActiveSubs = (subscriptions || []).filter((s: any) => s.is_active);
  const trueSubs = allActiveSubs.filter((s: any) => !isNonSubscription(s));
  const totalMonthlyBills = trueSubs
    .reduce((sum: number, s: any) => sum + toMonthly(s.average_amount, s.frequency), 0);

  const billCount = trueSubs.length;

  // Use the sum of individual recommendation savings (more transparent than AI's total)
  const validatedSavings = analysis
    ? analysis.recommendations.reduce((sum: number, r: Recommendation) => sum + r.potential_savings, 0)
    : 0;

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('bill-negotiation', {
        body: {
          subscriptions: (subscriptions || []).filter((s: any) => s.is_active).map((s: any) => ({
            merchant: s.merchant,
            average_amount: s.average_amount,
            frequency: s.frequency,
            is_active: s.is_active,
          })),
          recurring: (recurring || []).filter((r: any) => r.is_active).map((r: any) => ({
            merchant: r.merchant,
            amount: r.amount,
            frequency: r.frequency,
            is_active: r.is_active,
          })),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalysis(data as Analysis);
      toast.success(`Found $${data.total_potential_monthly_savings?.toFixed(0) || 0}/mo in potential savings!`);
    } catch (e: any) {
      toast.error(e.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <PageOverview
        title="Bill Negotiation Insights"
        description="AI-powered analysis of your recurring bills to find savings opportunities"
        icon={Scissors}
        ttsScript="Bill Negotiation Insights uses AI to analyze your subscriptions and recurring bills, identifying opportunities to save money through negotiation, switching, or cancellation."
        features={['AI analyzes every recurring bill', 'Provides negotiation scripts', 'Ranks by savings potential & difficulty']}
      />

      {/* Explanation */}
      <div className="rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">How this is calculated:</strong> Monthly Spend shows only true subscriptions (software, streaming, memberships) normalized to monthly amounts. Non-subscription recurring charges like rent, utilities, insurance, and loan payments are excluded. This matches the total shown on the Subscriptions page.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Active Subscriptions</p>
          <p className="text-2xl font-bold">{billCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Monthly Spend</p>
          <p className="text-2xl font-bold text-primary">${totalMonthlyBills.toFixed(2)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Potential Savings</p>
          <p className="text-2xl font-bold text-emerald-600">
            {analysis ? `$${validatedSavings.toFixed(2)}/mo` : '—'}
          </p>
          {analysis && analysis.recommendations.length > 0 && (
            <p className="text-[10px] text-muted-foreground mt-1">
              sum of {analysis.recommendations.length} recommendation{analysis.recommendations.length !== 1 ? 's' : ''}
            </p>
          )}
        </Card>
      </div>

      {/* CTA */}
      {!analysis && (
        <Card className="p-8 text-center">
          {billCount === 0 ? (
            <>
              <Info className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold text-lg mb-2">No Bills Found</h3>
              <p className="text-sm text-muted-foreground">Add subscriptions or recurring transactions first, then come back for savings recommendations.</p>
            </>
          ) : (
            <>
              <BadgeDollarSign className="h-12 w-12 mx-auto text-primary/40 mb-4" />
              <h3 className="font-semibold text-lg mb-2">Ready to Find Savings?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                AI will analyze your {billCount} active bill{billCount !== 1 ? 's' : ''} totaling ${totalMonthlyBills.toFixed(2)}/mo
                and identify negotiation, switching, and cancellation opportunities.
              </p>
              <Button onClick={runAnalysis} disabled={analyzing} size="lg">
                {analyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {analyzing ? 'Analyzing Bills...' : 'Analyze My Bills'}
              </Button>
            </>
          )}
        </Card>
      )}

      {/* Results */}
      {analysis && (
        <>
          {/* Savings Summary */}
          <Card className="border-emerald-500/30 bg-emerald-500/5 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Potential Savings</p>
                <p className="text-3xl font-bold text-emerald-600">${validatedSavings.toFixed(2)}<span className="text-lg">/mo</span></p>
                <p className="text-sm text-muted-foreground mt-1">${(validatedSavings * 12).toFixed(0)} per year</p>
              </div>
              <Button variant="outline" onClick={runAnalysis} disabled={analyzing} size="sm">
                {analyzing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                Re-analyze
              </Button>
            </div>
          </Card>

          {/* Recommendations */}
          <div className="space-y-3">
            {analysis.recommendations.map((rec, idx) => {
              const ActionIcon = actionIcons[rec.action_type] || DollarSign;
              const isExpanded = expandedIdx === idx;

              return (
                <Card key={idx} className="overflow-hidden">
                  <button
                    className="w-full p-4 flex items-center gap-4 text-left hover:bg-accent/50 transition-colors"
                    onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted shrink-0">
                      <ActionIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{rec.merchant}</span>
                        <Badge className={cn('text-[10px] border-0', difficultyColors[rec.difficulty])}>{rec.difficulty}</Badge>
                        <Badge variant="outline" className="text-[10px]">{actionLabels[rec.action_type]}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{rec.recommendation}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-emerald-600">-${rec.potential_savings.toFixed(0)}/mo</p>
                      <p className="text-[10px] text-muted-foreground">from ${rec.current_cost.toFixed(0)}/mo</p>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t pt-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Recommendation</p>
                        <p className="text-sm">{rec.recommendation}</p>
                      </div>

                      {rec.negotiation_script && (
                        <div className="bg-muted rounded-lg p-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><Phone className="h-3 w-3" /> Negotiation Script</p>
                          <p className="text-sm italic">"{rec.negotiation_script}"</p>
                        </div>
                      )}

                      {rec.alternatives && rec.alternatives.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Alternatives</p>
                          <div className="flex flex-wrap gap-1.5">
                            {rec.alternatives.map((alt, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{alt}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Current: <strong className="text-foreground">${rec.current_cost.toFixed(2)}/mo</strong></span>
                        <span>Save: <strong className="text-emerald-600">${rec.potential_savings.toFixed(2)}/mo</strong></span>
                        <span>Yearly: <strong className="text-emerald-600">${(rec.potential_savings * 12).toFixed(0)}/yr</strong></span>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default BillNegotiation;
