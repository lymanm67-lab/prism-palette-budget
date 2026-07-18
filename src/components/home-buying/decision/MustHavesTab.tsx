import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Trash2, Edit3, ArrowRight, ArrowLeft, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  type Preference, type Tier, TIER_LABEL, TIER_COLOR, TIER_DOT,
  loadPreferences, savePreferences, resetPreferences, clearPreferences, isDuplicate,
} from '@/lib/home-buying/decision/preferences';

const TIER_ORDER: Tier[] = ['must','like','wish'];
const TIER_HINT: Record<Tier,string> = {
  must: 'Deal-breakers. Missing = auto-reject property.',
  like: 'Preferred features. Add points but don\'t disqualify.',
  wish: 'Dream features. Small bonus + tiebreaker only.',
};

export default function MustHavesTab({ onChange }: { onChange?: (p: Preference[]) => void }) {
  const [prefs, setPrefs] = useState<Preference[]>(() => loadPreferences());
  const [showAdd, setShowAdd] = useState<Tier | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => { savePreferences(prefs); onChange?.(prefs); }, [prefs, onChange]);

  const grouped = TIER_ORDER.map(t => ({ tier: t, items: prefs.filter(p => p.tier === t) }));

  const toggle = (id: string) =>
    setPrefs(prefs.map(p => p.id === id ? { ...p, checked: !p.checked } : p));
  const setNote = (id: string, note: string) =>
    setPrefs(prefs.map(p => p.id === id ? { ...p, note } : p));
  const setName = (id: string, name: string) =>
    setPrefs(prefs.map(p => p.id === id ? { ...p, name } : p));
  const moveTier = (id: string, dir: 1 | -1) => {
    setPrefs(prefs.map(p => {
      if (p.id !== id) return p;
      const idx = TIER_ORDER.indexOf(p.tier);
      const next = TIER_ORDER[Math.min(TIER_ORDER.length - 1, Math.max(0, idx + dir))];
      return { ...p, tier: next };
    }));
  };
  const del = (id: string) => setPrefs(prefs.filter(p => p.id !== id));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle>Home-Buying Preferences</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Check the items that matter to you. Move items between tiers to reflect your true priorities.
            </p>
          </div>
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1"><RotateCcw className="h-3 w-3"/>Reset defaults</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset to default preferences?</AlertDialogTitle>
                  <AlertDialogDescription>Custom items and edits will be lost.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { setPrefs(resetPreferences()); toast.success('Preferences reset'); }}>Reset</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1 text-red-400"><X className="h-3 w-3"/>Clear all</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all preferences?</AlertDialogTitle>
                  <AlertDialogDescription>This removes every item. You can restore defaults later.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { setPrefs(clearPreferences()); }}>Clear</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {grouped.map(({ tier, items }) => (
          <Card key={tier} className={`border-2 ${TIER_COLOR[tier]}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${TIER_DOT[tier]}`} />
                  {TIER_LABEL[tier]} <span className="text-xs text-muted-foreground">({items.length})</span>
                </span>
                <Button size="sm" variant="ghost" onClick={() => setShowAdd(tier)} className="h-7 gap-1">
                  <Plus className="h-3 w-3" />Add
                </Button>
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">{TIER_HINT[tier]}</p>
            </CardHeader>
            <CardContent className="space-y-1.5 max-h-[600px] overflow-y-auto">
              {items.length === 0 && (
                <p className="text-xs text-muted-foreground italic py-4 text-center">No items yet.</p>
              )}
              {items.map(p => (
                <div key={p.id} className="rounded border border-border/40 bg-background/30 p-2 text-xs space-y-1">
                  <div className="flex items-start gap-2">
                    <Checkbox checked={!!p.checked} onCheckedChange={() => toggle(p.id)} className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      {editing === p.id ? (
                        <Input value={p.name} onChange={(e) => setName(p.id, e.target.value)} onBlur={() => setEditing(null)} autoFocus className="h-6 text-xs" />
                      ) : (
                        <div className="font-medium truncate">{p.name}</div>
                      )}
                      <div className="text-[10px] text-muted-foreground">{p.category}</div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button size="icon" variant="ghost" className="h-5 w-5" title="Move left" onClick={() => moveTier(p.id, -1)} disabled={tier === 'must'}>
                        <ArrowLeft className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-5 w-5" title="Move right" onClick={() => moveTier(p.id, 1)} disabled={tier === 'wish'}>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-5 w-5" title="Edit" onClick={() => setEditing(p.id)}>
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-5 w-5 text-red-400" title="Delete" onClick={() => del(p.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <Textarea placeholder="Note (optional)" value={p.note || ''} onChange={(e) => setNote(p.id, e.target.value)} className="min-h-[28px] text-[11px] p-1.5" rows={1} />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {showAdd && (
        <AddCustomForm
          tier={showAdd}
          existing={prefs}
          onCancel={() => setShowAdd(null)}
          onSave={(item) => { setPrefs([...prefs, item]); setShowAdd(null); toast.success('Preference added'); }}
        />
      )}
    </div>
  );
}

function AddCustomForm({ tier, existing, onCancel, onSave }: {
  tier: Tier; existing: Preference[];
  onCancel: () => void; onSave: (p: Preference) => void;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Custom');
  const [chosenTier, setChosenTier] = useState<Tier>(tier);
  const [note, setNote] = useState('');
  const dup = name.trim() && isDuplicate(existing, name);

  const submit = () => {
    if (!name.trim()) { toast.error('Feature name required'); return; }
    if (dup) { toast.error('That preference already exists'); return; }
    onSave({ id: `custom-${Date.now()}`, name: name.trim(), category: category.trim() || 'Custom', tier: chosenTier, note: note.trim() || undefined, checked: true, custom: true });
  };

  return (
    <Card className="border-2 border-prism-teal/40 bg-prism-teal/5">
      <CardHeader className="pb-2"><CardTitle className="text-base">Add Custom Preference</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><Label className="text-xs">Feature name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., South-facing backyard" /></div>
          <div><Label className="text-xs">Category</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} /></div>
          <div>
            <Label className="text-xs">Tier</Label>
            <Select value={chosenTier} onValueChange={(v) => setChosenTier(v as Tier)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIER_ORDER.map(t => <SelectItem key={t} value={t}>{TIER_LABEL[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div><Label className="text-xs">Note (optional)</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} /></div>
        {dup && <p className="text-xs text-red-400">A preference with this name already exists.</p>}
        <div className="flex gap-2">
          <Button onClick={submit} disabled={!name.trim() || !!dup}>Save</Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}
