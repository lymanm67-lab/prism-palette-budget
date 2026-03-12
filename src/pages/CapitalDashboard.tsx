import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, FileSearch, FileText, TrendingUp, DollarSign, Clock,
  BarChart3, Activity, Building2, Lock, Bot, AlertTriangle,
  ChevronRight, ArrowUpRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import PageOverview from '@/components/PageOverview';

const CAPITAL_FEATURES = [
  'Credit report import & analysis',
  'Metro2 compliance scanning',
  'eOSCAR dispute preparation',
  'Agency financial command center',
  'Business credit building roadmap',
];

interface ModuleCard {
  title: string;
  description: string;
  icon: React.ElementType;
  route: string;
  status: 'active' | 'coming-soon';
  category: 'credit' | 'agency';
  color: string;
  stat?: string;
  statLabel?: string;
}

const MODULES: ModuleCard[] = [
  {
    title: 'Credit Overview',
    description: 'Import and analyze credit reports from all three bureaus',
    icon: Shield,
    route: '/capital/credit-overview',
    status: 'active',
    category: 'credit',
    color: 'text-prism-teal',
    stat: '—',
    statLabel: 'Credit Score',
  },
  {
    title: 'Metro2 Risk Scanner',
    description: 'AI-powered compliance analysis against Metro2 reporting standards',
    icon: FileSearch,
    route: '/capital/metro2-scanner',
    status: 'active',
    category: 'credit',
    color: 'text-prism-amber',
    stat: '0',
    statLabel: 'Issues Found',
  },
  {
    title: 'Dispute Manager',
    description: 'Prepare eOSCAR-compatible disputes with FCRA compliance',
    icon: FileText,
    route: '/capital/disputes',
    status: 'active',
    category: 'credit',
    color: 'text-prism-orange',
    stat: '0',
    statLabel: 'Active Disputes',
  },
  {
    title: 'Funding Readiness Score',
    description: 'Proprietary scoring model evaluating your readiness for capital',
    icon: TrendingUp,
    route: '/capital/funding-readiness',
    status: 'active',
    category: 'credit',
    color: 'text-prism-lime',
    stat: '—',
    statLabel: 'Score / 100',
  },
  {
    title: 'Business Credit Builder',
    description: 'Step-by-step roadmap to establish strong business credit',
    icon: Building2,
    route: '/capital/business-credit',
    status: 'active',
    category: 'credit',
    color: 'text-prism-indigo',
    stat: '0%',
    statLabel: 'Progress',
  },
  {
    title: 'Medicaid Receivable Pipeline',
    description: 'Track claims submitted, pending, approved, and denied',
    icon: DollarSign,
    route: '/capital/receivables',
    status: 'active',
    category: 'agency',
    color: 'text-prism-sky',
    stat: '$0',
    statLabel: 'Outstanding',
  },
  {
    title: 'Payroll Runway',
    description: 'Calculate days of payroll coverage and monitor cash reserves',
    icon: Clock,
    route: '/capital/payroll-runway',
    status: 'active',
    category: 'agency',
    color: 'text-prism-rose',
    stat: '— days',
    statLabel: 'Runway',
  },
  {
    title: 'Funding Simulator',
    description: 'Simulate receivable factoring, bridge loans, and working capital',
    icon: BarChart3,
    route: '/capital/funding-simulator',
    status: 'active',
    category: 'agency',
    color: 'text-prism-violet',
  },
  {
    title: 'Agency Survival Index',
    description: 'Predictive health score for DODD agency sustainability',
    icon: Activity,
    route: '/capital/survival-index',
    status: 'active',
    category: 'agency',
    color: 'text-prism-teal',
    stat: '—',
    statLabel: 'Score / 100',
  },
  {
    title: 'Document Vault',
    description: 'Encrypted storage for credit reports, disputes, and financials',
    icon: Lock,
    route: '/capital/vault',
    status: 'active',
    category: 'agency',
    color: 'text-muted-foreground',
  },
  {
    title: 'AI Financial Coach',
    description: 'AI assistant for credit education and capital planning guidance',
    icon: Bot,
    route: '/capital/ai-coach',
    status: 'active',
    category: 'agency',
    color: 'text-prism-amber',
  },
];

const CapitalDashboard = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'credit' | 'agency'>('all');

  const filtered = filter === 'all' ? MODULES : MODULES.filter(m => m.category === filter);

  return (
    <div className="space-y-6 pb-8">
      <PageOverview
        title="FocusOS Capital"
        description="Credit Intelligence & Agency Financial Command Center"
        icon={Shield}
        ttsScript="Welcome to FocusOS Capital, your Credit Intelligence and Agency Financial Command Center."
        features={CAPITAL_FEATURES}
      />

      {/* Compliance Notice */}
      <div className="flex items-start gap-3 rounded-lg border border-prism-amber/30 bg-prism-amber/5 p-4">
        <AlertTriangle className="h-5 w-5 text-prism-amber shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          This system provides financial education, credit analysis, and operational planning tools.
          It does not provide credit repair services or guarantee removal of credit report items.
        </p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickStat label="Funding Readiness" value="—" sublabel="/ 100" color="text-prism-lime" />
        <QuickStat label="Metro2 Issues" value="0" sublabel="flagged" color="text-prism-amber" />
        <QuickStat label="Payroll Runway" value="—" sublabel="days" color="text-prism-rose" />
        <QuickStat label="Survival Index" value="—" sublabel="/ 100" color="text-prism-teal" />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'credit', 'agency'] as const).map(f => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f === 'all' ? 'All Modules' : f === 'credit' ? 'Credit Intelligence' : 'Agency Finance'}
          </Button>
        ))}
      </div>

      {/* Module Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((mod) => (
          <Card
            key={mod.route}
            className="group cursor-pointer hover:border-primary/30"
            onClick={() => navigate(mod.route)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-muted', mod.color)}>
                  <mod.icon className="h-5 w-5" />
                </div>
                {mod.status === 'coming-soon' ? (
                  <Badge variant="secondary" className="text-[10px]">Coming Soon</Badge>
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
              <CardTitle className="text-base mt-2">{mod.title}</CardTitle>
              <CardDescription className="text-xs">{mod.description}</CardDescription>
            </CardHeader>
            {mod.stat && (
              <CardContent className="pt-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold">{mod.stat}</span>
                  {mod.statLabel && <span className="text-xs text-muted-foreground">{mod.statLabel}</span>}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

const QuickStat = ({ label, value, sublabel, color }: { label: string; value: string; sublabel: string; color: string }) => (
  <Card className="p-4">
    <p className="text-xs text-muted-foreground mb-1">{label}</p>
    <div className="flex items-baseline gap-1">
      <span className={cn('text-2xl font-bold', color)}>{value}</span>
      <span className="text-xs text-muted-foreground">{sublabel}</span>
    </div>
  </Card>
);

export default CapitalDashboard;
