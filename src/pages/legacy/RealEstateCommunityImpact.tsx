import { Link } from 'react-router-dom';
import {
  Building2,
  Home,
  ArrowRight,
  Users,
  BarChart3,
  TrendingUp,
  MapPin,
  Wallet,
  HeartHandshake,
  ShieldAlert,
  Sparkles,
  FileText,
  Flag,
  Heart,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import PageOverview from '@/components/PageOverview';
import { useThvRollup } from '@/hooks/use-tiny-home-village';
import { useMhRollup } from '@/hooks/use-mh-rollup';
import {
  SHARED_FAMILY_LEGACY_STATEMENT,
  money,
  pct,
} from '@/lib/legacy/tinyHomeVillage';

const MH = '/legacy/real-estate/medical-housing';
const THV = '/legacy/real-estate/tiny-home-village';

const NAV: { label: string; to: string; icon: typeof Home }[] = [
  { label: 'Overview', to: '/legacy/real-estate', icon: Sparkles },
  { label: 'Goal 1 Medical Housing', to: `${MH}?tab=dashboard`, icon: Building2 },
  { label: 'Goal 1 Properties', to: `${MH}?tab=properties`, icon: MapPin },
  { label: 'Goal 1 Market Analysis', to: `${MH}?tab=markets`, icon: BarChart3 },
  { label: 'Goal 1 Income Projections', to: `${MH}?tab=income`, icon: TrendingUp },
  { label: 'Goal 2 Tiny Home Village', to: `${THV}?tab=dashboard`, icon: Home },
  { label: 'Goal 2 Site Planning', to: `${THV}?tab=sites`, icon: MapPin },
  { label: 'Goal 2 Development Budget', to: `${THV}?tab=budget`, icon: Wallet },
  { label: 'Goal 2 Resident Programs', to: `${THV}?tab=programs`, icon: HeartHandshake },
  { label: 'Goal 2 Funding', to: `${THV}?tab=funding`, icon: Wallet },
  { label: 'Partners', to: `${THV}?tab=partners`, icon: Users },
  { label: 'Milestones', to: `${THV}?tab=phases`, icon: Flag },
  { label: 'Risks', to: `${THV}?tab=risks`, icon: ShieldAlert },
  { label: 'Impact', to: `${THV}?tab=impact`, icon: Sparkles },
  { label: 'Documents', to: `${THV}?tab=documents`, icon: FileText },
  { label: 'Family Legacy', to: '/legacy/family', icon: Heart },
];

function GoalCard({
  accent,
  icon: Icon,
  eyebrow,
  title,
  description,
  cta,
  to,
  rows,
  completion,
}: {
  accent: string;
  icon: typeof Home;
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  to: string;
  rows: { label: string; value: string }[];
  completion: number;
}) {
  return (
    <Card className={`border-2 ${accent} bg-card/70 backdrop-blur`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          <Badge variant="secondary" className="text-[10px]">{eyebrow}</Badge>
        </div>
        <CardTitle className="text-lg leading-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{description}</p>

        <dl className="space-y-1.5 text-xs">
          {rows.map((r) => (
            <div key={r.label} className="flex items-start justify-between gap-3 border-b border-border/40 pb-1.5">
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd className="text-right font-medium tabular-nums">{r.value}</dd>
            </div>
          ))}
        </dl>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Completion</span>
            <span className="tabular-nums">{pct(completion)}</span>
          </div>
          <Progress value={completion} className="h-2" />
        </div>

        <Button asChild className="w-full">
          <Link to={to}>
            {cta}
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function RealEstateCommunityImpact() {
  const thv = useThvRollup();
  const mh = useMhRollup() as any;

  const s = thv.settings;

  const mhTotalCost = Number(mh?.totalStartup ?? mh?.startupTotal ?? 0);
  const mhProperties = Number(mh?.propertyCount ?? mh?.properties?.length ?? 0);
  const mhMonthlyIncome = Number(mh?.monthlyCashFlow ?? mh?.totalMonthlyCashFlow ?? 0);

  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      <PageOverview
        title="Building Wealth With Purpose"
        description="Two equal long-term real estate goals: professional housing for medical professionals, and a tiny home village for young adults aging out of foster care."
        icon={Sparkles}
        iconColor="text-prism-amber"
        ttsScript="This is the Montgomery family real estate and community impact hub. It holds two equal long-term goals. Goal 1 is professional housing for traveling nurses, residents, physicians, and other medical professionals. Goal 2 is a tiny home village for young adults aging out of foster care. Each goal has its own plan, budget, partners, funding strategy, risks, and measures of success. Goal 1 may help fund Goal 2, but Goal 2 is never dependent on it."
        features={[
          'Goal 1: furnished, professionally managed housing near hospitals and medical schools',
          'Goal 2: a supportive tiny home village with mentoring, employment prep, and financial literacy',
          'Independent phase, cost, funding, milestone, and risk tracking for each goal',
          'Optional Wealth With Purpose allocation from medical housing profit to the village fund',
        ]}
      />

      <h1 className="sr-only">Legacy Real Estate and Community Impact</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <GoalCard
          accent="border-prism-teal/40"
          icon={Building2}
          eyebrow="Goal 1"
          title="Professional Housing for Medical Professionals"
          description="Develop furnished, professionally managed housing near hospitals, medical schools, and healthcare employment centers for traveling nurses, medical residents, fellows, physicians, therapists, medical students, and other healthcare professionals."
          cta="View Medical Housing Plan"
          to={`${MH}?tab=dashboard`}
          completion={mhProperties > 0 ? 35 : 15}
          rows={[
            { label: 'Current phase', value: mhProperties > 0 ? 'Property evaluation' : 'Market research' },
            { label: 'Target date', value: '2027' },
            { label: 'Estimated cost', value: mhTotalCost ? money(mhTotalCost) : 'Modeling in planner' },
            { label: 'Amount funded', value: money(0) },
            { label: 'Funding gap', value: mhTotalCost ? money(mhTotalCost) : 'To be determined' },
            { label: 'Next milestone', value: 'Score first candidate property' },
            { label: 'Responsible owner', value: 'Lyman Montgomery' },
            {
              label: 'Risk status',
              value: mhMonthlyIncome > 0 ? 'Moderate' : 'Moderate — pre-acquisition',
            },
          ]}
        />

        <GoalCard
          accent="border-prism-rose/40"
          icon={Home}
          eyebrow="Goal 2"
          title="Tiny Home Village for Foster Care Alumni"
          description="Develop a safe, stable, and supportive tiny home village for young adults transitioning out of foster care — combining affordable housing, mentoring, employment preparation, education, financial literacy, life-skills development, and a structured pathway toward independent adulthood."
          cta="View Tiny Home Village Plan"
          to={`${THV}?tab=dashboard`}
          completion={thv.taskCompletionPct}
          rows={[
            { label: 'Current phase', value: s?.current_phase ?? 'Phase 1: Vision and Feasibility' },
            { label: 'Target date', value: s?.target_opening_date ?? 'Not set' },
            { label: 'Estimated cost', value: money(thv.projectGoal) },
            { label: 'Amount funded', value: money(thv.fundingRollup.cashReceived + thv.fundingRollup.pledges) },
            { label: 'Funding gap', value: money(thv.fundingRollup.remainingTotalGap) },
            { label: 'Next milestone', value: s?.next_milestone ?? 'Complete preliminary feasibility study' },
            { label: 'Responsible owner', value: s?.responsible_owner ?? 'Lyman Montgomery' },
            {
              label: 'Risk status',
              value: thv.criticalRisks
                ? `Critical — ${thv.criticalRisks} open`
                : thv.highRisks
                  ? `High — ${thv.highRisks} open`
                  : (s?.risk_rating ?? 'Moderate'),
            },
          ]}
        />
      </div>

      <Card className="border-prism-amber/30 bg-prism-amber/5">
        <CardContent className="p-4">
          <p className="text-sm italic">{SHARED_FAMILY_LEGACY_STATEMENT}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Legacy Real Estate and Community Impact navigation</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {NAV.map((n) => (
            <Button key={n.label} asChild variant="outline" className="h-auto justify-start py-2.5">
              <Link to={n.to}>
                <n.icon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-xs sm:text-sm">{n.label}</span>
              </Link>
            </Button>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Educational planning tools only. Not investment, tax, or legal advice.
      </p>
    </div>
  );
}
