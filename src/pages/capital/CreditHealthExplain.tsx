import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, AlertTriangle, CheckCircle2, Clock, XCircle, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import InsightCard from '@/components/credit-health/InsightCard';
import { useCreditAccounts } from '@/hooks/use-credit-accounts';
import { useDisputes } from '@/hooks/use-disputes';

const ExplainMyScore = () => {
  const navigate = useNavigate();
  const { accounts } = useCreditAccounts();
  const { disputes } = useDisputes();

  const insights = useMemo(() => {
    const list: { title: string; description: string; type: 'info' | 'warning' | 'success' | 'insight' }[] = [];
    const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);
    const totalLimit = accounts.reduce((s, a) => s + Number(a.credit_limit || 0), 0);
    const utilization = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;
    const negativeCount = accounts.filter(a => ['Collection', 'Charge-Off', 'Foreclosure', 'Repossession'].includes(a.account_status)).length;
    const openDisputes = disputes.filter(d => d.status === 'submitted' || d.status === 'in_progress');

    if (utilization > 50) list.push({ type: 'warning', title: 'High balances are the biggest drag on your score', description: `Your utilization is ${utilization.toFixed(0)}%. This is likely affecting your score more than any single negative item. Paying down revolving balances below 30% could result in a significant boost.` });
    else if (utilization > 30) list.push({ type: 'warning', title: 'Utilization is slightly high', description: `At ${utilization.toFixed(0)}%, you're above the ideal 30% threshold. Reducing balances further would help your score.` });
    else if (utilization > 0) list.push({ type: 'success', title: 'Your utilization is well managed', description: `At ${utilization.toFixed(0)}%, you're within the healthy range. Keep it up!` });

    if (negativeCount > 0) list.push({ type: 'warning', title: `${negativeCount} negative item${negativeCount > 1 ? 's' : ''} still on your report`, description: 'Even if you\'ve addressed the underlying issues, negative marks take time to fall off. Continue building positive history alongside any disputes.' });

    if (openDisputes.length > 0) list.push({ type: 'info', title: 'Open disputes may not have reflected yet', description: `You have ${openDisputes.length} dispute${openDisputes.length > 1 ? 's' : ''} in progress. Bureau investigations take up to 30 days. Score changes from successful disputes typically appear 1-2 statement cycles after resolution.` });

    if (accounts.length < 5) list.push({ type: 'info', title: 'Your credit profile is still building', description: 'With fewer than 5 accounts, scoring models have limited data. Adding responsible credit use over time will strengthen your profile.' });

    list.push({ type: 'insight', title: 'On-time payments compound over time', description: 'Each month of on-time payments adds to your positive history. Even if you don\'t see immediate score changes, consistency is building your foundation.' });

    list.push({ type: 'info', title: 'Scoring models vary', description: 'Your FICO score and VantageScore may differ by 20-40 points. Lenders may use different versions too. Focus on improving the factors rather than chasing a specific number.' });

    return list;
  }, [accounts, disputes]);

  const mostLikelyCause = useMemo(() => {
    const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);
    const totalLimit = accounts.reduce((s, a) => s + Number(a.credit_limit || 0), 0);
    const utilization = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;
    const negativeCount = accounts.filter(a => ['Collection', 'Charge-Off', 'Foreclosure', 'Repossession'].includes(a.account_status)).length;

    if (negativeCount > 2) return { cause: 'Multiple negative items', fix: 'Review each for accuracy and dispute errors. For legitimate marks, focus on building positive history.', avoid: 'Don\'t open new accounts to try to offset negatives — this can backfire.' };
    if (utilization > 50) return { cause: 'High credit card balances', fix: 'Focus on paying down the card with the highest utilization first.', avoid: 'Don\'t close cards after paying them off — the available credit helps your ratio.' };
    if (accounts.length < 3) return { cause: 'Thin credit file', fix: 'Consider a secured credit card or credit builder loan to add positive accounts.', avoid: 'Don\'t apply for multiple cards at once — space applications 3-6 months apart.' };
    return { cause: 'Time and consistency needed', fix: 'Keep making on-time payments and maintaining low balances. Your score will improve.', avoid: 'Don\'t make major credit changes (closing accounts, large purchases) before important applications.' };
  }, [accounts]);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/capital/credit-health')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Explain My Score</h1>
          <p className="text-sm text-muted-foreground">Plain-language insights about your credit</p>
        </div>
      </div>

      {/* Most Likely Cause */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Most Likely Cause
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm font-semibold">{mostLikelyCause.cause}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <p className="text-xs font-bold text-emerald-600 mb-1">✓ What to do next</p>
              <p className="text-xs text-muted-foreground">{mostLikelyCause.fix}</p>
            </div>
            <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <p className="text-xs font-bold text-destructive mb-1">✗ What NOT to do right now</p>
              <p className="text-xs text-muted-foreground">{mostLikelyCause.avoid}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personalized Insights */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Personalized Insights</h2>
        {insights.map((ins, i) => (
          <InsightCard key={i} title={ins.title} description={ins.description} type={ins.type} />
        ))}
      </div>

      {/* Encouragement */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-5 text-center space-y-2">
          <Heart className="h-8 w-8 text-primary mx-auto" />
          <p className="text-sm font-semibold">Keep going — consistency matters</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Credit improvement isn't instant. Every on-time payment, every balance paid down, every error corrected adds up. You're building a stronger financial foundation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExplainMyScore;
