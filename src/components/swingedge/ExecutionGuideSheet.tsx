import { forwardRef } from 'react';
import { AlertTriangle, CheckSquare, Eye, XOctagon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExecutionGuide } from '@/lib/swingedge/thinkorswimGuide';
import { GUIDE_KIND_LABEL } from '@/lib/swingedge/thinkorswimGuide';

/**
 * The printable execution guide.
 *
 * One component powers both the on-screen sheet and the print / PDF / PNG
 * output, so what the user downloads is exactly what they read. Colours come
 * from the SwingEdge tokens; the print rules flatten them for a laser printer.
 */
const ExecutionGuideSheet = forwardRef<
  HTMLDivElement,
  {
    guide: ExecutionGuide;
    orientation?: 'PORTRAIT' | 'LANDSCAPE';
    notice?: string | null;
  }
>(({ guide, orientation = 'PORTRAIT', notice }, ref) => {
  const stamp = new Date().toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div
      ref={ref}
      className={cn(
        'tos-guide space-y-4 bg-card p-6 text-foreground',
        orientation === 'LANDSCAPE' ? 'tos-landscape' : 'tos-portrait',
      )}
    >
      {/* Title */}
      <header className="border-b-2 border-prism-teal/60 pb-3">
        <div className="text-[11px] uppercase tracking-[0.14em] text-prism-teal">
          PrismMoney™ SwingEdge · Thinkorswim execution guide
        </div>
        <h2 className="mt-1 text-2xl font-bold leading-tight">{guide.title}</h2>
        <p className="text-sm text-muted-foreground">{guide.subtitle}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {GUIDE_KIND_LABEL[guide.kind]} · guide v{guide.version} · created {stamp}
        </p>
      </header>

      {notice ? (
        <p className="rounded-md border border-prism-amber/50 bg-prism-amber/10 p-2 text-xs">{notice}</p>
      ) : null}

      {/* Trade summary */}
      {guide.summary.length > 0 ? (
        <section className="tos-block rounded-lg border border-border p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Trade summary
          </h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
            {guide.summary.map((row) => (
              <div key={row.label} className="flex justify-between gap-3 border-b border-dashed border-border/60 py-0.5">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-medium tabular-nums">{row.value}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Steps */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step by step</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {guide.steps.map((step) => (
            <div key={step.n} className="tos-block rounded-lg border border-border p-3">
              <div className="flex items-start gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-prism-teal/15 text-xs font-bold text-prism-teal">
                  {step.n}
                </span>
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-prism-teal">{step.screen}</div>
                  <p className="text-sm font-medium leading-snug">{step.action}</p>
                  {step.value ? (
                    <p className="rounded bg-muted px-2 py-1 font-mono text-xs">Enter: {step.value}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold">You should see:</span> {step.expect}
                  </p>
                  {step.warning ? (
                    <p className="flex gap-1.5 rounded border border-destructive/40 bg-destructive/5 p-1.5 text-xs">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                      <span>{step.warning}</span>
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Order structure + mistakes */}
      <div className="grid gap-3 sm:grid-cols-2">
        <section className="tos-block rounded-lg border border-prism-teal/50 p-3">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-prism-teal">
            <Eye className="h-3.5 w-3.5" /> What you should see
          </h3>
          <ul className="space-y-1.5">
            {guide.shouldSee.map((line, i) => (
              <li key={`${line.text}-${i}`}>
                <span className="font-mono text-xs font-semibold">{line.text}</span>
                {line.note ? <span className="block text-xs text-muted-foreground">{line.note}</span> : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="tos-block rounded-lg border border-destructive/50 p-3">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-destructive">
            <XOctagon className="h-3.5 w-3.5" /> What would be wrong
          </h3>
          <ul className="space-y-1.5">
            {guide.wouldBeWrong.map((line, i) => (
              <li key={`${line.text}-${i}`}>
                <span className="font-mono text-xs font-semibold">{line.text}</span>
                {line.note ? <span className="block text-xs text-muted-foreground">{line.note}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Checklist */}
      <section className="tos-block rounded-lg border border-border p-3">
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <CheckSquare className="h-3.5 w-3.5" /> Final check before Confirm and Send
        </h3>
        <div className="grid gap-1 sm:grid-cols-2">
          {guide.checklist.map((item) => (
            <label key={item} className="flex items-start gap-2 text-xs">
              <span className="mt-0.5 inline-block h-3.5 w-3.5 shrink-0 rounded-sm border border-foreground/60" />
              <span>{item}</span>
            </label>
          ))}
        </div>
      </section>

      {guide.notes.length > 0 ? (
        <section className="tos-block space-y-1 rounded-lg bg-muted/50 p-3">
          {guide.notes.map((note) => (
            <p key={note} className="text-xs text-muted-foreground">
              {note}
            </p>
          ))}
        </section>
      ) : null}

      <footer className="border-t border-border pt-2 text-[10px] text-muted-foreground">
        SwingEdge decides the trade · Thinkorswim paperMoney is where you practise the execution ·{' '}
        {guide.trade ? `${guide.trade.symbol} · ` : ''}created {stamp} · guide v{guide.version}
      </footer>

      <style>{`
        .tos-guide { max-width: 8in; }
        .tos-guide.tos-landscape { max-width: 10.5in; }
        @media print {
          @page { size: ${orientation === 'LANDSCAPE' ? 'letter landscape' : 'letter portrait'}; margin: 0.5in; }
          body { background: #fff !important; }
          .tos-guide, .tos-guide * { color: #000 !important; }
          .tos-guide, .tos-guide [class*="bg-"] { background: #fff !important; box-shadow: none !important; }
          .tos-guide [class*="border"] { border-color: #000 !important; }
          .tos-guide .tos-block { break-inside: avoid; page-break-inside: avoid; }
          .tos-guide h2, .tos-guide h3 { break-after: avoid; }
        }
      `}</style>
    </div>
  );
});

ExecutionGuideSheet.displayName = 'ExecutionGuideSheet';
export default ExecutionGuideSheet;
