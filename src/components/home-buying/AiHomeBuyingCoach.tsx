import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Sparkles, Loader2, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useHousehold } from '@/contexts/HouseholdContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { STATE_DATA } from '@/lib/state-data';

interface Answers {
  state: string;
  city: string;
  income: number;
  monthlyDebt: number;
  savings: number;
  targetPrice: number;
  timelineMonths: number;
  firstTime: 'yes' | 'no';
  creditRange: string;
  employment: string;
  familyPlans: string;
  veteranStatus: 'yes' | 'no';
}

const DEFAULT: Answers = {
  state: 'FL', city: '', income: 7500, monthlyDebt: 600, savings: 15000,
  targetPrice: 350000, timelineMonths: 12, firstTime: 'yes', creditRange: '700-739',
  employment: 'W-2 employee', familyPlans: '', veteranStatus: 'no',
};

export default function AiHomeBuyingCoach() {
  const { household } = useHousehold();
  const [answers, setAnswers] = useState<Answers>(DEFAULT);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string>('');

  const update = <K extends keyof Answers>(k: K, v: Answers[K]) => setAnswers((p) => ({ ...p, [k]: v }));

  const runCoach = async () => {
    if (!household) return;
    setLoading(true);
    setReport('');
    try {
      const { data, error } = await supabase.functions.invoke('home-buying-coach', {
        body: { answers },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setReport(data?.report ?? '');

      await supabase.from('home_buying_coach_sessions').insert({
        household_id: household.id,
        user_id: (await supabase.auth.getUser()).data.user!.id,
        answers: answers as never,
        report: { markdown: data?.report } as never,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Coach failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="prism-card-shine border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display">
            <Bot className="h-5 w-5 text-prism-teal" />
            AI Home-Buying Coach
          </CardTitle>
          <p className="text-xs text-muted-foreground">Answer a few questions and get a personalized readiness report.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">State</Label>
              <Select value={answers.state} onValueChange={(v) => update('state', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {Object.entries(STATE_DATA).filter(([k]) => k).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">City / Area</Label><Input value={answers.city} onChange={(e) => update('city', e.target.value)} /></div>
            <div><Label className="text-xs">Gross Monthly Income</Label><Input type="number" value={answers.income} onChange={(e) => update('income', +e.target.value)} /></div>
            <div><Label className="text-xs">Other Monthly Debt</Label><Input type="number" value={answers.monthlyDebt} onChange={(e) => update('monthlyDebt', +e.target.value)} /></div>
            <div><Label className="text-xs">Current Savings</Label><Input type="number" value={answers.savings} onChange={(e) => update('savings', +e.target.value)} /></div>
            <div><Label className="text-xs">Target Home Price</Label><Input type="number" value={answers.targetPrice} onChange={(e) => update('targetPrice', +e.target.value)} /></div>
            <div><Label className="text-xs">Buying In (months)</Label><Input type="number" value={answers.timelineMonths} onChange={(e) => update('timelineMonths', +e.target.value)} /></div>
            <div>
              <Label className="text-xs">First-time Buyer?</Label>
              <Select value={answers.firstTime} onValueChange={(v) => update('firstTime', v as 'yes' | 'no')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Credit Range</Label>
              <Select value={answers.creditRange} onValueChange={(v) => update('creditRange', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['<620', '620-659', '660-699', '700-739', '740-779', '780+'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Employment</Label>
              <Select value={answers.employment} onValueChange={(v) => update('employment', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['W-2 employee', 'Self-employed', '1099 contractor', 'Retired', 'Other'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Veteran?</Label>
              <Select value={answers.veteranStatus} onValueChange={(v) => update('veteranStatus', v as 'yes' | 'no')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="no">No</SelectItem><SelectItem value="yes">Yes</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3"><Label className="text-xs">Family / lifestyle plans (optional)</Label><Input value={answers.familyPlans} onChange={(e) => update('familyPlans', e.target.value)} placeholder="e.g., planning kids in 2-3 yrs, work from home, need a yard" /></div>
          </div>
          <Button onClick={runCoach} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Analyzing…' : 'Get My Readiness Report'}
          </Button>
        </CardContent>
      </Card>

      {report && (
        <Card className="prism-card-shine border-prism-teal/30">
          <CardHeader className="pb-3">
            <CardTitle className="font-display flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-prism-teal" /> Your Personalized Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{report}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
