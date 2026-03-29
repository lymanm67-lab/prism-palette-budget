import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Heart, CreditCard, Clock, Shield, BarChart3, FileText,
  TrendingUp, TrendingDown, ArrowUpRight, Minus, RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PageOverview from '@/components/PageOverview';
import ScoreGauge from '@/components/credit-health/ScoreGauge';
import FactorCard, { type FactorStatus } from '@/components/credit-health/FactorCard';
import NextBestStep from '@/components/credit-health/NextBestStep';
import ScoreBarriers, { type Barrier } from '@/components/credit-health/ScoreBarriers';
import TimelinePreview from '@/components/credit-health/TimelinePreview';
import { useCreditAccounts } from '@/hooks/use-credit-accounts';
import { useDisputes } from '@/hooks/use-disputes';

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } } as const;
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } } } as const;

const CreditHealthDashboard = () => {
  const navigate = useNavigate();
  const { accounts } = useCreditAccounts();
  const { disputes } = useDisputes();

  // ── Score computation (reuses existing CreditOverview logic) ──
  const computeScore = (accts: typeof accounts) => {
    const revolving = accts.filter(a => a.account_type === 'Revolving');
    const totalBalance = revolving.reduce((s, a) => s + Number(a.balance), 0);
    const totalLimit = revolving.reduce((s, a) => s + Number(a.credit_limit || 0), 0);
    const utilization = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;
    const negativeCount = accts.filter(a =>
      ['Collection', 'Charge-Off', 'Foreclosure', 'Repossession'].includes(a.account_status)
    ).length;
    const openAccounts = accts.filter(a => a.account_status.toLowerCase() === 'open');
    const avgAge = (() => {
      const withDates = accts.filter(a => a.date_opened);
      if (!withDates.length) return 0;
      const now = new Date();
      return withDates.reduce((sum, a) => sum + ((now.getTime() - new Date(a.date_opened!).getTime()) / (1000 * 60 * 60 * 24 * 30)), 0) / withDates.length;
    })();

    const utilizationScore = utilization <= 10 ? 100 : utilization <= 30 ? 80 : utilization <= 50 ? 55 : utilization <= 75 ? 30 : 10;
    const negativeScore = negativeCount === 0 ? 100 : negativeCount <= 2 ? 40 : 15;
    const ageScore = avgAge >= 84 ? 100 : avgAge >= 48 ? 75 : avgAge >= 24 ? 55 : avgAge >= 12 ? 35 : 20;
    const types = new Set(accts.map(a => a.account_type));
    const mixScore = types.size >= 4 ? 100 : types.size >= 3 ? 75 : types.size >= 2 ? 50 : 30;
    const totalAcctsScore = openAccounts.length >= 10 ? 100 : openAccounts.length >= 5 ? 75 : openAccounts.length >= 3 ? 50 : 30;

    const raw = 300 + (550 * (utilizationScore * 0.20 + negativeScore * 0.28 + ageScore * 0.13 + mixScore * 0.11 + totalAcctsScore * 0.08 + 100 * 0.20) / 100);
    const score = accts.length > 0 ? Math.min(850, Math.max(300, Math.round(raw))) : 0;

    return { score, utilization, negativeCount, avgAge, utilizationScore, negativeScore, ageScore, mixScore, totalAcctsScore, openAccounts: openAccounts.length, totalBalance, totalLimit };
  };

  const metrics = useMemo(() => computeScore(accounts), [accounts]);

  // Per-bureau scores
  const bureauScores = useMemo(() => {
    const bureaus = ['Equifax', 'Experian', 'TransUnion'] as const;
    return bureaus.map(bureau => {
      const bureauAccounts = accounts.filter(a => a.bureau === bureau);
      const result = computeScore(bureauAccounts);
      return { bureau, score: result.score, count: bureauAccounts.length };
    });
  }, [accounts]);

  const toStatus = (s: number): FactorStatus => s >= 70 ? 'good' : s >= 40 ? 'fair' : s >= 20 ? 'poor' : 'critical';

  // ── Score barriers ──
  const barriers: Barrier[] = useMemo(() => {
    const b: Barrier[] = [];
    if (metrics.utilization > 30) b.push({ id: 'util', title: 'High credit card utilization', severity: metrics.utilization > 50 ? 'critical' : 'high', explanation: `Your utilization is ${metrics.utilization.toFixed(0)}%. Keeping it below 30% helps your score significantly.`, nextStep: 'Pay down balances', onAction: () => navigate('/capital/credit-health/breakdown') });
    if (metrics.negativeCount > 0) b.push({ id: 'neg', title: `${metrics.negativeCount} negative item${metrics.negativeCount > 1 ? 's' : ''} on report`, severity: 'critical', explanation: 'Collections, charge-offs, and derogatory marks weigh heavily on your score.', nextStep: 'Review & dispute', onAction: () => navigate('/capital/credit-health/issues') });
    if (metrics.avgAge < 24) b.push({ id: 'age', title: 'Thin credit history', severity: 'medium', explanation: 'Your average account age is under 2 years. Keep older accounts open to build history.', nextStep: 'Learn more' });
    if (disputes.filter(d => d.status === 'submitted' || d.status === 'in_progress').length > 0) b.push({ id: 'disp', title: 'Open disputes awaiting response', severity: 'medium', explanation: 'Some disputes are still under review. Score changes may be pending.', nextStep: 'Track disputes', onAction: () => navigate('/capital/credit-health/issues') });
    return b.slice(0, 3);
  }, [metrics, disputes, navigate]);

  // ── Next best step logic ──
  const nextStep = useMemo(() => {
    if (accounts.length === 0) return { title: 'Import your credit reports', description: 'Pull reports from all three bureaus to get a complete picture of your credit health.', impact: 'Foundation step', actionLabel: 'Import Reports', action: () => navigate('/capital/credit-overview') };
    if (metrics.utilization > 50) {
      const highest = accounts.filter(a => a.credit_limit && a.credit_limit > 0).sort((a, b) => (Number(b.balance) / Number(b.credit_limit!)) - (Number(a.balance) / Number(a.credit_limit!)))[0];
      return { title: highest ? `Pay down ${highest.account_name}` : 'Reduce revolving balances', description: `Your utilization is ${metrics.utilization.toFixed(0)}%. Getting below 30% could boost your score by 20-40 points.`, impact: 'Est. +20-40 pts', actionLabel: 'View plan', action: () => navigate('/capital/credit-health/breakdown') };
    }
    if (metrics.negativeCount > 0) return { title: 'Review negative items for errors', description: 'Check each negative account for reporting errors that can be disputed.', impact: 'Est. +15-50 pts per removal', actionLabel: 'Start review', action: () => navigate('/capital/credit-health/issues') };
    return { title: 'Stay consistent', description: 'Keep making on-time payments and maintaining low balances. Consistency is key.', impact: 'Steady improvement', actionLabel: 'View timeline', action: () => navigate('/capital/credit-health/timeline') };
  }, [accounts, metrics, navigate]);

  const factorCards = [
    { icon: Clock, title: 'Payment History', weight: '35%', score: metrics.negativeScore, opportunity: metrics.negativeScore >= 70 ? 'Great track record!' : 'Address late payments and negatives' },
    { icon: CreditCard, title: 'Credit Utilization', weight: '30%', score: metrics.utilizationScore, opportunity: metrics.utilization <= 30 ? 'Well managed' : `Currently at ${metrics.utilization.toFixed(0)}% — aim for under 30%` },
    { icon: Clock, title: 'Credit Age', weight: '15%', score: metrics.ageScore, opportunity: metrics.avgAge >= 48 ? 'Strong history' : 'Keep old accounts open' },
    { icon: BarChart3, title: 'Credit Mix', weight: '10%', score: metrics.mixScore, opportunity: 'Variety of account types helps' },
    { icon: FileText, title: 'Report Issues', weight: '—', score: disputes.length > 0 ? 50 : 80, opportunity: disputes.filter(d => d.status !== 'resolved').length > 0 ? `${disputes.filter(d => d.status !== 'resolved').length} active issues` : 'No open issues' },
  ];

  return (
    <div className="space-y-6 pb-8">
      <PageOverview
        title="Credit Health"
        description="Understand your score, find what's hurting it, and follow a clear plan to improve"
        icon={Heart}
        ttsScript="Welcome to Credit Health. This is your command center for understanding and improving your credit score. View your estimated score, see what factors are holding you back, get a personalized next best step, and follow a guided 7 to 120 day action timeline. Use the Score Breakdown for detailed factor education, the Issue Tracker to manage disputes, and the Approval Readiness screen to prepare for applications."
        features={['Score analysis & factor breakdown', 'Guided 7-120 day action plan', 'Issue tracking & dispute management', 'Approval readiness assessment']}
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
        {/* Hero: Score + Change + Target */}
        <motion.div variants={fadeUp}>
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
            <CardContent className="relative p-6">
              <div className="grid gap-6 md:grid-cols-[auto_1fr]">
                <ScoreGauge score={metrics.score} size="lg" />
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Estimated VantageScore®</p>
                    <p className="text-xs text-muted-foreground mt-1">Based on your imported credit data</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Accounts</p>
                      <p className="text-xl font-bold">{accounts.length}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Utilization</p>
                      <p className={`text-xl font-bold ${metrics.utilization > 30 ? 'text-destructive' : 'text-emerald-600'}`}>
                        {metrics.totalLimit > 0 ? `${metrics.utilization.toFixed(0)}%` : 'N/A'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Negative Items</p>
                      <p className={`text-xl font-bold ${metrics.negativeCount > 0 ? 'text-destructive' : ''}`}>{metrics.negativeCount}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => navigate('/capital/credit-overview')}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Update Reports
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate('/capital/credit-health/breakdown')}>
                      <BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Score Breakdown
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Next Best Step */}
        <motion.div variants={fadeUp}>
          <NextBestStep
            title={nextStep.title}
            description={nextStep.description}
            impact={nextStep.impact}
            actionLabel={nextStep.actionLabel}
            onAction={nextStep.action}
          />
        </motion.div>

        {/* Factor Cards */}
        <motion.div variants={fadeUp}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {factorCards.map(f => (
              <FactorCard
                key={f.title}
                icon={f.icon}
                title={f.title}
                status={toStatus(f.score)}
                statusText={f.weight}
                score={f.score}
                opportunity={f.opportunity}
                onClick={() => navigate('/capital/credit-health/breakdown')}
              />
            ))}
          </div>
        </motion.div>

        {/* Score Barriers */}
        <motion.div variants={fadeUp}>
          <ScoreBarriers barriers={barriers} />
        </motion.div>

        {/* Timeline Preview */}
        <motion.div variants={fadeUp}>
          <TimelinePreview />
        </motion.div>

        {/* Quick Navigation */}
        <motion.div variants={fadeUp}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Score Breakdown', icon: BarChart3, to: '/capital/credit-health/breakdown', color: 'text-blue-500' },
              { label: 'Issue Tracker', icon: FileText, to: '/capital/credit-health/issues', color: 'text-amber-500' },
              { label: 'Explain My Score', icon: Heart, to: '/capital/credit-health/explain', color: 'text-primary' },
              { label: 'Approval Readiness', icon: Shield, to: '/capital/credit-health/readiness', color: 'text-emerald-500' },
            ].map(nav => (
              <Card
                key={nav.label}
                className="cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
                onClick={() => navigate(nav.to)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <nav.icon className={`h-5 w-5 ${nav.color}`} />
                  <span className="text-sm font-semibold">{nav.label}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default CreditHealthDashboard;
