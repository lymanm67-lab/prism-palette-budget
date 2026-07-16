import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import type { WorksheetDef, WorksheetField } from '@/lib/home-buying/planner/worksheet-defs';
import { useHpWorksheet, useSaveWorksheet } from '@/hooks/use-hp-planner';

interface Props {
  projectId: string;
  def: WorksheetDef;
}

function FieldInput({ field, value, onChange }: { field: WorksheetField; value: any; onChange: (v: any) => void }) {
  if (field.type === 'checkbox') {
    return (
      <div className="flex items-center gap-2">
        <Checkbox checked={!!value} onCheckedChange={(v) => onChange(!!v)} />
        <span className="text-sm">{field.label}</span>
      </div>
    );
  }
  if (field.type === 'textarea') {
    return (
      <div className="space-y-1">
        <Label className="text-xs">{field.label}</Label>
        <Textarea value={value || ''} onChange={(e) => onChange(e.target.value)} rows={3} />
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <Label className="text-xs">{field.label}</Label>
      <Input
        type={['number', 'currency', 'percent'].includes(field.type) ? 'number' : field.type === 'date' ? 'date' : 'text'}
        step={field.type === 'currency' ? '0.01' : field.type === 'percent' ? '0.01' : undefined}
        value={value ?? ''}
        onChange={(e) => onChange(field.type === 'number' || field.type === 'currency' || field.type === 'percent' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
      />
    </div>
  );
}

export default function GenericWorksheet({ projectId, def }: Props) {
  const { data: existing } = useHpWorksheet(projectId, def.type);
  const save = useSaveWorksheet();
  const [state, setState] = useState<Record<string, any>>({});

  useEffect(() => {
    if (existing?.data) setState(existing.data);
  }, [existing]);

  const set = (path: string[], v: any) => {
    setState((prev) => {
      const next = { ...prev };
      let cur: any = next;
      for (let i = 0; i < path.length - 1; i++) {
        cur[path[i]] = { ...(cur[path[i]] || {}) };
        cur = cur[path[i]];
      }
      cur[path[path.length - 1]] = v;
      return next;
    });
  };

  const handleSave = () => {
    save.mutate({ project_id: projectId, worksheet_type: def.type, data: state }, {
      onSuccess: () => toast.success('Worksheet saved'),
      onError: (e: any) => toast.error(e.message || 'Save failed'),
    });
  };

  return (
    <Card className="prism-card-shine border-border/50">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="font-display text-xl">{def.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{def.description}</p>
          </div>
          <Button size="sm" onClick={handleSave} disabled={save.isPending}>
            <Save className="h-3.5 w-3.5 mr-1" /> {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {def.sections.map((section, si) => (
          <div key={si} className="space-y-3">
            <h4 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground">{section.title}</h4>

            {section.checklist && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {section.checklist.map((c) => (
                  <label key={c.key} className="flex items-center gap-2 rounded-md border border-border/40 bg-card/40 px-3 py-2 cursor-pointer">
                    <Checkbox
                      checked={!!state[c.key]}
                      onCheckedChange={(v) => set([c.key], !!v)}
                    />
                    <span className="text-sm">{c.label}</span>
                  </label>
                ))}
              </div>
            )}

            {section.fields && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {section.fields.map((f) => (
                  <FieldInput
                    key={f.key}
                    field={f}
                    value={state[f.key]}
                    onChange={(v) => set([f.key], v)}
                  />
                ))}
              </div>
            )}

            {section.rows && (
              <div className="space-y-4">
                {section.rows.map((row) => (
                  <div key={row.key} className="rounded-lg border border-border/40 bg-card/30 p-3 space-y-2">
                    <div className="text-xs font-bold text-muted-foreground">{row.label}</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {row.fields.map((f) => (
                        <FieldInput
                          key={f.key}
                          field={f}
                          value={state[row.key]?.[f.key]}
                          onChange={(v) => set([row.key, f.key], v)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
