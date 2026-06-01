import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useSafeToSpend } from '@/hooks/use-safe-to-spend';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Sparkles, Send, Loader2, User, MessageCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import PageOverview from '@/components/PageOverview';

interface Msg { role: 'user' | 'assistant'; content: string; }

const SUGGESTIONS = [
  'Why did I go over budget this month?',
  'What should I do with my next paycheck?',
  'Which leak should I fix first?',
  'Can I afford a $300 purchase right now?',
];

export default function CoachChat() {
  const { household } = useHousehold();
  const sts = useSafeToSpend('personal');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || !household || loading) return;
    const userMsg: Msg = { role: 'user', content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    let assistantSoFar = '';
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    try {
      const { data: { session } } = await (await import('@/integrations/supabase/client')).supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach-chat`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ household_id: household.id, messages: next }),
      });

      if (resp.status === 429) { toast({ title: 'Rate limited', description: 'Try again in a moment.', variant: 'destructive' }); setLoading(false); return; }
      if (resp.status === 402) { toast({ title: 'AI credits exhausted', description: 'Top up in workspace settings.', variant: 'destructive' }); setLoading(false); return; }
      if (!resp.ok || !resp.body) throw new Error('Coach unavailable');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf('\n')) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || !line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsert(content);
          } catch {
            buf = line + '\n' + buf;
            break;
          }
        }
      }
    } catch (e: any) {
      toast({ title: 'Coach chat failed', description: e?.message || 'Try again', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-4xl mx-auto">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link to="/coach"><ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Coach</Link>
        </Button>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">Ask Coach</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Coach reads your live Safe-to-Spend, budgets, leaks, paycheck plans, and recent purchases — then answers in plain English with a next play.
        </p>
      </div>

      <PageOverview
        title="What Coach knows"
        description="Coach answers using your live financial picture, not generic advice."
        icon={Sparkles}
        iconColor="text-prism-amber"
        ttsScript="Coach reads your live Safe-to-Spend, over-budget categories, money leaks, paycheck deployments, and recent purchase decisions, then answers questions in plain English with a specific next play."
        features={[
          'Live access to your over-budget categories, leaks, and Safe-to-Spend.',
          'Reads your paycheck deployment plan and recovery plans.',
          'Returns markdown — bullet lists, dollar amounts, and a recommended next play.',
          'Educational only — not legal, tax, or investment advice.',
        ]}
      />

      <Card className="bg-card/60 backdrop-blur-sm border-border/60">
        <div className="border-b border-border/40 p-3 flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-prism-amber" />
          <span className="text-sm font-semibold">PrismMoney™ Coach</span>
          <Badge variant="outline" className="ml-auto text-[10px]">Safe-to-Spend ${Math.round(sts.monthly)}</Badge>
        </div>

        <div ref={scrollRef} className="h-[440px] overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Start with a question, or pick one:</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map(s => (
                  <Button key={s} variant="outline" size="sm" className="h-auto py-2 text-left text-xs font-normal whitespace-normal justify-start"
                    onClick={() => send(s)}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${m.role === 'user' ? 'bg-prism-teal/20 text-prism-teal' : 'bg-prism-amber/20 text-prism-amber'}`}>
                {m.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
              </div>
              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.role === 'user' ? 'bg-prism-teal/10 border border-prism-teal/20' : 'bg-background/40 border border-border/40'}`}>
                {m.role === 'assistant' ? (
                  <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mt-2 [&_strong]:text-prism-amber">
                    <ReactMarkdown>{m.content || '…'}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{m.content}</p>
                )}
              </div>
            </div>
          ))}

          {loading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-prism-amber/20 text-prism-amber">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div className="rounded-lg px-3 py-2 bg-background/40 border border-border/40 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Coach is thinking…
              </div>
            </div>
          )}
        </div>

        <form className="border-t border-border/40 p-3 flex gap-2"
          onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about a budget, leak, paycheck, or purchase…"
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
        </form>
      </Card>

      <p className="text-[11px] text-muted-foreground italic text-center">
        Coach provides educational guidance only — not legal, tax, investment, or licensed financial advice.
      </p>
    </div>
  );
}
