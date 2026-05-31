import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, Landmark } from 'lucide-react';
import { LOAN_TYPES } from '@/lib/home-buying/loan-types';

const riskColor = { low: 'bg-prism-teal/15 text-prism-teal', medium: 'bg-prism-amber/15 text-prism-amber', high: 'bg-prism-rose/15 text-prism-rose' } as const;

export default function LoanTypeComparator() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Landmark className="h-5 w-5 text-prism-indigo" />
        <h3 className="font-display text-xl font-bold">Loan Type Comparison</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {LOAN_TYPES.map((loan) => (
          <Card key={loan.id} className="prism-card-shine border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-base">{loan.name}</CardTitle>
                <Badge className={riskColor[loan.risk]} variant="secondary">
                  {loan.risk === 'high' && <AlertTriangle className="h-3 w-3 mr-1" />}
                  {loan.risk} risk
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{loan.bestFor}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-muted/30 p-2">
                  <p className="text-muted-foreground">Min Down</p>
                  <p className="font-display font-bold text-sm">{loan.minDownPct}%</p>
                </div>
                <div className="rounded-md bg-muted/30 p-2">
                  <p className="text-muted-foreground">Min FICO</p>
                  <p className="font-display font-bold text-sm">{loan.minFico || 'Varies'}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Pros</p>
                <ul className="space-y-1">
                  {loan.pros.map((p) => (
                    <li key={p} className="text-xs flex gap-1.5"><CheckCircle2 className="h-3 w-3 text-prism-teal shrink-0 mt-0.5" /><span>{p}</span></li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Cons</p>
                <ul className="space-y-1">
                  {loan.cons.map((c) => (
                    <li key={c} className="text-xs flex gap-1.5"><AlertTriangle className="h-3 w-3 text-prism-amber shrink-0 mt-0.5" /><span>{c}</span></li>
                  ))}
                </ul>
              </div>

              <p className="text-xs text-muted-foreground italic border-t border-border/30 pt-2">{loan.notes}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
