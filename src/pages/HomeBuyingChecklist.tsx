import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Home, Bot, GitCompare, Calculator, Landmark, MapPin, Search, CheckCircle2 } from 'lucide-react';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PageOverview from '@/components/PageOverview';
import ReadinessHero from '@/components/home-buying/ReadinessHero';
import AiHomeBuyingCoach from '@/components/home-buying/AiHomeBuyingCoach';
import HomeBuyingScenarios from '@/components/home-buying/HomeBuyingScenarios';
import HomeBuyingCalculators from '@/components/home-buying/HomeBuyingCalculators';
import LoanTypeComparator from '@/components/home-buying/LoanTypeComparator';
import StateAssistancePicker from '@/components/home-buying/StateAssistancePicker';
import HomeSearchPanel from '@/components/home-buying/HomeSearchPanel';
import HomeBuyingChecklistTab from '@/components/home-buying/HomeBuyingChecklistTab';

const HomeBuyingChecklist = () => {
  const { household } = useHousehold();
  const [tab, setTab] = useState('coach');

  const { data: checklist } = useQuery({
    queryKey: ['homebuyer_checklist', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase.from('homebuyer_checklist').select('*').eq('household_id', household!.id);
      if (error) throw error;
      return data;
    },
  });

  const checklistPct = ((checklist?.filter((p) => p.is_checked).length ?? 0) / 8) * 100;

  const TABS = [
    { id: 'coach', label: 'AI Coach', icon: Bot },
    { id: 'scenarios', label: 'Scenarios', icon: GitCompare },
    { id: 'calculators', label: 'Calculators', icon: Calculator },
    { id: 'loans', label: 'Loan Types', icon: Landmark },
    { id: 'assistance', label: 'State Assistance', icon: MapPin },
    { id: 'search', label: 'Home Search', icon: Search },
    { id: 'checklist', label: 'Checklist', icon: CheckCircle2 },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            <span className="prism-gradient-text">Home-Buying Readiness</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Plan, simulate, and prepare — from down payment to closing.
          </p>
          <PageOverview
            title="Home-Buying Readiness"
            description="A complete toolkit: AI coach, scenario comparison, calculators, loan types, state assistance, home search, and the original 8-question checklist."
            icon={Home}
            iconColor="text-prism-amber"
            ttsScript="The Home-Buying Readiness page is a full toolkit for getting ready to buy a home. Use the AI Coach for a personalized report, compare mortgage scenarios side by side, run calculators for down payment, closing costs, hidden costs, and credit impact. Compare loan types, find your state's down payment assistance programs, search homes, and run through the 8 readiness questions."
            features={['AI-guided readiness coach', 'Side-by-side scenario compare', '4 financial calculators', 'Loan type comparison', '50-state DPA lookup', 'Live home search']}
            demoData={[
              { label: 'Readiness', value: '72%', badge: 'Almost ready', color: '#22c55e' },
              { label: 'Down Payment', value: '$42k', badge: '12%', color: '#14b8a6' },
              { label: 'Best Loan', value: 'FHA', badge: 'First-time', color: '#f59e0b' },
              { label: 'Programs', value: '4 in FL', badge: 'Eligible', color: '#3b82f6' },
            ]}
          />
        </div>
      </div>

      <ReadinessHero
        checklistPct={checklistPct}
        metrics={[
          { label: 'Down Payment', value: '—', pct: 0, color: 'prism-teal' },
          { label: 'Credit', value: '—', pct: 0, color: 'prism-amber' },
          { label: 'DTI', value: '—', pct: 0, color: 'prism-indigo' },
          { label: 'Emergency Fund', value: '—', pct: 0, color: 'prism-orange' },
        ]}
      />

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 h-auto p-1 gap-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.id} value={t.id} className="flex flex-col sm:flex-row gap-1 sm:gap-1.5 text-xs py-2">
                <Icon className="h-3.5 w-3.5" />
                <span>{t.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="coach" className="mt-4"><AiHomeBuyingCoach /></TabsContent>
        <TabsContent value="scenarios" className="mt-4"><HomeBuyingScenarios /></TabsContent>
        <TabsContent value="calculators" className="mt-4"><HomeBuyingCalculators /></TabsContent>
        <TabsContent value="loans" className="mt-4"><LoanTypeComparator /></TabsContent>
        <TabsContent value="assistance" className="mt-4"><StateAssistancePicker /></TabsContent>
        <TabsContent value="search" className="mt-4"><HomeSearchPanel /></TabsContent>
        <TabsContent value="checklist" className="mt-4"><HomeBuyingChecklistTab /></TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default HomeBuyingChecklist;
