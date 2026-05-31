import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ExternalLink, MapPin, Award } from 'lucide-react';
import { STATE_DATA } from '@/lib/state-data';
import { STATE_PROGRAMS, FEDERAL_PROGRAMS, type DpaProgram } from '@/lib/home-buying/state-dpa-programs';

const TYPE_LABEL: Record<DpaProgram['type'], string> = {
  grant: 'Grant',
  forgivable_loan: 'Forgivable Loan',
  deferred_loan: 'Deferred Loan',
  second_mortgage: 'Second Mortgage',
  tax_credit: 'Tax Credit',
};

const TYPE_COLOR: Record<DpaProgram['type'], string> = {
  grant: 'bg-prism-teal/15 text-prism-teal',
  forgivable_loan: 'bg-prism-lime/15 text-prism-lime',
  deferred_loan: 'bg-prism-sky/15 text-prism-sky',
  second_mortgage: 'bg-prism-indigo/15 text-prism-indigo',
  tax_credit: 'bg-prism-amber/15 text-prism-amber',
};

function ProgramCard({ p }: { p: DpaProgram }) {
  return (
    <a href={p.url} target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-border/40 bg-card/40 p-3 hover:border-prism-teal/40 hover:bg-prism-teal/5 transition-colors group">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          <p className="font-display font-bold text-sm group-hover:prism-gradient-text">{p.name}</p>
          <p className="text-xs text-muted-foreground">{p.agency}</p>
        </div>
        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        <Badge variant="secondary" className={TYPE_COLOR[p.type]}>{TYPE_LABEL[p.type]}</Badge>
        <Badge variant="outline" className="text-xs">{p.maxAssistance}</Badge>
        {p.incomeLimit && <Badge variant="outline" className="text-xs">Income: {p.incomeLimit}</Badge>}
        {p.ficoMin && <Badge variant="outline" className="text-xs">FICO {p.ficoMin}+</Badge>}
      </div>
      {p.notes && <p className="text-xs text-muted-foreground mt-2">{p.notes}</p>}
    </a>
  );
}

export default function StateAssistancePicker() {
  const [state, setState] = useState('OH');
  const programs = STATE_PROGRAMS[state] ?? [];
  const stateLabel = STATE_DATA[state]?.label ?? state;

  return (
    <div className="space-y-4">
      <Card className="prism-card-shine border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display">
            <MapPin className="h-5 w-5 text-prism-teal" />
            First-Time Buyer & Down Payment Assistance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label className="text-xs">Select Your State</Label>
          <Select value={state} onValueChange={setState}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              {Object.entries(STATE_DATA).filter(([k]) => k).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="prism-card-shine border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Award className="h-4 w-4 text-prism-amber" />
            {stateLabel} Programs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {programs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No curated state programs listed yet. Check your state HFA website directly.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {programs.map((p) => <ProgramCard key={p.name} p={p} />)}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="prism-card-shine border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">Federal Programs (available nationwide)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {FEDERAL_PROGRAMS.map((p) => <ProgramCard key={p.name} p={p} />)}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Programs change frequently. Always confirm current eligibility, income limits, and assistance amounts on the agency's official website before applying.
      </p>
    </div>
  );
}
