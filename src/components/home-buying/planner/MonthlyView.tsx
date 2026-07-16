import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, ChevronRight, Sparkles, Plus, FileText, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useHpMilestones, useHpTasks, useUpdateTask, useAddTask, useHpDocuments, useUpdateDocument, useHpRisks, useHpNotes, useAddNote, useHpCoach } from '@/hooks/use-hp-planner';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';

export default function MonthlyView({ projectId, monthIndex, onChangeMonth }: { projectId: string; monthIndex: number; onChangeMonth: (i: number) => void }) {
  const { household } = useHousehold();
  const { data: milestones = [] } = useHpMilestones(projectId);
  const { data: tasks = [] } = useHpTasks(projectId);
  const { data: docs = [] } = useHpDocuments(projectId);
  const { data: risks = [] } = useHpRisks(projectId);
  const { data: notes = [] } = useHpNotes(projectId, monthIndex);
  const updateTask = useUpdateTask();
  const addTask = useAddTask();
  const updateDoc = useUpdateDocument();
  const addNote = useAddNote();

  const milestone = milestones.find((m: any) => m.month_index === monthIndex);
  const monthTasks = tasks.filter((t: any) => t.milestone_id === milestone?.id);
  const narrativeKey = `month_${monthIndex}_narrative`;
  const narrative = useHpCoach(projectId, narrativeKey, monthIndex);
  const decisions = useHpCoach(projectId, `decisions_${monthIndex}`, monthIndex);
  const readiness = useHpCoach(projectId, `readiness_${monthIndex}`, monthIndex);

  const [newTask, setNewTask] = useState('');
  const [newNote, setNewNote] = useState({ title: '', body: '', category: 'journal' });

  const grouped = useMemo(() => {
    const g: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [] };
    monthTasks.forEach((t: any) => { (g[t.week_index] || (g[t.week_index] = [])).push(t); });
    return g;
  }, [monthTasks]);

  if (!milestone) {
    return <div className="text-sm text-muted-foreground">No milestone for this month.</div>;
  }

  const done = monthTasks.filter((t: any) => t.status === 'complete').length;
  const pct = monthTasks.length ? Math.round((done / monthTasks.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="prism-card-shine border-border/50">
        <CardContent className="p-4 flex items-center justify-between">
          <Button size="sm" variant="outline" disabled={monthIndex === 0} onClick={() => onChangeMonth(monthIndex - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{milestone.month_label} · Month {monthIndex + 1}</div>
            <div className="font-display text-2xl font-extrabold prism-gradient-text">{milestone.title}</div>
            <div className="text-xs text-muted-foreground mt-1">{done} / {monthTasks.length} tasks complete · {pct}%</div>
          </div>
          <Button size="sm" variant="outline" disabled={monthIndex >= milestones.length - 1} onClick={() => onChangeMonth(monthIndex + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Section A: Narrative */}
      <Card className="prism-card-shine border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-prism-amber" />
            Why This Month Matters (AI Coach)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {narrative.isLoading ? (
            <p className="text-sm text-muted-foreground">Generating month narrative…</p>
          ) : narrative.data?.content_md ? (
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown>{narrative.data.content_md}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{milestone.description}</p>
          )}
        </CardContent>
      </Card>

      {/* Section B/C: Weekly Action Plan */}
      <Card className="prism-card-shine border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-sm">Weekly Action Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((w) => (
            <div key={w}>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">Week {w}</div>
              <div className="space-y-1">
                {(grouped[w] || []).map((t: any) => (
                  <div key={t.id} className="flex items-center gap-2 rounded-md border border-border/30 bg-card/30 px-3 py-1.5">
                    <Checkbox
                      checked={t.status === 'complete'}
                      onCheckedChange={(v) => updateTask.mutate({ id: t.id, patch: { status: v ? 'complete' : 'pending', completed_at: v ? new Date().toISOString() : null } })}
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm truncate ${t.status === 'complete' ? 'line-through text-muted-foreground' : ''}`}>{t.title}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{t.priority}</Badge>
                    {t.due_date && (
                      <div className="text-[10px] text-muted-foreground">{new Date(t.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                    )}
                  </div>
                ))}
                {(grouped[w] || []).length === 0 && (
                  <div className="text-xs text-muted-foreground italic px-3">No tasks this week</div>
                )}
              </div>
            </div>
          ))}

          <div className="flex gap-2 pt-2 border-t border-border/30">
            <Input placeholder="Add a task…" value={newTask} onChange={(e) => setNewTask(e.target.value)} className="h-8" />
            <Button
              size="sm"
              onClick={() => {
                if (!newTask.trim() || !milestone || !household) return;
                addTask.mutate({
                  milestone_id: milestone.id,
                  project_id: projectId,
                  household_id: household.id,
                  week_index: 1,
                  title: newTask.trim(),
                  priority: 'medium',
                }, {
                  onSuccess: () => { setNewTask(''); toast.success('Task added'); },
                });
              }}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Section D+E: Mortgage Readiness */}
      <Card className="prism-card-shine border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-prism-teal" />
            Mortgage Readiness (AI)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {readiness.data?.content_md ? (
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown>{readiness.data.content_md}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Generating readiness assessment…</p>
          )}
        </CardContent>
      </Card>

      {/* Section F: Documents */}
      <Card className="prism-card-shine border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-prism-indigo" />
            Required Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {docs.map((d: any) => (
              <div key={d.id} className="flex items-center gap-2 rounded-md border border-border/30 bg-card/30 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{d.label || d.doc_type}</div>
                </div>
                <Select value={d.status} onValueChange={(v) => updateDoc.mutate({ id: d.id, patch: { status: v } })}>
                  <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="missing">Missing</SelectItem>
                    <SelectItem value="uploaded">Uploaded</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section G: Risks summary */}
      <Card className="prism-card-shine border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-prism-amber" />
            Active Risks ({risks.filter((r: any) => r.status === 'open').length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {risks.filter((r: any) => r.status === 'open').slice(0, 5).map((r: any) => (
              <div key={r.id} className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="text-[10px]">{r.probability}/{r.impact}</Badge>
                <span className="flex-1 truncate">{r.title}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section H: Decision Points */}
      <Card className="prism-card-shine border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-prism-rose" />
            Decision Points (AI)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {decisions.data?.content_md ? (
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown>{decisions.data.content_md}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Generating recommendations…</p>
          )}
        </CardContent>
      </Card>

      {/* Section J: Notes */}
      <Card className="prism-card-shine border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-sm">Notes & Journal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input placeholder="Title (optional)" value={newNote.title} onChange={(e) => setNewNote({ ...newNote, title: e.target.value })} className="h-8" />
            <Select value={newNote.category} onValueChange={(v) => setNewNote({ ...newNote, category: v })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="journal">Journal</SelectItem>
                <SelectItem value="lender">Lender</SelectItem>
                <SelectItem value="realtor">Realtor</SelectItem>
                <SelectItem value="property">Property</SelectItem>
                <SelectItem value="question">Question</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={() => {
                if (!newNote.body.trim() || !household) return;
                addNote.mutate({
                  project_id: projectId,
                  household_id: household.id,
                  month_index: monthIndex,
                  category: newNote.category,
                  title: newNote.title || null,
                  body: newNote.body,
                }, { onSuccess: () => { setNewNote({ title: '', body: '', category: 'journal' }); toast.success('Note saved'); } });
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </div>
          <Textarea placeholder="Write a note…" value={newNote.body} onChange={(e) => setNewNote({ ...newNote, body: e.target.value })} rows={2} />
          <div className="space-y-2">
            {notes.map((n: any) => (
              <div key={n.id} className="rounded-md border border-border/30 bg-card/30 px-3 py-2">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Badge variant="outline" className="text-[10px]">{n.category}</Badge>
                  {n.title && <span className="font-bold">{n.title}</span>}
                  <span>{new Date(n.created_at).toLocaleDateString()}</span>
                </div>
                <div className="text-sm mt-1 whitespace-pre-wrap">{n.body}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
