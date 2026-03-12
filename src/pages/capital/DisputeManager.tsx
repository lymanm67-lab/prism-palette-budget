import { FileText, Plus, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageOverview from '@/components/PageOverview';

const DisputeManager = () => {
  return (
    <div className="space-y-6 pb-8">
      <PageOverview title="Dispute Manager" description="Prepare eOSCAR-compatible disputes with FCRA compliance tracking" />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Active Disputes</p>
          <p className="text-2xl font-bold text-prism-amber">0</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Pending Response</p>
          <p className="text-2xl font-bold text-prism-sky">0</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Resolved</p>
          <p className="text-2xl font-bold text-prism-teal">0</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Denied</p>
          <p className="text-2xl font-bold text-prism-rose">0</p>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button><Plus className="h-4 w-4 mr-2" />New Dispute</Button>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-4">
          <Card className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Active Disputes</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create a dispute from Metro2 scanner findings or add one manually
            </p>
            <Button variant="outline"><Plus className="h-4 w-4 mr-2" />Create Dispute</Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DisputeManager;
