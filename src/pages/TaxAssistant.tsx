import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  Send, Volume2, VolumeX, Pause, Play, Bot, User,
  BookOpen, Route, Loader2, AlertTriangle, Lightbulb, ShieldAlert,
  Bookmark, BookmarkCheck, Trash2, Star, Wrench, FileWarning, Theater
} from 'lucide-react';
import { useTTS } from '@/hooks/use-tts';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';

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
  const { user } = useAuth();
  const qc = useQueryClient();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ttsContent, setTtsContent] = useState<Record<string, string>>({ overview: '', walkthrough: '', scenarios: '', tools: '', pitfalls: '' });
  const [ttsLoading, setTtsLoading] = useState<Record<string, boolean>>({ overview: false, walkthrough: false, scenarios: false, tools: false, pitfalls: false });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; question: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const tts = useTTS();

  // Fetch saved responses
  const { data: savedResponses, isLoading: savedLoading } = useQuery({
    queryKey: ['saved_tax_responses', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_tax_responses')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as { id: string; question: string; response: string; tags: string[]; created_at: string }[];
    },
  });

  const saveResponse = useMutation({
    mutationFn: async ({ question, response }: { question: string; response: string }) => {
      const { error } = await supabase
        .from('saved_tax_responses')
        .insert({ user_id: user!.id, question, response } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saved_tax_responses'] });
      toast.success('Response saved to favorites!');
    },
    onError: (e) => toast.error('Failed to save: ' + e.message),
  });

  const deleteResponse = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('saved_tax_responses')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saved_tax_responses'] });
      toast.success('Removed from favorites');
      setDeleteTarget(null);
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Find the question (user message) before a given assistant message index
  const getQuestionForIndex = (assistantIndex: number): string => {
    for (let i = assistantIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return messages[i].content;
    }
    return 'Tax question';
  };

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

  const generateContent = async (mode: string, withTTS = false) => {
    if (ttsLoading[mode]) return;
    setTtsLoading(prev => ({ ...prev, [mode]: true }));
    let content = '';

    const prompts: Record<string, string> = {
      overview: 'Give me a comprehensive overview of business tax deductions.',
      walkthrough: 'Walk me through claiming business tax deductions step by step.',
      scenarios: 'Give me detailed real-world tax scenarios and examples for small business owners with multiple businesses.',
      tools: 'What are the best tax tools, software, and resources for small business owners managing multiple businesses?',
      pitfalls: 'What are the most dangerous tax pitfalls, IRS audit triggers, and common mistakes small business owners with multiple businesses should avoid?',
    };

    try {
      await streamChat(
        [{ role: 'user', content: prompts[mode] || prompts.overview }],
        mode,
        (chunk) => {
          content += chunk;
          setTtsContent(prev => ({ ...prev, [mode]: content }));
        },
        () => {
          setTtsLoading(prev => ({ ...prev, [mode]: false }));
          if (withTTS) tts.speak(content);
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
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="chat" className="gap-1.5 text-xs"><Bot className="h-3.5 w-3.5" /> Chat</TabsTrigger>
          <TabsTrigger value="scenarios" className="gap-1.5 text-xs"><Theater className="h-3.5 w-3.5" /> Scenarios</TabsTrigger>
          <TabsTrigger value="tools" className="gap-1.5 text-xs"><Wrench className="h-3.5 w-3.5" /> Tools</TabsTrigger>
          <TabsTrigger value="pitfalls" className="gap-1.5 text-xs"><FileWarning className="h-3.5 w-3.5" /> Pitfalls</TabsTrigger>
          <TabsTrigger value="saved" className="gap-1.5 text-xs">
            <Star className="h-3.5 w-3.5" /> Saved
            {savedResponses && savedResponses.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{savedResponses.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="overview" className="gap-1.5 text-xs"><BookOpen className="h-3.5 w-3.5" /> TTS Overview</TabsTrigger>
          <TabsTrigger value="walkthrough" className="gap-1.5 text-xs"><Route className="h-3.5 w-3.5" /> TTS Walkthrough</TabsTrigger>
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
                      <div className="flex flex-col gap-1 max-w-[80%]">
                        <div className={`rounded-xl px-4 py-3 text-sm ${
                          m.role === 'user'
                            ? 'bg-primary text-primary-foreground whitespace-pre-wrap'
                            : 'bg-muted text-foreground'
                        }`}>
                          {m.role === 'assistant' ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown>{m.content}</ReactMarkdown>
                            </div>
                          ) : m.content}
                        </div>
                        {m.role === 'assistant' && !loading && m.content.length > 20 && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-primary gap-1"
                              onClick={() => saveResponse.mutate({
                                question: getQuestionForIndex(i),
                                response: m.content,
                              })}
                              disabled={saveResponse.isPending}
                            >
                              <Bookmark className="h-3 w-3" /> Save
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-primary gap-1"
                              onClick={() => {
                                if (tts.isSpeaking) tts.stop();
                                else tts.speak(m.content);
                              }}
                            >
                              {tts.isSpeaking ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                              {tts.isSpeaking ? 'Stop' : 'Listen'}
                            </Button>
                          </div>
                        )}
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

        {/* Saved Tab */}
        <TabsContent value="saved" className="space-y-4">
          {savedLoading ? (
            <div className="flex items-center justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (!savedResponses || savedResponses.length === 0) ? (
            <Card>
              <CardContent className="p-10 text-center text-muted-foreground">
                <BookmarkCheck className="mx-auto h-10 w-10 opacity-30 mb-3" />
                <p className="text-sm">No saved responses yet.</p>
                <p className="text-xs mt-1">Click the "Save" button on any AI response to bookmark it here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {savedResponses.map(saved => (
                <Card key={saved.id} className="group border-border transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {format(new Date(saved.created_at), 'MMM d, yyyy')}
                          </Badge>
                          <p className="text-sm font-medium text-primary truncate">{saved.question}</p>
                        </div>
                        <ScrollArea className="max-h-[200px]">
                          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{saved.response}</p>
                        </ScrollArea>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => tts.isSpeaking ? tts.stop() : tts.speak(saved.response)}
                          title={tts.isSpeaking ? 'Stop' : 'Listen'}
                        >
                          {tts.isSpeaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget({ id: saved.id, question: saved.question })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Scenarios Tab */}
        <TabsContent value="scenarios">
          <ContentSection
            title="Real-World Tax Scenarios & Examples"
            description="Explore detailed, realistic tax scenarios for small business owners with multiple businesses — complete with calculations and IRS form references."
            icon={<Theater className="h-5 w-5 text-primary" />}
            content={ttsContent.scenarios}
            isLoading={ttsLoading.scenarios}
            tts={tts}
            onGenerate={() => generateContent('scenarios')}
            onSave={ttsContent.scenarios ? () => saveResponse.mutate({ question: 'Tax Scenarios & Examples', response: ttsContent.scenarios }) : undefined}
            useMarkdown
          />
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools">
          <ContentSection
            title="Tax Tools, Software & Resources"
            description="Comprehensive guide to accounting software, expense trackers, tax prep tools, and IRS resources for multi-business owners."
            icon={<Wrench className="h-5 w-5 text-primary" />}
            content={ttsContent.tools}
            isLoading={ttsLoading.tools}
            tts={tts}
            onGenerate={() => generateContent('tools')}
            onSave={ttsContent.tools ? () => saveResponse.mutate({ question: 'Tax Tools & Resources', response: ttsContent.tools }) : undefined}
            useMarkdown
          />
        </TabsContent>

        {/* Pitfalls Tab */}
        <TabsContent value="pitfalls">
          <ContentSection
            title="Tax Pitfalls & Audit Triggers"
            description="Learn about dangerous mistakes, IRS red flags, and common errors that small business owners must avoid — with penalties and how to protect yourself."
            icon={<FileWarning className="h-5 w-5 text-destructive" />}
            content={ttsContent.pitfalls}
            isLoading={ttsLoading.pitfalls}
            tts={tts}
            onGenerate={() => generateContent('pitfalls')}
            onSave={ttsContent.pitfalls ? () => saveResponse.mutate({ question: 'Tax Pitfalls & Audit Triggers', response: ttsContent.pitfalls }) : undefined}
            useMarkdown
          />
        </TabsContent>

        {/* TTS Overview Tab */}
        <TabsContent value="overview">
          <ContentSection
            title="Tax Deductions Overview"
            description="Listen to a comprehensive overview of business tax deductions, key strategies, and what every multi-business owner should know."
            icon={<BookOpen className="h-5 w-5 text-primary" />}
            content={ttsContent.overview}
            isLoading={ttsLoading.overview}
            tts={tts}
            onGenerate={() => generateContent('overview', true)}
            onSave={ttsContent.overview ? () => saveResponse.mutate({ question: 'Tax Deductions Overview (TTS)', response: ttsContent.overview }) : undefined}
          />
        </TabsContent>

        {/* TTS Walkthrough Tab */}
        <TabsContent value="walkthrough">
          <ContentSection
            title="Step-by-Step Walkthrough"
            description="Follow along as the AI walks you through claiming business tax deductions — from categorizing expenses to preparing for audits."
            icon={<Route className="h-5 w-5 text-primary" />}
            content={ttsContent.walkthrough}
            isLoading={ttsLoading.walkthrough}
            tts={tts}
            onGenerate={() => generateContent('walkthrough', true)}
            onSave={ttsContent.walkthrough ? () => saveResponse.mutate({ question: 'Step-by-Step Walkthrough (TTS)', response: ttsContent.walkthrough }) : undefined}
          />
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove saved response?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{deleteTarget?.question}" from your saved favorites.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteResponse.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function ContentSection({ title, description, icon, content, isLoading, tts, onGenerate, onSave, useMarkdown }: {
  title: string; description: string; icon: React.ReactNode; content: string;
  isLoading: boolean; tts: ReturnType<typeof useTTS>; onGenerate: () => void; onSave?: () => void; useMarkdown?: boolean;
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
            <Lightbulb className="h-4 w-4" /> Generate Content
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
            <div className="flex flex-wrap gap-2">
              {!tts.isSpeaking ? (
                <Button onClick={() => tts.speak(content)} variant="outline" size="sm" className="gap-2">
                  <Play className="h-4 w-4" /> Listen
                </Button>
              ) : (
                <>
                  <Button onClick={tts.isPaused ? tts.resume : tts.pause} variant="outline" size="sm" className="gap-2">
                    {tts.isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    {tts.isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button onClick={tts.stop} variant="outline" size="sm" className="gap-2">
                    <VolumeX className="h-4 w-4" /> Stop
                  </Button>
                </>
              )}
              {onSave && (
                <Button onClick={onSave} variant="outline" size="sm" className="gap-2">
                  <Bookmark className="h-4 w-4" /> Save
                </Button>
              )}
              <Button onClick={onGenerate} variant="ghost" size="sm" className="text-xs">
                Regenerate
              </Button>
            </div>
            <ScrollArea className="h-[500px]">
              {useMarkdown ? (
                <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
                  <ReactMarkdown>{content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{content}</p>
              )}
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default TaxAssistant;
