import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { GitCompare, Save, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BUREAU_PROFILE, type Bureau } from '@/lib/credit/triBureauModel';
import type { SavedRun } from '@/lib/credit/triBureauRuns';

export default function TriBureauRunCompare({
  runs,
  onSave,
  onDelete,
  canSave,
}: {
  runs: SavedRun[];
  onSave: (label: string) => void;
  onDelete: (id: string) => void;
  canSave: boolean;
}) {
  const [label, setLabel] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) =>
    setSelected(p => (p.includes(id) ? p.filter(x => x !== id) : p.length >= 4 ? p : [...p, id]));

  const shown = runs.filter(r => selected.includes(r.id));
  const compare = shown.length > 0 ? shown : runs.slice(0, 3);

  const best = compare.reduce<SavedRun | null>(
    (b, r) => (b == null || (r.simMiddle ?? 0) > (b.simMiddle ?? 0) ? r : b),
    null,
  );

  return (
    <Card className="glass-card border-prism-amber/30">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <GitCompare className="h-4 w-4 text-prism-amber" /> Saved Runs &amp; Side-by-Side Comparison
        </CardTitle>
        <CardDescription>
          Save the current scenario, then compare cumulative score ranges and qualification badges across runs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Name this run (e.g. Pay off Discover + dispute)"
              className="h-9 w-72"
            />
          </div>
          <Button
            size="sm"
            onClick={() => {
              onSave(label.trim() || `Run ${runs.length + 1}`);
              setLabel('');
            }}
            disabled={!canSave}
            className="gap-1.5"
          >
            <Save className="h-3.5 w-3.5" /> Save current run
          </Button>
          {!canSave && <span className="text-[11px] text-muted-foreground">Stack at least one action to save a run.</span>}
        </div>

        {runs.length === 0 ? (
          <p className="text-xs text-muted-foreground">No saved runs yet.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {runs.map(r => (
                <label
                  key={r.id}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs cursor-pointer',
                    selected.includes(r.id) ? 'border-primary bg-primary/10' : 'border-border/40',
                  )}
                >
                  <Checkbox checked={selected.includes(r.id)} onCheckedChange={() => toggle(r.id)} />
                  <span className="truncate max-w-[160px]">{r.label}</span>
                  <button onClick={e => { e.preventDefault(); onDelete(r.id); }} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </label>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Metric</th>
                    {compare.map(r => (
                      <th key={r.id} className="text-right py-2 px-3 font-semibold min-w-[130px]">
                        <span className="block truncate max-w-[150px]">{r.label}</span>
                        <span className="block text-[10px] font-normal text-muted-foreground">
                          {new Date(r.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {best?.id === r.id && compare.length > 1 && ' · best'}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/30">
                    <td className="py-1.5 pr-3 text-muted-foreground">Qualifying score</td>
                    {compare.map(r => (
                      <td key={r.id} className="py-1.5 px-3 text-right tabular-nums">
                        {r.baseMiddle ?? '—'} →{' '}
                        <span className={cn('font-bold', (r.simMiddle ?? 0) >= (r.baseMiddle ?? 0) ? 'text-prism-lime' : 'text-prism-rose')}>
                          {r.simMiddle ?? '—'}
                        </span>
                      </td>
                    ))}
                  </tr>
                  {(['Equifax', 'Experian', 'TransUnion'] as Bureau[]).map(b => (
                    <tr key={b} className="border-b border-border/30">
                      <td className={cn('py-1.5 pr-3', BUREAU_PROFILE[b].color)}>
                        {b} range
                      </td>
                      {compare.map(r => {
                        const x = r.bureaus.find(y => y.bureau === b);
                        return (
                          <td key={r.id} className="py-1.5 px-3 text-right tabular-nums">
                            {x?.projected == null
                              ? '—'
                              : `${Math.max(300, x.projected - x.margin)}–${Math.min(850, x.projected + x.margin)}`}
                            {x && x.delta !== 0 && (
                              <span className={cn('ml-1', x.delta > 0 ? 'text-prism-lime' : 'text-prism-rose')}>
                                ({x.delta > 0 ? '+' : ''}{x.delta})
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr className="border-b border-border/30">
                    <td className="py-1.5 pr-3 text-muted-foreground">Aggregate utilization</td>
                    {compare.map(r => {
                      const avg = r.bureaus.filter(b => b.tradelineCountable !== false);
                      const now = avg.length ? avg.reduce((s, b) => s + b.aggregateUtil, 0) / avg.length : 0;
                      const sim = avg.length ? avg.reduce((s, b) => s + b.simAggregateUtil, 0) / avg.length : 0;
                      return (
                        <td key={r.id} className="py-1.5 px-3 text-right tabular-nums">
                          {now.toFixed(0)}% → <span className="font-semibold">{sim.toFixed(0)}%</span>
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="border-b border-border/30">
                    <td className="py-1.5 pr-3 text-muted-foreground align-top">Qualifies for</td>
                    {compare.map(r => (
                      <td key={r.id} className="py-1.5 px-3 text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          {r.programs.map(p => (
                            <Badge key={p.program} variant={p.ok ? 'default' : 'outline'} className="text-[9px] gap-0.5">
                              {p.ok ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                              {p.program.split(' ')[0]}
                            </Badge>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border/30">
                    <td className="py-1.5 pr-3 text-muted-foreground align-top">Assumptions</td>
                    {compare.map(r => (
                      <td key={r.id} className="py-1.5 px-3 text-right text-[10px] text-muted-foreground">
                        util {r.sensitivity.utilWindowMonths} cyc · inq {r.sensitivity.inquiryWindowMonths} mo · dispute {r.sensitivity.disputeLagMonths} mo
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-3 text-muted-foreground align-top">Actions</td>
                    {compare.map(r => (
                      <td key={r.id} className="py-1.5 px-3 text-right text-[10px] text-muted-foreground">
                        {r.actionSummary.length === 0 ? '—' : r.actionSummary.map((a, i) => <span key={i} className="block">{a}</span>)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Ranges are directional. When two runs overlap inside the ± margin, treat them as equivalent and pick the
              one that costs less cash or takes less time.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
