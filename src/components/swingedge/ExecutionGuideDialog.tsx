import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookMarked,
  ChevronLeft,
  ChevronRight,
  FileImage,
  FileText,
  Loader2,
  NotebookPen,
  Printer,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import ExecutionGuideSheet from './ExecutionGuideSheet';
import type { ExecutionGuide } from '@/lib/swingedge/thinkorswimGuide';
import { useExecutionGuides } from '@/hooks/use-execution-guides';

/**
 * The in-app execution guide: a Next-through-the-steps walkthrough and the same
 * data as a printable sheet, with print, PDF, PNG and save-to-journal/binder.
 */
export default function ExecutionGuideDialog({
  guide,
  open,
  onOpenChange,
  notice,
  paperTradeId,
  tradePlanId,
  executionTicketId,
}: {
  guide: ExecutionGuide | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  notice?: string | null;
  paperTradeId?: string | null;
  tradePlanId?: string | null;
  executionTicketId?: string | null;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [orientation, setOrientation] = useState<'PORTRAIT' | 'LANDSCAPE'>('PORTRAIT');
  const [paper, setPaper] = useState<'LETTER' | 'A4'>('LETTER');
  const [busy, setBusy] = useState<null | 'pdf' | 'png'>(null);
  const { save } = useExecutionGuides();

  const steps = guide?.steps ?? [];
  const current = steps[Math.min(step, Math.max(steps.length - 1, 0))];

  const baseName = useMemo(
    () =>
      `${(guide?.title ?? 'thinkorswim-guide').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${new Date()
        .toISOString()
        .slice(0, 10)}`,
    [guide?.title],
  );

  const record = (flags: { printed?: boolean; downloaded?: boolean }) => {
    if (!guide) return;
    save.mutate({
      guide,
      savedTo: 'JOURNAL',
      orientation,
      paperTradeId: paperTradeId ?? null,
      tradePlanId: tradePlanId ?? null,
      executionTicketId: executionTicketId ?? null,
      ...flags,
    });
  };

  const capture = async () => {
    const el = sheetRef.current;
    if (!el) throw new Error('The sheet is still loading');
    const html2canvas = (await import('html2canvas')).default;
    return html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
  };

  const exportPng = async () => {
    setBusy('png');
    try {
      const canvas = await capture();
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `${baseName}.png`;
      a.click();
      record({ downloaded: true });
      toast.success('PNG downloaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'PNG download failed');
    } finally {
      setBusy(null);
    }
  };

  const exportPdf = async () => {
    setBusy('pdf');
    try {
      const canvas = await capture();
      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF({
        unit: 'in',
        format: paper === 'A4' ? 'a4' : 'letter',
        orientation: orientation === 'LANDSCAPE' ? 'landscape' : 'portrait',
      });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 0.4;
      const scale = Math.min((pageW - margin * 2) / canvas.width, (pageH - margin * 2) / canvas.height);
      const w = canvas.width * scale;
      const h = canvas.height * scale;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (pageW - w) / 2, margin, w, h);
      pdf.save(`${baseName}.pdf`);
      record({ downloaded: true });
      toast.success('PDF downloaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'PDF download failed');
    } finally {
      setBusy(null);
    }
  };

  const printSheet = () => {
    record({ printed: true });
    window.print();
  };

  const saveTo = (savedTo: 'JOURNAL' | 'BINDER') => {
    if (!guide) return;
    save.mutate(
      {
        guide,
        savedTo,
        orientation,
        paperTradeId: paperTradeId ?? null,
        tradePlanId: tradePlanId ?? null,
        executionTicketId: executionTicketId ?? null,
      },
      {
        onSuccess: () => toast.success(savedTo === 'JOURNAL' ? 'Saved to your trade journal' : 'Saved to your training binder'),
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not save the guide'),
      },
    );
  };

  if (!guide) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader className="print:hidden">
          <DialogTitle>{guide.title}</DialogTitle>
          <DialogDescription>{guide.subtitle}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="walk" className="print:hidden">
          <TabsList>
            <TabsTrigger value="walk">Walk me through it</TabsTrigger>
            <TabsTrigger value="sheet">Printable sheet</TabsTrigger>
          </TabsList>

          <TabsContent value="walk" className="space-y-3 pt-3">
            {current ? (
              <div className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    Step {current.n} of {steps[steps.length - 1]?.n ?? steps.length}
                  </Badge>
                  <span className="text-xs font-semibold uppercase tracking-wide text-prism-teal">{current.screen}</span>
                </div>
                <p className="mt-3 text-lg font-semibold leading-snug">{current.action}</p>
                {current.value ? (
                  <p className="mt-2 rounded bg-muted px-3 py-2 font-mono text-sm">Enter: {current.value}</p>
                ) : null}
                <p className="mt-3 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">You should see:</span> {current.expect}
                </p>
                {current.warning ? (
                  <p className="mt-3 flex gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    <span>{current.warning}</span>
                  </p>
                ) : null}

                <div className="mt-4 flex items-center justify-between gap-2">
                  <Button variant="outline" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                    <ChevronLeft className="mr-1 h-4 w-4" /> Back
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
                    disabled={step >= steps.length - 1}
                  >
                    Next <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">This guide has no steps recorded.</p>
            )}
          </TabsContent>

          <TabsContent value="sheet" className="space-y-3 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" className="gap-2" onClick={printSheet}>
                <Printer className="h-4 w-4" /> Print
              </Button>
              <Button size="sm" className="gap-2" onClick={exportPdf} disabled={busy !== null}>
                {busy === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} PDF
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={exportPng} disabled={busy !== null}>
                {busy === 'png' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileImage className="h-4 w-4" />} PNG
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => saveTo('JOURNAL')}>
                <NotebookPen className="h-4 w-4" /> Save to journal
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => saveTo('BINDER')}>
                <BookMarked className="h-4 w-4" /> Save to binder
              </Button>
              <ToggleGroup
                type="single"
                size="sm"
                value={orientation}
                onValueChange={(v) => v && setOrientation(v as 'PORTRAIT' | 'LANDSCAPE')}
              >
                <ToggleGroupItem value="PORTRAIT" className="text-xs">
                  Portrait
                </ToggleGroupItem>
                <ToggleGroupItem value="LANDSCAPE" className="text-xs">
                  Landscape
                </ToggleGroupItem>
              </ToggleGroup>
              <ToggleGroup type="single" size="sm" value={paper} onValueChange={(v) => v && setPaper(v as 'LETTER' | 'A4')}>
                <ToggleGroupItem value="LETTER" className="text-xs">
                  Letter
                </ToggleGroupItem>
                <ToggleGroupItem value="A4" className="text-xs">
                  A4
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="max-h-[62vh] overflow-auto rounded-lg border border-border">
              <ExecutionGuideSheet ref={sheetRef} guide={guide} orientation={orientation} notice={notice} />
            </div>
          </TabsContent>
        </Tabs>

        {/* Printing always uses the sheet, whichever tab is open. */}
        <div className="hidden print:block">
          <ExecutionGuideSheet guide={guide} orientation={orientation} notice={notice} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
