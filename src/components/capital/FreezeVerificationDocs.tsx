import { useEffect, useState } from 'react';
import { Upload, FileText, Trash2, Loader2, ShieldCheck, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';

type DocKind = {
  key: string;
  label: string;
  hint: string;
};

const DOC_KINDS: DocKind[] = [
  { key: 'freeze_gov_id', label: 'Government ID', hint: "Driver's license, state ID, or passport (front & back if applicable)" },
  { key: 'freeze_ssn', label: 'Social Security Card', hint: 'Copy of SSN card or SSA letter. Redact all but last 4 if bureau allows.' },
  { key: 'freeze_utility', label: 'Proof of Address', hint: 'Utility bill, bank statement, or lease dated within 60 days' },
  { key: 'freeze_other', label: 'Other Supporting Doc', hint: 'Police report (ID theft), FTC affidavit, court order, name-change doc' },
];

type Row = {
  id: string;
  document_type: string;
  file_name: string;
  storage_path: string;
  file_size: number | null;
  notes: string | null;
  created_at: string;
};

export default function FreezeVerificationDocs() {
  const { household } = useHousehold();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    if (!household) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('credit_documents')
      .select('id,document_type,file_name,storage_path,file_size,notes,created_at')
      .eq('household_id', household.id)
      .in('document_type', DOC_KINDS.map(d => d.key))
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [household?.id]);

  const upload = async (kind: DocKind, file: File) => {
    if (!household) return;
    if (file.size > 15 * 1024 * 1024) { toast.error('Max 15 MB'); return; }
    setBusy(kind.key);
    try {
      const path = `${household.id}/freeze/${kind.key}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from('credit-documents')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from('credit_documents').insert({
        household_id: household.id,
        document_type: kind.key,
        file_name: file.name,
        storage_path: path,
        file_size: file.size,
        notes: kind.label,
      });
      if (insErr) throw insErr;
      toast.success(`${kind.label} uploaded`);
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setBusy(null);
    }
  };

  const open = async (row: Row) => {
    const { data, error } = await supabase.storage
      .from('credit-documents')
      .createSignedUrl(row.storage_path, 300);
    if (error || !data?.signedUrl) { toast.error('Unable to open'); return; }
    window.open(data.signedUrl, '_blank');
  };

  const remove = async (row: Row) => {
    if (!confirm(`Delete ${row.file_name}?`)) return;
    await supabase.storage.from('credit-documents').remove([row.storage_path]);
    await supabase.from('credit_documents').delete().eq('id', row.id);
    toast.success('Deleted');
    load();
  };

  const byKind = (k: string) => rows.filter(r => r.document_type === k);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Freeze Verification Documents
        </CardTitle>
        <CardDescription>
          Most bureaus require ID + proof of address to place a freeze by mail. Upload once here and reuse across all 10 bureaus. Files are private and household-scoped.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          {DOC_KINDS.map((k) => {
            const items = byKind(k.key);
            return (
              <div key={k.key} className="rounded-xl border border-border/40 bg-muted/20 p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <div className="text-sm font-semibold flex items-center gap-2">
                      {k.label}
                      {items.length > 0 && <Badge variant="outline" className="text-[10px]">{items.length}</Badge>}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{k.hint}</div>
                  </div>
                  <label className="shrink-0">
                    <Button size="sm" variant="outline" asChild disabled={busy !== null}>
                      <span className="cursor-pointer">
                        {busy === k.key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                        <span className="ml-1">Upload</span>
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="application/pdf,image/png,image/jpeg,image/webp,image/heic"
                      className="hidden"
                      disabled={busy !== null}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) upload(k, f);
                        e.currentTarget.value = '';
                      }}
                    />
                  </label>
                </div>

                {items.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {items.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-2 rounded-md bg-background/60 px-2 py-1 text-xs">
                        <button onClick={() => open(r)} className="flex items-center gap-2 min-w-0 hover:underline text-left flex-1">
                          <FileText className="h-3 w-3 shrink-0 text-primary" />
                          <span className="truncate">{r.file_name}</span>
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => open(r)}>
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => remove(r)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
          <strong className="text-foreground">Tip:</strong> When mailing a freeze request, include a photocopy of your government ID and one proof-of-address document. For online portals, you'll typically upload the same files. Keep originals — never mail them.
        </div>

        {loading && <div className="text-xs text-muted-foreground">Loading…</div>}
      </CardContent>
    </Card>
  );
}
