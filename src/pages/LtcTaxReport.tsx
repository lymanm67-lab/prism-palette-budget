import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Lock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LtcExportBar } from '@/components/ltc/LtcExportBar';
import { allLtcExportTables, tableLabel } from '@/lib/ltc/exports';
import { decodeLtcTaxShare, LTC_SHARE_PARAM } from '@/lib/ltc/share';
import { NW_PLANNING_NOTICE, NW_PRODUCT } from '@/lib/ltc/nationwide';
import { TAX_DISCLAIMER } from '@/lib/ltc/tax';

/**
 * Locked, read-only LTC tax report. Everything is derived from the inputs
 * carried in the share link — no editing controls, no household data, but the
 * same PDF and CSV exports as the dashboard.
 */
export default function LtcTaxReport() {
  const [params] = useSearchParams();
  const payload = useMemo(() => decodeLtcTaxShare(params.get(LTC_SHARE_PARAM)), [params]);
  const tables = useMemo(
    () =>
      payload
        ? allLtcExportTables({
            stress: payload.stress,
            deduction: payload.deduction,
            hsa: payload.hsa,
            benefit: payload.benefit,
          })
        : [],
    [payload],
  );

  if (!payload) {
    return (
      <div className="container mx-auto max-w-2xl p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> This report link is invalid or expired
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Ask the sender to generate a new read-only link from the Tax Advantage tab of their Long-Term Care
            dashboard.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-6 space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{payload.title || 'LTC Tax Report'}</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            {NW_PRODUCT} — premium deduction, HSA funding, benefit taxability and stress-test projections.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" /> Read-only
            </Badge>
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Generated {payload.createdAt.slice(0, 10)}
            </span>
          </div>
        </div>
        <LtcExportBar
          opts={{
            stress: payload.stress,
            deduction: payload.deduction,
            hsa: payload.hsa,
            benefit: payload.benefit,
          }}
        />
      </header>

      {tables.map((t) => (
        <Card key={t.key}>
          <CardHeader className="pb-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t.subTab ? `${t.tab} · ${t.subTab}` : t.tab}
            </div>
            <CardTitle className="text-base">{t.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label={tableLabel(t)}>
                <thead>
                  <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
                    {t.headers.map((h, ci) => (
                      <th key={h} className={ci === 0 ? 'text-left py-1.5' : 'text-right py-1.5'}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {t.rows.map((row, ri) => (
                    <tr key={ri} className="border-b border-border/40">
                      {row.map((cell, ci) => (
                        <td
                          key={ci}
                          className={ci === 0 ? 'py-1.5' : 'py-1.5 text-right tabular-nums'}
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
          </CardContent>
        </Card>
      ))}

      <footer className="space-y-2 text-xs text-muted-foreground">
        <p>{NW_PLANNING_NOTICE}</p>
        <p>{TAX_DISCLAIMER}</p>
        <p>
          Long-term care benefits, death benefits and surrender values are reported as coverage figures. Only the net
          surrender value may ever appear in household net worth.
        </p>
      </footer>
    </div>
  );
}
