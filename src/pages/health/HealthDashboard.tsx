import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HeartPulse } from 'lucide-react';
import HealthDashboardTab from '@/components/health/HealthDashboardTab';
import NutritionTab from '@/components/health/NutritionTab';
import MealPrepTab from '@/components/health/MealPrepTab';
import GroceryTab from '@/components/health/GroceryTab';
import MilestonesTab from '@/components/health/MilestonesTab';
import TrendsTab from '@/components/health/TrendsTab';
import ProductivityTab from '@/components/health/ProductivityTab';
import LongevityTab from '@/components/health/LongevityTab';
import HealthCoachTab from '@/components/health/HealthCoachTab';
import HealthProfileTab from '@/components/health/HealthProfileTab';
import HealthImportTab from '@/components/health/HealthImportTab';
import SleepRecoveryTab from '@/components/health/SleepRecoveryTab';
import PreventiveCareTab from '@/components/health/PreventiveCareTab';
import ExerciseTab from '@/components/health/ExerciseTab';

const TABS = [
  { value: 'dashboard', label: 'Command Center' },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'prep', label: 'Meal Prep' },
  { value: 'grocery', label: 'Grocery Budget' },
  { value: 'exercise', label: 'Exercise (Total Gym)' },
  { value: 'sleep', label: 'Sleep & Recovery' },
  { value: 'preventive', label: 'Preventive Care' },
  { value: 'milestones', label: 'Milestones' },
  { value: 'trends', label: 'Trends' },
  { value: 'productivity', label: 'Performance' },
  { value: 'longevity', label: 'Longevity' },
  { value: 'coach', label: 'AI Coach' },
  { value: 'import', label: 'Import (Apple Health)' },
  { value: 'profile', label: 'Profile' },
];


export default function HealthDashboard() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'dashboard';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <HeartPulse className="h-6 w-6 text-prism-rose" />
          Health, Wellness &amp; Longevity
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your health is a portfolio. Daily deposits compound into weight loss, energy, productivity and
          lower lifetime healthcare cost.
        </p>
      </header>

      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v })}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <HealthDashboardTab />
        </TabsContent>
        <TabsContent value="nutrition" className="mt-6">
          <NutritionTab />
        </TabsContent>
        <TabsContent value="prep" className="mt-6">
          <MealPrepTab />
        </TabsContent>
        <TabsContent value="grocery" className="mt-6">
          <GroceryTab />
        </TabsContent>
        <TabsContent value="exercise" className="mt-6">
          <ExerciseTab />
        </TabsContent>
        <TabsContent value="sleep" className="mt-6">
          <SleepRecoveryTab />
        </TabsContent>
        <TabsContent value="preventive" className="mt-6">
          <PreventiveCareTab />
        </TabsContent>

        <TabsContent value="milestones" className="mt-6">
          <MilestonesTab />
        </TabsContent>
        <TabsContent value="trends" className="mt-6">
          <TrendsTab />
        </TabsContent>
        <TabsContent value="productivity" className="mt-6">
          <ProductivityTab />
        </TabsContent>
        <TabsContent value="longevity" className="mt-6">
          <LongevityTab />
        </TabsContent>
        <TabsContent value="coach" className="mt-6">
          <HealthCoachTab />
        </TabsContent>
        <TabsContent value="import" className="mt-6">
          <HealthImportTab />
        </TabsContent>
        <TabsContent value="profile" className="mt-6">
          <HealthProfileTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
