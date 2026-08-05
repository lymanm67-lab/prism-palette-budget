import { useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Stethoscope,
  CalendarClock,
  ShieldCheck,
  Upload,
  FileText,
  Trash2,
  Plus,
  PiggyBank,
} from 'lucide-react';
import {
  CARE_TYPES,
  DOC_TYPES,
  DEFAULT_PREVENTIVE_ITEMS,
  addMonths,
  careCostSummary,
  dueStatus,
  type PreventiveItem,
} from '@/lib/health/sleepRecovery';
import {
  usePreventiveCare,
  useSavePreventiveCare,
  useSeedPreventiveCare,
  useDeletePreventiveCare,
  useMedicalDocuments,
  useUploadMedicalDocument,
  useDeleteMedicalDocument,
  useParseMedicalDocument,
  openMedicalDocument,
  type MedicalDocument,
} from '@/hooks/use-preventive-care';

const FLAG_TONE: Record<string, string> = {
  normal: 'text-emerald-600 dark:text-emerald-400',
  low: 'text-amber-600 dark:text-amber-400',
  high: 'text-destructive',
  abnormal: 'text-destructive',
  unknown: 'text-muted-foreground',
};

function ParsedReportView({ doc }: { doc: MedicalDocument }) {
  const p = doc.parsed_summary;
  if (!p) return null;
  const list = (label: string, arr?: string[]) =>
    arr && arr.length > 0 ? (
      <div>
        <p className="text-xs font-medium">{label}</p>
        <ul className="list-disc pl-4 text-xs text-muted-foreground">
          {arr.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      </div>
    ) : null;

  return (
    <div className="mt-3 w-full space-y-3 rounded-lg border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">AI extracted</Badge>
        {p.report_type && <span className="text-xs text-muted-foreground">{p.report_type}</span>}
        {p.report_date && <span className="text-xs text-muted-foreground">· {p.report_date}</span>}
        {p.confidence && (
          <span className="text-xs text-muted-foreground">· {p.confidence} confidence</span>
        )}
      </div>
      {p.summary && <p className="text-sm">{p.summary}</p>}
      {p.results && p.results.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1 text-left font-medium">Test</th>
                <th className="py-1 text-left font-medium">Result</th>
                <th className="py-1 text-left font-medium">Reference</th>
              </tr>
            </thead>
            <tbody>
              {p.results.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="py-1 pr-2">{r.name}</td>
                  <td className={`py-1 pr-2 font-medium ${FLAG_TONE[r.flag ?? 'unknown'] ?? ''}`}>
                    {r.value}
                    {r.unit ? ` ${r.unit}` : ''}
                  </td>
                  <td className="py-1 text-muted-foreground">{r.reference_range ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {p.vitals && p.vitals.length > 0 &&
        list('Vitals', p.vitals.map((v) => `${v.name}: ${v.value}`))}
      {list('Key findings', p.key_findings)}
      {list('Diagnoses noted', p.diagnoses)}
      {list('Medications noted', p.medications)}
      {list('Follow-ups', p.follow_ups)}
      <p className="text-[11px] text-muted-foreground">
        AI extraction for your own records only — not medical advice. Always confirm against the
        original report and your provider.
      </p>
    </div>
  );
}

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const kb = (n: number | null) => (n == null ? '' : `${Math.max(1, Math.round(n / 1024))} KB`);

const STATUS_TONE: Record<string, string> = {
  overdue: 'bg-destructive/15 text-destructive border-destructive/30',
  due_soon: 'bg-prism-amber/15 text-prism-amber border-prism-amber/30',
  up_to_date: 'bg-prism-lime/15 text-prism-lime border-prism-lime/30',
  unknown: 'bg-muted text-muted-foreground',
};

function CareForm({
  item,
  onDone,
}: {
  item?: PreventiveItem;
  onDone: () => void;
}) {
  const save = useSavePreventiveCare();
  const [form, setForm] = useState({
    item_name: item?.item_name ?? '',
    care_type: item?.care_type ?? 'screening',
    person: item?.person ?? '',
    provider: item?.provider ?? '',
    frequency_months: String(item?.frequency_months ?? 12),
    last_completed_on: item?.last_completed_on ?? '',
    next_due_on: item?.next_due_on ?? '',
    cost_estimate: String(item?.cost_estimate ?? 0),
    out_of_pocket: String(item?.out_of_pocket ?? 0),
    covered_by_insurance: item?.covered_by_insurance ?? true,
    notes: item?.notes ?? '',
  });

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.item_name.trim()) return;
    const freq = Number(form.frequency_months) || 12;
    const next =
      form.next_due_on ||
      (form.last_completed_on ? addMonths(form.last_completed_on, freq) : null);
    await save.mutateAsync({
      id: item?.id,
      item_name: form.item_name.trim(),
      care_type: form.care_type,
      person: form.person.trim() || null,
      provider: form.provider.trim() || null,
      frequency_months: freq,
      last_completed_on: form.last_completed_on || null,
      next_due_on: next,
      cost_estimate: Number(form.cost_estimate) || 0,
      out_of_pocket: Number(form.out_of_pocket) || 0,
      covered_by_insurance: form.covered_by_insurance,
      notes: form.notes.trim() || null,
    });
    onDone();
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Care item</Label>
          <Input value={form.item_name} onChange={(e) => set('item_name', e.target.value)} placeholder="Annual physical" />
        </div>
        <div>
          <Label>Type</Label>
          <Select value={form.care_type} onValueChange={(v) => set('care_type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CARE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Person</Label>
          <Input value={form.person} onChange={(e) => set('person', e.target.value)} placeholder="Lyman" />
        </div>
        <div>
          <Label>Provider</Label>
          <Input value={form.provider} onChange={(e) => set('provider', e.target.value)} />
        </div>
        <div>
          <Label>Repeats every (months)</Label>
          <Input type="number" min={1} value={form.frequency_months} onChange={(e) => set('frequency_months', e.target.value)} />
        </div>
        <div>
          <Label>Last completed</Label>
          <Input type="date" value={form.last_completed_on} onChange={(e) => set('last_completed_on', e.target.value)} />
        </div>
        <div>
          <Label>Next due (optional)</Label>
          <Input type="date" value={form.next_due_on} onChange={(e) => set('next_due_on', e.target.value)} />
        </div>
        <div>
          <Label>Cost estimate</Label>
          <Input type="number" min={0} step="0.01" value={form.cost_estimate} onChange={(e) => set('cost_estimate', e.target.value)} />
        </div>
        <div>
          <Label>Your out-of-pocket</Label>
          <Input type="number" min={0} step="0.01" value={form.out_of_pocket} onChange={(e) => set('out_of_pocket', e.target.value)} />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
          <span className="text-sm">Covered by insurance</span>
          <Switch checked={form.covered_by_insurance} onCheckedChange={(v) => set('covered_by_insurance', v)} />
        </div>
        <div className="sm:col-span-2">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
        </div>
      </div>
      <Button onClick={submit} disabled={save.isPending || !form.item_name.trim()} className="w-full">
        {item ? 'Save changes' : 'Add care item'}
      </Button>
    </div>
  );
}

function UploadForm({ items, onDone }: { items: PreventiveItem[]; onDone: () => void }) {
  const upload = useUploadMedicalDocument();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState({
    title: '',
    doc_type: 'lab_result',
    document_date: '',
    provider: '',
    person: '',
    notes: '',
    preventive_care_id: 'none',
  });
  const set = (k: string, v: string) => setMeta((m) => ({ ...m, [k]: v }));

  const submit = async () => {
    if (!file) return;
    await upload.mutateAsync({
      file,
      meta: {
        title: meta.title.trim() || file.name,
        doc_type: meta.doc_type,
        document_date: meta.document_date || null,
        provider: meta.provider.trim() || null,
        person: meta.person.trim() || null,
        notes: meta.notes.trim() || null,
        preventive_care_id: meta.preventive_care_id === 'none' ? null : meta.preventive_care_id,
      },
    });
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
    onDone();
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>File (PDF or image)</Label>
        <Input
          ref={fileRef}
          type="file"
          accept=".pdf,image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Title</Label>
          <Input value={meta.title} onChange={(e) => set('title', e.target.value)} placeholder="2026 annual labs" />
        </div>
        <div>
          <Label>Document type</Label>
          <Select value={meta.doc_type} onValueChange={(v) => set('doc_type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Document date</Label>
          <Input type="date" value={meta.document_date} onChange={(e) => set('document_date', e.target.value)} />
        </div>
        <div>
          <Label>Provider</Label>
          <Input value={meta.provider} onChange={(e) => set('provider', e.target.value)} />
        </div>
        <div>
          <Label>Person</Label>
          <Input value={meta.person} onChange={(e) => set('person', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label>Link to care item (optional)</Label>
          <Select value={meta.preventive_care_id} onValueChange={(v) => set('preventive_care_id', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not linked</SelectItem>
              {items.map((i) => (
                <SelectItem key={i.id} value={i.id}>{i.item_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label>Notes</Label>
          <Textarea value={meta.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
        </div>
      </div>
      <Button onClick={submit} disabled={!file || upload.isPending} className="w-full">
        <Upload className="mr-2 h-4 w-4" />
        {upload.isPending ? 'Uploading…' : 'Upload report'}
      </Button>
    </div>
  );
}

export default function PreventiveCareTab() {
  const { data: items = [], isLoading } = usePreventiveCare();
  const { data: docs = [] } = useMedicalDocuments();
  const seed = useSeedPreventiveCare();
  const save = useSavePreventiveCare();
  const del = useDeletePreventiveCare();
  const delDoc = useDeleteMedicalDocument();

  const [addOpen, setAddOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState<PreventiveItem | null>(null);

  const summary = useMemo(() => careCostSummary(items), [items]);
  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => {
        const da = dueStatus(a).days ?? 99999;
        const db = dueStatus(b).days ?? 99999;
        return da - db;
      }),
    [items],
  );

  const markDone = (item: PreventiveItem) => {
    const today = new Date().toISOString().slice(0, 10);
    save.mutate({
      id: item.id,
      last_completed_on: today,
      next_due_on: addMonths(today, item.frequency_months || 12),
      status: 'complete',
    });
  };

  const stats = [
    { icon: CalendarClock, label: 'Overdue', value: String(summary.overdue), tone: 'text-destructive' },
    { icon: Stethoscope, label: 'Due in 60 days', value: String(summary.dueSoon), tone: 'text-prism-amber' },
    { icon: ShieldCheck, label: 'Up to date', value: String(summary.upToDate), tone: 'text-prism-lime' },
    { icon: PiggyBank, label: 'Annual out-of-pocket', value: money(summary.annualOutOfPocket), tone: 'text-prism-teal' },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-0 prism-gradient-teal">
        <CardContent className="p-6">
          <p className="text-xs uppercase tracking-wide text-prism-on-dark-muted">
            Preventive care &amp; medical cost planner
          </p>
          <p className="mt-2 text-lg font-semibold text-prism-on-dark">
            Staying current on preventive care is worth roughly {money(summary.lifetimeSavings)} over 30
            years when the avoided reactive-care cost compounds at 6% inside an HSA.
          </p>
          <p className="mt-2 text-sm text-prism-on-dark-muted">
            Budgeted preventive spend: {money(summary.annualEstimate)}/yr total,{' '}
            {money(summary.annualOutOfPocket)}/yr from your pocket. Illustrative, not medical or tax
            advice.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((st) => (
          <Card key={st.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <st.icon className="h-4 w-4" />
                <span className="text-xs">{st.label}</span>
              </div>
              <p className={`mt-2 text-2xl font-semibold ${st.tone}`}>{st.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Screening &amp; appointment schedule</CardTitle>
          <div className="flex flex-wrap gap-2">
            {items.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => seed.mutate(DEFAULT_PREVENTIVE_ITEMS)}
                disabled={seed.isPending}
              >
                Add standard schedule
              </Button>
            )}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Add care item</DialogTitle></DialogHeader>
                <CareForm onDone={() => setAddOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && sorted.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nothing tracked yet. Add the standard schedule to start with physicals, dental, vision,
              labs and screenings.
            </p>
          )}
          {sorted.map((item) => {
            const st = dueStatus(item);
            return (
              <div key={item.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{item.item_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {CARE_TYPES.find((c) => c.value === item.care_type)?.label ?? item.care_type}
                      {item.person ? ` · ${item.person}` : ''}
                      {item.provider ? ` · ${item.provider}` : ''} · every {item.frequency_months} mo
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Last done {item.last_completed_on ?? '—'} · out-of-pocket{' '}
                      {money(Number(item.out_of_pocket ?? 0))}
                      {item.covered_by_insurance ? ' · insured' : ' · not covered'}
                    </p>
                    {item.notes && <p className="mt-1 text-xs text-muted-foreground">{item.notes}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={STATUS_TONE[st.key]}>{st.label}</Badge>
                    <Button variant="outline" size="sm" onClick={() => markDone(item)}>
                      Mark done
                    </Button>
                    <Dialog
                      open={editing?.id === item.id}
                      onOpenChange={(o) => setEditing(o ? item : null)}
                    >
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">Edit</Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[85vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>Edit care item</DialogTitle></DialogHeader>
                        <CareForm item={item} onDone={() => setEditing(null)} />
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${item.item_name}`}
                      onClick={() => del.mutate(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Medical reports vault</CardTitle>
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Upload report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Upload medical report</DialogTitle></DialogHeader>
              <UploadForm items={items} onDone={() => setUploadOpen(false)} />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Files are stored privately and only your household can open them. Links expire after five
            minutes.
          </p>
          {docs.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No reports uploaded yet — add lab results, visit summaries, imaging reports or EOBs.
            </p>
          )}
          {docs.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <div className="flex min-w-0 items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{d.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {DOC_TYPES.find((t) => t.value === d.doc_type)?.label ?? d.doc_type}
                    {d.document_date ? ` · ${d.document_date}` : ''}
                    {d.provider ? ` · ${d.provider}` : ''}
                    {d.person ? ` · ${d.person}` : ''}
                    {d.file_size ? ` · ${kb(d.file_size)}` : ''}
                  </p>
                  {d.notes && <p className="text-xs text-muted-foreground">{d.notes}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={parseDoc.isPending}
                  onClick={() => parseDoc.mutate(d.id)}
                >
                  {parseDoc.isPending && parseDoc.variables === d.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  {d.parsed_summary ? 'Re-parse' : 'Parse with AI'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => openMedicalDocument(d.file_path)}>
                  View
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${d.title}`}
                  onClick={() => delDoc.mutate(d)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <ParsedReportView doc={d} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
