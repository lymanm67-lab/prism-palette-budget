import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileImage, FileText, Printer, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { renderInfographic, type InfographicSpec } from '@/lib/reports/infographic';

/**
 * Preview modal for a report infographic.
 *
 * The spec is rendered into a sandboxed iframe (same markup the print window
 * uses), then exported as PNG or PDF from that live DOM so the file matches the
 * preview exactly.
 */
export default function InfographicPreviewDialog({
  spec,
  html,
  title,
  open,
  onOpenChange,
  filename,
}: {
  /** Spec-driven infographic (shared engine). */
  spec?: InfographicSpec | null;
  /** Pre-rendered standalone HTML document (bespoke infographics). */
  html?: string | null;
  title?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  filename?: string;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [busy, setBusy] = useState<null | 'png' | 'pdf'>(null);

  const baseName =
    filename ||
    `${(spec?.title ?? title ?? 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${new Date()
      .toISOString()
      .slice(0, 10)}`;

  useEffect(() => {
    if (!open) return;
    const markup = html ?? (spec ? renderInfographic(spec) : null);
    if (!markup) return;
    const frame = frameRef.current;
    if (!frame) return;
    const doc = frame.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(markup);
    doc.close();
  }, [open, spec, html]);

  const captureCanvas = async () => {
    const doc = frameRef.current?.contentDocument;
    const target = doc?.body?.firstElementChild as HTMLElement | null;
    if (!doc || !target) throw new Error('Preview is still loading');
    const html2canvas = (await import('html2canvas')).default;
    return html2canvas(target, {
      scale: 2,
      backgroundColor: '#ffffff',
      windowWidth: target.scrollWidth,
      windowHeight: target.scrollHeight,
    });
  };

  const exportPng = async () => {
    setBusy('png');
    try {
      const canvas = await captureCanvas();
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `${baseName}.png`;
      a.click();
      toast.success('PNG exported');
    } catch (e: any) {
      toast.error(e?.message || 'PNG export failed');
    } finally {
      setBusy(null);
    }
  };

  const exportPdf = async () => {
    setBusy('pdf');
    try {
      const canvas = await captureCanvas();
      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ unit: 'in', format: 'letter', orientation: 'portrait' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 0.35;
      const maxW = pageW - margin * 2;
      const maxH = pageH - margin * 2;
      const ratio = Math.min(maxW / canvas.width, maxH / canvas.height);
      const w = canvas.width * ratio;
      const h = canvas.height * ratio;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (pageW - w) / 2, margin, w, h);
      pdf.save(`${baseName}.pdf`);
      toast.success('PDF exported');
    } catch (e: any) {
      toast.error(e?.message || 'PDF export failed');
    } finally {
      setBusy(null);
    }
  };

  const printFrame = () => {
    const win = frameRef.current?.contentWindow;
    if (!win) return toast.error('Preview is still loading');
    win.focus();
    win.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {spec?.title ?? title ?? 'Infographic'}
            {spec?.period ? ` — ${spec.period}` : ''}
          </DialogTitle>
          <DialogDescription>
            Letter-size one-page infographic. Choose your output format below.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={printFrame} variant="secondary" className="gap-2">
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button onClick={exportPdf} disabled={busy !== null} className="gap-2">
            {busy === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Download PDF
          </Button>
          <Button onClick={exportPng} disabled={busy !== null} variant="outline" className="gap-2">
            {busy === 'png' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileImage className="h-4 w-4" />}
            Download PNG
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
          <iframe
            ref={frameRef}
            title="Infographic preview"
            className="w-full h-[65vh] bg-white"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
