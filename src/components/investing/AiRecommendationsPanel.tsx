import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Plus, CalendarClock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { ROLES, ROLE_META, securityTypeLabel, type InvestmentRole } from '@/lib/investing/roles';
import { useInvestingMetrics } from '@/hooks/use-investing-metrics';
import { useRoleWatchlist, useSaveWatchlistItem } from '@/hooks/use-investing';

const MAX_PER_ROLE = 7;
const REVIEW_MONTHS = 6;

interface Idea {
  ticker: string;
  name?: string;
  security_type?: string;
  thesis?: string;
  main_risk?: string;
  catalyst?: string;
  fit_note?: string;
}

function reviewDate(from = new Date()): string {
  const d = new Date(from);
  d.setMonth(d.getMonth() + REVIEW_MONTHS);
  return d.toISOString().slice(0, 10);
}

export function AiRecommendationsPanel() {
  const { positions, loading } = useInvestingMetrics();
  const watchlist = useRoleWatchlist();
  const saveWatchlistItem = useSaveWatchlistItem();

  const [role, setRole] = useState<InvestmentRole>('CORE');
  const [notes, setNotes] = useState('');
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [guidance, setGuidance] = useState('');
  const [running, setRunning] = useState(false);

  const watchRows = (watchlist.data ?? []) as { ticker: string; candidate_role: string; review_date: string | null }[];

  const roleCounts = useMemo(
    () =>
      ROLES.map((r) => {
        const holdings = positions.filter((p) => p.role === r);
        const watching = watchRows.filter((w) => w.candidate_role === r);
        const nextReview = [...holdings.map((p) => p.review_date), ...watching.map((w) => w.review_date)]
          .filter(Boolean)
          .sort()[0] as string | undefined;
        return {
          role: r,
          held: holdings.length,
          watching: watching.length,
          slots: Math.max(0, MAX_PER_ROLE - holdings.length - watching.length),
          nextReview: nextReview ?? null,
        };
      }),
    [positions, watchRows],
  );

  const current = roleCounts.find((r) => r.role === role)!;

  async function runAdvisor() {
    if (current.slots <= 0) {
      toast.error(`${role} already holds the maximum of ${MAX_PER_ROLE} securities. Retire one before adding another.`);
      return;
    }
    setRunning(true);
    setIdeas([]);
    setGuidance('');
    try {
      const { data, error } = await supabase.functions.invoke('investing-role-advisor', {
        body: {
          role,
          purpose: `${ROLE_META[role].purpose} — ${ROLE_META[role].job}`,
          currentHoldings: positions.filter((p) => p.role === role).map((p) => ({ ticker: p.ticker, name: p.name })),
          slotsRemaining: current.slots,
          accountTypes: [...new Set(positions.map((p) => p.account_type))],
          notes,
        },
      });
      if (error) throw error;
      const payload = data as { error?: string; ideas?: Idea[]; role_guidance?: string };
      if (payload?.error) throw new Error(payload.error);
      setIdeas((payload.ideas ?? []).slice(0, current.slots));
      setGuidance(payload.role_guidance ?? '');
      if ((payload.ideas ?? []).length === 0) toast.info('No new candidates returned for this role.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Recommendation failed');
    } finally {
      setRunning(false);
    }
  }

  function addToWatchlist(idea: Idea) {
    saveWatchlistItem.mutate({
      ticker: idea.ticker.toUpperCase(),
      name: idea.name ?? null,
      security_type: idea.security_type ?? 'unverified',
      verified: false,
      candidate_role: role,
      thesis: [idea.thesis, idea.main_risk ? `Main risk: ${idea.main_risk}` : null].filter(Boolean).join(' '),
      catalyst: idea.catalyst ?? null,
      research_notes: idea.fit_note ?? null,
      review_date: reviewDate(),
      decision_status: 'researching',
    });
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" /> AI candidates by role
          </CardTitle>
          <CardDescription>
            Research ideas for one role at a time, capped at {MAX_PER_ROLE} securities per role and re-evaluated every {REVIEW_MONTHS} months.
            Candidates land on your watchlist for approval — nothing is bought and no trade is placed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="grid gap-2 sm:grid-cols-5">
              {roleCounts.map((r) => (
                <button
                  key={r.role}
                  onClick={() => setRole(r.role)}
                  className={`rounded-md border p-3 text-left transition ${
                    r.role === role ? 'border-primary/60 bg-primary/5' : 'border-border/60 hover:bg-muted/40'
                  }`}
                >
                  <Badge variant="outline" className={ROLE_META[r.role].accent}>{r.role}</Badge>
                  <div className="mt-2 text-sm">
                    {r.held + r.watching} / {MAX_PER_ROLE} slots used
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.held} held · {r.watching} watching
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarClock className="h-3 w-3" />
                    {r.nextReview ? `Review ${r.nextReview}` : 'No review set'}
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-1">
            <Label>What matters to you for {role} right now (optional)</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. keep costs low, avoid overlap with SPMO, taxable account only"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={runAdvisor} disabled={running || current.slots <= 0}>
              <Sparkles className="mr-2 h-4 w-4" />
              {running ? 'Researching…' : `Suggest up to ${current.slots} candidate${current.slots === 1 ? '' : 's'}`}
            </Button>
            {current.slots <= 0 && (
              <span className="flex items-center gap-1 text-sm text-amber-400">
                <AlertTriangle className="h-4 w-4" /> {role} is at its {MAX_PER_ROLE}-security cap.
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              Next review date applied to anything you add: {reviewDate()}
            </span>
          </div>

          {guidance && <p className="rounded-md border border-border/60 bg-background/40 p-3 text-sm">{guidance}</p>}

          {ideas.length > 0 && (
            <div className="space-y-3">
              {ideas.map((idea) => (
                <div key={idea.ticker} className="rounded-lg border border-border/60 bg-background/40 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{idea.ticker?.toUpperCase()}</span>
                    <span className="text-sm text-muted-foreground">{idea.name}</span>
                    <Badge variant="secondary">{securityTypeLabel(idea.security_type)}</Badge>
                    <Badge variant="outline" className={ROLE_META[role].accent}>{role}</Badge>
                  </div>
                  {idea.thesis && <p className="mt-2 text-sm">{idea.thesis}</p>}
                  {idea.catalyst && <p className="mt-1 text-sm text-muted-foreground">Catalyst: {idea.catalyst}</p>}
                  {idea.main_risk && <p className="mt-1 text-sm text-muted-foreground">Main risk: {idea.main_risk}</p>}
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => addToWatchlist(idea)}>
                    <Plus className="mr-2 h-3.5 w-3.5" /> Add to watchlist for review
                  </Button>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            AI research is an estimate and an idea list, not investment advice or a guarantee. Verify the security type, costs and holdings
            before you buy, and confirm anything tax-related with your advisor.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
