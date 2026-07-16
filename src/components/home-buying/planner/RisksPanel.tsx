import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { useHpRisks, useUpdateRisk, useAddRisk } from '@/hooks/use-hp-planner';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';

const LEVELS = ['low', 'medium', 'high'];
const STATUSES = ['open', 'mitigating', 'accepted', 'resolved'];

const toneFor = (level: string) =>
  level === 'high' ? 'bg-prism-rose/20 text-prism-rose border-prism-rose/40'
  : level === 'medium' ? 'bg-prism-amber/20 text-prism-amber border-prism-amber/40'
  : 'bg-prism-teal/20 text-prism-teal border-prism-teal/40';

const statusTone = (s: string) =>
  s === 'resolved' ? 'bg-prism-teal/20 text-prism-teal border-prism-teal/40'
  : s === 'mitigating' ? 'bg-prism-amber/20 text-prism-amber border-prism-amber/40'
  : s === 'accepted' ? 'bg-muted text-muted-foreground border-border'
  : 'bg-prism-rose/20 text-prism-rose border-prism-rose/40';

export default function RisksPanel({ projectId }: { projectId: string }) {
  const { household } = useHousehold();
  const { data: risks = [] } = useHpRisks(projectId);
  const updateRisk = useUpdateRisk();
  const addRisk = useAddRisk();

  const [newRisk, setNewRisk] = useState({ title: '', probability: 'medium', impact: 'medium' });

  const open = risks.filter((r: any) => r.status !== 'resolved');
  const resolved = risks.filter((r: any) => r.status === 'resolved');

  return (
    <Card className="prism-card-shine border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-prism-rose" />
          Risk Register
          <Badge variant="outline" className="ml-2 text-[10px]">
            {open.length} open · {resolved.length} resolved
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">Track anything that could derail your close date. Mark them mitigating, accepted, or resolved as you work through them.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {risks.length === 0 && (
          <div className="text-sm text-muted-foreground py-4 text-center">No risks tracked yet.</div>
        )}

        <div className="space-y-2">
          {risks.map((r: any) => (
            <div key={r.id} className="rounded-md border border-border/30 bg-card/30 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <Input
                  value={r.title}
                  onChange={(e) => updateRisk.mutate({ id: r.id, patch: { title: e.target.value } })}
                  className="h-8 flex-1 text-sm font-semibold"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-prism-rose"
                  onClick={() => updateRisk.mutate({ id: r.id, patch: { deleted_at: new Date().toISOString() } }, { onSuccess: () => toast.success('Risk removed') })}
                  aria-label="Delete risk"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Probability</div>
                  <Select value={r.probability} onValueChange={(v) => updateRisk.mutate({ id: r.id, patch: { probability: v } })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Impact</div>
                  <Select value={r.impact} onValueChange={(v) => updateRisk.mutate({ id: r.id, patch: { impact: v } })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Status</div>
                  <Select value={r.status} onValueChange={(v) => updateRisk.mutate({ id: r.id, patch: { status: v } })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Mitigation plan</div>
                <Textarea
                  value={r.mitigation ?? ''}
                  onChange={(e) => updateRisk.mutate({ id: r.id, patch: { mitigation: e.target.value } })}
                  placeholder="How will you prevent or reduce this risk?"
                  className="min-h-[60px] text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className={`text-[10px] ${toneFor(r.probability)}`}>P: {r.probability}</Badge>
                <Badge variant="outline" className={`text-[10px] ${toneFor(r.impact)}`}>I: {r.impact}</Badge>
                <Badge variant="outline" className={`text-[10px] ${statusTone(r.status)}`}>{r.status}</Badge>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-3 border-t border-border/30">
          <Input
            placeholder="New risk title…"
            value={newRisk.title}
            onChange={(e) => setNewRisk({ ...newRisk, title: e.target.value })}
            className="h-8 md:col-span-2"
          />
          <Select value={newRisk.probability} onValueChange={(v) => setNewRisk({ ...newRisk, probability: v })}>
            <SelectTrigger className="h-8"><SelectValue placeholder="Probability" /></SelectTrigger>
            <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>Prob: {l}</SelectItem>)}</SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={() => {
              if (!newRisk.title.trim() || !household) return;
              addRisk.mutate(
                {
                  project_id: projectId,
                  household_id: household.id,
                  title: newRisk.title.trim(),
                  probability: newRisk.probability,
                  impact: newRisk.impact,
                  status: 'open',
                } as any,
                {
                  onSuccess: () => {
                    setNewRisk({ title: '', probability: 'medium', impact: 'medium' });
                    toast.success('Risk added');
                  },
                }
              );
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Risk
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
