import { DollarSign, Plus, Clock, CheckCircle2, XCircle, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PageOverview from '@/components/PageOverview';

const Receivables = () => {
  return (
    <div className="space-y-6 pb-8">
      <PageOverview title="Medicaid Receivable Pipeline" description="Track claims status and forecast reimbursement timing" />

      {/* Pipeline Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Send className="h-4 w-4 text-prism-sky" />
            <p className="text-xs text-muted-foreground">Submitted</p>
          </div>
          <p className="text-2xl font-bold">0</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-prism-amber" />
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <p className="text-2xl font-bold">0</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-prism-teal" />
            <p className="text-xs text-muted-foreground">Approved</p>
          </div>
          <p className="text-2xl font-bold">$0</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="h-4 w-4 text-prism-rose" />
            <p className="text-xs text-muted-foreground">Denied</p>
          </div>
          <p className="text-2xl font-bold">0</p>
        </Card>
      </div>

      {/* Pipeline Value */}
      <Card className="p-6 text-center">
        <p className="text-xs text-muted-foreground mb-1">Total Receivable Pipeline Value</p>
        <p className="text-3xl font-bold text-prism-teal">$0.00</p>
        <p className="text-xs text-muted-foreground mt-2">Average reimbursement cycle: — days</p>
      </Card>

      {/* Payment Predictor */}
      <Card className="p-6">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-lg">Medicaid Payment Predictor</CardTitle>
        </CardHeader>
        <div className="text-center py-8">
          <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-sm text-muted-foreground">Add claims to see predicted payment dates and delay probability</p>
          <Button className="mt-4"><Plus className="h-4 w-4 mr-2" />Add Claim</Button>
        </div>
      </Card>
    </div>
  );
};

export default Receivables;
