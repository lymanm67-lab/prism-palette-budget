import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';
import { useState } from 'react';

export interface Metro2Finding {
  id: string;
  household_id: string;
  credit_account_id: string;
  severity: string;
  violation_type: string;
  title: string;
  explanation: string;
  metro2_principle: string | null;
  recommended_action: string | null;
  is_resolved: boolean;
  scan_batch_id: string | null;
  created_at: string;
}

export function useMetro2Findings() {
  const { household } = useHousehold();
  const queryClient = useQueryClient();
  const householdId = household?.id;
  const [scanning, setScanning] = useState(false);

  const query = useQuery({
    queryKey: ['metro2-findings', householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await (supabase as any)
        .from('metro2_findings')
        .select('*')
        .eq('household_id', householdId)
        .order('severity', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Metro2Finding[];
    },
    enabled: !!householdId,
  });

  const runScan = async () => {
    if (!householdId) return;
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('metro2-scan', {
        body: { household_id: householdId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      queryClient.invalidateQueries({ queryKey: ['metro2-findings'] });
      toast.success(`Scan complete — ${data.findings?.length || 0} issues found across ${data.accounts_analyzed} accounts`);
    } catch (e: any) {
      toast.error(e.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const toggleResolved = async (id: string, resolved: boolean) => {
    const { error } = await (supabase as any)
      .from('metro2_findings')
      .update({ is_resolved: resolved })
      .eq('id', id);
    if (error) toast.error(error.message);
    else queryClient.invalidateQueries({ queryKey: ['metro2-findings'] });
  };

  const findings = query.data || [];
  const high = findings.filter(f => f.severity === 'high' && !f.is_resolved).length;
  const medium = findings.filter(f => f.severity === 'medium' && !f.is_resolved).length;
  const low = findings.filter(f => f.severity === 'low' && !f.is_resolved).length;

  return { ...query, findings, high, medium, low, scanning, runScan, toggleResolved };
}
