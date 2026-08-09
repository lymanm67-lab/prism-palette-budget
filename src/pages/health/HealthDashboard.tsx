import { useSearchParams } from 'react-router-dom';
import { HeartPulse, Activity, UtensilsCrossed, MoonStar, LineChart, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import EnergyReportTab from '@/components/health/EnergyReportTab';
import DailyRecapPanel from '@/components/health/DailyRecapPanel';
import MorningKickstartCard from '@/components/health/MorningKickstartCard';
import ConsistencyTrackerCard from '@/components/health/ConsistencyTrackerCard';

type Section = { value: string; label: string; hint: string; render: () => JSX.Element };
type Module = {
  id: string;
  step: number;
  title: string;
  blurb: string;
  icon: typeof Activity;
  sections: Section[];
};

// Five modules replace the old 15-tab strip: pick a module, then a section inside it.
const MODULES: Module[] = [
  {
    id: 'today',
    step: 1,
    title: 'Today',
    blurb: 'Log the day and see where you stand right now.',
    icon: Activity,
    sections: [
      { value: 'dashboard', label: 'Command Center', hint: 'Scores, rings and the daily snapshot.', render: () => <HealthDashboardTab /> },
      { value: 'nutrition', label: 'Nutrition & Water', hint: 'Meals, protein, fiber and hydration.', render: () => <NutritionTab /> },
      { value: 'exercise', label: 'Exercise & Coach Arty', hint: 'Total Gym, stretching, cardio and guided sessions.', render: () => <ExerciseTab /> },
      { value: 'recap', label: 'Daily Recap', hint: 'Sessions by type and how they feed your Weekly Health Score.', render: () => <DailyRecapPanel /> },
      { value: 'energy', label: 'Energy Report', hint: 'Calories in vs out, hydration and weight trend.', render: () => <EnergyReportTab /> },
    ],
  },
  {
    id: 'kitchen',
    step: 2,
    title: 'Kitchen',
    blurb: 'Plan the food and keep the grocery spend in budget.',
    icon: UtensilsCrossed,
    sections: [
      { value: 'prep', label: 'Meal Prep', hint: 'Weekly batch plan and power bowls.', render: () => <MealPrepTab /> },
      { value: 'grocery', label: 'Grocery Budget', hint: 'Spend pulled from your budgets and transactions.', render: () => <GroceryTab /> },
    ],
  },
  {
    id: 'recovery',
    step: 3,
    title: 'Recovery & Care',
    blurb: 'Sleep, recovery and the clinical side of longevity.',
    icon: MoonStar,
    sections: [
      { value: 'sleep', label: 'Sleep & Recovery', hint: 'Sleep hours, quality and recovery signals.', render: () => <SleepRecoveryTab /> },
      { value: 'preventive', label: 'Preventive Care', hint: 'Screenings, labs and the medical document vault.', render: () => <PreventiveCareTab /> },
    ],
  },
  {
    id: 'progress',
    step: 4,
    title: 'Progress',
    blurb: 'Milestones, trends and how health compounds into wealth.',
    icon: LineChart,
    sections: [
      { value: 'milestones', label: 'Milestones', hint: 'Weight goal pacing and achievements.', render: () => <MilestonesTab /> },
      { value: 'trends', label: 'Trends', hint: 'Long-run charts across every metric.', render: () => <TrendsTab /> },
      { value: 'productivity', label: 'Performance', hint: 'Focus, energy and output vs habits.', render: () => <ProductivityTab /> },
      { value: 'longevity', label: 'Longevity Dividend', hint: 'Health-adjusted horizon and combined Legacy Score.', render: () => <LongevityTab /> },
    ],
  },
  {
    id: 'setup',
    step: 5,
    title: 'Coach & Setup',
    blurb: 'Your AI coach, imports and personal baseline.',
    icon: Sparkles,
    sections: [
      { value: 'coach', label: 'AI Coach', hint: 'Narrative guidance on your latest data.', render: () => <HealthCoachTab /> },
      { value: 'import', label: 'Import (Apple Health)', hint: 'Bring in export.xml activity and vitals.', render: () => <HealthImportTab /> },
      { value: 'profile', label: 'Profile', hint: 'Age, weight goal, targets and preferences.', render: () => <HealthProfileTab /> },
    ],
  },
];

const ALL_SECTIONS = MODULES.flatMap((m) => m.sections.map((s) => ({ ...s, moduleId: m.id })));

export default function HealthDashboard() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab') ?? 'dashboard';
  const active = ALL_SECTIONS.find((s) => s.value === requested) ?? ALL_SECTIONS[0];
  const activeModule = MODULES.find((m) => m.id === active.moduleId) ?? MODULES[0];

  const go = (value: string) => setParams({ tab: value });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <HeartPulse className="h-6 w-6 text-prism-rose" />
          Health, Wellness &amp; Longevity
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Five modules, one flow: log today, plan the kitchen, protect recovery, track progress, then let the
          coach tune it.
        </p>
      </header>

      {/* Module rail */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {MODULES.map((m) => {
          const Icon = m.icon;
          const isActive = m.id === activeModule.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => go(m.sections[0].value)}
              className={cn(
                'rounded-xl border bg-card/60 p-4 text-left transition-colors hover:border-primary/50',
                isActive && 'border-primary bg-primary/10',
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold',
                    isActive ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground',
                  )}
                >
                  {m.step}
                </span>
                <Icon className={cn('h-4 w-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
                <span className="text-sm font-semibold">{m.title}</span>
              </div>
              <p className="mt-2 text-xs leading-snug text-muted-foreground">{m.blurb}</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <aside className="order-first space-y-4 lg:order-last lg:sticky lg:top-4 lg:self-start">
          <MorningKickstartCard />
          <ConsistencyTrackerCard />
        </aside>

        <div className="min-w-0 space-y-4">
          {/* Sections inside the active module only */}
          <Card>
            <CardContent className="flex flex-wrap items-center gap-2 p-3">
              {activeModule.sections.map((s) => (
                <Button
                  key={s.value}
                  size="sm"
                  variant={s.value === active.value ? 'default' : 'ghost'}
                  onClick={() => go(s.value)}
                >
                  {s.label}
                </Button>
              ))}
            </CardContent>
          </Card>

          <div>
            <h2 className="text-lg font-semibold">{active.label}</h2>
            <p className="text-sm text-muted-foreground">{active.hint}</p>
          </div>

          <div>{active.render()}</div>
        </div>
      </div>
    </div>
  );
}
