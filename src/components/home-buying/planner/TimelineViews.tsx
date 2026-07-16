import { useState } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { GanttChart, Kanban, Calendar, AlertOctagon } from 'lucide-react';
import MasterTimeline from './MasterTimeline';
import { KanbanView, CalendarView, CriticalPathView } from './ProjectViews';

interface Props {
  projectId: string;
  onSelectMonth: (i: number) => void;
}

export default function TimelineViews({ projectId, onSelectMonth }: Props) {
  const [view, setView] = useState<'gantt' | 'kanban' | 'calendar' | 'critical'>('gantt');
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">View</div>
        <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as any)} size="sm">
          <ToggleGroupItem value="gantt" className="gap-1.5 text-xs"><GanttChart className="h-3.5 w-3.5" />Gantt</ToggleGroupItem>
          <ToggleGroupItem value="kanban" className="gap-1.5 text-xs"><Kanban className="h-3.5 w-3.5" />Kanban</ToggleGroupItem>
          <ToggleGroupItem value="calendar" className="gap-1.5 text-xs"><Calendar className="h-3.5 w-3.5" />Calendar</ToggleGroupItem>
          <ToggleGroupItem value="critical" className="gap-1.5 text-xs"><AlertOctagon className="h-3.5 w-3.5" />Critical Path</ToggleGroupItem>
        </ToggleGroup>
      </div>
      {view === 'gantt' && <MasterTimeline projectId={projectId} onSelectMonth={onSelectMonth} />}
      {view === 'kanban' && <KanbanView projectId={projectId} />}
      {view === 'calendar' && <CalendarView projectId={projectId} />}
      {view === 'critical' && <CriticalPathView projectId={projectId} />}
    </div>
  );
}
