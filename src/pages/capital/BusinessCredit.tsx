import { useState } from 'react';
import { Building2, CheckCircle2, Circle, ChevronDown, ChevronUp, StickyNote, Save, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import PageOverview from '@/components/PageOverview';
import { useBusinessCreditSteps } from '@/hooks/use-business-credit-steps';

const ROADMAP_STEPS = [
  { step: 1, key: 'entity_formation', title: 'Entity Formation', description: 'Register LLC/Corp, obtain Articles of Organization', items: ['File with Secretary of State', 'Obtain operating agreement', 'Get certificate of formation'] },
  { step: 2, key: 'ein_tax_setup', title: 'EIN & Tax Setup', description: 'Apply for Employer Identification Number', items: ['Apply for EIN via IRS', 'Register for state taxes', 'Determine tax classification'] },
  { step: 3, key: 'business_bank', title: 'Business Bank Account', description: 'Open a dedicated business checking account', items: ['Choose a business-friendly bank', 'Separate personal and business finances', 'Set up online banking'] },
  { step: 4, key: 'bureau_registration', title: 'Business Credit Bureau Registration', description: 'Register with D&B, Experian Business, Equifax Business', items: ['Get D-U-N-S number', 'Register with Experian Business', 'Register with Equifax Small Business'] },
  { step: 5, key: 'vendor_tradelines', title: 'Vendor Tradelines', description: 'Establish Net-30/60/90 vendor accounts', items: ['Apply for starter vendor accounts', 'Make purchases and pay on time', 'Build 3-5 reporting tradelines'] },
  { step: 6, key: 'business_credit_cards', title: 'Business Credit Cards', description: 'Apply for business credit cards that report to bureaus', items: ['Start with secured business cards if needed', 'Graduate to unsecured cards', 'Keep utilization below 30%'] },
];

const BusinessCredit = () => {
  const { steps, getStep, upsertStep, updateNotes, isLoading } = useBusinessCreditSteps();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const completedSteps = ROADMAP_STEPS.filter(s => getStep(s.key)?.is_completed).length;
  const progress = (completedSteps / ROADMAP_STEPS.length) * 100;

  const toggleStep = (key: string, label: string) => {
    const current = getStep(key);
    upsertStep({ step_key: key, step_label: label, is_completed: !current?.is_completed });
  };

  const handleSaveNotes = (key: string, label: string) => {
    updateNotes({ step_key: key, notes: notesDraft[key] ?? '', step_label: label });
  };

  const openNotes = (key: string) => {
    if (expandedKey === key) { setExpandedKey(null); return; }
    const existing = getStep(key);
    setNotesDraft(prev => ({ ...prev, [key]: existing?.notes || '' }));
    setExpandedKey(key);
  };

  return (
    <div className="space-y-6 pb-8">
      <PageOverview title="Business Credit Builder" description="Step-by-step roadmap to establish strong business credit" icon={Building2} ttsScript="Welcome to the Business Credit Builder. This is your step-by-step roadmap for establishing business credit separate from your personal credit. The six phases walk you through entity formation, EIN and tax setup, opening a business bank account, registering with business credit bureaus like Dun and Bradstreet, building vendor tradelines with Net-30 accounts, and graduating to business credit cards. Each step includes a checklist and notes section to track your progress. Scenario: You just formed your LLC. Start by checking off entity formation, then move to getting your EIN from the IRS. Once your business bank account is open, apply for your D-U-N-S number and two to three starter vendor accounts that report to business bureaus — building the foundation for a strong Paydex score." features={['6-phase business credit roadmap', 'Entity formation and EIN setup guides', 'Vendor tradeline and D-U-N-S registration', 'Progress tracking with notes per step']} />

      <Card className="p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Capital Preparation Roadmap</h3>
          <Badge variant="outline">{completedSteps} / {ROADMAP_STEPS.length} complete</Badge>
        </div>
        <Progress value={progress} className="h-3" />
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-primary" />
            Essential Registration Links
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <a href="https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-lg border bg-background hover:bg-accent transition-colors group">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20">
              <ExternalLink className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm">Apply for EIN</p>
              <p className="text-xs text-muted-foreground truncate">IRS.gov</p>
            </div>
          </a>
          <a href="https://www.dnb.com/duns/get-a-duns.html" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-lg border bg-background hover:bg-accent transition-colors group">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20">
              <ExternalLink className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm">Get D-U-N-S Number</p>
              <p className="text-xs text-muted-foreground truncate">dnb.com</p>
            </div>
          </a>
          <a href="https://www.experian.com/small-business/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-lg border bg-background hover:bg-accent transition-colors group">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20">
              <ExternalLink className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm">Experian Business</p>
              <p className="text-xs text-muted-foreground truncate">experian.com</p>
            </div>
          </a>
          <a href="https://www.equifax.com/business/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-lg border bg-background hover:bg-accent transition-colors group">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20">
              <ExternalLink className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm">Equifax Small Business</p>
              <p className="text-xs text-muted-foreground truncate">equifax.com</p>
            </div>
          </a>
        </CardContent>
      </Card>

      {/* Vendor Tradeline Resources */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-primary" />
            Vendor Tradeline Resources
          </CardTitle>
          <p className="text-xs text-muted-foreground">Establish Net-30/60/90 vendor accounts that report to business credit bureaus</p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[
            { name: 'Tradeline Supply', url: 'https://www.tradelinesupply.com', desc: 'tradelinesupply.com' },
            { name: 'Boost Credit 101', url: 'https://www.boostcredit101.com', desc: 'boostcredit101.com' },
            { name: 'Tradelines Club', url: 'https://www.tradelines.club', desc: 'tradelines.club' },
            { name: 'Improve My Credit Fitness', url: 'https://www.improvemycreditfitness.com', desc: 'improvemycreditfitness.com' },
            { name: 'Tradeline Genie', url: 'https://www.tradelinegenie.com', desc: 'tradelinegenie.com' },
          ].map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-lg border bg-background hover:bg-accent transition-colors group">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20">
                <ExternalLink className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm">{link.name}</p>
                <p className="text-xs text-muted-foreground truncate">{link.desc}</p>
              </div>
            </a>
          ))}
        </CardContent>
      </Card>

        {ROADMAP_STEPS.map((step) => {
          const saved = getStep(step.key);
          const isDone = saved?.is_completed ?? false;
          const isExpanded = expandedKey === step.key;

          return (
            <Card key={step.key} className={`overflow-hidden transition-colors ${isDone ? 'border-emerald-500/40 bg-emerald-500/5' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Checkbox checked={isDone} onCheckedChange={() => toggleStep(step.key, step.title)} className="h-5 w-5" />
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold">
                    {step.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className={`text-base ${isDone ? 'line-through text-muted-foreground' : ''}`}>{step.title}</CardTitle>
                    <CardDescription className="text-xs">{step.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    {saved?.notes && <StickyNote className="h-3.5 w-3.5 text-primary" />}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openNotes(step.key)}>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <ul className="space-y-2">
                  {step.items.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      {isDone ? <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" /> : <Circle className="h-3 w-3 shrink-0" />}
                      {item}
                    </li>
                  ))}
                </ul>
                {isExpanded && (
                  <div className="border-t pt-3 space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Notes</label>
                    <Textarea
                      value={notesDraft[step.key] ?? ''}
                      onChange={e => setNotesDraft(prev => ({ ...prev, [step.key]: e.target.value }))}
                      placeholder="Add notes, links, or reminders for this step..."
                      rows={3}
                    />
                    <Button size="sm" onClick={() => handleSaveNotes(step.key, step.title)}>
                      <Save className="h-3.5 w-3.5 mr-1" />Save Notes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default BusinessCredit;
