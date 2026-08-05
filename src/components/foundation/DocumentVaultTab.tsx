import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Trash2, Upload, ExternalLink } from 'lucide-react';
import {
  useFdnDocuments,
  useUploadFdnDocument,
  useDeleteFdnOpsRow,
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

export default function DocumentVaultTab() {
  const { data: docs = [] } = useFdnDocuments();
  const upload = useUploadFdnDocument();
  const remove = useDeleteFdnOpsRow('fdn_documents');

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('formation');
  const [expires, setExpires] = useState('');
  const [notes, setNotes] = useState('');

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

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Upload a foundation document</CardTitle>
          <p className="text-xs text-muted-foreground">
            Private storage, visible only to your household. Keep the originals a funder, auditor, or attorney would ask
            for in one place.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="fdn-doc-file">File</Label>
              <Input
                id="fdn-doc-file"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
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
              {rows.map((d) => (
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
                      </p>
                      {d.notes && <p className="mt-1 text-xs text-muted-foreground">{d.notes}</p>}
                      {d.expires_at && (
                        <Badge
                          variant={d.expires_at < today ? 'destructive' : 'outline'}
                          className="mt-1 text-xs"
                        >
                          {d.expires_at < today ? 'Expired' : 'Renews'} {d.expires_at}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Open document"
                      disabled={!d.file_path}
                      onClick={() => d.file_path && openFdnDocument(d.file_path)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Delete document" onClick={() => remove.mutate(d.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      {docs.length === 0 && (
        <p className="text-sm text-muted-foreground">No documents stored yet.</p>
      )}
    </div>
  );
}
