import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LayoutDashboard, GanttChart, CalendarClock, ListChecks, ClipboardList, ShieldCheck, GitCompare, FileDown } from 'lucide-react';
import { useHpProject } from '@/hooks/use-hp-planner';
import PlannerOnboarding from './PlannerOnboarding';
import ExecutiveDashboard from './ExecutiveDashboard';
import MonthlyView from './MonthlyView';
import WorksheetsIndex from './WorksheetsIndex';
import RulesEngine from './RulesEngine';
import ExportCenter from './ExportCenter';
import TimelineViews from './TimelineViews';
import TasksMasterList from './TasksMasterList';
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
    { id: 'tasks', label: 'Tasks', icon: ListChecks },
    { id: 'worksheets', label: 'Worksheets', icon: ClipboardList },
    { id: 'rules', label: 'Rules & Risks', icon: ShieldCheck },
    { id: 'scenarios', label: 'Scenarios', icon: GitCompare },
  ];

  return (
    <div id="planner-print-root" className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-start gap-2">
          <TabsList className="flex-1 w-full grid grid-cols-3 sm:grid-cols-7 h-auto p-1 gap-1">
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
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
                <FileDown className="h-3.5 w-3.5" />
                Export
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Export center</DialogTitle></DialogHeader>
              <ExportCenter projectId={project.id} project={project} />
            </DialogContent>
          </Dialog>
        </div>

        <TabsContent value="dashboard" className="mt-4"><ExecutiveDashboard project={project} onNavigate={setTab} /></TabsContent>
        <TabsContent value="timeline" className="mt-4">
          <TimelineViews projectId={project.id} onSelectMonth={(i) => { setMonthIndex(i); setTab('monthly'); }} />
        </TabsContent>
        <TabsContent value="monthly" className="mt-4">
          <div id="monthly-view-root">
            <MonthlyView projectId={project.id} monthIndex={monthIndex} onChangeMonth={setMonthIndex} />
          </div>
        </TabsContent>
        <TabsContent value="worksheets" className="mt-4"><WorksheetsIndex projectId={project.id} /></TabsContent>
        <TabsContent value="rules" className="mt-4"><RulesEngine projectId={project.id} /></TabsContent>
        <TabsContent value="scenarios" className="mt-4"><HomeBuyingScenarios /></TabsContent>
      </Tabs>
    </div>
  );
}
