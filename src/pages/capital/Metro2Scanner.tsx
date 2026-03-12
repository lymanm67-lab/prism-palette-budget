import { FileSearch, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PageOverview from '@/components/PageOverview';

const Metro2Scanner = () => {
  return (
    <div className="space-y-6 pb-8">
      <PageOverview title="Metro2 Risk Scanner" description="AI-powered compliance analysis against Metro2 reporting standards" icon={FileSearch} ttsScript="AI-powered Metro2 compliance analysis." features={['Detect reporting inconsistencies', 'Severity classification', 'Recommended dispute actions']} />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">High Severity Issues</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-prism-amber/20 bg-prism-amber/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Info className="h-8 w-8 text-prism-amber" />
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Medium Severity</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-prism-teal/20 bg-prism-teal/5">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-prism-teal" />
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Accounts Compliant</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scan Results */}
      <Card className="p-12 text-center">
        <FileSearch className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
        <h3 className="font-semibold text-lg mb-2">No Accounts to Scan</h3>
        <p className="text-sm text-muted-foreground">
          Import credit report data in the Credit Overview module to run the Metro2 compliance scanner
        </p>
      </Card>
    </div>
  );
};

export default Metro2Scanner;
