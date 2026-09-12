import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, BookOpen, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import SwingEdgeHeader from '@/components/swingedge/SwingEdgeHeader';
import HowToUse from '@/components/swingedge/HowToUse';
import AiLevelsAssistant from '@/components/swingedge/AiLevelsAssistant';
import { useTradingSettings, useTradingTitle } from '@/hooks/use-swingedge';
import { useTradeJournal, type PaperTrade } from '@/hooks/use-swingedge-lists';
import { MISTAKE_TAGS, rMultiple } from '@/lib/swingedge/performance';
import NextStepsCard from '@/components/swingedge/NextStepsCard';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

const NO_TRADE = 'none';
const NO_MISTAKE = 'none';

interface FormState {
  paperTradeId: string;
  symbol: string;
  entryDate: string;
  title: string;
  planned: string;
  happened: string;
  mistake: string;
  lessons: string;
  rulesFollowed: 'yes' | 'no' | 'unanswered';
  rating: string;
}

const blankForm = (): FormState => ({
  paperTradeId: NO_TRADE,
  symbol: '',
  entryDate: new Date().toISOString().slice(0, 10),
  title: '',
  planned: '',
  happened: '',
  mistake: NO_MISTAKE,
  lessons: '',
  rulesFollowed: 'unanswered',
  rating: '',
});

function tradeSummary(t: PaperTrade): string {
  const r = t.exit_price !== null && t.exit_date
    ? rMultiple({
        symbol: t.symbol,
        entryPrice: t.entry_price,
        stopPrice: t.stop_price,
        targetPrice: t.target_price,
        shares: t.shares,
        exitPrice: t.exit_price,
        entryDate: t.entry_date,
        exitDate: t.exit_date,
        realizedPl: t.realized_pl ?? (t.exit_price - t.entry_price) * t.shares,
        rulesFollowed: t.rules_followed,
      })
    : null;
  const plan = `${t.shares} shares at ${money(t.entry_price)}, stop ${money(t.stop_price)}, target ${money(t.target_price)}`;
  return r === null ? plan : `${plan} · ${r > 0 ? '+' : ''}${r}R`;
}

