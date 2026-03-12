import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import PageOverview from '@/components/PageOverview';

const RISK_FACTORS = [
  { label: 'Cash Flow Stability', weight: '25%', score: 0 },
  { label: 'Payroll Coverage', weight: '20%', score: 0 },
  { label: 'Client Census Trends', weight: '20%', score: 0 },
  { label: 'Claim Approval Rates', weight: '20%', score: 0 },
  { label: 'Compliance Readiness', weight: '15%', score: 0 },
];

const SurvivalIndex = () => {
  return (
    <div className="space-y-6 pb-8">
      <PageOverview title="DODD Agency Survival Index" description="Predictive health score for agency sustainability" icon={Activity} ttsScript="Predictive health score for agency sustainability." features={['Cash flow stability analysis', 'Client census tracking', 'Compliance readiness scoring']} />

      {/* Main Score */}
      <Card className="text-center p-8">
        <div className="inline-flex h-32 w-32 items-center justify-center rounded-full border-4 border-muted bg-muted/30 mx-auto">
          <div>
            <p className="text-4xl font-bold text-muted-foreground">—</p>
            <p className="text-xs text-muted-foreground">/100</p>
          </div>
        </div>
        <Badge variant="outline" className="mt-4">Risk Level: Unknown</Badge>
        <p className="text-sm text-muted-foreground mt-2">Complete agency financial data to calculate your survival index</p>
      </Card>

      {/* Breakdown */}
      <div className="space-y-3">
        {RISK_FACTORS.map(f => (
          <Card key={f.label} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{f.label}</span>
              <span className="text-xs text-muted-foreground">Weight: {f.weight}</span>
            </div>
            <Progress value={f.score} className="h-2" />
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SurvivalIndex;
