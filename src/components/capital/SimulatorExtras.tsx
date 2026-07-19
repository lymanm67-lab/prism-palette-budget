import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, Save, Trash2, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Action {
  label: string;
  detail: string;
  points: number;
}

interface Props {
  baselineScore: number;
  projectedScore: number;
  actions: Action[];
}

interface Scenario {
  id: string;
  name: string;
  baseline_score: number;
  projected_score: number;
  actions: Action[];
  notes: string | null;
  created_at: string;
}

export default function SimulatorExtras({ baselineScore, projectedScore, actions }: Props) {
  const { household } = useHousehold();
  const [saving, setSaving] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [open, setOpen] = useState(false);

  const loadScenarios = async () => {
    if (!household) return;
    const { data } = await (supabase as any)
      .from('score_scenarios').select('*').eq('household_id', household.id)
      .order('created_at', { ascending: false }).limit(6);
    setScenarios(data ?? []);
  };
  useEffect(() => { loadScenarios(); }, [household?.id]);

  const totalDelta = projectedScore - baselineScore;
  // Assume ~40% of gains land in months 1-2 (paydowns hit fastest), 80% by month 4, 100% by month 6.
  const trajectory = [0, 0.15, 0.4, 0.65, 0.85, 0.95, 1.0];
  const chartData = trajectory.map((pct, i) => ({
    month: i === 0 ? 'Now' : `M+${i}`,
    score: Math.round(baselineScore + totalDelta * pct),
  }));

  const save = async () => {
    if (!household || !name.trim()) return;
    setSaving(true);
    const { error } = await (supabase as any).from('score_scenarios').insert({
      household_id: household.id,
      name: name.trim(),
      baseline_score: baselineScore,
      projected_score: projectedScore,
      actions,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Scenario saved');
    setName(''); setNotes(''); setOpen(false);
    loadScenarios();
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from('score_scenarios').delete().eq('id', id);
    if (error) return toast.error(error.message);
    setScenarios((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-4 pt-2 border-t">
      {/* 6-Month projection */}
      <div>
        <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          6-Month Projection
          <Badge variant="secondary" className="text-[10px]">
            {totalDelta >= 0 ? '+' : ''}{totalDelta} pts by month 6
          </Badge>
        </h4>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 6, right: 12, bottom: 0, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={[
                Math.min(baselineScore, projectedScore) - 20,
                Math.max(baselineScore, projectedScore) + 20,
              ]} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 11 }}
              />
              <ReferenceLine y={baselineScore} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" label={{ value: 'Baseline', fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
              <Line
                type="monotone" dataKey="score"
                stroke="hsl(var(--primary))" strokeWidth={2}
                dot={{ r: 3, fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Assumes paydowns post in 1-2 statement cycles and dispute deletions land by round 3. Actual results vary by furnisher response times.
        </p>
      </div>

      {/* Save scenario */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          {actions.length} action{actions.length === 1 ? '' : 's'} stacked in this scenario
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" disabled={totalDelta === 0}>
              <Save className="h-3.5 w-3.5 mr-1.5" /> Save scenario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Save Score Scenario</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Pay off Cap One + dispute JC collection" />
              </div>
              <div>
                <Label className="text-xs">Notes (optional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Plan to fund from tax refund in April" />
              </div>
              <div className="text-xs bg-muted/40 rounded p-2">
                <strong>{baselineScore}</strong> → <strong className="text-primary">{projectedScore}</strong> ({totalDelta >= 0 ? '+' : ''}{totalDelta} pts)
                <ul className="mt-1 list-disc list-inside text-[10px]">
                  {actions.slice(0, 6).map((a, i) => <li key={i}>{a.label} — {a.detail} (+{a.points})</li>)}
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={save} disabled={saving || !name.trim()}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Saved scenarios */}
      {scenarios.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-primary" /> Saved Scenarios
          </h4>
          <div className="space-y-1">
            {scenarios.map((s) => {
              const d = s.projected_score - s.baseline_score;
              return (
                <div key={s.id} className="flex items-center gap-2 rounded border border-border/50 p-2 text-xs">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{s.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {s.baseline_score} → {s.projected_score} ({d >= 0 ? '+' : ''}{d}) · saved {format(new Date(s.created_at), 'MMM d')}
                    </div>
                  </div>
                  <Badge variant={d > 0 ? 'default' : 'secondary'} className="text-[9px]">{d >= 0 ? '+' : ''}{d} pts</Badge>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => remove(s.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
