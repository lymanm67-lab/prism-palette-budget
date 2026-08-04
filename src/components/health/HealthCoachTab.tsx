import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import ReactMarkdown from 'react-markdown';
import { Bot, RefreshCw, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useHealthReports } from '@/hooks/use-health';
import { formatDate } from '@/lib/health/healthEngine';
import { useQueryClient } from '@tanstack/react-query';

export default function HealthCoachTab() {
  const { household } = useHousehold();
  const { data: reports = [], isLoading } = useHealthReports();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (kind: 'daily' | 'weekly' | 'monthly') => {
    if (!household) return;
    setBusy(kind);
    try {
      const { data, error } = await supabase.functions.invoke('health-coach', {
        body: { household_id: household.id, report_type: kind },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      qc.invalidateQueries({ queryKey: ['health_coach_reports', household.id] });
      toast.success(`${kind} brief ready`);
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (msg.includes('429')) toast.error('AI is rate limited — try again shortly.');
      else if (msg.includes('402')) toast.error('AI credits exhausted. Add credits in Settings.');
      else toast.error(msg || 'Could not generate the brief');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4 text-prism-teal" /> AI Health Coach
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The coach reads only your logged data — walks, weigh-ins, protein, water, meals, energy and
            grocery spend — and writes a grounded brief. Educational support, not medical advice.
          </p>
          <div className="flex flex-wrap gap-2">
            {(['daily', 'weekly', 'monthly'] as const).map((k) => (
              <Button key={k} variant={k === 'daily' ? 'default' : 'outline'} onClick={() => run(k)} disabled={busy != null}>
                {busy === k ? (
                  <RefreshCw className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <CalendarDays className="mr-1 h-4 w-4" />
                )}
                {k === 'daily' ? 'Morning brief' : k === 'weekly' ? 'Weekly review' : 'Monthly report'}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {isLoading && <Skeleton className="h-48 w-full" />}

      {!isLoading && reports.length === 0 && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No briefs yet. Generate your first one above.
          </CardContent>
        </Card>
      )}

      {reports.map((r) => (
        <Card key={r.id}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between gap-3 text-base">
              <span className="capitalize">{r.report_type} brief</span>
              <Badge variant="outline">{formatDate(String(r.created_at).slice(0, 10))}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{r.content ?? ''}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
