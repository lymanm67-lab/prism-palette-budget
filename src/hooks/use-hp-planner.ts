// Consolidated hooks for the Home Purchase Planner.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { generateTimeline, defaultRules, defaultRisks, defaultDocuments } from '@/lib/home-buying/planner/timeline-generator';
import { toast } from 'sonner';

// ============ Project ============
export function useHpProject() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['hp_project', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hp_projects' as any)
        .select('*')
        .eq('household_id', household!.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}

export function useCreateProject() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      target_close_date: string;
      target_price?: number;
      max_monthly_payment?: number;
      down_payment_target?: number;
      loan_type_preference?: string;
    }) => {
      if (!household) throw new Error('No household');
      const startDate = new Date();
      const closeDate = new Date(input.target_close_date);

      // Insert project
      const { data: proj, error: pErr } = await supabase
        .from('hp_projects' as any)
        .insert({
          household_id: household.id,
          start_date: startDate.toISOString().slice(0, 10),
          target_close_date: input.target_close_date,
          target_price: input.target_price ?? null,
          max_monthly_payment: input.max_monthly_payment ?? null,
          down_payment_target: input.down_payment_target ?? null,
          loan_type_preference: input.loan_type_preference ?? null,
        } as any)
        .select()
        .single();
      if (pErr) throw pErr;
      const project = proj as any;

      // Seed milestones + tasks
      const timeline = generateTimeline(startDate, closeDate);
      for (const m of timeline) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + m.month_index);
        dueDate.setDate(28);
        const { data: milestone, error: mErr } = await supabase
          .from('hp_milestones' as any)
          .insert({
            project_id: project.id,
            household_id: household.id,
            month_index: m.month_index,
            month_label: m.month_label,
            title: m.title,
            description: m.description,
            due_date: dueDate.toISOString().slice(0, 10),
          } as any)
          .select()
          .single();
        if (mErr) throw mErr;
        const ms = milestone as any;

        const taskRows = m.tasks.map((t) => {
          const td = new Date(dueDate);
          td.setDate(7 * t.week_index);
          return {
            milestone_id: ms.id,
            project_id: project.id,
            household_id: household.id,
            week_index: t.week_index,
            title: t.title,
            priority: t.priority,
            estimated_hours: t.estimated_hours,
            due_date: td.toISOString().slice(0, 10),
          };
        });
        if (taskRows.length) {
          const { error: tErr } = await supabase.from('hp_tasks' as any).insert(taskRows as any);
          if (tErr) throw tErr;
        }
      }

      // Seed default rules
      const rules = defaultRules().map((r) => ({ ...r, project_id: project.id, household_id: household.id }));
      await supabase.from('hp_rules' as any).insert(rules as any);

      // Seed default risks
      const risks = defaultRisks().map((r) => ({ ...r, project_id: project.id, household_id: household.id }));
      await supabase.from('hp_risks' as any).insert(risks as any);

      // Seed required documents
      const docs = defaultDocuments().map((d) => ({ ...d, project_id: project.id, household_id: household.id }));
      await supabase.from('hp_documents' as any).insert(docs as any);

      return project;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hp_project'] });
      qc.invalidateQueries({ queryKey: ['hp_milestones'] });
      qc.invalidateQueries({ queryKey: ['hp_tasks'] });
      qc.invalidateQueries({ queryKey: ['hp_rules'] });
      qc.invalidateQueries({ queryKey: ['hp_risks'] });
      qc.invalidateQueries({ queryKey: ['hp_documents'] });
      toast.success('Home purchase plan created');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to create plan'),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from('hp_projects' as any).update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hp_project'] }),
  });
}

// ============ Milestones ============
export function useHpMilestones(projectId?: string) {
  return useQuery({
    queryKey: ['hp_milestones', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hp_milestones' as any)
        .select('*')
        .eq('project_id', projectId!)
        .is('deleted_at', null)
        .order('month_index');
      if (error) throw error;
      return (data as any[]) || [];
    },
  });
}

export function useUpdateMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from('hp_milestones' as any).update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hp_milestones'] }),
  });
}

// ============ Tasks ============
export function useHpTasks(projectId?: string) {
  return useQuery({
    queryKey: ['hp_tasks', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hp_tasks' as any)
        .select('*')
        .eq('project_id', projectId!)
        .is('deleted_at', null)
        .order('due_date');
      if (error) throw error;
      return (data as any[]) || [];
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from('hp_tasks' as any).update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hp_tasks'] }),
  });
}

export function useAddTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      const { error } = await supabase.from('hp_tasks' as any).insert(row);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hp_tasks'] }),
  });
}

