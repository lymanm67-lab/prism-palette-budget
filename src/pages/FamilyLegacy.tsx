import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { HundredYearSimulator } from '@/components/legacy/HundredYearSimulator';
import { FamilyConstitutionWizard } from '@/components/legacy/FamilyConstitutionWizard';
import { EstateChecklist } from '@/components/legacy/EstateChecklist';
import { TrustDashboard } from '@/components/legacy/TrustDashboard';
import { TrustPhilosophy } from '@/components/legacy/TrustPhilosophy';
import { LegacyLetterEditor } from '@/components/legacy/LegacyLetterEditor';
import { EthicalWillEditor } from '@/components/legacy/EthicalWillEditor';
import { AnnualMeetingPlanner } from '@/components/legacy/AnnualMeetingPlanner';
import { Heart, ScrollText, ShieldCheck, TrendingUp, Users, PenLine, BookHeart, CalendarDays, Landmark } from 'lucide-react';
import { PageExplainer } from '@/components/PageExplainer';
import { LegacyStepNav } from '@/components/legacy/LegacyStepNav';

export default function FamilyLegacy() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'trust';
  const validTab = ['trust', 'philosophy', 'estate', 'constitution', 'letters', 'ethical', 'meeting', 'simulator'].includes(defaultTab) ? defaultTab : 'trust';
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

      <PageExplainer
        title="How to use the Family Legacy Suite"
        sections={[
          {
            heading: 'Seven tools, one journey',
            body: (
              <ul className="list-disc pl-5 space-y-1">
                <li><b className="text-foreground">Trust</b> — fund a revocable/irrevocable trust; track assets and funding target.</li>
                <li><b className="text-foreground">Trust Philosophy</b> — the Lyman Montgomery Family Trust intent statement, values, and trustee expectations.</li>
                <li><b className="text-foreground">Estate</b> — will, POA, healthcare directive, beneficiary audit.</li>
                <li><b className="text-foreground">Constitution</b> — AI-drafted family values, decision rules, money principles.</li>
                <li><b className="text-foreground">Letters</b> — legacy letters to heirs; upload or draft with AI; save to Trust Vault.</li>
                <li><b className="text-foreground">Ethical Will</b> — pass down values and stories (not legal — the heart-version).</li>
                <li><b className="text-foreground">Annual Meeting</b> — agenda, minutes, printable packet for the yearly family meeting.</li>
                <li><b className="text-foreground">100-Year Simulator</b> — Monte Carlo of wealth across 3 generations.</li>
              </ul>
            ),
          },
          {
            heading: 'Suggested order',
            body: (
              <p>
                Estate → Trust → Constitution → Letters/Ethical Will → Annual Meeting → 100-Year Simulator.
                Complete the legal foundation first, then the human documents, then the recurring cadence.
              </p>
            ),
          },
          {
            heading: 'Example',
            body: (
              <p>
                Draft the Family Constitution (AI assist) → export clean PDF → sign at the Annual Meeting →
                store in Montgomery Family Trust Vault. Repeat yearly.
              </p>
            ),
          },
        ]}
      />

      <Tabs defaultValue={validTab}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="trust"><ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Trust</TabsTrigger>
          <TabsTrigger value="philosophy"><Landmark className="h-3.5 w-3.5 mr-1.5" /> Trust Philosophy</TabsTrigger>
          <TabsTrigger value="estate"><Users className="h-3.5 w-3.5 mr-1.5" /> Estate</TabsTrigger>
          <TabsTrigger value="constitution"><ScrollText className="h-3.5 w-3.5 mr-1.5" /> Constitution</TabsTrigger>
          <TabsTrigger value="letters"><PenLine className="h-3.5 w-3.5 mr-1.5" /> Letters</TabsTrigger>
          <TabsTrigger value="ethical"><BookHeart className="h-3.5 w-3.5 mr-1.5" /> Ethical Will</TabsTrigger>
          <TabsTrigger value="meeting"><CalendarDays className="h-3.5 w-3.5 mr-1.5" /> Annual Meeting</TabsTrigger>
          <TabsTrigger value="simulator"><TrendingUp className="h-3.5 w-3.5 mr-1.5" /> 100-Year</TabsTrigger>
        </TabsList>
        <TabsContent value="trust" className="mt-4"><TrustDashboard /></TabsContent>
        <TabsContent value="philosophy" className="mt-4"><TrustPhilosophy /></TabsContent>
        <TabsContent value="estate" className="mt-4"><EstateChecklist /></TabsContent>
        <TabsContent value="constitution" className="mt-4"><FamilyConstitutionWizard /></TabsContent>
        <TabsContent value="letters" className="mt-4"><LegacyLetterEditor /></TabsContent>
        <TabsContent value="ethical" className="mt-4"><EthicalWillEditor /></TabsContent>
        <TabsContent value="meeting" className="mt-4"><AnnualMeetingPlanner /></TabsContent>
        <TabsContent value="simulator" className="mt-4"><HundredYearSimulator /></TabsContent>
      </Tabs>
      <LegacyStepNav />
    </div>
  );
}
