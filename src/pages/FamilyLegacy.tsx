import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { HundredYearSimulator } from '@/components/legacy/HundredYearSimulator';
import { FamilyConstitutionWizard } from '@/components/legacy/FamilyConstitutionWizard';
import { EstateChecklist } from '@/components/legacy/EstateChecklist';
import { TrustDashboard } from '@/components/legacy/TrustDashboard';
import { Heart, ScrollText, ShieldCheck, TrendingUp, Users } from 'lucide-react';

export default function FamilyLegacy() {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Heart className="h-7 w-7 text-prism-amber" />
          Montgomery Family Legacy Suite
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Intentionally create, preserve, and transfer wealth across generations.
        </p>
        <div className="rounded-md border border-border/40 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground mt-3">
          Educational planning only. Not legal, tax, or investment advice — consult qualified professionals.
        </div>
      </div>

      <Tabs defaultValue="trust">
        <TabsList className="grid grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="trust"><ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Trust</TabsTrigger>
          <TabsTrigger value="estate"><Users className="h-3.5 w-3.5 mr-1.5" /> Estate</TabsTrigger>
          <TabsTrigger value="constitution"><ScrollText className="h-3.5 w-3.5 mr-1.5" /> Constitution</TabsTrigger>
          <TabsTrigger value="simulator"><TrendingUp className="h-3.5 w-3.5 mr-1.5" /> 100-Year</TabsTrigger>
        </TabsList>
        <TabsContent value="trust" className="mt-4"><TrustDashboard /></TabsContent>
        <TabsContent value="estate" className="mt-4"><EstateChecklist /></TabsContent>
        <TabsContent value="constitution" className="mt-4"><FamilyConstitutionWizard /></TabsContent>
        <TabsContent value="simulator" className="mt-4"><HundredYearSimulator /></TabsContent>
      </Tabs>
    </div>
  );
}
