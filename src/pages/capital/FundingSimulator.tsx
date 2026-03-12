import { BarChart3, Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PageOverview from '@/components/PageOverview';

const FUNDING_OPTIONS = [
  { name: 'Receivable Factoring', description: 'Sell outstanding Medicaid receivables at a discount for immediate cash', pros: ['Fast access to cash', 'No debt added'], cons: ['Reduced total revenue', 'Ongoing cost'] },
  { name: 'Payroll Bridge Loan', description: 'Short-term loan specifically for covering payroll gaps', pros: ['Keeps staff paid', 'Quick approval'], cons: ['Interest costs', 'Short repayment window'] },
  { name: 'Working Capital Loan', description: 'General purpose loan for operational expenses', pros: ['Flexible use', 'Predictable payments'], cons: ['Requires credit history', 'Monthly obligation'] },
  { name: 'Equipment Financing', description: 'Financing for agency equipment and technology', pros: ['Equipment as collateral', 'Tax benefits'], cons: ['Tied to specific purchases', 'Depreciation risk'] },
];

const FundingSimulator = () => {
  return (
    <div className="space-y-6 pb-8">
      <PageOverview title="Funding Scenario Simulator" description="Compare financing options and their impact on cash flow" icon={BarChart3} ttsScript="Compare financing options and their impact on cash flow." features={['Receivable factoring simulation', 'Bridge loan modeling', 'Working capital analysis']} />

      <div className="grid gap-4 md:grid-cols-2">
        {FUNDING_OPTIONS.map(option => (
          <Card key={option.name} className="hover:border-primary/30 cursor-pointer transition-colors">
            <CardHeader>
              <CardTitle className="text-base">{option.name}</CardTitle>
              <CardDescription className="text-xs">{option.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-medium text-prism-teal mb-1">Advantages</p>
                <ul className="space-y-1">
                  {option.pros.map(p => <li key={p} className="text-xs text-muted-foreground">• {p}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium text-prism-rose mb-1">Considerations</p>
                <ul className="space-y-1">
                  {option.cons.map(c => <li key={c} className="text-xs text-muted-foreground">• {c}</li>)}
                </ul>
              </div>
              <Badge variant="outline" className="text-[10px]">Click to simulate</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default FundingSimulator;
