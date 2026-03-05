import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Send, Volume2, VolumeX, Pause, Play, Bot, User,
  BookOpen, Route, Loader2, AlertTriangle, Lightbulb, ShieldAlert
} from 'lucide-react';
import { useTTS } from '@/hooks/use-tts';
import { toast } from 'sonner';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tax-assistant`;

const QUICK_QUESTIONS = [
  "What are the top 10 business tax deductions I should know about?",
  "How do I deduct home office expenses for multiple businesses?",
  "What are common pitfalls that trigger an IRS audit?",
  "How should I allocate shared expenses across my 3 businesses?",
  "Can I deduct vehicle expenses if I use my car for multiple businesses?",
  "What records do I need to keep for meal deductions?",
];

async function streamChat(
  messages: Msg[],
  mode: string,
  onDelta: (t: string) => void,
  onDone: () => void,
  signal?: AbortSignal,
) {
  const resp = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, mode }),
    signal,
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `Error ${resp.status}`);
  }
  if (!resp.body) throw new Error('No response body');

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buf.indexOf('\n')) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (!line.startsWith('data: ')) continue;
      const json = line.slice(6).trim();
      if (json === '[DONE]') { onDone(); return; }
      try {
        const c = JSON.parse(json).choices?.[0]?.delta?.content;
        if (c) onDelta(c);
      } catch {
        buf = line + '\n' + buf;
        break;
      }
    }
  }
  onDone();
}

const TaxAssistant = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ttsContent, setTtsContent] = useState<{ overview: string; walkthrough: string }>({ overview: '', walkthrough: '' });
  const [ttsLoading, setTtsLoading] = useState<{ overview: boolean; walkthrough: boolean }>({ overview: false, walkthrough: false });
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const tts = useTTS();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    let assistantSoFar = '';
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant')
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    try {
      abortRef.current = new AbortController();
      await streamChat([...messages, userMsg], 'chat', upsert, () => setLoading(false), abortRef.current.signal);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        toast.error(e.message || 'Failed to get response');
        setLoading(false);
      }
    }
  };

  const generateTTS = async (mode: 'overview' | 'walkthrough') => {
    if (ttsLoading[mode]) return;
    setTtsLoading(prev => ({ ...prev, [mode]: true }));
    let content = '';

    try {
      const prompt = mode === 'overview'
        ? 'Give me a comprehensive overview of business tax deductions.'
        : 'Walk me through claiming business tax deductions step by step.';

      await streamChat(
        [{ role: 'user', content: prompt }],
        mode,
        (chunk) => {
          content += chunk;
          setTtsContent(prev => ({ ...prev, [mode]: content }));
        },
        () => {
          setTtsLoading(prev => ({ ...prev, [mode]: false }));
          tts.speak(content);
        },
      );
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate content');
      setTtsLoading(prev => ({ ...prev, [mode]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI Tax Assistant</h1>
        <p className="text-muted-foreground">Business tax deductions, scenarios & pitfalls — with voice walkthroughs</p>
      </div>

      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chat" className="gap-2"><Bot className="h-4 w-4" /> Chat</TabsTrigger>
          <TabsTrigger value="overview" className="gap-2"><BookOpen className="h-4 w-4" /> TTS Overview</TabsTrigger>
          <TabsTrigger value="walkthrough" className="gap-2"><Route className="h-4 w-4" /> TTS Walkthrough</TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {QUICK_QUESTIONS.map((q, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="cursor-pointer hover:bg-primary/10 transition-colors text-xs"
                onClick={() => send(q)}
              >
                {q.length > 50 ? q.slice(0, 50) + '…' : q}
              </Badge>
            ))}
          </div>

          <Card className="border-border">
            <CardContent className="p-0">
              <ScrollArea className="h-[400px] p-4" ref={scrollRef}>
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
                    <Bot className="h-12 w-12 opacity-30" />
                    <p className="text-sm">Ask me about business tax deductions, scenarios, or pitfalls to avoid.</p>
                  </div>
                )}
                <div className="space-y-4">
                  {messages.map((m, i) => (
                    <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                      {m.role === 'assistant' && (
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${
                        m.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}>
                        {m.content}
                      </div>
                      {m.role === 'user' && (
                        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-secondary-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                  {loading && messages[messages.length - 1]?.role === 'user' && (
                    <div className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div className="bg-muted rounded-xl px-4 py-3">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="border-t border-border p-3 flex gap-2">
                <Input
                  placeholder="Ask about tax deductions, scenarios, pitfalls…"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
                  disabled={loading}
                  className="flex-1"
                />
                <Button onClick={() => send(input)} disabled={loading || !input.trim()} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
                {messages.length > 0 && messages[messages.length - 1]?.role === 'assistant' && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (tts.isSpeaking) tts.stop();
                      else tts.speak(messages[messages.length - 1].content);
                    }}
                    title={tts.isSpeaking ? 'Stop reading' : 'Read aloud'}
                  >
                    {tts.isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Info cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Lightbulb className="h-4 w-4 text-[hsl(var(--prism-amber))]" /> Scenarios</CardTitle>
              </CardHeader>
              <CardContent><p className="text-xs text-muted-foreground">Ask about real-world tax scenarios for your multiple businesses — expense allocation, entity structures, and more.</p></CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-destructive" /> Pitfalls</CardTitle>
              </CardHeader>
              <CardContent><p className="text-xs text-muted-foreground">Learn about common mistakes that trigger audits — mixing expenses, hobby loss rules, and documentation gaps.</p></CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-[hsl(var(--prism-orange))]" /> Disclaimer</CardTitle>
              </CardHeader>
              <CardContent><p className="text-xs text-muted-foreground">This AI provides general educational information only. Always consult a CPA or tax professional for your specific situation.</p></CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TTS Overview Tab */}
        <TabsContent value="overview">
          <TTSSection
            title="Tax Deductions Overview"
            description="Listen to a comprehensive overview of business tax deductions, key strategies, and what every multi-business owner should know."
            icon={<BookOpen className="h-5 w-5 text-primary" />}
            content={ttsContent.overview}
            isLoading={ttsLoading.overview}
            tts={tts}
            onGenerate={() => generateTTS('overview')}
          />
        </TabsContent>

        {/* TTS Walkthrough Tab */}
        <TabsContent value="walkthrough">
          <TTSSection
            title="Step-by-Step Walkthrough"
            description="Follow along as the AI walks you through claiming business tax deductions — from categorizing expenses to preparing for audits."
            icon={<Route className="h-5 w-5 text-primary" />}
            content={ttsContent.walkthrough}
            isLoading={ttsLoading.walkthrough}
            tts={tts}
            onGenerate={() => generateTTS('walkthrough')}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

function TTSSection({ title, description, icon, content, isLoading, tts, onGenerate }: {
  title: string; description: string; icon: React.ReactNode; content: string;
  isLoading: boolean; tts: ReturnType<typeof useTTS>; onGenerate: () => void;
}) {
  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!content && !isLoading && (
          <Button onClick={onGenerate} className="gap-2">
            <Volume2 className="h-4 w-4" /> Generate & Listen
          </Button>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Generating content…</span>
          </div>
        )}

        {content && (
          <>
            <div className="flex gap-2">
              {!tts.isSpeaking ? (
                <Button onClick={() => tts.speak(content)} variant="outline" className="gap-2">
                  <Play className="h-4 w-4" /> Play
                </Button>
              ) : (
                <>
                  <Button onClick={tts.isPaused ? tts.resume : tts.pause} variant="outline" className="gap-2">
                    {tts.isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    {tts.isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button onClick={tts.stop} variant="outline" className="gap-2">
                    <VolumeX className="h-4 w-4" /> Stop
                  </Button>
                </>
              )}
              <Button onClick={onGenerate} variant="ghost" size="sm" className="text-xs">
                Regenerate
              </Button>
            </div>
            <ScrollArea className="h-[350px]">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{content}</p>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default TaxAssistant;
