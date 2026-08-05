import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Save } from 'lucide-react';
import { useFdnSettings, useUpdateFdnSettings } from '@/hooks/use-foundation';
import { DEFAULT_VALUES } from '@/lib/legacy/foundation';

type CoreValue = { title: string; description: string };

export default function MissionValuesTab() {
  const { data: settings } = useFdnSettings();
  const update = useUpdateFdnSettings();

  const [form, setForm] = useState({
    foundation_name: '',
    tagline: '',
    mission: '',
    vision: '',
    legacy_statement: '',
    founding_year: 2027,
    endowment_target: 1000000,
    endowment_current: 0,
    annual_grant_budget: 25000,
  });
  const [values, setValues] = useState<CoreValue[]>(DEFAULT_VALUES);

  useEffect(() => {
    if (!settings) return;
    setForm({
      foundation_name: settings.foundation_name ?? '',
      tagline: settings.tagline ?? '',
      mission: settings.mission ?? '',
      vision: settings.vision ?? '',
      legacy_statement: settings.legacy_statement ?? '',
      founding_year: Number(settings.founding_year ?? 2027),
      endowment_target: Number(settings.endowment_target ?? 0),
      endowment_current: Number(settings.endowment_current ?? 0),
      annual_grant_budget: Number(settings.annual_grant_budget ?? 0),
    });
    setValues(Array.isArray(settings.core_values) && settings.core_values.length ? settings.core_values : DEFAULT_VALUES);
  }, [settings]);

  const save = () => update.mutate({ ...form, core_values: values });

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Identity & purpose</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Foundation name</Label>
              <Input
                value={form.foundation_name}
                onChange={(e) => setForm({ ...form, foundation_name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Tagline</Label>
              <Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Mission — what we do</Label>
            <Textarea rows={3} value={form.mission} onChange={(e) => setForm({ ...form, mission: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Vision — where this leads</Label>
            <Textarea rows={3} value={form.vision} onChange={(e) => setForm({ ...form, vision: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Legacy statement</Label>
            <Textarea
              rows={3}
              value={form.legacy_statement}
              onChange={(e) => setForm({ ...form, legacy_statement: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label>Founding year</Label>
              <Input
                type="number"
                value={form.founding_year}
                onChange={(e) => setForm({ ...form, founding_year: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <Label>Annual grant budget</Label>
              <Input
                type="number"
                value={form.annual_grant_budget}
                onChange={(e) => setForm({ ...form, annual_grant_budget: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <Label>Endowment target</Label>
              <Input
                type="number"
                value={form.endowment_target}
                onChange={(e) => setForm({ ...form, endowment_target: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <Label>Endowment funded to date</Label>
              <Input
                type="number"
                value={form.endowment_current}
                onChange={(e) => setForm({ ...form, endowment_current: Number(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Core values</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setValues([...values, { title: '', description: '' }])}
          >
            <Plus className="mr-1 h-4 w-4" /> Add value
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {values.map((v, i) => (
            <div key={i} className="grid gap-2 rounded-md border border-border/50 p-3 md:grid-cols-[1fr_2fr_auto]">
              <Input
                placeholder="Value"
                value={v.title}
                onChange={(e) => {
                  const next = [...values];
                  next[i] = { ...v, title: e.target.value };
                  setValues(next);
                }}
              />
              <Input
                placeholder="What it means in practice"
                value={v.description}
                onChange={(e) => {
                  const next = [...values];
                  next[i] = { ...v, description: e.target.value };
                  setValues(next);
                }}
              />
              <Button
                size="icon"
                variant="ghost"
                aria-label="Remove value"
                onClick={() => setValues(values.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={save} disabled={update.isPending}>
        <Save className="mr-2 h-4 w-4" /> Save foundation profile
      </Button>
    </div>
  );
}
