import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { BarChart3, Play, Square, Trophy, FlaskConical, TrendingUp, Users } from 'lucide-react';
import { EXPERIMENT_DEFINITIONS } from '@/lib/ab-experiments';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface ExperimentResult {
  experiment_id: string;
  experiment_name: string;
  status: string;
  variant_id: string;
  variant_name: string;
  variant_key: string;
  is_control: boolean;
  impressions: number;
  clicks: number;
  conversions: number;
  conversion_rate: number;
  click_through_rate: number;
}

interface Experiment {
  id: string;
  name: string;
  description: string;
  target_element: string;
  status: string;
  required_sample_size: number;
  started_at: string | null;
  ended_at: string | null;
  winner_variant_id: string | null;
  created_at: string;
}

const ExperimentsDashboard = () => {
  const { user, isFounder } = useAuth();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [results, setResults] = useState<ExperimentResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isFounder) fetchData();
  }, [isFounder]);

  // Only founder/admin can access
  if (!isFounder) return <Navigate to="/dashboard" replace />;

  const fetchData = async () => {
    setLoading(true);
    const [{ data: exps }, { data: res }] = await Promise.all([
      supabase.from('ab_experiments').select('*').order('created_at', { ascending: false }),
      supabase.from('ab_experiment_results').select('*'),
    ]);
    setExperiments((exps as Experiment[]) || []);
    setResults((res as ExperimentResult[]) || []);
    setLoading(false);
  };

  const seedExperiments = async () => {
    for (const def of Object.values(EXPERIMENT_DEFINITIONS)) {
      // Check if already exists
      const { data: existing } = await supabase
        .from('ab_experiments')
        .select('id')
        .eq('target_element', def.target_element)
        .limit(1);

      if (existing?.length) continue;

      const { data: exp, error } = await supabase
        .from('ab_experiments')
        .insert({
          name: def.name,
          description: def.description,
          target_element: def.target_element,
          status: 'draft',
          required_sample_size: 1000,
        })
        .select()
        .single();

      if (error || !exp) continue;

      await supabase.from('ab_variants').insert(
        def.variants.map((v) => ({
          experiment_id: exp.id,
          ...v,
        }))
      );
    }
    toast.success('Experiments seeded');
    fetchData();
  };

  const toggleExperiment = async (exp: Experiment) => {
    const newStatus = exp.status === 'running' ? 'paused' : 'running';
    await supabase
      .from('ab_experiments')
      .update({
        status: newStatus,
        ...(newStatus === 'running' && !exp.started_at ? { started_at: new Date().toISOString() } : {}),
        ...(newStatus === 'paused' ? { ended_at: new Date().toISOString() } : {}),
      })
      .eq('id', exp.id);
    toast.success(`Experiment ${newStatus}`);
    fetchData();
  };

  const declareWinner = async (experimentId: string, variantId: string) => {
    await supabase
      .from('ab_experiments')
      .update({ winner_variant_id: variantId, status: 'completed', ended_at: new Date().toISOString() })
      .eq('id', experimentId);
    toast.success('Winner declared!');
    fetchData();
  };

  const getResultsForExperiment = (expId: string) =>
    results.filter((r) => r.experiment_id === expId);

  const getTotalImpressions = (expId: string) =>
    getResultsForExperiment(expId).reduce((sum, r) => sum + (r.impressions || 0), 0);

  const statusColor = (s: string) => {
    switch (s) {
      case 'running': return 'default';
      case 'completed': return 'secondary';
      case 'paused': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-accent" /> A/B Experiments
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Test, measure, and optimize conversion across the Prism experience.
          </p>
        </div>
        <Button onClick={seedExperiments} variant="outline" className="gap-2">
          <Play className="h-4 w-4" /> Seed All Experiments
        </Button>
      </div>

      {/* Overview stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Experiments', value: experiments.length, icon: FlaskConical },
          { label: 'Running', value: experiments.filter((e) => e.status === 'running').length, icon: Play },
          { label: 'Completed', value: experiments.filter((e) => e.status === 'completed').length, icon: Trophy },
          { label: 'Total Impressions', value: results.reduce((s, r) => s + (r.impressions || 0), 0), icon: Users },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <stat.icon className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {experiments.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-semibold">No experiments yet</p>
            <p className="text-sm text-muted-foreground mt-1">Click "Seed All Experiments" to create the predefined test suite.</p>
          </CardContent>
        </Card>
      )}

      {experiments.map((exp) => {
        const expResults = getResultsForExperiment(exp.id);
        const totalImpressions = getTotalImpressions(exp.id);
        const progress = Math.min(100, (totalImpressions / (exp.required_sample_size * (expResults.length || 1))) * 100);
        const controlRate = expResults.find((r) => r.is_control)?.conversion_rate || 0;

        return (
          <Card key={exp.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-accent" /> {exp.name}
                  </CardTitle>
                  <CardDescription className="mt-1">{exp.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusColor(exp.status)}>{exp.status}</Badge>
                  {exp.status !== 'completed' && (
                    <Button size="sm" variant="outline" onClick={() => toggleExperiment(exp)} className="gap-1">
                      {exp.status === 'running' ? <><Square className="h-3 w-3" /> Pause</> : <><Play className="h-3 w-3" /> Start</>}
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>{totalImpressions.toLocaleString()} / {(exp.required_sample_size * (expResults.length || 1)).toLocaleString()} impressions</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {expResults.map((r) => {
                  const isWinner = exp.winner_variant_id === r.variant_id;
                  const lift = controlRate > 0 && !r.is_control
                    ? ((r.conversion_rate - controlRate) / controlRate * 100).toFixed(1)
                    : null;

                  return (
                    <div
                      key={r.variant_id}
                      className={`rounded-xl border p-4 space-y-3 ${isWinner ? 'border-accent ring-2 ring-accent/20 bg-accent/5' : 'border-border bg-card'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{r.variant_name}</span>
                        <div className="flex items-center gap-1">
                          {r.is_control && <Badge variant="outline" className="text-[10px]">Control</Badge>}
                          {isWinner && <Badge className="bg-accent text-accent-foreground text-[10px]">Winner</Badge>}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-lg font-bold">{r.impressions?.toLocaleString() || 0}</p>
                          <p className="text-[10px] text-muted-foreground">Impressions</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold">{r.click_through_rate || 0}%</p>
                          <p className="text-[10px] text-muted-foreground">CTR</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold">{r.conversion_rate || 0}%</p>
                          <p className="text-[10px] text-muted-foreground">CVR</p>
                        </div>
                      </div>
                      {lift && (
                        <p className={`text-xs font-semibold text-center ${parseFloat(lift) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          <TrendingUp className="h-3 w-3 inline mr-1" />
                          {parseFloat(lift) > 0 ? '+' : ''}{lift}% vs control
                        </p>
                      )}
                      {exp.status === 'running' && !isWinner && r.impressions >= exp.required_sample_size && (
                        <Button size="sm" variant="outline" className="w-full text-xs"
                          onClick={() => declareWinner(exp.id, r.variant_id)}>
                          <Trophy className="h-3 w-3 mr-1" /> Declare Winner
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
              {expResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No data yet. Start the experiment to begin collecting data.</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ExperimentsDashboard;
