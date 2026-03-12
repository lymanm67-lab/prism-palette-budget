import { useState } from 'react';
import { Upload, FileText, Shield, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageOverview from '@/components/PageOverview';

const BUREAUS = ['Equifax', 'Experian', 'TransUnion'] as const;

const CreditOverview = () => {
  const [accounts] = useState<any[]>([]);

  return (
    <div className="space-y-6 pb-8">
      <PageOverview title="Credit Overview" description="Import and analyze credit reports from all three major bureaus" icon={Shield} ttsScript="Import and analyze credit reports from all three major bureaus." features={['Upload PDF, CSV, or JSON', 'Equifax, Experian, TransUnion', 'Structured account dashboard']} />

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5 text-prism-teal" />
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
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Upload Report
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

      {/* Accounts Table Placeholder */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Accounts</TabsTrigger>
          {BUREAUS.map(b => <TabsTrigger key={b} value={b}>{b}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="all" className="mt-4">
          {accounts.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold text-lg mb-2">No Credit Reports Imported</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload a credit report or manually enter account details to get started
              </p>
              <Button><Plus className="h-4 w-4 mr-2" />Add Account Manually</Button>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CreditOverview;
