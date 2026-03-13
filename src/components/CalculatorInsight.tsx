import { useState, useCallback, useRef } from 'react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface CalculatorInsightProps {
  calculatorType: string;
  inputs: Record<string, string>;
  results: Record<string, any>;
  hasResults: boolean;
}

const INSIGHT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calculator-insights`;

export default function CalculatorInsight({ calculatorType, inputs, results, hasResults }: CalculatorInsightProps) {
  const [insight, setInsight] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const generateInsight = useCallback(async () => {
    if (!hasResults) return;
    
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setInsight('');
    setError(null);
    setHasGenerated(true);

    try {
      const resp = await fetch(INSIGHT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ calculatorType, inputs, results }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'AI unavailable' }));
        throw new Error(err.error || 'Failed to get insights');
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
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
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulated += content;
              setInsight(accumulated);
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError(e.message || 'Something went wrong');
      }
    } finally {
      setIsLoading(false);
    }
  }, [calculatorType, inputs, results, hasResults]);

  if (!hasResults) return null;

  return (
    <div className="mt-4">
      {!hasGenerated ? (
        <Button
          variant="outline"
          size="sm"
          onClick={generateInsight}
          className="gap-2 w-full border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-colors"
        >
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm">Get AI Insight</span>
        </Button>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">AI Insight</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={generateInsight}
                disabled={isLoading}
                className="h-7 w-7 p-0"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {isLoading && !insight ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Analyzing your numbers...</span>
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none text-sm [&_ul]:mt-1 [&_ul]:mb-0 [&_li]:mt-0.5 [&_p]:mt-0 [&_p]:mb-1">
                <ReactMarkdown>{insight}</ReactMarkdown>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
