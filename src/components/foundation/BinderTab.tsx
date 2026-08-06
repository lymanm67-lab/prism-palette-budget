import { useMemo, useState } from 'react';
import { FileText, Plus, Pencil, Trash2, Copy, Printer, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useFdnSettings } from '@/hooks/use-foundation';
import {
  useBinderDocs, useSaveBinderDoc, useDeleteBinderDoc, useNewBinderVersion,
} from '@/hooks/use-foundation-binder';
import {
  BINDER_SECTIONS, BINDER_STATUSES, STATUS_LABELS, STATUS_TONE,
  binderProgress, docControl, docFooter, latestVersions, nextDocCode,
  type BinderDoc, type BinderStatus,
} from '@/lib/legacy/foundationBinder';

const emptyForm = {
  id: '' as string,
  doc_code: '',
  title: '',
  purpose: '',
  body: '',
  status: 'draft' as BinderStatus,
  prepared_by: '',
  reviewed_by: '',
  approved_on: '',
  effective_on: '',
  review_due_on: '',
  cross_refs: '',
  sort_order: 0,
};

type Form = typeof emptyForm;

export default function BinderTab() {
  const settings = useFdnSettings();
  const docs = useBinderDocs();
  const save = useSaveBinderDoc();
  const del = useDeleteBinderDoc();
  const newVersion = useNewBinderVersion();

  const [section, setSection] = useState(BINDER_SECTIONS[0].key);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [historyFor, setHistoryFor] = useState<string | null>(null);

  const org = settings.data?.organization_name ?? 'Dr. Lyman A. Montgomery Family Foundation';
  const all = docs.data ?? [];
  const sectionDocs = useMemo(() => all.filter((d) => d.section === section), [all, section]);
  const live = useMemo(() => latestVersions(sectionDocs), [sectionDocs]);
  const progress = useMemo(() => binderProgress(all), [all]);
  const def = BINDER_SECTIONS.find((s) => s.key === section)!;

  const openNew = () => {
    setForm({ ...emptyForm, doc_code: nextDocCode(section, sectionDocs), sort_order: live.length });
    setOpen(true);
  };

  const openEdit = (d: BinderDoc) => {
    setForm({
      id: d.id,
      doc_code: d.doc_code,
      title: d.title,
      purpose: d.purpose ?? '',
      body: d.body ?? '',
      status: d.status,
      prepared_by: d.prepared_by ?? '',
      reviewed_by: d.reviewed_by ?? '',
      approved_on: d.approved_on ?? '',
      effective_on: d.effective_on ?? '',
      review_due_on: d.review_due_on ?? '',
      cross_refs: (d.cross_refs ?? []).join(', '),
      sort_order: d.sort_order,
    });
    setOpen(true);
  };

  const submit = () => {
    if (!form.title.trim() || !form.doc_code.trim()) return;
    save.mutate(
      {
        ...(form.id ? { id: form.id } : {}),
        section,
        doc_code: form.doc_code.trim(),
        title: form.title.trim(),
        purpose: form.purpose || null,
        body: form.body || null,
        status: form.status,
        prepared_by: form.prepared_by || null,
        reviewed_by: form.reviewed_by || null,
        approved_on: form.approved_on || null,
        effective_on: form.effective_on || null,
        review_due_on: form.review_due_on || null,
        cross_refs: form.cross_refs
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        sort_order: form.sort_order,
      },
      { onSuccess: () => setOpen(false) },
    );
  };

  const printDoc = (d: BinderDoc) => {
    const c = docControl(d, org);
    const w = window.open('', '_blank');
    if (!w) return;
    const rows = [
      ['Document code', c.docCode],
      ['Version', c.version],
      ['Status', c.status],
      ['Effective', c.effective],
      ['Approved', c.approved],
      ['Next review', c.reviewDue],
      ['Prepared by', c.preparedBy],
      ['Reviewed by', c.reviewedBy],
    ];
    w.document.write(`<!doctype html><html><head><title>${c.docCode} ${c.title}</title>
<style>
body{font-family:Georgia,serif;margin:48px;color:#111;line-height:1.55}
h1{font-size:20px;margin:0 0 4px}
.org{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#666}
table{border-collapse:collapse;margin:18px 0;font-size:12px;width:100%}
td{border:1px solid #ccc;padding:6px 8px}
td:first-child{width:150px;color:#555}
.purpose{font-style:italic;color:#444}
.body{white-space:pre-wrap;font-size:14px}
footer{margin-top:36px;border-top:1px solid #ccc;padding-top:8px;font-size:11px;color:#666}
</style></head><body>
<div class="org">${org}</div>
<h1>${c.docCode} — ${c.title}</h1>
<table>${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>
${d.purpose ? `<p class="purpose">${d.purpose}</p>` : ''}
<div class="body">${(d.body ?? 'No content drafted yet.').replace(/</g, '&lt;')}</div>
<footer>${docFooter(d, org)}</footer>
</body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-prism-amber">Binder control</p>
            <p className="text-base font-semibold">Formation &amp; Governance Binder</p>
            <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">
              Every binder document carries a control header: code, version, status, effective and review dates, and who
              prepared and reviewed it. Approving a document locks it; editing later creates a new version and marks the
              old one superseded.
            </p>
          </div>
          <div className="min-w-[180px]">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-muted-foreground">Approved</span>
              <span className="font-semibold">{progress.approved}/{progress.total}</span>
            </div>
            <Progress value={progress.pct} className="mt-1.5 h-2" />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {progress.draft} draft · {progress.inReview} in review
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs value={section} onValueChange={setSection} className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          {BINDER_SECTIONS.map((s) => (
            <TabsTrigger key={s.key} value={s.key} className="text-xs sm:text-sm">
              {s.tabLabel}
            </TabsTrigger>
          ))}
        </TabsList>

        {BINDER_SECTIONS.map((s) => (
          <TabsContent key={s.key} value={s.key} className="space-y-4">
            <Card className="glass-card">
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4 text-prism-amber" />
                    {s.title}
                  </CardTitle>
                  <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{s.blurb}</p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1.5" onClick={openNew}>
                      <Plus className="h-4 w-4" />
                      Add document
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{form.id ? 'Edit document' : 'New binder document'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label>Document code</Label>
                        <Input value={form.doc_code} onChange={(e) => setForm({ ...form, doc_code: e.target.value })} />
                      </div>
                      <div>
                        <Label>Status</Label>
                        <Select
                          value={form.status}
                          onValueChange={(v) => setForm({ ...form, status: v as BinderStatus })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {BINDER_STATUSES.map((st) => (
                              <SelectItem key={st} value={st}>{STATUS_LABELS[st]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Title</Label>
                        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Purpose</Label>
                        <Input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Body</Label>
                        <Textarea
                          rows={8}
                          value={form.body}
                          onChange={(e) => setForm({ ...form, body: e.target.value })}
                          placeholder="Document text. Leave blank now — the AI document writer fills this in a later step."
                        />
                      </div>
                      <div>
                        <Label>Prepared by</Label>
                        <Input value={form.prepared_by} onChange={(e) => setForm({ ...form, prepared_by: e.target.value })} />
                      </div>
                      <div>
                        <Label>Reviewed by</Label>
                        <Input value={form.reviewed_by} onChange={(e) => setForm({ ...form, reviewed_by: e.target.value })} />
                      </div>
                      <div>
                        <Label>Effective date</Label>
                        <Input type="date" value={form.effective_on} onChange={(e) => setForm({ ...form, effective_on: e.target.value })} />
                      </div>
                      <div>
                        <Label>Approved date</Label>
                        <Input type="date" value={form.approved_on} onChange={(e) => setForm({ ...form, approved_on: e.target.value })} />
                      </div>
                      <div>
                        <Label>Next review due</Label>
                        <Input type="date" value={form.review_due_on} onChange={(e) => setForm({ ...form, review_due_on: e.target.value })} />
                      </div>
                      <div>
                        <Label>Cross-references</Label>
                        <Input
                          value={form.cross_refs}
                          onChange={(e) => setForm({ ...form, cross_refs: e.target.value })}
                          placeholder="GV-001, FN-002"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                      <Button onClick={submit} disabled={save.isPending}>Save</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-2">
                {docs.isLoading && <p className="text-sm text-muted-foreground">Loading binder…</p>}
                {!docs.isLoading && live.length === 0 && (
                  <p className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                    No documents in this section yet. Add the first one to start the binder index.
                  </p>
                )}
                {live.map((d) => {
                  const versions = sectionDocs.filter((x) => x.doc_code === d.doc_code).sort((a, b) => b.version - a.version);
                  return (
                    <div key={d.id} className="rounded-lg border border-border/50 bg-muted/20 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">{d.doc_code}</span>
                            <span className="text-sm font-medium">{d.title}</span>
                            <Badge className={STATUS_TONE[d.status]} variant="secondary">
                              {STATUS_LABELS[d.status]}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">v{d.version}.0</span>
                          </div>
                          {d.purpose && <p className="mt-1 text-xs text-muted-foreground">{d.purpose}</p>}
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Effective {d.effective_on ?? '—'} · Review due {d.review_due_on ?? '—'}
                            {d.cross_refs?.length ? ` · Refs: ${d.cross_refs.join(', ')}` : ''}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button size="icon" variant="ghost" title="Print / PDF" onClick={() => printDoc(d)}>
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" title="Edit" onClick={() => openEdit(d)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="New version"
                            onClick={() => newVersion.mutate(d)}
                            disabled={newVersion.isPending}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {versions.length > 1 && (
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Version history"
                              onClick={() => setHistoryFor(historyFor === d.doc_code ? null : d.doc_code)}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" title="Remove" onClick={() => del.mutate(d.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      {historyFor === d.doc_code && (
                        <ul className="mt-2 space-y-1 border-t border-border/50 pt-2">
                          {versions.map((v) => (
                            <li key={v.id} className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>v{v.version}.0 · {STATUS_LABELS[v.status]}</span>
                              <span>{new Date(v.updated_at).toLocaleDateString()}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
