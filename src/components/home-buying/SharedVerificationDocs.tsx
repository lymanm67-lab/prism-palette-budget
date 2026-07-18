import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Download, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const KINDS = ['freeze_gov_id', 'freeze_ssn', 'freeze_utility', 'freeze_other'];
const LABELS: Record<string, string> = {
  freeze_gov_id: 'Government ID',
  freeze_ssn: 'Social Security Card',
  freeze_utility: 'Proof of Address',
  freeze_other: 'Other Supporting Doc',
};

type Doc = {
  id: string;
  file_name: string;
  document_type: string;
  storage_path: string;
  created_at: string;
};

export default function SharedVerificationDocs() {
  const { household } = useHousehold();

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['freeze_verification_docs', 'home-buying', household?.id],
    enabled: !!household?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('credit_documents')
        .select('id,file_name,document_type,storage_path,created_at')
        .eq('household_id', household!.id)
        .in('document_type', KINDS)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Doc[];
    },
  });

  const open = async (path: string) => {
    const { data, error } = await supabase.storage
      .from('credit-documents')
      .createSignedUrl(path, 600);
    if (error || !data?.signedUrl) { toast.error('Could not open'); return; }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-prism-teal" />
          Verification Documents (ID / SSN / Proof of Address)
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          The same ID and proof-of-address files you uploaded for credit freezes are shared here for lender verification.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : docs.length === 0 ? (
          <div className="text-sm text-muted-foreground border border-dashed border-border rounded-md p-4 flex items-center justify-between gap-3">
            <span>No verification documents uploaded yet.</span>
            <Button asChild size="sm" variant="outline">
              <Link to="/capital/secondary-freeze">
                Upload in Freeze Hub <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {docs.map((d) => (
              <li key={d.id} className="py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{d.file_name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{LABELS[d.document_type] || d.document_type}</Badge>
                    <span>{new Date(d.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => open(d.storage_path)}>
                  <Download className="h-3.5 w-3.5 mr-1" /> Open
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="text-xs text-muted-foreground">
          Manage in <Link to="/capital/secondary-freeze" className="text-prism-teal underline">Freeze Verification Hub</Link>.
        </div>
      </CardContent>
    </Card>
  );
}