export default function TradeJournal() {
  useTradingTitle('Trade Journal');
  const { settings } = useTradingSettings();
  const { trades, entries, tradesMissingJournal, isLoading, saveEntry, deleteEntry, isSaving } =
    useTradeJournal();

  const [form, setForm] = useState<FormState>(blankForm());
  const [editingId, setEditingId] = useState<string | null>(null);

  const closedTradesForSelect = useMemo(
    () => trades.filter((t) => t.status === 'CLOSED' || t.status === 'OPEN'),
    [trades],
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const reset = () => {
    setForm(blankForm());
    setEditingId(null);
  };

  const prefillFromTrade = (id: string) => {
    set('paperTradeId', id);
    if (id === NO_TRADE) return;
    const t = trades.find((x) => x.id === id);
    if (!t) return;
    setForm((f) => ({
      ...f,
      paperTradeId: id,
      symbol: t.symbol,
      title: f.title || `${t.symbol} ${t.setup_type ? t.setup_type.toLowerCase() : 'swing'} trade`,
      planned: f.planned || tradeSummary(t),
      entryDate: t.exit_date ?? t.entry_date,
      rulesFollowed:
        t.rules_followed === null ? f.rulesFollowed : t.rules_followed ? 'yes' : 'no',
    }));
  };

  const submit = async () => {
    if (!form.symbol.trim() && form.paperTradeId === NO_TRADE) {
      toast.error('Add a symbol or pick a paper trade first');
      return;
    }
    try {
      await saveEntry({
        id: editingId ?? undefined,
        paper_trade_id: form.paperTradeId === NO_TRADE ? null : form.paperTradeId,
        symbol: form.symbol.trim() || null,
        entry_date: form.entryDate,
        title: form.title.trim() || null,
        what_i_planned: form.planned.trim() || null,
        what_happened: form.happened.trim() || null,
        mistakes: form.mistake === NO_MISTAKE ? null : form.mistake,
        lessons: form.lessons.trim() || null,
        rules_followed: form.rulesFollowed === 'unanswered' ? null : form.rulesFollowed === 'yes',
        rating: form.rating ? Number(form.rating) : null,
      });
      toast.success(editingId ? 'Entry updated' : 'Entry saved');
      reset();
    } catch {
      toast.error('Could not save that entry');
    }
  };

  const startEdit = (id: string) => {
    const e = entries.find((x) => x.id === id);
    if (!e) return;
    setEditingId(id);
    setForm({
      paperTradeId: e.paper_trade_id ?? NO_TRADE,
      symbol: e.symbol ?? '',
      entryDate: e.entry_date,
      title: e.title ?? '',
      planned: e.what_i_planned ?? '',
      happened: e.what_happened ?? '',
      mistake: e.mistakes ?? NO_MISTAKE,
      lessons: e.lessons ?? '',
      rulesFollowed: e.rules_followed === null ? 'unanswered' : e.rules_followed ? 'yes' : 'no',
      rating: e.rating ? String(e.rating) : '',
    });
  };

  return (
    <div className="space-y-6">
      <SwingEdgeHeader
        title="Trade Journal"
        subtitle="Write it down the same day. This is where improvement actually happens."
        mode={settings.data_mode}
        right={
          <Button asChild variant="outline" size="sm">
            <Link to="/swingedge/performance">Performance review</Link>
          </Button>
        }
      />

      {tradesMissingJournal.length > 0 ? (
        <Alert className="border-prism-amber/40">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {tradesMissingJournal.length} closed{' '}
            {tradesMissingJournal.length === 1 ? 'trade has' : 'trades have'} no journal entry yet
          </AlertTitle>
          <AlertDescription>
            {tradesMissingJournal.slice(0, 4).map((t) => (
              <Button
                key={t.id}
                variant="link"
                className="h-auto px-0 py-0 mr-3 text-sm"
                onClick={() => prefillFromTrade(t.id)}
              >
                Write up {t.symbol}
              </Button>
            ))}
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{editingId ? 'Edit entry' : 'New entry'}</CardTitle>
          <CardDescription>
            Four honest answers beat a long essay: what you planned, what happened, whether you followed
            your rules, and one mistake.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Paper trade</Label>
              <Select value={form.paperTradeId} onValueChange={prefillFromTrade}>
                <SelectTrigger>
                  <SelectValue placeholder="Not linked" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TRADE}>Not linked to a trade</SelectItem>
                  {closedTradesForSelect.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.symbol} · {t.entry_date} · {t.status === 'OPEN' ? 'open' : 'closed'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="j-symbol">Symbol</Label>
              <Input
                id="j-symbol"
                className="uppercase"
                value={form.symbol}
                onChange={(e) => set('symbol', e.target.value)}
                placeholder="AAPL"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="j-date">Date</Label>
              <Input
                id="j-date"
                type="date"
                value={form.entryDate}
                onChange={(e) => set('entryDate', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="j-title">Title</Label>
            <Input
              id="j-title"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="AAPL pullback that stopped out"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="j-planned">What I planned</Label>
              <Textarea
                id="j-planned"
                rows={4}
                value={form.planned}
                onChange={(e) => set('planned', e.target.value)}
                placeholder="Entry, stop, target, share count and the reason for the trade."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="j-happened">What actually happened</Label>
              <Textarea
                id="j-happened"
                rows={4}
                value={form.happened}
                onChange={(e) => set('happened', e.target.value)}
                placeholder="How price behaved, where you exited and why."
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Did I follow my plan?</Label>
              <Select
                value={form.rulesFollowed}
                onValueChange={(v) => set('rulesFollowed', v as FormState['rulesFollowed'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes, I followed it</SelectItem>
                  <SelectItem value="no">No, I broke it</SelectItem>
                  <SelectItem value="unanswered">Not answered yet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Main mistake</Label>
              <Select value={form.mistake} onValueChange={(v) => set('mistake', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_MISTAKE}>No mistake</SelectItem>
                  {MISTAKE_TAGS.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="j-rating">Process rating (1–5)</Label>
              <Input
                id="j-rating"
                type="number"
                min={1}
                max={5}
                value={form.rating}
                onChange={(e) => set('rating', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="j-lessons">What I will do differently</Label>
            <Textarea
              id="j-lessons"
              rows={3}
              value={form.lessons}
              onChange={(e) => set('lessons', e.target.value)}
              placeholder="One change, not ten."
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={submit} disabled={isSaving}>
              <Plus className="mr-2 h-4 w-4" />
              {editingId ? 'Save changes' : 'Save entry'}
            </Button>
            {editingId ? (
              <Button variant="ghost" onClick={reset} disabled={isSaving}>
                Cancel
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your entries</CardTitle>
          <CardDescription>
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'} recorded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading your journal…</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing here yet. Write up your next closed paper trade the same day you exit it.
            </p>
          ) : (
            entries.map((e) => (
              <div key={e.id} className="rounded-lg border bg-card/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{e.title || e.symbol || 'Journal entry'}</span>
                    {e.symbol ? <Badge variant="secondary">{e.symbol}</Badge> : null}
                    <span className="text-xs text-muted-foreground">{e.entry_date}</span>
                    {e.rules_followed === null ? null : (
                      <Badge
                        variant="outline"
                        className={cn(
                          'font-semibold',
                          e.rules_followed
                            ? 'border-prism-lime/50 text-prism-lime'
                            : 'border-prism-rose/50 text-prism-rose',
                        )}
                      >
                        {e.rules_followed ? 'Followed the plan' : 'Broke the plan'}
                      </Badge>
                    )}
                    {e.rating ? <Badge variant="secondary">Process {e.rating}/5</Badge> : null}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(e.id)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete entry"
                      onClick={async () => {
                        try {
                          await deleteEntry(e.id);
                          toast.success('Entry deleted');
                        } catch {
                          toast.error('Could not delete that entry');
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                  {e.what_i_planned ? (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Planned</p>
                      <p className="whitespace-pre-line">{e.what_i_planned}</p>
                    </div>
                  ) : null}
                  {e.what_happened ? (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Happened</p>
                      <p className="whitespace-pre-line">{e.what_happened}</p>
                    </div>
                  ) : null}
                </div>
                {e.mistakes ? (
                  <p className="mt-2 text-sm">
                    <span className="text-xs font-semibold text-muted-foreground">Mistake: </span>
                    {e.mistakes}
                  </p>
                ) : null}
                {e.lessons ? (
                  <p className="mt-1 text-sm">
                    <span className="text-xs font-semibold text-muted-foreground">Next time: </span>
                    {e.lessons}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <HowToUse
        steps={[
          'Pick the paper trade you are writing about — the plan details fill in for you.',
          'Write what you planned and what actually happened, in your own words.',
          'Answer the discipline question honestly: did you follow your plan?',
          'Tag one main mistake if there was one. Those tags are ranked on the Performance Review.',
          'Finish with a single change for next time, then leave it alone until your monthly review.',
        ]}
        tips={[
          'The entries you least want to write are the ones worth the most.',
          'Your journal is private to your household.',
        ]}
      />
    <AiLevelsAssistant page="Trade Journal" />
        <NextStepsCard
      summary="The entry is written. Journaling is what turns trades into a track record you can act on."
      steps={[
        { label: 'See what the record says about your process', to: '/swingedge/performance', cta: 'Open Performance' },
        { label: 'Check your readiness points and weekly review', to: '/swingedge/training', cta: 'Open Training' },
        { label: 'Look for the next candidate', to: '/swingedge/scanner', cta: 'Open Scanner' },
      ]}
    />
</div>
  );
}
