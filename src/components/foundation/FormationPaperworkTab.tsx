import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, FileText, Landmark, ArrowRight } from 'lucide-react';
import { useFdnCompliance } from '@/hooks/use-foundation-ops';

interface Props {
  onNavigate: (tab: string) => void;
}

interface Form {
  code: string;
  name: string;
  who: string;
  when: string;
  cost: string;
  match: string;
  url: string;
  note?: string;
}

const FEDERAL_FORMS: Form[] = [
  {
    code: 'Form SS-4',
    name: 'Application for Employer Identification Number',
    who: 'IRS',
    when: 'Immediately after the articles are filed — everything else needs the EIN',
    cost: 'Free',
    match: 'ein',
    url: 'https://www.irs.gov/forms-pubs/about-form-ss-4',
    note: 'Apply online and the EIN is issued the same session.',
  },
  {
    code: 'Form 1023',
    name: 'Application for Recognition of Exemption Under Section 501(c)(3)',
    who: 'IRS',
    when: 'Within 27 months of formation to have exemption date back to inception',
    cost: '$600 user fee',
    match: '1023',
    url: 'https://www.irs.gov/forms-pubs/about-form-1023',
    note: 'Private foundations cannot use the short Form 1023-EZ — the full 1023 is required.',
  },
  {
    code: 'Form 990-PF',
    name: 'Return of Private Foundation',
    who: 'IRS',
    when: 'Annually, by the 15th day of the 5th month after year end',
    cost: 'Free to file',
    match: '990',
    url: 'https://www.irs.gov/forms-pubs/about-form-990-pf',
    note: 'Reports the 5% distribution test, excise tax, and every grant paid. Must be made public.',
  },
  {
    code: 'Form 4720',
    name: 'Return of Certain Excise Taxes',
    who: 'IRS',
    when: 'Only if a distribution shortfall, self-dealing, or jeopardy investment occurs',
    cost: 'Tax due',
    match: '4720',
    url: 'https://www.irs.gov/forms-pubs/about-form-4720',
  },
  {
    code: 'Form 8940',
    name: 'Request for Miscellaneous Determination',
    who: 'IRS',
    when: 'When requesting advance approval of a scholarship grant procedure',
    cost: 'User fee applies',
    match: '8940',
    url: 'https://www.irs.gov/forms-pubs/about-form-8940',
    note: 'Required before awarding scholarships directly to individuals.',
  },
  {
    code: 'Publication 578',
    name: 'Tax Information for Private Foundations and Foundation Managers',
    who: 'IRS guidance',
    when: 'Read before the first grant cycle',
    cost: 'Free',
    match: 'publication 578',
    url: 'https://www.irs.gov/charities-non-profits/private-foundations',
  },
];

const STATE_STEPS: Form[] = [
  {
    code: 'Form 532B',
    name: 'Ohio Articles of Incorporation — Nonprofit',
    who: 'Ohio Secretary of State',
    when: 'Step one of formation',
    cost: '$99',
    match: 'articles',
    url: 'https://www.ohiosos.gov/businesses/filing-forms--fee-schedule/',
  },
  {
    code: 'Statutory agent',
    name: 'Appointment of statutory agent (included in 532B)',
    who: 'Ohio Secretary of State',
    when: 'Filed with the articles',
    cost: 'Included',
    match: 'statutory agent',
    url: 'https://www.ohiosos.gov/businesses/information-on-starting-and-maintaining-a-business/starting-a-nonprofit/',
  },
  {
    code: 'Charitable registration',
    name: 'Ohio Attorney General charitable trust registration and annual report',
    who: 'Ohio Attorney General',
    when: 'Within 6 months of receiving assets, then annually',
    cost: 'Sliding fee',
    match: 'attorney general',
    url: 'https://www.ohioattorneygeneral.gov/charitable',
  },
  {
    code: 'Bylaws + organizing minutes',
    name: 'Board adoption of bylaws, conflict-of-interest policy, and officers',
    who: 'Your board',
    when: 'First organizing meeting, before filing Form 1023',
    cost: 'Attorney time',
    match: 'bylaws',
    url: 'https://www.irs.gov/charities-non-profits/charitable-organizations/governance-and-related-topics-501c3-organizations',
  },
];

export default function FormationPaperworkTab({ onNavigate }: Props) {
  const { data: compliance = [] } = useFdnCompliance();

  const statusFor = (match: string) => {
    const row = (compliance as any[]).find((c) => String(c.item ?? '').toLowerCase().includes(match));
    if (!row) return null;
    return String(row.status);
  };

  const badgeFor = (match: string) => {
    const status = statusFor(match);
    if (!status) return null;
    const done = ['filed', 'complete'].includes(status);
    return (
      <Badge variant={done ? 'secondary' : status === 'overdue' ? 'destructive' : 'outline'} className="text-xs">
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const renderGroup = (title: string, blurb: string, rows: Form[]) => (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{blurb}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((f) => (
          <div key={f.code} className="rounded-lg border border-border/50 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-prism-amber" />
                  <p className="text-sm font-semibold">{f.code}</p>
                  {badgeFor(f.match)}
                </div>
                <p className="mt-0.5 text-sm">{f.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {f.who} · {f.when} · {f.cost}
                </p>
                {f.note && <p className="mt-1 text-xs text-muted-foreground">{f.note}</p>}
              </div>
              <Button asChild size="sm" variant="outline" className="h-7 gap-1 text-xs">
                <a href={f.url} target="_blank" rel="noopener noreferrer">
                  Open <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Landmark className="h-4 w-4 text-prism-amber" /> Formation paperwork, in filing order
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Ohio articles first, then the EIN, then bylaws and policies at the organizing meeting, then Form 1023 to the
            IRS. Statuses below mirror your compliance tracker — mark items filed there and they update here.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="gap-1" onClick={() => onNavigate('compliance')}>
            Track filing statuses <ArrowRight className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => onNavigate('documents')}>
            Store the filed originals <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {renderGroup(
        'Step A — Ohio state formation',
        'Creates the legal entity and the authority your board acts under. Nothing federal can be filed until this exists.',
        STATE_STEPS,
      )}

      {renderGroup(
        'Step B — IRS forms and guidance',
        'Federal recognition and the annual return cycle. Links go to the official IRS pages.',
        FEDERAL_FORMS,
      )}

      <p className="text-xs text-muted-foreground">
        Fees and deadlines change — confirm current amounts on the linked official pages. Educational planning only; have
        your attorney and CPA review the articles, bylaws, and Form 1023 narrative before filing.
      </p>
    </div>
  );
}
