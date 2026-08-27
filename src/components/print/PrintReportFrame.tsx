import { ReactNode } from 'react';

/**
 * Shared print frame for export-ready reports.
 *
 * Every report that is meant to be printed or saved as PDF wraps its content in
 * this frame so the printed output is identical across pages: same masthead,
 * same repeating running header/footer (Chrome repeats `position: fixed`
 * elements on each printed sheet), same black & white safe table styling.
 *
 * Add `print-block` to any section that must not be split across two sheets,
 * and `print-page-break` to force a new sheet before a section.
 */
export default function PrintReportFrame({
  id,
  title,
  period,
  subtitle,
  generatedAt,
  children,
}: {
  id: string;
  title: string;
  period?: string;
  subtitle?: string;
  generatedAt?: string | Date | null;
  children: ReactNode;
}) {
  const stamp = generatedAt ? new Date(generatedAt) : new Date();
  const stampLabel = stamp.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div id={id} className="print-report space-y-6">
      {/* Running header — repeats at the top of every printed sheet */}
      <div className="print-running-header" aria-hidden="true">
        <span className="print-running-title">
          PrismMoney™ · {title}
          {period ? ` · ${period}` : ''}
        </span>
        <span className="print-running-meta">Generated {stampLabel}</span>
      </div>

      {/* Print masthead — screen shows the page's own hero instead */}
      <div className="hidden print:block print-masthead">
        <div className="print-masthead-kicker">PrismMoney™</div>
        <h2 className="print-masthead-title">
          {title}
          {period ? ` — ${period}` : ''}
        </h2>
        {subtitle && <div className="print-masthead-sub">{subtitle}</div>}
        <div className="print-masthead-sub">Generated {stampLabel}</div>
      </div>

      {children}

      {/* Running footer — repeats at the bottom of every printed sheet */}
      <div className="print-running-footer" aria-hidden="true">
        <span>
          PrismMoney™ · {title}
          {period ? ` · ${period}` : ''}
        </span>
        <span className="print-page-counter" />
      </div>

      <style>{`
        .print-running-header,
        .print-running-footer { display: none; }

        @media print {
          @page {
            size: letter;
            margin: 0.7in 0.5in 0.7in 0.5in;
          }

          body { background: #fff !important; color: #000 !important; }
          .print\\:hidden { display: none !important; }

          /* Running header / footer repeat on every sheet in Chromium */
          .print-report .print-running-header,
          .print-report .print-running-footer {
            display: flex !important;
            position: fixed;
            left: 0;
            right: 0;
            justify-content: space-between;
            align-items: baseline;
            gap: 12px;
            font-size: 8.5pt;
            color: #000 !important;
            background: #fff !important;
          }
          .print-report .print-running-header {
            top: -0.45in;
            border-bottom: 1px solid #000;
            padding-bottom: 3px;
          }
          .print-report .print-running-footer {
            bottom: -0.45in;
            border-top: 1px solid #000;
            padding-top: 3px;
          }
          .print-report .print-running-title { font-weight: 700; }

          /* Page numbering via CSS counters on the footer */
          .print-report { counter-reset: prism-page; }
          .print-report .print-running-footer { counter-increment: prism-page; }
          .print-report .print-page-counter::after {
            content: "Page " counter(prism-page);
          }

          /* Masthead */
          .print-report .print-masthead {
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }
          .print-report .print-masthead-kicker {
            font-size: 8.5pt;
            letter-spacing: 0.14em;
            text-transform: uppercase;
          }
          .print-report .print-masthead-title {
            font-size: 18pt;
            font-weight: 800;
            margin: 2px 0 4px;
          }
          .print-report .print-masthead-sub { font-size: 9pt; }

          /* Flatten all themed surfaces to white for B&W laser printers */
          .print-report,
          .print-report [class*="bg-gradient"],
          .print-report [class*="bg-card"],
          .print-report [class*="bg-muted"],
          .print-report [class*="bg-background"],
          .print-report [class*="bg-prism"],
          .print-report .rounded-2xl,
          .print-report .rounded-xl {
            background: #fff !important;
            background-image: none !important;
            box-shadow: none !important;
          }
          .print-report, .print-report * { color: #000 !important; }
          .print-report [class*="border"] { border-color: #000 !important; }

          .print-report [class*="Badge"], .print-report .badge {
            background: #fff !important;
            border: 1px solid #000 !important;
            box-shadow: none !important;
          }

          /* Tables: repeat headers across sheets, never split a row */
          .print-report table { border-collapse: collapse; width: 100%; font-size: 9pt; }
          .print-report thead { display: table-header-group; }
          .print-report tfoot { display: table-footer-group; }
          .print-report tr { break-inside: avoid; page-break-inside: avoid; }
          .print-report th, .print-report td {
            border: 1px solid #000 !important;
            padding: 5px 7px !important;
          }
          .print-report th { background: #e8e8e8 !important; font-weight: 700 !important; }

          /* Pagination helpers */
          .print-report .print-block,
          .print-report [class*="Card"] {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .print-report .print-page-break { break-before: page; page-break-before: always; }
          .print-report h1, .print-report h2, .print-report h3 { break-after: avoid; }

          /* Icons should never render as solid blocks */
          .print-report svg { fill: none !important; stroke: #000 !important; }

          /* Single column so nothing is clipped at the page edge */
          .print-report [class*="grid-cols-"] { display: block !important; }
          .print-report [class*="grid-cols-"] > * { margin-bottom: 8px; }
        }
      `}</style>
    </div>
  );
}
