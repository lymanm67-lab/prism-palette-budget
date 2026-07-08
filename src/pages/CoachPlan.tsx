import { useNavigate } from 'react-router-dom';
import { useLatestCoachPlan, useRestartCoachPlan } from '@/hooks/use-coach-plan';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Download, RefreshCw, Sparkles, Target, CalendarDays, CheckCircle2, Printer } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
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
      const margin = 48;
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      let y = margin;

      const writeLine = (text: string, opts: { size?: number; bold?: boolean; gap?: number } = {}) => {
        const size = opts.size ?? 11;
        doc.setFontSize(size);
        doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
        const lines = doc.splitTextToSize(text, pageW - margin * 2);
        for (const ln of lines) {
          if (y > pageH - margin) { doc.addPage(); y = margin; }
          doc.text(ln, margin, y);
          y += size + 4;
        }
        y += opts.gap ?? 0;
      };

      writeLine('Your Money Coach Plan', { size: 20, bold: true, gap: 4 });
      writeLine(`Generated ${plan.generated_at ? format(new Date(plan.generated_at), 'PPP') : ''}`, { size: 9, gap: 12 });

      writeLine('Summary', { size: 14, bold: true, gap: 4 });
      writeLine(g.summary, { gap: 10 });

      writeLine('Top priorities', { size: 14, bold: true, gap: 4 });
      g.top_priorities.forEach((p, i) => writeLine(`${i + 1}. ${p}`));
      y += 8;

      const section = (label: string, items: string[]) => {
        writeLine(label, { size: 14, bold: true, gap: 4 });
        items.forEach((p) => writeLine(`• ${p}`));
        y += 8;
      };
      section('Next 30 days', g.thirty_day);
      section('Days 31–60', g.sixty_day);
      section('Days 61–90', g.ninety_day);

      writeLine('Per-card recommendations', { size: 14, bold: true, gap: 4 });
      Object.entries(g.per_card).forEach(([k, v]) => {
        writeLine(`${k}. ${CARD_TITLES[k] || ''} — ${v.headline}`, { bold: true, size: 11 });
        writeLine(v.recommendation, { gap: 6 });
      });

      doc.save(`money-coach-plan-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (e: any) {
      toast.error(e?.message || 'Could not download PDF');
    }
  };

  const handleRestart = async () => {
    await restart.mutateAsync(plan.id);
    navigate('/coach');
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate('/coach')}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Money Coach
        </Button>
        <div className="flex gap-2">
          <Button size="sm" onClick={downloadPdf}>
            <Download className="h-4 w-4 mr-1.5" /> Download PDF
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
