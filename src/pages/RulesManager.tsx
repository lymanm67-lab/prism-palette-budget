import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { History, ListChecks, Settings2, Wand2 } from 'lucide-react';
import { RulesList } from '@/components/cleanup/RulesList';
import { RuleRunner } from '@/components/cleanup/RuleRunner';

export default function RulesManager() {
  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings2 className="h-6 w-6 text-prism-teal" />
            Import Rules
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the merchant naming and category rules used during imports, then re-run them across your history.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/cleanup/audit"><History className="mr-2 h-4 w-4" />Audit trail</Link>
        </Button>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules"><ListChecks className="mr-2 h-4 w-4" />My rules</TabsTrigger>
          <TabsTrigger value="rerun"><Wand2 className="mr-2 h-4 w-4" />Re-run rules</TabsTrigger>
        </TabsList>
        <TabsContent value="rules" className="mt-4"><RulesList /></TabsContent>
        <TabsContent value="rerun" className="mt-4"><RuleRunner /></TabsContent>
      </Tabs>
    </div>
  );
}
