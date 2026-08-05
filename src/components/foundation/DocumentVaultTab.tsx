import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Trash2, Upload, ExternalLink, Search, ScanText, Loader2 } from 'lucide-react';
import {
  useFdnDocuments,
  useUploadFdnDocument,
  useDeleteFdnOpsRow,
  useOcrFdnDocument,
  useSearchFdnDocuments,
  documentSnippets,
  openFdnDocument,
} from '@/hooks/use-foundation-ops';
import { DOC_CATEGORIES } from '@/lib/legacy/foundationOps';

const CATEGORY_HINTS: Record<string, string> = {
  formation: 'Articles, bylaws, EIN letter, organizing minutes',
  irs: 'Form 1023, determination letter, 990-PF filings',
  governance: 'Signed policies, conflict disclosures, board minutes',
  financial: 'Budgets, bank statements, audit or review letters',
  grants: 'Grant agreements, due diligence, grantee reports',
  insurance: 'D&O, general liability, property policies',
  contracts: 'Leases, vendor and service agreements',
  impact: 'Annual impact reports, evaluations, photos',
};

const OCR_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: { label: 'Not indexed', variant: 'outline' },
  processing: { label: 'Indexing…', variant: 'secondary' },
  indexed: { label: 'Searchable', variant: 'secondary' },
  empty: { label: 'No text found', variant: 'outline' },
  failed: { label: 'Index failed', variant: 'destructive' },
};

