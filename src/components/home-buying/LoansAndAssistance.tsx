import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import LoanTypeComparator from './LoanTypeComparator';
import StateAssistancePicker from './StateAssistancePicker';
import AkronDreamsApplication from './AkronDreamsApplication';
import { Landmark, MapPin, FileText } from 'lucide-react';

export default function LoansAndAssistance() {
  const [tab, setTab] = useState('loans');
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="mb-4 flex flex-wrap h-auto w-fit">
        <TabsTrigger value="loans" className="gap-1.5"><Landmark className="h-3.5 w-3.5" />Loan Types</TabsTrigger>
        <TabsTrigger value="assistance" className="gap-1.5"><MapPin className="h-3.5 w-3.5" />State Assistance</TabsTrigger>
        <TabsTrigger value="akron" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Akron Dreams Application & Guide</TabsTrigger>
      </TabsList>
      <TabsContent value="loans"><LoanTypeComparator /></TabsContent>
      <TabsContent value="assistance"><StateAssistancePicker /></TabsContent>
      <TabsContent value="akron"><AkronDreamsApplication /></TabsContent>
    </Tabs>
  );
}
