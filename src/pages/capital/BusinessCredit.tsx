import { Building2, CheckCircle2, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import PageOverview from '@/components/PageOverview';

const ROADMAP_STEPS = [
  { step: 1, title: 'Entity Formation', description: 'Register LLC/Corp, obtain Articles of Organization', items: ['File with Secretary of State', 'Obtain operating agreement', 'Get certificate of formation'] },
  { step: 2, title: 'EIN & Tax Setup', description: 'Apply for Employer Identification Number', items: ['Apply for EIN via IRS', 'Register for state taxes', 'Determine tax classification'] },
  { step: 3, title: 'Business Bank Account', description: 'Open a dedicated business checking account', items: ['Choose a business-friendly bank', 'Separate personal and business finances', 'Set up online banking'] },
  { step: 4, title: 'Business Credit Bureau Registration', description: 'Register with D&B, Experian Business, Equifax Business', items: ['Get D-U-N-S number', 'Register with Experian Business', 'Register with Equifax Small Business'] },
  { step: 5, title: 'Vendor Tradelines', description: 'Establish Net-30/60/90 vendor accounts', items: ['Apply for starter vendor accounts', 'Make purchases and pay on time', 'Build 3-5 reporting tradelines'] },
  { step: 6, title: 'Business Credit Cards', description: 'Apply for business credit cards that report to bureaus', items: ['Start with secured business cards if needed', 'Graduate to unsecured cards', 'Keep utilization below 30%'] },
];

const BusinessCredit = () => {
  const completedSteps = 0;
  const progress = (completedSteps / ROADMAP_STEPS.length) * 100;

  return (
    <div className="space-y-6 pb-8">
      <PageOverview title="Business Credit Builder" description="Step-by-step roadmap to establish strong business credit" />

      {/* Progress */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Capital Preparation Roadmap</h3>
          <Badge variant="outline">{completedSteps} / {ROADMAP_STEPS.length} complete</Badge>
        </div>
        <Progress value={progress} className="h-3" />
      </Card>

      {/* Steps */}
      <div className="space-y-4">
        {ROADMAP_STEPS.map((step) => (
          <Card key={step.step} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold">
                  {step.step}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">{step.title}</CardTitle>
                  <CardDescription className="text-xs">{step.description}</CardDescription>
                </div>
                <Circle className="h-5 w-5 text-muted-foreground/30" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {step.items.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Circle className="h-3 w-3 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BusinessCredit;