export default function DocumentVaultTab() {
  const { data: docs = [] } = useFdnDocuments();
  const upload = useUploadFdnDocument();
  const remove = useDeleteFdnOpsRow('fdn_documents');
  const ocr = useOcrFdnDocument();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('formation');
  const [expires, setExpires] = useState('');
  const [notes, setNotes] = useState('');
  const [term, setTerm] = useState('');

  const search = useSearchFdnDocuments(term);
  const searching = term.trim().length >= 2;
  const results = (search.data ?? []) as any[];

  const notIndexed = useMemo(
    () => (docs as any[]).filter((d) => d.file_path && !['indexed', 'processing'].includes(d.ocr_status)),
    [docs],
  );
  const indexedCount = (docs as any[]).filter((d) => d.ocr_status === 'indexed').length;

  const submit = () => {
    if (!file) return;
    upload.mutate(
      { file, title, doc_category: category, expires_at: expires || null, notes: notes || null },
      {
        onSuccess: () => {
          setFile(null);
          setTitle('');
          setExpires('');
          setNotes('');
        },
      },
    );
  };

  const indexAll = async () => {
    for (const d of notIndexed) {
      await ocr.mutateAsync(d.id).catch(() => undefined);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4 text-prism-teal" /> Search inside your documents
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Indexed files are searchable word by word — look for a clause, a date, a dollar figure, a party name, or a
            board decision and jump straight to the file that contains it. {indexedCount} of {(docs as any[]).length}{' '}
            documents indexed.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[240px] flex-1 space-y-1">
              <Label htmlFor="fdn-doc-search">Search terms</Label>
              <Input
                id="fdn-doc-search"
                value={term}
                placeholder="indemnification, conflict of interest, renewal date, board approved…"
                onChange={(e) => setTerm(e.target.value)}
              />
            </div>
            {notIndexed.length > 0 && (
              <Button variant="outline" className="gap-1.5" disabled={ocr.isPending} onClick={indexAll}>
                {ocr.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanText className="h-4 w-4" />}
                Index {notIndexed.length} remaining
              </Button>
            )}
          </div>

          {searching && search.isLoading && <p className="text-sm text-muted-foreground">Searching…</p>}
          {searching && !search.isLoading && results.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No matches. Documents must be indexed before their contents can be searched.
            </p>
          )}

          {searching &&
            results.map((d) => {
              const snippets = documentSnippets(d.ocr_text, term);
              const ex = d.extracted ?? {};
              const lowered = term.toLowerCase();
              const dates = (ex.key_dates ?? []).filter((k: any) =>
                `${k.date} ${k.label}`.toLowerCase().includes(lowered),
              );
              const clauses = (ex.clauses ?? []).filter((c: any) =>
                `${c.heading} ${c.text}`.toLowerCase().includes(lowered),
              );
              const decisions = (ex.decisions ?? []).filter((s: string) => s.toLowerCase().includes(lowered));
              return (
                <div key={d.id} className="rounded-md border border-border/50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-prism-teal" />
                      <p className="truncate text-sm font-medium">{d.title}</p>
                      <Badge variant="outline" className="capitalize">
                        {d.doc_category}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs"
                      disabled={!d.file_path}
                      onClick={() => d.file_path && openFdnDocument(d.file_path)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Open
                    </Button>
                  </div>

                  {snippets.map((s, i) => (
                    <p key={i} className="mt-2 border-l-2 border-prism-amber/60 pl-2 text-xs text-muted-foreground">
                      {s}
                    </p>
                  ))}
                  {clauses.slice(0, 3).map((c: any, i: number) => (
                    <p key={`c-${i}`} className="mt-2 text-xs">
                      <span className="font-medium">Clause — {c.heading}: </span>
                      <span className="text-muted-foreground">{c.text}</span>
                    </p>
                  ))}
                  {dates.slice(0, 4).map((k: any, i: number) => (
                    <p key={`d-${i}`} className="mt-1 text-xs">
                      <span className="font-medium">{k.date}: </span>
                      <span className="text-muted-foreground">{k.label}</span>
                    </p>
                  ))}
                  {decisions.slice(0, 3).map((s: string, i: number) => (
                    <p key={`x-${i}`} className="mt-1 text-xs">
                      <span className="font-medium">Decision: </span>
                      <span className="text-muted-foreground">{s}</span>
                    </p>
                  ))}
                  {snippets.length === 0 && clauses.length === 0 && dates.length === 0 && decisions.length === 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Matched on the title, file name, or notes for this document.
                    </p>
                  )}
                </div>
              );
            })}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Upload a foundation document</CardTitle>
          <p className="text-xs text-muted-foreground">
            Private storage, visible only to your household. Keep the originals a funder, auditor, or attorney would ask
            for in one place — then index each one so its contents are searchable.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="fdn-doc-file">File</Label>
              <Input id="fdn-doc-file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fdn-doc-title">Title</Label>
              <Input
                id="fdn-doc-title"
                value={title}
                placeholder={file?.name ?? 'Determination letter'}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fdn-doc-cat">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="fdn-doc-cat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{CATEGORY_HINTS[category]}</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="fdn-doc-exp">Expires / renews on</Label>
              <Input id="fdn-doc-exp" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="fdn-doc-notes">Notes</Label>
            <Textarea id="fdn-doc-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button onClick={submit} disabled={!file || upload.isPending} className="gap-1.5">
            <Upload className="h-4 w-4" />
            {upload.isPending ? 'Uploading…' : 'Store document'}
          </Button>
        </CardContent>
      </Card>

      {DOC_CATEGORIES.map((cat) => {
        const rows = (docs as any[]).filter((d) => d.doc_category === cat);
        if (rows.length === 0) return null;
        return (
          <Card key={cat} className="glass-card">
            <CardHeader>
              <CardTitle className="text-base capitalize">{cat}</CardTitle>
              <p className="text-xs text-muted-foreground">{CATEGORY_HINTS[cat]}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {rows.map((d) => {
                const badge = OCR_BADGE[d.ocr_status] ?? OCR_BADGE.pending;
                const ex = d.extracted ?? {};
                return (
                  <div
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/50 p-3"
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-prism-teal" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{d.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.file_name}
                          {d.size_bytes ? ` · ${Math.round(Number(d.size_bytes) / 1024)} KB` : ''}
                          {d.page_count ? ` · ${d.page_count} pages` : ''}
                        </p>
                        {d.notes && <p className="mt-1 text-xs text-muted-foreground">{d.notes}</p>}
                        {ex.summary && <p className="mt-1 text-xs text-muted-foreground">{ex.summary}</p>}
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge variant={badge.variant} className="text-xs">
                            {badge.label}
                          </Badge>
                          {(ex.clauses ?? []).length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {ex.clauses.length} clauses
                            </Badge>
                          )}
                          {(ex.key_dates ?? []).length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {ex.key_dates.length} dates
                            </Badge>
                          )}
                          {(ex.decisions ?? []).length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {ex.decisions.length} decisions
                            </Badge>
                          )}
                          {d.expires_at && (
                            <Badge variant={d.expires_at < today ? 'destructive' : 'outline'} className="text-xs">
                              {d.expires_at < today ? 'Expired' : 'Renews'} {d.expires_at}
                            </Badge>
                          )}
                        </div>
                        {d.ocr_error && <p className="mt-1 text-xs text-destructive">{d.ocr_error}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 text-xs"
                        disabled={!d.file_path || ocr.isPending}
                        onClick={() => ocr.mutate(d.id)}
                      >
                        {ocr.isPending && ocr.variables === d.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ScanText className="h-3.5 w-3.5" />
                        )}
                        {d.ocr_status === 'indexed' ? 'Re-index' : 'Index'}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Open document"
                        disabled={!d.file_path}
                        onClick={() => d.file_path && openFdnDocument(d.file_path)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Delete document"
                        onClick={() => remove.mutate(d.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {docs.length === 0 && <p className="text-sm text-muted-foreground">No documents stored yet.</p>}
    </div>
  );
}
