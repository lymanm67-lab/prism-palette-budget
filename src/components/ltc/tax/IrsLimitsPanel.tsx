import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, AlertTriangle } from 'lucide-react';
import { money2 } from '../shared';
import { PlanningNotice } from '../nationwide/PlanningNotice';
import {
  LTC_AGE_LIMITS_2025,
  LTC_LIMIT_YEAR,
  LTC_PER_DIEM_LIMIT_2025,
  MEDICAL_AGI_FLOOR,
  IRS_LIMIT_CITATIONS,
  MUST_CONFIRM_WITH_CPA,
  TAX_DISCLAIMER,
} from '@/lib/ltc/tax';

export function IrsLimitsPanel() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-prism-sky" /> IRS Limits &amp; Documentation ({LTC_LIMIT_YEAR})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="text-left py-1.5">Attained age at year end</th>
                  <th className="text-right py-1.5">Eligible LTC premium (per insured)</th>
                </tr>
              </thead>
              <tbody>
                {LTC_AGE_LIMITS_2025.map((b) => (
                  <tr key={b.label} className="border-b border-border/40">
                    <td className="py-1.5">{b.label}</td>
                    <td className="py-1.5 text-right tabular-nums font-semibold">{money2(b.limit)}</td>
                  </tr>
                ))}
                <tr className="border-b border-border/40">
                  <td className="py-1.5">Per-diem benefit exclusion</td>
                  <td className="py-1.5 text-right tabular-nums font-semibold">{money2(LTC_PER_DIEM_LIMIT_2025)} / day</td>
                </tr>
                <tr>
                  <td className="py-1.5">Medical expense floor</td>
                  <td className="py-1.5 text-right tabular-nums font-semibold">{(MEDICAL_AGI_FLOOR * 100).toFixed(1)}% of AGI</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-2">
            {IRS_LIMIT_CITATIONS.map((c) => (
              <div key={c.topic} className="rounded-lg border border-border/60 p-3">
                <div className="flex flex-wrap items-baseline gap-2">
                  <p className="text-sm font-semibold">{c.topic}</p>
                  <span className="text-[10px] rounded border border-border/60 px-1.5 py-0.5 text-muted-foreground">
                    {c.authority}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{c.detail}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-prism-amber/40 bg-prism-amber/5 p-3">
            <p className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-prism-amber" /> Confirm with your tax professional
            </p>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground list-disc pl-5">
              {MUST_CONFIRM_WITH_CPA.map((x) => <li key={x}>{x}</li>)}
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">{TAX_DISCLAIMER}</p>
        </CardContent>
      </Card>
      <PlanningNotice />
    </div>
  );
}
