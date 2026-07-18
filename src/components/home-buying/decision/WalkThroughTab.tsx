import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertCircle, AlertTriangle, Camera, HelpCircle, ShieldAlert, CheckCircle2, Circle } from 'lucide-react';
import { toast } from 'sonner';
import {
  WALK_SECTIONS, NEIGHBORHOOD_ITEMS, NEIGHBORHOOD_QUESTIONS,
  SCENARIOS, RISK_LABEL, RISK_COLOR, STATUS_LABEL,
  type ItemStatus, type CheckItemDef,
} from '@/lib/home-buying/decision/walkthrough-defs';
import {
  loadWalk, saveWalk, loadNbhd, saveNbhd,
  type WalkMap, type WalkItemState, type PropertyProfile,
} from '@/lib/home-buying/decision/walkthrough-store';

const STATUS_OPTIONS: ItemStatus[] = ['good','minor','major','unknown','na','needs_pro'];

export default function WalkThroughTab({ property }: { property: PropertyProfile }) {
  const [walk, setWalk] = useState<WalkMap>(() => loadWalk(property.id));
  const [nbhd, setNbhd] = useState<WalkMap>(() => loadNbhd(property.id));

  useEffect(() => { setWalk(loadWalk(property.id)); setNbhd(loadNbhd(property.id)); }, [property.id]);
  useEffect(() => { saveWalk(property.id, walk); }, [walk, property.id]);
  useEffect(() => { saveNbhd(property.id, nbhd); }, [nbhd, property.id]);

  const updateWalk = (id: string, patch: Partial<WalkItemState>) =>
    setWalk(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch, reviewedAt: new Date().toISOString() } }));
  const updateNbhd = (id: string, patch: Partial<WalkItemState>) =>
    setNbhd(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch, reviewedAt: new Date().toISOString() } }));

  const unknownItems = [
    ...Object.entries(walk).filter(([_, s]) => s.status === 'unknown').map(([id]) => WALK_SECTIONS.flatMap(s => s.items).find(i => i.id === id)?.name || id),
    ...Object.entries(nbhd).filter(([_, s]) => s.status === 'unknown').map(([id]) => NEIGHBORHOOD_ITEMS.find(i => i.id === id)?.name || id),
  ];

  return (
    <div className="space-y-4">
      {/* Property strip */}
      <Card>
        <CardContent className="p-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-medium truncate">{property.address}</div>
            <div className="text-xs text-muted-foreground">${property.price.toLocaleString()} · walk-through for this property</div>
          </div>
        </CardContent>
      </Card>

      {/* Needs Verification */}
      {unknownItems.length > 0 && (
        <Card className="border-2 border-amber-500/40 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-300">
              <HelpCircle className="h-4 w-4" /> Needs Verification ({unknownItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">Unknown items must be resolved before decision. They do not count as acceptable.</p>
            <ul className="text-xs list-disc list-inside space-y-0.5">
              {unknownItems.slice(0, 15).map((n, i) => <li key={i}>{n}</li>)}
              {unknownItems.length > 15 && <li className="text-muted-foreground">…and {unknownItems.length - 15} more</li>}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Scenarios */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-prism-amber" />Walk-Through Scenarios</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {SCENARIOS.map(s => (
            <div key={s.id} className="rounded border border-border/40 bg-background/30 p-2 text-xs">
              <div className="font-medium mb-1 text-prism-amber">{s.title}</div>
              <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                {s.prompts.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Sections */}
      <Accordion type="multiple" className="space-y-2">
        {WALK_SECTIONS.map(sec => (
          <AccordionItem key={sec.id} value={sec.id} className="border rounded-lg">
            <AccordionTrigger className="px-3 hover:no-underline">
              <span className="flex items-center gap-2 text-sm font-medium">
                {sec.title}
                <SectionBadge sectionId={sec.id} walk={walk} />
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3 space-y-3">
              {sec.scenario && (
                <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-200 flex items-start gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{sec.scenario}</span>
                </div>
              )}
              <div className="space-y-2">
                {sec.items.map(item => (
                  <WalkThroughItem key={item.id} def={item} state={walk[item.id] || {}} onChange={(patch) => updateWalk(item.id, patch)} />
                ))}
              </div>
              {sec.questions.length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Questions to ask ({sec.questions.length})</summary>
                  <ul className="list-disc list-inside space-y-0.5 mt-1 text-muted-foreground">
                    {sec.questions.map((q, i) => <li key={i}>{q}</li>)}
                  </ul>
                </details>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}

        <AccordionItem value="neighborhood" className="border rounded-lg">
          <AccordionTrigger className="px-3 hover:no-underline">
            <span className="text-sm font-medium">Neighborhood Review</span>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3 space-y-3">
            <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-200">
              A quiet midday showing does not confirm the neighborhood is quiet at night or on weekends. Visit during morning rush, evening rush, after dark, and after heavy rain.
            </div>
            <div className="space-y-2">
              {NEIGHBORHOOD_ITEMS.map(item => (
                <WalkThroughItem key={item.id} def={item} state={nbhd[item.id] || {}} onChange={(patch) => updateNbhd(item.id, patch)} />
              ))}
            </div>
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">Neighborhood questions to research</summary>
              <ul className="list-disc list-inside space-y-0.5 mt-1 text-muted-foreground">
                {NEIGHBORHOOD_QUESTIONS.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </details>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <p className="text-xs text-muted-foreground">
        All changes save automatically to this browser and update the Property Scorecard in real time.
      </p>
    </div>
  );
}

function SectionBadge({ sectionId, walk }: { sectionId: string; walk: WalkMap }) {
  const sec = WALK_SECTIONS.find(s => s.id === sectionId);
  if (!sec) return null;
  const total = sec.items.length;
  const reviewed = sec.items.filter(i => walk[i.id]?.status && walk[i.id]?.status !== 'unknown').length;
  const unknown = sec.items.filter(i => walk[i.id]?.status === 'unknown').length;
  const majors = sec.items.filter(i => {
    const s = walk[i.id];
    return s && (s.status === 'major' || s.status === 'needs_pro');
  }).length;
  return (
    <span className="ml-2 flex items-center gap-1.5 text-[10px]">
      <span className="text-muted-foreground">{reviewed}/{total}</span>
      {majors > 0 && <span className="text-red-400">{majors} concern</span>}
      {unknown > 0 && <span className="text-amber-400">{unknown} unknown</span>}
    </span>
  );
}

function WalkThroughItem({ def, state, onChange }: {
  def: CheckItemDef; state: WalkItemState; onChange: (p: Partial<WalkItemState>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const risk = state.riskOverride || def.risk;
  const showConcern = state.status === 'major' || state.status === 'needs_pro';

  const onPhoto = async (file: File) => {
    if (file.size > 500_000) {
      // downscale via canvas
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise(r => img.onload = r);
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 640 / Math.max(img.width, img.height));
      canvas.width = img.width * scale; canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      onChange({ photo: canvas.toDataURL('image/jpeg', 0.7) });
    } else {
      const reader = new FileReader();
      reader.onload = () => onChange({ photo: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="rounded border border-border/40 bg-background/30 p-2 text-xs space-y-1.5">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{def.name}</span>
            <span className={`inline-flex items-center gap-1 px-1.5 py-0 rounded border text-[9px] uppercase tracking-wider ${RISK_COLOR[risk]}`}>
              {RISK_LABEL[risk]}
            </span>
            {showConcern && risk === 'critical' && (
              <span className="text-[9px] text-red-400 font-bold">STOP — Investigate before offer</span>
            )}
          </div>
        </div>
        <Select value={state.status || ''} onValueChange={(v) => onChange({ status: v as ItemStatus })}>
          <SelectTrigger className="h-7 w-[140px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Less' : 'More'}
        </Button>
      </div>

      {expanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 border-t border-border/30">
          <div>
            <Label className="text-[10px]">Note</Label>
            <Textarea value={state.note || ''} onChange={(e) => onChange({ note: e.target.value })} rows={2} className="text-xs" />
          </div>
          <div>
            <Label className="text-[10px]">Seller response</Label>
            <Textarea value={state.sellerResponse || ''} onChange={(e) => onChange({ sellerResponse: e.target.value })} rows={2} className="text-xs" />
          </div>
          <div>
            <Label className="text-[10px]">Repair — expected ($)</Label>
            <Input type="number" value={state.repairExpected || ''} onChange={(e) => onChange({ repairExpected: +e.target.value || 0 })} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px]">Seller credit requested ($)</Label>
            <Input type="number" value={state.sellerCredit || ''} onChange={(e) => onChange({ sellerCredit: +e.target.value || 0 })} className="h-8 text-xs" />
          </div>
          <div className="flex flex-wrap gap-3 col-span-full">
            <label className="flex items-center gap-1 text-xs">
              <Checkbox checked={!!state.followUp} onCheckedChange={(v) => onChange({ followUp: !!v })} />
              Follow-up required
            </label>
            <label className="flex items-center gap-1 text-xs">
              <Checkbox checked={!!state.needsPro} onCheckedChange={(v) => onChange({ needsPro: !!v })} />
              Professional inspection
            </label>
            <label className="flex items-center gap-1 text-xs">
              <Checkbox checked={!!state.fhaRequired} onCheckedChange={(v) => onChange({ fhaRequired: !!v })} />
              FHA-required repair
            </label>
            <label className="flex items-center gap-1 text-xs">
              <Checkbox checked={!!state.sellerRepairRequested} onCheckedChange={(v) => onChange({ sellerRepairRequested: !!v })} />
              Seller repair requested
            </label>
            <label className="flex items-center gap-1 text-xs">
              <Checkbox checked={!!state.buyerAsIs} onCheckedChange={(v) => onChange({ buyerAsIs: !!v })} />
              Buyer accepts as-is
            </label>
          </div>
          <div className="col-span-full">
            <Label className="text-[10px]">Photo</Label>
            <div className="flex items-center gap-2">
              <input type="file" accept="image/*" capture="environment" onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])} className="text-xs" />
              {state.photo && <img src={state.photo} className="h-12 w-12 object-cover rounded border border-border/40" alt="check" />}
              {state.photo && <Button size="sm" variant="ghost" onClick={() => onChange({ photo: undefined })}>Remove</Button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
