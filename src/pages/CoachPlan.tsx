import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLatestCoachPlan, useRestartCoachPlan } from '@/hooks/use-coach-plan';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Download, RefreshCw, Sparkles, Target, CalendarDays, CheckCircle2, Printer } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { STEPS } from '@/components/coach/wizard-steps';
import { toast } from 'sonner';

const CARD_TITLES = STEPS.reduce<Record<string, string>>((acc, s) => {
  acc[String(s.n)] = s.title;
  return acc;
}, {});

export default function CoachPlan() {
  const navigate = useNavigate();
  const { data: plan, isLoading } = useLatestCoachPlan();
  const restart = useRestartCoachPlan();
  const printRef = useRef<HTMLDivElement>(null);


  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading your plan…</div>;
  }

  if (!plan || !plan.generated_plan) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <p className="text-sm text-muted-foreground">You don't have a completed Money Coach plan yet.</p>
        <Button onClick={() => navigate('/coach')}><ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Money Coach</Button>
      </div>
    );
  }

  const g = plan.generated_plan;

  const downloadPdf = () => {
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'letter' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 54;
      const contentW = pageW - margin * 2;

      // Brand palette (approximated to jsPDF RGB)
      const INK = [24, 32, 48] as const;
      const MUTED = [110, 118, 132] as const;
      const RULE = [220, 225, 232] as const;
      const ACCENT = [255, 138, 76] as const;   // prism-orange
      const TEAL = [40, 176, 168] as const;
      const SKY = [56, 152, 226] as const;
      const VIOLET = [138, 108, 214] as const;
      const CARDBG = [248, 250, 252] as const;

      let y = margin;
      let pageNum = 1;

      const setColor = (rgb: readonly [number, number, number] | readonly number[]) =>
        doc.setTextColor(rgb[0], rgb[1], rgb[2]);
      const setFill = (rgb: readonly [number, number, number] | readonly number[]) =>
        doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      const setDraw = (rgb: readonly [number, number, number] | readonly number[]) =>
        doc.setDrawColor(rgb[0], rgb[1], rgb[2]);

      const footer = () => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        setColor(MUTED);
        doc.text('Your Money Coach Plan · PrismMoney™', margin, pageH - 24);
        doc.text(`Page ${pageNum}`, pageW - margin, pageH - 24, { align: 'right' });
      };

      const newPage = () => {
        footer();
        doc.addPage();
        pageNum += 1;
        y = margin;
      };

      const ensure = (h: number) => {
        if (y + h > pageH - margin - 20) newPage();
      };

      const drawHeader = () => {
        setFill(INK);
        doc.rect(0, 0, pageW, 96, 'F');
        setFill(ACCENT);
        doc.rect(0, 96, pageW, 4, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        setColor([255, 255, 255]);
        doc.text('Your Money Coach Plan', margin, 52);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        setColor([200, 210, 225]);
        const dateStr = plan.generated_at ? format(new Date(plan.generated_at), 'PPP') : '';
        doc.text(`Generated ${dateStr}  ·  PrismMoney™`, margin, 74);
        y = 130;
      };

      const sectionTitle = (label: string, color: readonly number[] = ACCENT) => {
        ensure(36);
        setFill(color);
        doc.rect(margin, y, 4, 18, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        setColor(INK);
        doc.text(label.toUpperCase(), margin + 12, y + 14);
        y += 28;
      };

      const paragraph = (text: string, opts: { size?: number; color?: readonly number[]; leading?: number; gap?: number } = {}) => {
        const size = opts.size ?? 10.5;
        const leading = opts.leading ?? size * 1.45;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(size);
        setColor(opts.color ?? INK);
        const lines: string[] = doc.splitTextToSize(text, contentW);
        for (const ln of lines) {
          ensure(leading);
          doc.text(ln, margin, y);
          y += leading;
        }
        y += opts.gap ?? 6;
      };

      const numberedList = (items: string[]) => {
        items.forEach((item, i) => {
          const size = 10.5;
          const leading = size * 1.45;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(size);
          setColor(ACCENT);
          const numText = `${i + 1}.`;
          const numW = 22;
          const lines: string[] = doc.splitTextToSize(item, contentW - numW);
          const blockH = lines.length * leading + 6;
          ensure(blockH);
          doc.text(numText, margin, y);
          doc.setFont('helvetica', 'normal');
          setColor(INK);
          lines.forEach((ln, idx) => {
            doc.text(ln, margin + numW, y);
            if (idx < lines.length - 1) y += leading;
          });
          y += leading + 6;
        });
      };

      const bulletBlock = (items: string[], color: readonly number[]) => {
        items.forEach((item) => {
          const size = 10;
          const leading = size * 1.45;
          const bulletX = margin + 4;
          const textX = margin + 16;
          const lines: string[] = doc.splitTextToSize(item, contentW - 16);
          const blockH = lines.length * leading + 6;
          ensure(blockH);
          setFill(color);
          doc.circle(bulletX, y - 3, 2, 'F');
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(size);
          setColor(INK);
          lines.forEach((ln, idx) => {
            doc.text(ln, textX, y);
            if (idx < lines.length - 1) y += leading;
          });
          y += leading + 6;
        });
      };

      const perCardBlock = (k: string, headline: string, recommendation: string) => {
        const title = `Card ${k} · ${CARD_TITLES[k] || ''}`;
        const headLines: string[] = doc.splitTextToSize(headline, contentW - 24);
        const recLines: string[] = doc.splitTextToSize(recommendation, contentW - 24);
        const blockH = 22 + headLines.length * 14 + recLines.length * 13 + 20;
        ensure(blockH);
        setFill(CARDBG);
        setDraw(RULE);
        doc.roundedRect(margin, y, contentW, blockH - 8, 6, 6, 'FD');
        const startY = y;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        setColor(MUTED);
        doc.text(title.toUpperCase(), margin + 12, startY + 16);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        setColor(INK);
        headLines.forEach((ln, i) => {
          doc.text(ln, margin + 12, startY + 32 + i * 14);
        });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        setColor(MUTED);
        const recStart = startY + 32 + headLines.length * 14 + 6;
        recLines.forEach((ln, i) => {
          doc.text(ln, margin + 12, recStart + i * 13);
        });
        y = startY + blockH + 6;
      };

      // ===== Render =====
      drawHeader();

      sectionTitle('Summary', ACCENT);
      paragraph(g.summary, { gap: 12 });

      sectionTitle('Top Priorities', ACCENT);
      numberedList(g.top_priorities);
      y += 6;

      sectionTitle('Next 30 Days', TEAL);
      bulletBlock(g.thirty_day, TEAL);
      y += 4;

      sectionTitle('Days 31–60', SKY);
      bulletBlock(g.sixty_day, SKY);
      y += 4;

      sectionTitle('Days 61–90', VIOLET);
      bulletBlock(g.ninety_day, VIOLET);
      y += 4;

      sectionTitle('Per-Card Recommendations', ACCENT);
      Object.entries(g.per_card).forEach(([k, v]) => perCardBlock(k, v.headline, v.recommendation));

      footer();
      doc.save(`money-coach-plan-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (e: any) {
      toast.error(e?.message || 'Could not download PDF');
    }
  };

  const handlePrint = () => window.print();

  const handleRestart = async () => {
    await restart.mutateAsync(plan.id);
    navigate('/coach');
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5 coach-plan-print-root">
      <style>{`
        @media print {
          @page { margin: 0.6in; }
          body { background: white !important; }
          .coach-plan-no-print { display: none !important; }
          .coach-plan-print-root { padding: 0 !important; max-width: 100% !important; }
          .coach-plan-print-root * {
            color: #111 !important;
            background: transparent !important;
            border-color: #d0d5dd !important;
            backdrop-filter: none !important;
            box-shadow: none !important;
          }
          .coach-plan-print-root .print-accent { color: #ff8a4c !important; }
          .coach-plan-print-root h1, .coach-plan-print-root h2, .coach-plan-print-root h3 { break-after: avoid; }
          .coach-plan-print-root li, .coach-plan-print-root .print-card { break-inside: avoid; }
        }
      `}</style>
      <div className="flex items-center justify-between gap-2 flex-wrap coach-plan-no-print">
        <Button variant="ghost" size="sm" onClick={() => navigate('/coach')}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Money Coach
        </Button>
        <div className="flex gap-2">
          <Button size="sm" onClick={downloadPdf}>
            <Download className="h-4 w-4 mr-1.5" /> Download PDF
          </Button>
          <Button size="sm" variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1.5" /> Print
          </Button>
          <Button size="sm" variant="outline" onClick={handleRestart} disabled={restart.isPending}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> Restart
          </Button>
        </div>
      </div>


      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-prism-lime" />
          <h1 className="text-2xl font-bold">Your Money Coach Plan</h1>
        </div>
        {plan.generated_at && (
          <p className="text-xs text-muted-foreground">Generated {format(new Date(plan.generated_at), 'PPP')}</p>
        )}
      </div>

      <Card className="p-5 bg-card/40 backdrop-blur-md">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">Summary</h2>
        <p className="text-base leading-relaxed">{g.summary}</p>
      </Card>

      <Card className="p-5 bg-card/40 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-prism-orange" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Top priorities</h2>
        </div>
        <ol className="space-y-2">
          {g.top_priorities.map((p, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-mono text-xs text-prism-orange font-bold w-5 shrink-0 pt-0.5">{i + 1}</span>
              <span className="text-sm">{p}</span>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Next 30 days', items: g.thirty_day, color: 'text-prism-teal' },
          { label: 'Days 31–60', items: g.sixty_day, color: 'text-prism-sky' },
          { label: 'Days 61–90', items: g.ninety_day, color: 'text-prism-violet' },
        ].map((s) => (
          <Card key={s.label} className="p-4 bg-card/40 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className={`h-4 w-4 ${s.color}`} />
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{s.label}</h3>
            </div>
            <ul className="space-y-1.5">
              {s.items.map((it, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <CheckCircle2 className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${s.color}`} />
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Card className="p-5 bg-card/40 backdrop-blur-md">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">Per-card recommendations</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(g.per_card).map(([k, v]) => (
            <div key={k} className="rounded-lg border border-border/40 bg-background/30 p-3">
              <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Card {k} · {CARD_TITLES[k] || ''}
              </div>
              <div className="text-sm font-semibold mt-1">{v.headline}</div>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">{v.recommendation}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
