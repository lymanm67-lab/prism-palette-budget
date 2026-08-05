import { useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Smartphone, Info, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  parseAppleHealthXml,
  readAppleHealthFile,
  readLastImport,
  writeLastImport,
  type ImportedDay,
  type ParseSummary,
} from '@/lib/health/appleHealthImport';
import { useHealthLogs, useSaveDailyLog, useHealthVitals, useHealthUpsert } from '@/hooks/use-health';

const NUMERIC_FIELDS: (keyof ImportedDay)[] = [
  'steps',
  'miles',
  'active_minutes',
  'weight',
  'sleep_hours',
  'protein_g',
  'water_oz',
];

const LABELS: Record<string, string> = {
  steps: 'Steps',
  miles: 'Miles',
  active_minutes: 'Active min',
  weight: 'Weight',
  sleep_hours: 'Sleep hrs',
  protein_g: 'Protein g',
  water_oz: 'Water oz',
};

export default function HealthImportTab() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [summary, setSummary] = useState<ParseSummary | null>(null);
  const [parsing, setParsing] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [last, setLast] = useState(() => readLastImport());

  const logs = useHealthLogs();
  const vitals = useHealthVitals();
  const saveLog = useSaveDailyLog();
  const saveVital = useHealthUpsert('health_vitals');

  const existingByDate = useMemo(() => {
    const map = new Map<string, any>();
    (logs.data ?? []).forEach((l: any) => map.set(l.log_date, l));
    return map;
  }, [logs.data]);

  const vitalDates = useMemo(
    () => new Set((vitals.data ?? []).map((v: any) => v.measured_on)),
    [vitals.data],
  );

  const activeFields = useMemo(() => {
    if (!summary) return [] as (keyof ImportedDay)[];
    return NUMERIC_FIELDS.filter((f) => summary.days.some((d) => d[f] != null));
  }, [summary]);

  async function handleFile(file: File) {
    setParsing(true);
    setSummary(null);
    try {
      const xml = await readAppleHealthFile(file);
      const parsed = parseAppleHealthXml(xml);
      if (parsed.days.length === 0) {
        toast.error('No supported health records were found in that export.');
      } else {
        toast.success(`Found ${parsed.days.length} days of data`);
      }
      setSummary(parsed);
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not read that file');
    } finally {
      setParsing(false);
    }
  }

  async function handleImport() {
    if (!summary) return;
    setSaving(true);
    setProgress(0);
    let written = 0;

    try {
      for (let i = 0; i < summary.days.length; i += 1) {
        const day = summary.days[i];
        const existing = existingByDate.get(day.log_date);
        const patch: Record<string, unknown> = { log_date: day.log_date };

        NUMERIC_FIELDS.forEach((f) => {
          const val = day[f];
          if (val == null) return;
          const current = existing?.[f];
          const hasManual = current != null && Number(current) !== 0;
          if (hasManual && !overwrite) return;
          patch[f] = val;
        });

        if (Object.keys(patch).length > 1) {
          // Preserve everything already logged for that day, then layer imports on top.
          const merged = existing ? { ...existing, ...patch } : patch;
          delete (merged as any).created_at;
          delete (merged as any).updated_at;
          await saveLog.mutateAsync(merged as any);
          written += 1;
        }

        if (day.resting_heart_rate != null && !vitalDates.has(day.log_date)) {
          await saveVital.mutateAsync({
            measured_on: day.log_date,
            resting_heart_rate: Math.round(day.resting_heart_rate),
            notes: 'Imported from Apple Health',
          });
        }

        setProgress(Math.round(((i + 1) / summary.days.length) * 100));
      }

      const info = {
        at: new Date().toISOString(),
        days: written,
        from: summary.firstDate,
        to: summary.lastDate,
      };
      writeLastImport(info);
      setLast(info);
      toast.success(`Imported ${written} day${written === 1 ? '' : 's'} into your health log`);
      setSummary(null);
    } catch (e: any) {
      toast.error(e?.message ?? 'Import failed partway through');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-prism-teal" />
            Import from Apple Health (Pacer included)
          </CardTitle>
          <CardDescription>
            Pacer writes its steps and distance into Apple Health, so a single Apple Health export
            brings in both. Manual entry always stays available.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="ml-5 list-decimal space-y-1 text-sm text-muted-foreground">
            <li>On iPhone open <strong>Health</strong> &rarr; tap your profile photo.</li>
            <li>Scroll down and tap <strong>Export All Health Data</strong>.</li>
            <li>Save or AirDrop the <code>export.zip</code> file to this device.</li>
            <li>Upload it below — nothing leaves your browser except the daily totals.</li>
          </ol>

          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={inputRef}
              type="file"
              accept=".zip,.xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = '';
              }}
            />
            <Button onClick={() => inputRef.current?.click()} disabled={parsing || saving}>
              <Upload className="mr-2 h-4 w-4" />
              {parsing ? 'Reading export…' : 'Choose Apple Health export'}
            </Button>
            {last && (
              <span className="text-xs text-muted-foreground">
                Last import: {new Date(last.at).toLocaleString()} · {last.days} days
                {last.from && last.to ? ` (${last.from} → ${last.to})` : ''}
              </span>
            )}
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Two-way sync needs the native iOS app</AlertTitle>
            <AlertDescription>
              Writing data back into Apple Health requires Apple's HealthKit framework, which only
              runs inside a native iOS build. Until Prism ships to the App Store, this import is
              one-way: Apple Health &rarr; Prism.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {summary && summary.days.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              {summary.days.length} days · {summary.recordCount.toLocaleString()} records ·{' '}
              {summary.firstDate} → {summary.lastDate}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {activeFields.map((f) => (
                <Badge key={String(f)} variant="secondary">
                  {LABELS[String(f)]}
                </Badge>
              ))}
              {summary.days.some((d) => d.resting_heart_rate != null) && (
                <Badge variant="secondary">Resting HR &rarr; Vitals</Badge>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Switch id="overwrite" checked={overwrite} onCheckedChange={setOverwrite} />
              <Label htmlFor="overwrite" className="text-sm">
                Overwrite days I already logged manually
              </Label>
            </div>

            <div className="max-h-80 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    {activeFields.map((f) => (
                      <TableHead key={String(f)} className="text-right">
                        {LABELS[String(f)]}
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Existing log</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.days.slice(0, 60).map((d) => (
                    <TableRow key={d.log_date}>
                      <TableCell className="font-medium">{d.log_date}</TableCell>
                      {activeFields.map((f) => (
                        <TableCell key={String(f)} className="text-right">
                          {d[f] != null ? Number(d[f]).toLocaleString() : '—'}
                        </TableCell>
                      ))}
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {existingByDate.has(d.log_date) ? 'yes' : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {summary.days.length > 60 && (
              <p className="text-xs text-muted-foreground">
                Showing the 60 most recent days — all {summary.days.length} will be imported.
              </p>
            )}

            {saving && <Progress value={progress} />}

            <div className="flex gap-2">
              <Button onClick={handleImport} disabled={saving}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {saving ? `Importing… ${progress}%` : `Import ${summary.days.length} days`}
              </Button>
              <Button variant="outline" onClick={() => setSummary(null)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
