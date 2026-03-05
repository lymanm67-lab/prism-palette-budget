import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, RefreshCw, Volume2, VolumeX, Pause, Play } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useTTS } from '@/hooks/use-tts';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AiSpendingInsightsProps {
  transactions: any[];
  accounts: any[];
  monthlyIncome: number;
  monthlyExpenses: number;
}

export default function AiSpendingInsights({ transactions, accounts, monthlyIncome, monthlyExpenses }: AiSpendingInsightsProps) {
  const { user } = useAuth();
  const { speak, pause, resume, stop, isSpeaking, isPaused } = useTTS();
  const [financialJourney, setFinancialJourney] = useState<string | null>(null);
  const [insights, setInsights] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('financial_journey').eq('user_id', user.id).single()
      .then(({ data }) => setFinancialJourney(data?.financial_journey || null));
  }, [user]);

  const generateInsights = useCallback(async () => {
    setLoading(true);
    setInsights('');
    setHasGenerated(true);

    try {
      const txnData = (transactions || []).slice(0, 50).map(t => ({
        amount: t.amount,
        category_name: t.categories?.name || null,
        merchant: t.merchant,
        date: t.date,
      }));

      const accountData = (accounts || []).map(a => ({
        name: a.name,
        account_type: a.account_type,
        balance: a.balance,
      }));

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/spending-insights`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            transactions: txnData,
            accounts: accountData,
            financial_journey: financialJourney,
            monthly_income: monthlyIncome,
            monthly_expenses: monthlyExpenses,
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'AI service error' }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error('No stream');
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulated += content;
              setInsights(accumulated);
            }
          } catch { /* partial */ }
        }
      }
    } catch (e: any) {
      console.error('Spending insights error:', e);
      toast.error(e.message || 'Failed to generate insights');
      if (!insights) setHasGenerated(false);
    } finally {
      setLoading(false);
    }
  }, [transactions, accounts, monthlyIncome, monthlyExpenses, financialJourney]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="prism-card-shine border-border/50 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-prism-violet to-prism-rose flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              AI Spending Insights
            </CardTitle>
            {hasGenerated && (
              <div className="flex items-center gap-1">
                {insights && !loading && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (isSpeaking && !isPaused) pause();
                      else if (isSpeaking && isPaused) resume();
                      else speak(insights);
                    }}
                    className="text-xs gap-1"
                    title={isSpeaking ? (isPaused ? 'Resume' : 'Pause') : 'Listen'}
                  >
                    {isSpeaking ? (
                      isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />
                    ) : (
                      <Volume2 className="h-3 w-3" />
                    )}
                    {isSpeaking ? (isPaused ? 'Resume' : 'Pause') : 'Listen'}
                  </Button>
                )}
                {isSpeaking && (
                  <Button variant="ghost" size="sm" onClick={stop} className="text-xs gap-1">
                    <VolumeX className="h-3 w-3" />
                    Stop
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { stop(); generateInsights(); }}
                  disabled={loading}
                  className="text-xs gap-1"
                >
                  <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent aria-live="polite" aria-atomic="false">
          <AnimatePresence mode="wait">
            {!hasGenerated ? (
              <motion.div
                key="cta"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center text-center py-6"
              >
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-prism-violet/20 to-prism-rose/20 flex items-center justify-center mb-3">
                  <Sparkles className="h-6 w-6 text-prism-violet" />
                </div>
                <p className="text-sm text-muted-foreground max-w-xs mb-4">
                  Get AI-powered analysis of your spending patterns with personalized tips tailored to your financial goals.
                </p>
                <Button
                  onClick={generateInsights}
                  disabled={loading}
                  className="gap-2 rounded-xl bg-gradient-to-r from-prism-violet to-prism-rose text-white border-0 hover:opacity-90"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Analyze My Spending
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="prose prose-sm dark:prose-invert max-w-none text-sm [&>h2]:text-base [&>h2]:font-display [&>h2]:font-bold [&>h2]:mt-4 [&>h2]:mb-2 [&>ul]:space-y-1 [&>p]:leading-relaxed"
              >
                {loading && !insights && (
                  <div className="flex items-center gap-2 text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Analyzing your finances…</span>
                  </div>
                )}
                <ReactMarkdown>{insights}</ReactMarkdown>
                {loading && insights && (
                  <span className="inline-block w-1.5 h-4 bg-prism-violet animate-pulse rounded-full ml-0.5 align-text-bottom" />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
