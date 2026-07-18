import { useRef, useState } from 'react';
import { Lock, Upload, FileText, FolderOpen, Download, Trash2, Loader2, ArrowRight, ScanSearch, Gavel, Home } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageOverview from '@/components/PageOverview';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

type CreditDoc = {
  id: string;
  file_name: string;
  bureau: string | null;
  document_type: string;
  storage_path: string;
  file_size: number | null;
  created_at: string;
};

const OTHER_CATEGORIES = [
  { label: 'Dispute Documents', icon: FileText, href: '/capital/disputes' },
  { label: 'Financial Statements', icon: FileText, href: '/capital/documents' },
  { label: 'Funding Applications', icon: FileText, href: '/capital/funding' },
  { label: 'Agency Formation Docs', icon: FolderOpen, href: '/capital/agencies' },
];

const DocumentVault = () => {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [bureau, setBureau] = useState<string>('Experian');
  const [uploading, setUploading] = useState(false);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['credit_documents', 'vault', household?.id],
    enabled: !!household?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('credit_documents')
        .select('id,file_name,bureau,document_type,storage_path,file_size,created_at')
        .eq('household_id', household!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CreditDoc[];
    },
  });

  const handleFile = async (file: File) => {
    if (!household?.id) {
      toast.error('No household loaded');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'pdf';
      const storagePath = `${household.id}/reports/${bureau.toLowerCase()}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('credit-documents')
        .upload(storagePath, file);
      if (upErr) throw upErr;
      const { error: insErr } = await (supabase as any).from('credit_documents').insert({
        household_id: household.id,
        document_type: 'credit_report',
        bureau,
        file_name: file.name,
        storage_path: storagePath,
        file_size: file.size,
      });
      if (insErr) throw insErr;
      toast.success('Credit report uploaded');
      qc.invalidateQueries({ queryKey: ['credit_documents'] });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const openDoc = async (path: string) => {
    const { data, error } = await supabase.storage
      .from('credit-documents')
      .createSignedUrl(path, 60 * 10);
    if (error || !data?.signedUrl) return toast.error('Could not open document');
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const deleteDoc = async (doc: CreditDoc) => {
    if (!confirm(`Delete ${doc.file_name}?`)) return;
    try {
      await supabase.storage.from('credit-documents').remove([doc.storage_path]);
      const { error } = await (supabase as any).from('credit_documents').delete().eq('id', doc.id);
      if (error) throw error;
      toast.success('Deleted');
      qc.invalidateQueries({ queryKey: ['credit_documents'] });
    } catch (e: any) {
      toast.error(e?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <PageOverview
        title="Secure Financial Document Vault"
        description="Encrypted storage for credit reports, disputes, and agency financials"
        icon={Lock}
        ttsScript="Encrypted storage for financial documents."
        features={['End-to-end encryption', 'Role-based access', 'Organized categories']}
      />

      <div className="flex items-start gap-3 rounded-lg border border-prism-teal/30 bg-prism-teal/5 p-4">
        <Lock className="h-5 w-5 text-prism-teal shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium">Household-scoped, private storage</p>
          <p className="text-xs text-muted-foreground">Documents are stored in a private bucket and only visible to your household members. Credit reports here are also visible in Home-Buying Readiness.</p>
        </div>
      </div>

      {/* Credit Reports */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-prism-teal" />
              <h3 className="font-medium text-sm">Credit Reports</h3>
              <Badge variant="outline" className="text-[10px]">{docs.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Select value={bureau} onValueChange={setBureau}>
                <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Experian">Experian</SelectItem>
                  <SelectItem value="Equifax">Equifax</SelectItem>
                  <SelectItem value="TransUnion">TransUnion</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.txt,.csv,.json,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading || !household?.id}>
                {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                Upload Credit Report
              </Button>
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : docs.length === 0 ? (
            <p className="text-sm text-muted-foreground border border-dashed border-border rounded-md p-4">
              No credit reports uploaded yet. Choose a bureau and click Upload.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {docs.map((d) => (
                <li key={d.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{d.file_name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                      {d.bureau && <Badge variant="outline" className="text-[10px]">{d.bureau}</Badge>}
                      <span>{new Date(d.created_at).toLocaleDateString()}</span>
                      {d.file_size && <span>· {(d.file_size / 1024).toFixed(0)} KB</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openDoc(d.storage_path)}>
                      <Download className="h-3.5 w-3.5 mr-1" /> Open
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteDoc(d)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 1-2-3 Next Steps workflow */}
      {docs.length > 0 && (
        <Card className="border-prism-teal/40 bg-prism-teal/5">
          <CardContent className="p-5 space-y-4">
            <div>
              <h3 className="font-semibold text-sm">You uploaded a credit report. Here's what to do next:</h3>
              <p className="text-xs text-muted-foreground">Work through these in order — each one builds on the last.</p>
            </div>
            <ol className="grid gap-3 md:grid-cols-3">
              {[
                { n: 1, icon: ScanSearch, title: 'Import & review accounts', body: 'Parse the report so every tradeline, balance, and utilization shows up in Credit Health.', cta: 'Go to Credit Overview', href: '/capital/credit-overview' },
                { n: 2, icon: Gavel, title: 'Flag errors & start disputes', body: 'Mark inaccurate items and generate Metro2-compliant dispute letters for each bureau.', cta: 'Open Dispute Manager', href: '/capital/disputes' },
                { n: 3, icon: Home, title: 'Share with Home-Buying', body: 'Attach the report to your lender packet in Home-Buying Readiness → Calculators.', cta: 'Open Home-Buying', href: '/home-buying-readiness' },
              ].map((s) => (
                <li key={s.n} className="rounded-lg border border-border/60 bg-background/60 p-4 flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="h-6 w-6 rounded-full bg-prism-teal text-white text-xs font-bold flex items-center justify-center">{s.n}</span>
                    <s.icon className="h-4 w-4 text-prism-teal" />
                    <p className="text-sm font-medium">{s.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground flex-1">{s.body}</p>
                  <Button asChild size="sm" variant="outline" className="mt-3 self-start">
                    <Link to={s.href}>{s.cta} <ArrowRight className="h-3 w-3 ml-1" /></Link>
                  </Button>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}


      {/* Other categories link out to their managers */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {OTHER_CATEGORIES.map((cat) => (
          <Link key={cat.label} to={cat.href}>
            <Card className="group hover:border-primary/30 cursor-pointer transition-colors h-full">
              <CardContent className="p-6 text-center">
                <cat.icon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="font-medium text-sm">{cat.label}</p>
                <p className="text-xs text-muted-foreground mt-1">Manage →</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default DocumentVault;
