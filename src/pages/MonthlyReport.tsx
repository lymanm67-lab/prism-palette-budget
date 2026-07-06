import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RefreshCcw, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface ReportRow {
  id: string;
  message: string;
  metadata: any;
  created_at: string;
}

export default function MonthlyReport() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['monthly_reports', household?.id],
    enabled: !!household?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_insights')
        .select('id, message, metadata, created_at')
        .eq('household_id', household!.id)
        .eq('insight_type', 'monthly_report')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ReportRow[];
    },
  });

  useEffect(() => {
    if (!selectedId && reports.length) setSelectedId(reports[0].id);
  }, [reports, selectedId]);

  const active = reports.find((r) => r.id === selectedId) || reports[0];

  const runReport = async () => {
    if (!household?.id) return;
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('monthly-spending-report', {
        body: { household_id: household.id },
      });
      if (error) throw error;
      toast.success(`Report generated for ${data?.results?.[0]?.month ?? 'last month'}`);
      await qc.invalidateQueries({ queryKey: ['monthly_reports', household.id] });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to run report');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <FileText className="h-6 w-6 text-prism-orange" />
            Monthly Spending Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Auto-generated on the 1st of each month. Shows overages, wrong-account charges,
            unsplit multi-entity charges, and AI-written next-month steps.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {reports.length > 0 && (
            <Select value={selectedId ?? undefined} onValueChange={setSelectedId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select report" />
              </SelectTrigger>
              <SelectContent>
                {reports.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.metadata?.month || new Date(r.created_at).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={runReport} disabled={running || !household?.id}>
            {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
            Run for last month
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : !active ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No monthly report yet. Click <strong>Run for last month</strong> to generate one.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{active.metadata?.title || `Monthly Report — ${active.metadata?.month ?? ''}`}</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{active.message}</ReactMarkdown>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
