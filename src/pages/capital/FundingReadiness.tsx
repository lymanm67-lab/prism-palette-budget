import { TrendingUp, Target, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import PageOverview from '@/components/PageOverview';

const SCORE_FACTORS = [
  { label: 'Payment History', weight: '25%', score: 0, tip: 'Maintain consistent on-time payments' },
  { label: 'Credit Utilization', weight: '20%', score: 0, tip: 'Keep utilization below 30%' },
  { label: 'Negative Accounts', weight: '15%', score: 0, tip: 'Resolve or dispute inaccurate negatives' },
  { label: 'Credit Age', weight: '10%', score: 0, tip: 'Maintain older accounts in good standing' },
  { label: 'Business Credit Readiness', weight: '15%', score: 0, tip: 'Register with business credit bureaus' },
  { label: 'Debt-to-Income Ratio', weight: '15%', score: 0, tip: 'Reduce total debt relative to income' },
];

const FundingReadiness = () => {
  return (
    <div className="space-y-6 pb-8">
      <PageOverview title="Agency Funding Readiness Score" description="Proprietary scoring model evaluating your readiness for capital acquisition" />

      {/* Main Score */}
      <Card className="text-center p-8">
        <div className="inline-flex h-32 w-32 items-center justify-center rounded-full border-4 border-muted bg-muted/30 mx-auto">
          <div>
            <p className="text-4xl font-bold text-muted-foreground">—</p>
            <p className="text-xs text-muted-foreground">/100</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4">Import credit data and complete your profile to calculate your score</p>
      </Card>

      {/* Score Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        {SCORE_FACTORS.map(factor => (
          <Card key={factor.label} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{factor.label}</span>
              <span className="text-xs text-muted-foreground">Weight: {factor.weight}</span>
            </div>
            <Progress value={factor.score} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3 text-prism-teal" />
              {factor.tip}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default FundingReadiness;
