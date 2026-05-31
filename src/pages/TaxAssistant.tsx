import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  Bookmark, BookmarkCheck, Trash2, Star, Wrench, FileWarning, Theater,
  Sparkles, Zap, MessageSquare, ArrowRight
} from 'lucide-react';
import { useTTS } from '@/hooks/use-tts';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import PageOverview from '@/components/PageOverview';
import RelatedToolsBar from '@/components/RelatedToolsBar';
import { BarChart3 as BarChart3Icon, Building2 as Building2Icon, FileSearch as FileSearchIcon, Calculator as CalculatorIcon } from 'lucide-react';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tax-assistant`;

const QUICK_QUESTIONS = [
  { q: "What are the top 10 business tax deductions I should know about?", icon: Lightbulb, color: 'from-prism-teal to-prism-lime' },
  { q: "How do I deduct home office expenses for multiple businesses?", icon: BookOpen, color: 'from-prism-navy to-prism-sky' },
  { q: "What are common pitfalls that trigger an IRS audit?", icon: ShieldAlert, color: 'from-prism-orange to-prism-amber' },
  { q: "How should I allocate shared expenses across my 3 businesses?", icon: Zap, color: 'from-prism-indigo to-prism-teal' },
  { q: "Can I deduct vehicle expenses if I use my car for multiple businesses?", icon: Route, color: 'from-prism-sky to-prism-teal' },
  { q: "What records do I need to keep for meal deductions?", icon: Wrench, color: 'from-prism-orange to-prism-rose' },
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

async function streamChat(
  messages: Msg[],
  mode: string,
  onDelta: (t: string) => void,
  onDone: () => void,
  signal?: AbortSignal,
) {
  const { data: { session } } = await supabase.auth.getSession();
  const resp = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
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
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Hero Header */}
      <motion.div variants={item} className="relative overflow-hidden rounded-2xl p-6 sm:p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-prism-navy via-[hsl(220,60%,20%)] to-prism-teal opacity-95 rounded-2xl" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-4 right-8 h-32 w-32 rounded-full bg-prism-orange blur-[60px]" />
          <div className="absolute bottom-0 left-12 h-40 w-40 rounded-full bg-prism-teal blur-[80px]" />
        </div>
        <div className="relative z-10 flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-prism-teal to-prism-orange flex items-center justify-center shrink-0 shadow-lg shadow-prism-teal/20">
            <Bot className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              AI Tax Assistant
            </h1>
            <p className="text-white/70 text-sm mt-1 max-w-lg">
              Expert guidance on business deductions, audit prevention, and multi-entity tax strategies — powered by AI with voice walkthroughs.
            </p>
            <RelatedToolsBar
              className="mb-3"
              tools={[
                { to: '/reports', icon: BarChart3Icon, label: 'Reports' },
                { to: '/reconciliation', icon: FileSearchIcon, label: 'Reconciliation' },
                { to: '/capital/business-credit', icon: Building2Icon, label: 'Business Credit' },
                { to: '/calculators', icon: CalculatorIcon, label: 'Calculators' },
              ]}
            />
            <PageOverview
              title="AI Tax Assistant"
              description="Get AI-powered answers to tax questions, generate voice walkthroughs, and save responses for reference."
              icon={Bot}
              iconColor="text-prism-indigo"
              ttsScript="The AI Tax Assistant provides expert guidance on business tax deductions, audit prevention, and multi-entity strategies. Use the Chat tab to ask any tax question and get detailed AI responses. The Scenarios tab generates real-world tax examples. The Tools tab recommends tax software and resources. The Pitfalls tab covers common mistakes and audit triggers. Save important responses for future reference and tag them for easy searching. Use the voice playback feature to listen to any response."
              features={[
                'AI-powered tax Q&A chat',
                'Real-world tax scenarios and examples',
                'Tax tools and software recommendations',
                'Common pitfalls and audit triggers',
                'Save and tag responses',
                'Voice playback for all content',
              ]}
              demoData={[
                { label: 'Home Office Deduction', value: 'Simplified: $5/sq ft', badge: 'Deduction' },
                { label: 'Vehicle Expenses', value: '$0.67/mile (2024)', badge: 'Deduction' },
                { label: 'QBI Deduction', value: 'Up to 20%', badge: 'Pass-through' },
                { label: 'SE Tax', value: '15.3% of net', badge: 'Self-Employment' },
              ]}
            />
          </div>
        </div>
      </motion.div>

      <Tabs defaultValue="chat" className="space-y-4">
        <motion.div variants={item}>
          <TabsList className="flex flex-wrap h-auto gap-1.5 bg-card/80 backdrop-blur-sm p-1.5 rounded-xl border border-border/50">
            <TabsTrigger value="chat" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-prism-navy data-[state=active]:to-prism-teal data-[state=active]:text-white">
              <MessageSquare className="h-3.5 w-3.5" /> Chat
            </TabsTrigger>
            <TabsTrigger value="scenarios" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-prism-indigo data-[state=active]:to-prism-teal data-[state=active]:text-white">
              <Theater className="h-3.5 w-3.5" /> Scenarios
            </TabsTrigger>
            <TabsTrigger value="tools" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-prism-teal data-[state=active]:to-prism-lime data-[state=active]:text-white">
              <Wrench className="h-3.5 w-3.5" /> Tools
            </TabsTrigger>
            <TabsTrigger value="pitfalls" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-prism-orange data-[state=active]:to-prism-rose data-[state=active]:text-white">
              <FileWarning className="h-3.5 w-3.5" /> Pitfalls
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-prism-amber data-[state=active]:to-prism-orange data-[state=active]:text-white">
              <Star className="h-3.5 w-3.5" /> Saved
              {savedResponses && savedResponses.length > 0 && (
                <Badge className="ml-1 h-5 px-1.5 text-[10px] bg-white/20 text-current border-0">{savedResponses.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="overview" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-prism-navy data-[state=active]:to-prism-indigo data-[state=active]:text-white">
              <BookOpen className="h-3.5 w-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="walkthrough" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-prism-sky data-[state=active]:to-prism-teal data-[state=active]:text-white">
              <Route className="h-3.5 w-3.5" /> Walkthrough
            </TabsTrigger>
          </TabsList>
        </motion.div>

        {/* Chat Tab */}
        <TabsContent value="chat" className="space-y-5">
          {/* Quick Questions as styled cards */}
          <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {QUICK_QUESTIONS.map((q, i) => {
              const Icon = q.icon;
              return (
                <button
                  key={i}
                  onClick={() => send(q.q)}
                  className="group flex items-start gap-3 rounded-xl border border-border/50 bg-card p-3.5 text-left transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-prism-teal/30"
                >
                  <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${q.color} flex items-center justify-center shrink-0 shadow-sm`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-xs font-medium text-foreground/80 leading-snug group-hover:text-foreground transition-colors line-clamp-2">
                    {q.q}
                  </p>
                </button>
              );
            })}
          </motion.div>

          {/* Chat Card */}
          <motion.div variants={item}>
            <Card className="prism-card-shine border-border/50 overflow-hidden">
              <CardContent className="p-0">
                <ScrollArea className="h-[420px] p-5" ref={scrollRef}>
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
                      <div className="relative">
                        <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-prism-navy to-prism-teal flex items-center justify-center shadow-xl shadow-prism-teal/15">
                          <Bot className="h-10 w-10 text-white" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-gradient-to-br from-prism-orange to-prism-amber flex items-center justify-center shadow-md">
                          <Sparkles className="h-3 w-3 text-white" />
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="font-display font-bold text-foreground">Ready to help with taxes</p>
                        <p className="text-sm text-muted-foreground mt-1 max-w-xs">Ask about deductions, scenarios, pitfalls, or click a quick question above.</p>
                      </div>
                    </div>
                  )}
                  <div className="space-y-4">
                    {messages.map((m, i) => (
                      <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                        {m.role === 'assistant' && (
                          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-prism-navy to-prism-teal flex items-center justify-center shrink-0 shadow-sm">
                            <Bot className="h-4 w-4 text-white" />
                          </div>
                        )}
                        <div className="flex flex-col gap-1.5 max-w-[80%]">
                          <div className={`rounded-2xl px-4 py-3 text-sm ${
                            m.role === 'user'
                              ? 'bg-gradient-to-r from-prism-navy to-[hsl(220,60%,32%)] text-white shadow-md shadow-prism-navy/20'
                              : 'bg-card border border-border/50 text-foreground shadow-sm'
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
                                className="h-7 px-2.5 text-[11px] text-muted-foreground hover:text-prism-teal gap-1 rounded-lg"
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
                                className="h-7 px-2.5 text-[11px] text-muted-foreground hover:text-prism-orange gap-1 rounded-lg"
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
                          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-prism-orange to-prism-amber flex items-center justify-center shrink-0 shadow-sm">
                            <User className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                    {loading && messages[messages.length - 1]?.role === 'user' && (
                      <div className="flex gap-3">
                        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-prism-navy to-prism-teal flex items-center justify-center shrink-0 shadow-sm">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div className="bg-card border border-border/50 rounded-2xl px-4 py-3 shadow-sm">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-prism-teal" />
                            <span className="text-xs text-muted-foreground">Thinking…</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <div className="border-t border-border/50 p-4 bg-card/50 backdrop-blur-sm">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ask about tax deductions, scenarios, pitfalls…"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
                      disabled={loading}
                      className="flex-1 rounded-xl border-border/50 bg-background"
                    />
                    <Button
                      onClick={() => send(input)}
                      disabled={loading || !input.trim()}
                      className="rounded-xl bg-gradient-to-r from-prism-navy to-prism-teal hover:opacity-90 text-white shadow-md shadow-prism-teal/15 px-4"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Feature cards */}
          <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="prism-card-shine border-border/50 hover-lift group">
              <CardContent className="p-5">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-prism-teal to-prism-lime flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                  <Lightbulb className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-display font-bold text-sm mb-1">Real-World Scenarios</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">Ask about tax scenarios for your multiple businesses — expense allocation, entity structures, and more.</p>
              </CardContent>
            </Card>
            <Card className="prism-card-shine border-border/50 hover-lift group">
              <CardContent className="p-5">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-prism-orange to-prism-rose flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                  <ShieldAlert className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-display font-bold text-sm mb-1">Audit Prevention</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">Learn about common mistakes that trigger audits — mixing expenses, hobby loss rules, and documentation gaps.</p>
              </CardContent>
            </Card>
            <Card className="prism-card-shine border-border/50 hover-lift group">
              <CardContent className="p-5">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-prism-navy to-prism-indigo flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-display font-bold text-sm mb-1">Important Disclaimer</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">This AI provides general educational information only. Always consult a CPA or tax professional for your specific situation.</p>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Saved Tab */}
        <TabsContent value="saved" className="space-y-4">
          {savedLoading ? (
            <div className="flex items-center justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-prism-teal" /></div>
          ) : (!savedResponses || savedResponses.length === 0) ? (
            <Card className="prism-card-shine border-border/50">
              <CardContent className="p-12 text-center">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-prism-amber to-prism-orange flex items-center justify-center mx-auto mb-4 shadow-lg shadow-prism-orange/15">
                  <BookmarkCheck className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-display font-bold mb-1">No saved responses yet</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">Click the "Save" button on any AI response to bookmark it here for quick reference.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {savedResponses.map(saved => (
                <Card key={saved.id} className="group border-border/50 prism-card-shine transition-all hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-[10px] shrink-0 border-prism-teal/30 text-prism-teal">
                            {format(new Date(saved.created_at), 'MMM d, yyyy')}
                          </Badge>
                          <p className="text-sm font-display font-semibold text-foreground truncate">{saved.question}</p>
                        </div>
                        <ScrollArea className="max-h-[200px]">
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{saved.response}</p>
                        </ScrollArea>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg hover:bg-prism-teal/10 hover:text-prism-teal"
                          onClick={() => tts.isSpeaking ? tts.stop() : tts.speak(saved.response)}
                          title={tts.isSpeaking ? 'Stop' : 'Listen'}
                        >
                          {tts.isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget({ id: saved.id, question: saved.question })}
                        >
                          <Trash2 className="h-4 w-4" />
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
            title="Real-World Tax Scenarios"
            description="Explore detailed, realistic tax scenarios for small business owners with multiple businesses — complete with calculations and IRS form references."
            icon={<Theater className="h-6 w-6 text-white" />}
            iconGradient="from-prism-indigo to-prism-teal"
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
            title="Tax Tools & Resources"
            description="Comprehensive guide to accounting software, expense trackers, tax prep tools, and IRS resources for multi-business owners."
            icon={<Wrench className="h-6 w-6 text-white" />}
            iconGradient="from-prism-teal to-prism-lime"
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
            description="Learn about dangerous mistakes, IRS red flags, and common errors that small business owners must avoid."
            icon={<FileWarning className="h-6 w-6 text-white" />}
            iconGradient="from-prism-orange to-prism-rose"
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
            icon={<BookOpen className="h-6 w-6 text-white" />}
            iconGradient="from-prism-navy to-prism-indigo"
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
            icon={<Route className="h-6 w-6 text-white" />}
            iconGradient="from-prism-sky to-prism-teal"
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
            <AlertDialogTitle className="font-display">Remove saved response?</AlertDialogTitle>
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
    </motion.div>
  );
};

function ContentSection({ title, description, icon, iconGradient, content, isLoading, tts, onGenerate, onSave, useMarkdown }: {
  title: string; description: string; icon: React.ReactNode; iconGradient?: string; content: string;
  isLoading: boolean; tts: ReturnType<typeof useTTS>; onGenerate: () => void; onSave?: () => void; useMarkdown?: boolean;
}) {
  return (
    <Card className="prism-card-shine border-border/50 overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-4">
          <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${iconGradient || 'from-prism-navy to-prism-teal'} flex items-center justify-center shadow-lg`}>
            {icon}
          </div>
          <div>
            <CardTitle className="font-display text-lg font-bold">{title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!content && !isLoading && (
          <Button onClick={onGenerate} className="gap-2 rounded-xl bg-gradient-to-r from-prism-navy to-prism-teal text-white hover:opacity-90 shadow-md shadow-prism-teal/15">
            <Sparkles className="h-4 w-4" /> Generate Content
          </Button>
        )}

        {isLoading && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border/30">
            <Loader2 className="h-5 w-5 animate-spin text-prism-teal" />
            <span className="text-sm text-muted-foreground">Generating content…</span>
          </div>
        )}

        {content && (
          <>
            <div className="flex flex-wrap gap-2">
              {!tts.isSpeaking ? (
                <Button onClick={() => tts.speak(content)} variant="outline" size="sm" className="gap-2 rounded-xl border-prism-teal/30 hover:bg-prism-teal/10 hover:text-prism-teal">
                  <Play className="h-4 w-4" /> Listen
                </Button>
              ) : (
                <>
                  <Button onClick={tts.isPaused ? tts.resume : tts.pause} variant="outline" size="sm" className="gap-2 rounded-xl">
                    {tts.isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    {tts.isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button onClick={tts.stop} variant="outline" size="sm" className="gap-2 rounded-xl">
                    <VolumeX className="h-4 w-4" /> Stop
                  </Button>
                </>
              )}
              {onSave && (
                <Button onClick={onSave} variant="outline" size="sm" className="gap-2 rounded-xl border-prism-orange/30 hover:bg-prism-orange/10 hover:text-prism-orange">
                  <Bookmark className="h-4 w-4" /> Save
                </Button>
              )}
              <Button onClick={onGenerate} variant="ghost" size="sm" className="text-xs rounded-xl">
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
