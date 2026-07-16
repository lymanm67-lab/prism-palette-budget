import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DollarSign, Save } from 'lucide-react';
import { useUpdateProject } from '@/hooks/use-hp-planner';
import { toast } from 'sonner';

export default function DownPaymentDetailsEditor({ project }: { project: any }) {
  const updateProject = useUpdateProject();

  const [saved, setSaved] = useState<string>(project.down_payment_saved ?? '');
  const [source, setSource] = useState<string>(project.down_payment_source ?? '');
  const [dpa, setDpa] = useState<string>(project.dpa_program_note ?? '');

  useEffect(() => {
    setSaved(project.down_payment_saved ?? '');
    setSource(project.down_payment_source ?? '');
    setDpa(project.dpa_program_note ?? '');
  }, [project.id, project.down_payment_saved, project.down_payment_source, project.dpa_program_note]);

  const handleSave = () => {
    updateProject.mutate(
      {
        id: project.id,
        patch: {
          down_payment_saved: saved === '' ? null : Number(saved),
          down_payment_source: source.trim() || null,
          dpa_program_note: dpa.trim() || null,
        },
      },
      {
        onSuccess: () => toast.success('Down payment details saved — refresh the AI summary to update.'),
        onError: (e: any) => toast.error(e?.message || 'Save failed'),
      }
    );
  };

  return (
    <Card className="prism-card-shine border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-sm flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-prism-teal" />
          Down Payment Details
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Tell the AI coach about funds you already have earmarked (retirement loans, gifts, etc.) and any down-payment assistance program you qualify for.
        </p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Already Saved / Earmarked ($)</Label>
          <Input
            type="number"
            value={saved}
            onChange={(e) => setSaved(e.target.value)}
            placeholder="7000"
            className="h-8 mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Source</Label>
          <Input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="e.g. 401(k) loan, family gift"
            className="h-8 mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Down Payment Assistance Program</Label>
          <Input
            value={dpa}
            onChange={(e) => setDpa(e.target.value)}
            placeholder="e.g. Ohio Heroes DPA — 2.5% grant"
            className="h-8 mt-1"
          />
        </div>
        <div className="md:col-span-3 flex justify-end">
          <Button size="sm" onClick={handleSave} disabled={updateProject.isPending}>
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {updateProject.isPending ? 'Saving…' : 'Save details'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
