import { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, MessageSquare, Send, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

const COACH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mortgage-freedom-coach`;

interface Msg { role: 'user' | 'assistant'; content: string; }

interface CoachChatProps {
  snapshot: any;
}

const SUGGESTIONS = [
  'Should I refinance or accelerate payoff first?',
  'Is a HELOC safe for me right now?',
  'How do I balance retirement savings and mortgage payoff?',
  'What\'s the fastest realistic path for my situation?',
];

export default function AiCoachChat({ snapshot }: CoachChatProps) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = async (q: string) => {
    if (!q.trim() || loading) return;
    const nextMessages: Msg[] = [...messages, { role: 'user', content: q }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch(COACH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        signal: controller.signal,
        body: JSON.stringify({ mode: 'qa', question: q, snapshot }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'AI unavailable');
      }
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let acc = '';
      // seed the assistant slot
      setMessages([...nextMessages, { role: 'assistant', content: '' }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const j = line.slice(6).trim();
          if (j === '[DONE]') break;
          try {
            const parsed = JSON.parse(j);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) {
              acc += c;
              setMessages([...nextMessages, { role: 'assistant', content: acc }]);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setMessages([...nextMessages, { role: 'assistant', content: `⚠️ ${e.message}` }]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-primary" /> Ask the Freedom Coach
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Ask anything about your mortgage, HELOC, cash flow, or wealth strategy. Answers use your actual numbers.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {messages.length === 0 && (
          <div className="grid sm:grid-cols-2 gap-2">
            {SUGGESTIONS.map(s => (
              <Button key={s} variant="outline" size="sm" onClick={() => send(s)} className="justify-start text-left h-auto whitespace-normal py-2 text-xs">
                <Sparkles className="h-3 w-3 mr-1.5 shrink-0 text-primary" /> {s}
              </Button>
            ))}
          </div>
        )}

        {messages.length > 0 && (
          <div className="max-h-96 overflow-y-auto space-y-3 rounded-lg border border-border/50 bg-muted/10 p-3">
            {messages.map((m, i) => (
              <div key={i} className={cn('flex gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'rounded-lg px-3 py-2 max-w-[85%] text-sm',
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border/50'
                )}>
                  {m.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_p]:text-sm">
                      <ReactMarkdown>{m.content || '…'}</ReactMarkdown>
                    </div>
                  ) : m.content}
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
          <Input
            placeholder="Ask the AI Coach…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="h-9"
          />
          <Button type="submit" size="sm" disabled={loading || !input.trim()} className="gap-1">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Ask
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
