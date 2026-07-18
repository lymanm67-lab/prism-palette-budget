import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

type CreditDoc = {
  id: string;
  file_name: string;
  bureau: string | null;
  document_type: string;
  storage_path: string;
  file_size: number | null;
  created_at: string;
};

export default function SharedCreditReports() {
  const { household } = useHousehold();

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['credit_documents', 'home-buying', household?.id],
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

  const openDoc = async (path: string) => {
    const { data, error } = await supabase.storage
      .from('credit-documents')
      .createSignedUrl(path, 60 * 10);
    if (error || !data?.signedUrl) {
      toast.error('Could not open document');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4 text-prism-teal" />
          Your Credit Reports
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Credit reports you upload in Capital → Credit are shared here so your lender packet stays in one place.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : docs.length === 0 ? (
          <div className="text-sm text-muted-foreground border border-dashed border-border rounded-md p-4 flex items-center justify-between gap-3">
            <span>No credit reports uploaded yet.</span>
            <Button asChild size="sm" variant="outline">
              <Link to="/capital/credit">
                Upload in Credit <ExternalLink className="h-3 w-3 ml-1" />
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
                    {d.bureau && <Badge variant="outline" className="text-[10px]">{d.bureau}</Badge>}
                    <span>{d.document_type.replace(/_/g, ' ')}</span>
                    <span>·</span>
                    <span>{new Date(d.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => openDoc(d.storage_path)}>
                  <Download className="h-3.5 w-3.5 mr-1" /> Open
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="text-xs text-muted-foreground">
          Need to add more? <Link to="/capital/credit" className="text-prism-teal underline">Go to Credit Reports</Link>.
        </div>
      </CardContent>
    </Card>
  );
}
