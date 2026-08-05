import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  useFdnSettings,
  useFdnPillars,
  useFdnInitiatives,
  useFdnRoadmap,
  useFdnRelationships,
} from '@/hooks/use-foundation';
import {
  useFdnGifts,
  useFdnInvestments,
  useFdnGovernance,
  useFdnCompliance,
  useFdnImpactMetrics,
  useFdnSuccession,
  useFdnDocuments,
} from '@/hooks/use-foundation-ops';
import { rollupFoundation } from '@/lib/legacy/foundation';
import {
  rollupFunding,
  rollupInvestments,
  rollupCompliance,
  rollupGovernance,
  rollupImpact,
  rollupSuccession,
  legacyScore,
} from '@/lib/legacy/foundationOps';

const PROMPTS = [
  'What is the single most important thing to fix this quarter?',
  'Are we at risk of missing the 5% minimum distribution requirement?',
  'Review our board composition and self-dealing exposure.',
  'Build a 12-month fundraising plan from our current donor base.',
  'How should we invest the endowment given our spending policy?',
  'Draft the agenda for our next board meeting.',
  'What would an auditor or major funder flag in our files today?',
];

export default function AiAdvisorTab() {
  const settings = useFdnSettings();
  const pillars = useFdnPillars();
  const initiatives = useFdnInitiatives();
  const roadmap = useFdnRoadmap();
  const relationships = useFdnRelationships();
  const gifts = useFdnGifts();
  const holdings = useFdnInvestments();
  const governance = useFdnGovernance();
  const compliance = useFdnCompliance();
  const metrics = useFdnImpactMetrics();
  const succession = useFdnSuccession();
  const documents = useFdnDocuments();

  const [question, setQuestion] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);

  const buildSnapshot = () => {
    const base = rollupFoundation(
      (pillars.data ?? []) as any,
      (initiatives.data ?? []) as any,
      (roadmap.data ?? []) as any,
      settings.data ?? null,
    );
    const funding = rollupFunding((gifts.data ?? []) as any[]);
    const investments = rollupInvestments((holdings.data ?? []) as any[], settings.data ?? null);
    const comp = rollupCompliance((compliance.data ?? []) as any[]);
    const gov = rollupGovernance((governance.data ?? []) as any[]);
    const impact = rollupImpact((metrics.data ?? []) as any[]);
    const succ = rollupSuccession((succession.data ?? []) as any[]);
    const score = legacyScore({
      readiness: base.readiness,
      funding,
      investments,
      compliance: comp,
      governance: gov,
      impact,
      succession: succ,
      endowmentTarget: base.endowmentTarget,
    });

    return {
      mission: settings.data?.mission ?? null,
      vision: settings.data?.vision ?? null,
      legacyScore: { total: score.total, label: score.label, dimensions: score.dimensions },
      strategy: base,
      funding: { ...funding, top: funding.top.map((g: any) => ({ donor: g.donor_name, amount: g.amount, type: g.gift_type })) },
      investments,
      governance: {
        ...gov,
        meetings: gov.meetings.slice(0, 6).map((m: any) => ({ date: m.meeting_date, decisions: m.decisions })),
      },
      compliance: {
        score: comp.score,
        total: comp.total,
        done: comp.done,
        overdue: comp.overdue.map((o: any) => ({ item: o.item, due: o.due_date })),
        upcoming: comp.upcoming.map((o: any) => ({ item: o.item, due: o.due_date })),
      },
      impact: {
        average: impact.average,
        onTrack: impact.onTrack,
        total: impact.total,
        metrics: impact.metrics.map((m: any) => ({
          name: m.metric_name,
          unit: m.unit,
          target: m.target,
          actual: m.actual,
          progress: m.progress,
        })),
      },
      succession: {
        ...succ,
        roles: (succession.data ?? []).map((s: any) => ({
          role: s.role_title,
          holder: s.current_holder,
          successor: s.successor_name,
          readiness: s.readiness,
          status: s.status,
        })),
      },
      pillars: (pillars.data ?? []).map((p: any) => ({
        name: p.name,
        status: p.status,
        annual_budget: p.annual_budget,
        target_beneficiaries: p.target_beneficiaries,
        actual_beneficiaries: p.actual_beneficiaries,
      })),
      roadmap: (roadmap.data ?? []).map((r: any) => ({
        phase: r.phase_label,
        title: r.title,
        status: r.status,
        target_amount: r.target_amount,
      })),
      relationshipCount: (relationships.data ?? []).length,
      documentCount: (documents.data ?? []).length,
      documentCategories: Array.from(new Set((documents.data ?? []).map((d: any) => d.doc_category))),
    };
  };

  const run = async (q?: string) => {
    const asked = q ?? question;
    setLoading(true);
    setAnalysis('');
    try {
      const { data, error } = await supabase.functions.invoke('foundation-advisor', {
        body: { snapshot: buildSnapshot(), question: asked },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const text = (data as any)?.analysis ?? '';
      if (!text) throw new Error('The advisor returned nothing — try again.');
      setAnalysis(text);
    } catch (e: any) {
      toast.error(e.message ?? 'Could not reach the advisor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card border-prism-indigo/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-prism-indigo" />
            Virtual Chief Philanthropy Advisor
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Reads your live foundation data — funding, endowment, governance, compliance, impact, and succession — and
            reviews it the way a 25-year private foundation executive would. Educational planning only.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {PROMPTS.map((p) => (
              <Badge
                key={p}
                variant="outline"
                className="cursor-pointer text-xs hover:bg-accent"
                onClick={() => {
                  setQuestion(p);
                  void run(p);
                }}
              >
                {p}
              </Badge>
            ))}
          </div>
          <div className="space-y-1">
            <Label htmlFor="fdn-advisor-q">Ask the advisor</Label>
            <Textarea
              id="fdn-advisor-q"
              rows={3}
              placeholder="e.g. We have $40k to give this year — how should we split it across the five pillars?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => run()} disabled={loading} className="gap-1.5">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? 'Reviewing…' : 'Ask the advisor'}
            </Button>
            <Button variant="outline" onClick={() => run('')} disabled={loading}>
              Full advisory review
            </Button>
          </div>
        </CardContent>
      </Card>

      {analysis && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Advisory review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{analysis}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        AI output is educational only and can be wrong. It is not legal, tax, accounting, or investment advice — confirm
        every structural, filing, and investment decision with a licensed attorney, CPA, and advisor.
      </p>
    </div>
  );
}