// ============ Documents ============
export function useHpDocuments(projectId?: string) {
  return useQuery({
    queryKey: ['hp_documents', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hp_documents' as any)
        .select('*')
        .eq('project_id', projectId!)
        .is('deleted_at', null)
        .order('created_at');
      if (error) throw error;
      return (data as any[]) || [];
    },
  });
}

export function useUpdateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from('hp_documents' as any).update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hp_documents'] }),
  });
}

// ============ Risks ============
export function useHpRisks(projectId?: string) {
  return useQuery({
    queryKey: ['hp_risks', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hp_risks' as any)
        .select('*')
        .eq('project_id', projectId!)
        .is('deleted_at', null);
      if (error) throw error;
      return (data as any[]) || [];
    },
  });
}

export function useUpdateRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from('hp_risks' as any).update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hp_risks'] }),
  });
}

export function useAddRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      const { error } = await supabase.from('hp_risks' as any).insert(row);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hp_risks'] }),
  });
}

// ============ Rules ============
export function useHpRules(projectId?: string) {
  return useQuery({
    queryKey: ['hp_rules', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hp_rules' as any)
        .select('*')
        .eq('project_id', projectId!)
        .is('deleted_at', null);
      if (error) throw error;
      return (data as any[]) || [];
    },
  });
}

export function useUpdateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from('hp_rules' as any).update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hp_rules'] }),
  });
}

export function useAddRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      const { error } = await supabase.from('hp_rules' as any).insert(row);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hp_rules'] }),
  });
}

// ============ Scenarios ============
export function useHpScenarios(projectId?: string) {
  return useQuery({
    queryKey: ['hp_scenarios', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hp_scenarios' as any)
        .select('*')
        .eq('project_id', projectId!)
        .is('deleted_at', null);
      if (error) throw error;
      return (data as any[]) || [];
    },
  });
}

export function useSaveScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      const { error } = await supabase.from('hp_scenarios' as any).insert(row);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hp_scenarios'] }),
  });
}

// ============ Notes ============
export function useHpNotes(projectId?: string, monthIndex?: number) {
  return useQuery({
    queryKey: ['hp_notes', projectId, monthIndex],
    enabled: !!projectId,
    queryFn: async () => {
      let q = supabase.from('hp_notes' as any).select('*').eq('project_id', projectId!).is('deleted_at', null);
      if (monthIndex !== undefined) q = q.eq('month_index', monthIndex);
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      return (data as any[]) || [];
    },
  });
}

export function useAddNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      const { error } = await supabase.from('hp_notes' as any).insert(row);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hp_notes'] }),
  });
}

// ============ Worksheets ============
export function useHpWorksheet(projectId: string | undefined, type: string) {
  return useQuery({
    queryKey: ['hp_worksheet', projectId, type],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hp_worksheets' as any)
        .select('*')
        .eq('project_id', projectId!)
        .eq('worksheet_type', type)
        .is('deleted_at', null)
        .maybeSingle();
      if (error) throw error;
      return (data as any) || null;
    },
  });
}

export function useSaveWorksheet() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ project_id, worksheet_type, data }: { project_id: string; worksheet_type: string; data: any }) => {
      if (!household) throw new Error('No household');
      const { data: existing } = await supabase
        .from('hp_worksheets' as any)
        .select('id')
        .eq('project_id', project_id)
        .eq('worksheet_type', worksheet_type)
        .is('deleted_at', null)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase.from('hp_worksheets' as any).update({ data }).eq('id', (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('hp_worksheets' as any)
          .insert({ project_id, worksheet_type, household_id: household.id, data } as any);
        if (error) throw error;
      }
    },
    onSuccess: (_r, v) => qc.invalidateQueries({ queryKey: ['hp_worksheet', v.project_id, v.worksheet_type] }),
  });
}

// ============ Coach ============
export function useHpCoach(projectId?: string, sectionKey?: string, monthIndex?: number | null) {
  return useQuery({
    queryKey: ['hp_coach', projectId, sectionKey, monthIndex],
    enabled: !!projectId && !!sectionKey,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('home-purchase-coach', {
        body: { project_id: projectId, section_key: sectionKey, month_index: monthIndex ?? null },
      });
      if (error) throw error;
      return data as { content_md: string; cached: boolean };
    },
  });
}

export function useRefreshHpCoach() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, sectionKey, monthIndex }: { projectId: string; sectionKey: string; monthIndex?: number | null }) => {
      const { data, error } = await supabase.functions.invoke('home-purchase-coach', {
        body: { project_id: projectId, section_key: sectionKey, month_index: monthIndex ?? null, force: true },
      });
      if (error) throw error;
      return data as { content_md: string; cached: boolean };
    },
    onSuccess: (data, v) => {
      qc.setQueryData(['hp_coach', v.projectId, v.sectionKey, v.monthIndex ?? null], data);
    },
  });
}
