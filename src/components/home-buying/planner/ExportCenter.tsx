import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown, FileText, FileSpreadsheet, Files, Calendar, Package } from 'lucide-react';
import { exportToPdf, exportToCsv } from '@/lib/export-utils';
import { toast } from 'sonner';
import { useHpMilestones, useHpTasks, useHpDocuments, useHpRisks, useHpRules } from '@/hooks/use-hp-planner';

export default function ExportCenter({ projectId, project }: { projectId: string; project: any }) {
  const { data: milestones = [] } = useHpMilestones(projectId);
  const { data: tasks = [] } = useHpTasks(projectId);
  const { data: docs = [] } = useHpDocuments(projectId);
  const { data: risks = [] } = useHpRisks(projectId);
  const { data: rules = [] } = useHpRules(projectId);

  const exportFullPdf = async () => {
    const el = document.getElementById('planner-print-root');
    if (!el) return toast.error('Nothing to export yet');
    toast.info('Generating PDF…');
    try { await exportToPdf(el, `home-purchase-plan-${new Date().toISOString().slice(0, 10)}`); toast.success('PDF exported'); }
    catch (e: any) { toast.error(e.message || 'Export failed'); }
  };

  const exportMonthlyReport = async () => {
    const el = document.getElementById('monthly-view-root') || document.getElementById('planner-print-root');
    if (!el) return toast.error('Open a month first');
    toast.info('Generating monthly report…');
    try { await exportToPdf(el, `monthly-report-${new Date().toISOString().slice(0, 10)}`); toast.success('Monthly report exported'); }
    catch (e: any) { toast.error(e.message || 'Export failed'); }
  };

  const exportLenderPacket = () => {
    const rows: (string | number)[][] = [
      ['Section', 'Item', 'Detail'],
      ['Project', 'Target Close', project.target_close_date],
      ['Project', 'Target Price', project.target_price || ''],
      ['Project', 'Down Payment Target', project.down_payment_target || ''],
      ['Project', 'Loan Type', project.loan_type_preference || ''],
      ['Project', 'Max Monthly Payment', project.max_monthly_payment || ''],
      ...docs.map((d: any) => ['Document', d.label || d.doc_type, d.status]),
      ...rules.filter((r: any) => r.is_active).map((r: any) => ['Rule', r.label, r.value_numeric ?? r.value_text ?? '']),
    ];
    exportToCsv(rows[0] as string[], rows.slice(1), `lender-packet-${new Date().toISOString().slice(0, 10)}`);
    toast.success('Lender packet exported');
  };

  const exportChecklistXlsx = () => {
    // CSV bundle with sections (Excel opens it fine)
    const rows: (string | number)[][] = [['Section', 'Field', 'Value']];
    milestones.forEach((m: any) => rows.push(['Milestone', `${m.month_label} — ${m.title}`, `${m.status} (${m.completion_pct || 0}%)`]));
    tasks.forEach((t: any) => rows.push(['Task', t.title, `${t.status} · ${t.priority} · due ${t.due_date || '—'}`]));
    docs.forEach((d: any) => rows.push(['Document', d.label || d.doc_type, d.status]));
    risks.forEach((r: any) => rows.push(['Risk', r.title, `${r.probability}/${r.impact} · ${r.status}`]));
    exportToCsv(rows[0] as string[], rows.slice(1), `home-purchase-checklist-${new Date().toISOString().slice(0, 10)}`);
    toast.success('Excel checklist exported');
  };

  const exportProjectPlan = () => {
    const rows: (string | number)[][] = [['ID', 'Name', 'Start', 'Finish', 'Status', 'Progress %']];
    tasks.forEach((t: any, i: number) => {
      rows.push([i + 1, t.title, t.due_date || '', t.due_date || '', t.status, t.status === 'complete' ? 100 : 0]);
    });
    exportToCsv(rows[0] as string[], rows.slice(1), `project-plan-${new Date().toISOString().slice(0, 10)}`);
    toast.success('Project plan exported (import into MS Project or Asana)');
  };

  const exportWord = async () => {
    // Print as PDF-styled doc; Word can open PDFs
    await exportFullPdf();
    toast.info('Word: open the exported PDF in Word for editable content.');
  };

  const OPTIONS = [
    { title: 'Professional PDF', desc: 'Full workbook — dashboard, timeline, months, worksheets.', icon: FileText, action: exportFullPdf },
    { title: 'Word Document', desc: 'Editable format via PDF import into Word.', icon: FileText, action: exportWord },
    { title: 'Excel Checklist', desc: 'Milestones, tasks, docs, risks in one spreadsheet.', icon: FileSpreadsheet, action: exportChecklistXlsx },
    { title: 'Project Plan', desc: 'Task list with dates for MS Project / Asana.', icon: Files, action: exportProjectPlan },
    { title: 'Monthly Progress Report', desc: 'One-page PDF of current month.', icon: Calendar, action: exportMonthlyReport },
    { title: 'Lender Preparation Packet', desc: 'Profile + documents + rules for your loan officer.', icon: Package, action: exportLenderPacket },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {OPTIONS.map((o) => (
        <Card key={o.title} className="prism-card-shine border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <o.icon className="h-4 w-4 text-prism-teal" />
              {o.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">{o.desc}</p>
            <Button size="sm" onClick={o.action} className="w-full">
              <FileDown className="h-3.5 w-3.5 mr-1" /> Export
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
