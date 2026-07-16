import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LayoutDashboard, GanttChart, CalendarClock, ClipboardList, ShieldCheck, GitCompare, Kanban, Calendar, AlertOctagon, FileDown } from 'lucide-react';
import { useHpProject } from '@/hooks/use-hp-planner';
import PlannerOnboarding from './PlannerOnboarding';
import ExecutiveDashboard from './ExecutiveDashboard';
import MasterTimeline from './MasterTimeline';
import MonthlyView from './MonthlyView';
import WorksheetsIndex from './WorksheetsIndex';
import RulesEngine from './RulesEngine';
import ExportCenter from './ExportCenter';
import { KanbanView, CalendarView, CriticalPathView } from './ProjectViews';
import HomeBuyingScenarios from '@/components/home-buying/HomeBuyingScenarios';

export default function PlannerRoot() {
  const { data: project, isLoading } = useHpProject();
  const [tab, setTab] = useState('dashboard');
  const [monthIndex, setMonthIndex] = useState(0);

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading planner…</div>;
  if (!project) return <PlannerOnboarding />;

  const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'timeline', label: 'Timeline', icon: GanttChart },
    { id: 'monthly', label: 'Monthly', icon: CalendarClock },
    { id: 'worksheets', label: 'Worksheets', icon: ClipboardList },
    { id: 'rules', label: 'Rules', icon: ShieldCheck },
    { id: 'scenarios', label: 'Scenarios', icon: GitCompare },
    { id: 'kanban', label: 'Kanban', icon: Kanban },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'critical', label: 'Critical Path', icon: AlertOctagon },
    { id: 'exports', label: 'Exports', icon: FileDown },
  ];

  return (
    <div id="planner-print-root" className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 h-auto p-1 gap-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.id} value={t.id} className="flex flex-col sm:flex-row gap-1 sm:gap-1.5 text-[11px] py-2">
                <Icon className="h-3 w-3" />
                <span>{t.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="dashboard" className="mt-4"><ExecutiveDashboard project={project} /></TabsContent>
        <TabsContent value="timeline" className="mt-4">
          <MasterTimeline projectId={project.id} onSelectMonth={(i) => { setMonthIndex(i); setTab('monthly'); }} />
        </TabsContent>
        <TabsContent value="monthly" className="mt-4">
          <div id="monthly-view-root">
            <MonthlyView projectId={project.id} monthIndex={monthIndex} onChangeMonth={setMonthIndex} />
          </div>
        </TabsContent>
        <TabsContent value="worksheets" className="mt-4"><WorksheetsIndex projectId={project.id} /></TabsContent>
        <TabsContent value="rules" className="mt-4"><RulesEngine projectId={project.id} /></TabsContent>
        <TabsContent value="scenarios" className="mt-4"><HomeBuyingScenarios /></TabsContent>
        <TabsContent value="kanban" className="mt-4"><KanbanView projectId={project.id} /></TabsContent>
        <TabsContent value="calendar" className="mt-4"><CalendarView projectId={project.id} /></TabsContent>
        <TabsContent value="critical" className="mt-4"><CriticalPathView projectId={project.id} /></TabsContent>
        <TabsContent value="exports" className="mt-4"><ExportCenter projectId={project.id} project={project} /></TabsContent>
      </Tabs>
    </div>
  );
}
