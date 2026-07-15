import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Save, Trash2, GitCompareArrows, FolderOpen } from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const KEY = 'prism.mortgage-freedom.scenarios.v1';

export interface Scenario {
  id: string;
  name: string;
  savedAt: number;
  inputs: any;
  summary: {
    winner: string;
    yearsSaved: number;
    interestSaved: number;
    freedomScore: number;
  };
}

function load(): Scenario[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function persist(arr: Scenario[]) { localStorage.setItem(KEY, JSON.stringify(arr)); }

interface ScenarioLabProps {
  currentInputs: any;
  currentSummary: Scenario['summary'];
  onLoad: (inputs: any) => void;
}

export default function ScenarioLab({ currentInputs, currentSummary, onLoad }: ScenarioLabProps) {
  const { formatCurrency } = useCurrency();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => { setScenarios(load()); }, []);

  const save = () => {
    if (!name.trim()) { toast.error('Give the scenario a name'); return; }
    const next: Scenario[] = [
      ...scenarios,
      { id: crypto.randomUUID(), name: name.trim(), savedAt: Date.now(), inputs: currentInputs, summary: currentSummary },
    ];
    setScenarios(next); persist(next); setName('');
    toast.success(`Saved "${name.trim()}"`);
  };

  const remove = (id: string) => {
    const next = scenarios.filter(s => s.id !== id);
    setScenarios(next); persist(next);
    setSelected(sel => sel.filter(x => x !== id));
  };

  const toggleSelect = (id: string) => {
    setSelected(sel => sel.includes(id) ? sel.filter(x => x !== id) : sel.length < 3 ? [...sel, id] : sel);
  };

  const chosen = scenarios.filter(s => selected.includes(s.id));

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <GitCompareArrows className="h-5 w-5 text-primary" /> Scenario Comparison Lab
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Save unlimited "what-if" scenarios and compare up to 3 side-by-side. Stored locally on your device.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input placeholder="Name this scenario (e.g. 'Aggressive HELOC + bonus')" value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
          <Button onClick={save} size="sm" className="gap-1"><Save className="h-3.5 w-3.5" /> Save current</Button>
        </div>

        {scenarios.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/50 p-6 text-center text-sm text-muted-foreground">
            No saved scenarios yet. Tweak inputs above, then save a snapshot to compare.
          </div>
        ) : (
          <div className="space-y-2">
            {scenarios.map(s => {
              const isSelected = selected.includes(s.id);
              return (
                <div
                  key={s.id}
                  className={cn(
                    'rounded-lg border p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors',
                    isSelected ? 'border-primary/60 bg-primary/5' : 'border-border/50 bg-card/50 hover:bg-muted/30'
                  )}
                  onClick={() => toggleSelect(s.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium truncate">{s.name}</div>
                      {isSelected && <Badge variant="secondary" className="text-[10px] h-4">Selected</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      Winner: <span className="text-foreground">{s.summary.winner}</span> ·
                      Saves {s.summary.yearsSaved.toFixed(1)}y / {formatCurrency(s.summary.interestSaved)} ·
                      Score {s.summary.freedomScore}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onLoad(s.inputs); toast.success(`Loaded "${s.name}"`); }}>
                      <FolderOpen className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); remove(s.id); }} className="text-rose-500 hover:text-rose-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {chosen.length >= 2 && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="text-xs uppercase tracking-wider text-primary font-semibold mb-3">
              Comparing {chosen.length} scenarios
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/40 text-left">
                    <th className="p-2 font-semibold">Metric</th>
                    {chosen.map(s => <th key={s.id} className="p-2 font-semibold">{s.name}</th>)}
                  </tr>
                </thead>
                <tbody className="[&_tr]:border-b [&_tr]:border-border/20">
                  <CmpRow label="Winning strategy" values={chosen.map(s => s.summary.winner)} />
                  <CmpRow label="Years saved" values={chosen.map(s => `${s.summary.yearsSaved.toFixed(1)} yr`)} />
                  <CmpRow label="Interest saved" values={chosen.map(s => formatCurrency(s.summary.interestSaved))} />
                  <CmpRow label="Freedom Score" values={chosen.map(s => `${s.summary.freedomScore}/100`)} />
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CmpRow({ label, values }: { label: string; values: (string | number)[] }) {
  return (
    <tr>
      <td className="p-2 text-muted-foreground">{label}</td>
      {values.map((v, i) => <td key={i} className="p-2 font-mono">{v}</td>)}
    </tr>
  );
}
