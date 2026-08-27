import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FileDown, Sheet, Loader2 } from 'lucide-react';
import { exportToCsv, exportToPdf } from '@/lib/export-utils';
import {
  allLtcExportTables,
  tablesToCsvRows,
  tableLabel,
  type ExportTable,
  type LtcExportOptions,
} from '@/lib/ltc/exports';
import { NW_PLANNING_NOTICE, NW_PRODUCT, DEFAULT_STRESS } from '@/lib/ltc/nationwide';
import { TAX_DISCLAIMER } from '@/lib/ltc/tax';

const stamp = () => new Date().toISOString().slice(0, 10);

/**
 * Exports the Nationwide projections, stress-test outputs and tax estimates.
 * CSV writes every dataset into one sheet; PDF renders an off-screen printable
 * report so the export is identical regardless of which tab is open.
 */
export function LtcExportBar({ opts }: { opts?: LtcExportOptions } = {}) {
  const [busy, setBusy] = useState<'pdf' | 'csv' | null>(null);
  const [tables, setTables] = useState<ExportTable[] | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const onCsv = () => {
    try {
      setBusy('csv');
      const { headers, rows } = tablesToCsvRows(allLtcExportTables(opts));
      exportToCsv(headers, rows, `ltc-nationwide-projections-${stamp()}`);
      toast.success('LTC projections exported to CSV');
    } catch (e: any) {
      toast.error(e?.message || 'Could not export CSV');
    } finally {
      setBusy(null);
    }
  };

  const onPdf = async () => {
    setBusy('pdf');
    try {
      setTables(allLtcExportTables(opts));
      // Let the printable block mount before rasterizing it.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
      if (!printRef.current) throw new Error('Report could not be prepared');
      await exportToPdf(printRef.current, `ltc-nationwide-projections-${stamp()}`);
      toast.success('LTC projections exported to PDF');
    } catch (e: any) {
      toast.error(e?.message || 'Could not export PDF');
    } finally {
      setTables(null);
      setBusy(null);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onPdf} disabled={busy !== null}>
          {busy === 'pdf' ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileDown className="h-3.5 w-3.5 mr-1" />}
          Export PDF
        </Button>
        <Button size="sm" variant="outline" onClick={onCsv} disabled={busy !== null}>
          {busy === 'csv' ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sheet className="h-3.5 w-3.5 mr-1" />}
          Export CSV
        </Button>
      </div>

      {/* Off-screen printable report — rendered only during a PDF export. */}
      {tables && (
        <div className="fixed left-[-10000px] top-0" aria-hidden>
          <div ref={printRef} style={{ width: 820, padding: 32, background: '#ffffff', color: '#111827' }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{NW_PRODUCT}</h1>
            <p style={{ fontSize: 12, color: '#4b5563', margin: '4px 0 2px' }}>
              LTC projections, stress-test outputs and tax estimates
            </p>
            <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>
              Generated {stamp()} · Stress baseline: claim age {opts?.stress?.claimAge ?? DEFAULT_STRESS.claimAge},{' '}
              {opts?.stress?.careYears ?? DEFAULT_STRESS.careYears} years at $
              {(opts?.stress?.monthlyCareCost ?? DEFAULT_STRESS.monthlyCareCost).toLocaleString()}/mo
            </p>

            <div style={{ marginTop: 14, padding: 10, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#374151' }}>
                Contents
              </div>
              <ol style={{ margin: '4px 0 0 16px', padding: 0, fontSize: 10, color: '#4b5563' }}>
                {tables.map((t) => (
                  <li key={t.key}>{tableLabel(t)}</li>
                ))}
              </ol>
            </div>



            {tables.map((t) => (
              <div key={t.key} style={{ marginTop: 18 }}>
                <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280' }}>
                  {t.subTab ? `${t.tab} · ${t.subTab}` : t.tab}
                </div>
                <h2 style={{ fontSize: 13, fontWeight: 700, margin: '2px 0 6px' }}>{t.title}</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr>
                      {t.headers.map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: 'left',
                            borderBottom: '1px solid #d1d5db',
                            padding: '4px 6px',
                            color: '#374151',
                            fontWeight: 600,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {t.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            style={{
                              borderBottom: '1px solid #f3f4f6',
                              padding: '3px 6px',
                              textAlign: ci === 0 ? 'left' : 'right',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {typeof cell === 'number'
                              ? cell.toLocaleString('en-US', { maximumFractionDigits: 2 })
                              : cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            <p style={{ fontSize: 9, color: '#6b7280', marginTop: 18 }}>{NW_PLANNING_NOTICE}</p>
            <p style={{ fontSize: 9, color: '#6b7280', marginTop: 6 }}>{TAX_DISCLAIMER}</p>
            <p style={{ fontSize: 9, color: '#6b7280', marginTop: 6 }}>
              Long-term care benefits, death benefits and surrender values are reported as coverage figures. Only the net
              surrender value may ever appear in household net worth, under Insurance and Contract Values.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
