import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Radar, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** Settings for the scheduled duplicate detector (scan window, per-run cap, email alerts). */
export function DetectorSettings() {
  const { household } = useHousehold();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['duplicate-detector-settings', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('duplicate_detector_settings')
        .select('*')
        .eq('household_id', household!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [scanDays, setScanDays] = useState('30');
  const [maxClusters, setMaxClusters] = useState('25');
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setScanDays(String(data.scan_days));
      setMaxClusters(String(data.max_clusters));
      setEmailEnabled(data.email_enabled);
      setEmail(data.email || '');
    }
  }, [data]);

  const save = async () => {
    if (!household) return;
    const max = parseInt(maxClusters, 10);
    if (!Number.isFinite(max) || max < 1 || max > 200) {
      toast({ title: 'Max clusters must be between 1 and 200', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('duplicate_detector_settings')
        .upsert(
          {
            household_id: household.id,
            scan_days: parseInt(scanDays, 10),
            max_clusters: max,
            email_enabled: emailEnabled,
            email: email.trim() || null,
          },
          { onConflict: 'household_id' },
        );
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['duplicate-detector-settings'] });
      toast({ title: 'Detector settings saved', description: 'The next scheduled scan (every 6 hours) uses these values.' });
    } catch (e: unknown) {
      toast({ title: 'Save failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Radar className="h-5 w-5 text-prism-teal" /> Scheduled duplicate detector
        </CardTitle>
        <CardDescription>
          Runs every 6 hours and posts review-only flags to the categorization audit. Nothing is deleted automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Scan range</Label>
            <Select value={scanDays} onValueChange={setScanDays}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">How far back each scan looks for same-day, same-amount clusters.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Max new clusters per run</Label>
            <Input type="number" min={1} max={200} value={maxClusters} onChange={(e) => setMaxClusters(e.target.value)} />
            <p className="text-[11px] text-muted-foreground">Caps how many clusters get flagged in a single run (1–200).</p>
          </div>
        </div>

        <div className="rounded-md border p-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label className="text-sm">Email alerts</Label>
              <p className="text-[11px] text-muted-foreground">Get one email per day when new flags are added. In-app alerts are always on.</p>
            </div>
            <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
          </div>
          {emailEnabled && (
            <div className="space-y-1.5">
              <Label>Send alerts to</Label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          )}
        </div>

        <Button onClick={save} disabled={saving || !household} className="gap-1.5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save detector settings
        </Button>
      </CardContent>
    </Card>
  );
}
