import { useState } from 'react';
import { Mail, ExternalLink, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Props {
  disputeId: string;
  initial?: {
    certified_tracking_number?: string | null;
    certified_mailed_date?: string | null;
    certified_delivered_date?: string | null;
    certified_carrier?: string | null;
    certified_cost?: number | null;
    certified_notes?: string | null;
  };
}

const CARRIER_URLS: Record<string, (t: string) => string> = {
  USPS: (t) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(t)}`,
  UPS: (t) => `https://www.ups.com/track?tracknum=${encodeURIComponent(t)}`,
  FedEx: (t) => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(t)}`,
};

export default function CertifiedMailTracker({ disputeId, initial }: Props) {
  const [form, setForm] = useState({
    certified_tracking_number: initial?.certified_tracking_number ?? '',
    certified_mailed_date: initial?.certified_mailed_date ?? '',
    certified_delivered_date: initial?.certified_delivered_date ?? '',
    certified_carrier: initial?.certified_carrier ?? 'USPS',
    certified_cost: initial?.certified_cost ?? '',
    certified_notes: initial?.certified_notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await (supabase as any).from('credit_disputes').update({
      certified_tracking_number: form.certified_tracking_number || null,
      certified_mailed_date: form.certified_mailed_date || null,
      certified_delivered_date: form.certified_delivered_date || null,
      certified_carrier: form.certified_carrier || null,
      certified_cost: form.certified_cost ? Number(form.certified_cost) : null,
      certified_notes: form.certified_notes || null,
    }).eq('id', disputeId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Certified mail info saved');
  };

  const trackUrl =
    form.certified_tracking_number && CARRIER_URLS[form.certified_carrier]
      ? CARRIER_URLS[form.certified_carrier](form.certified_tracking_number)
      : null;

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          Certified Mail Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs">Carrier</Label>
            <select
              value={form.certified_carrier}
              onChange={(e) => setForm((p) => ({ ...p, certified_carrier: e.target.value }))}
              className="w-full h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value="USPS">USPS Certified</option>
              <option value="UPS">UPS</option>
              <option value="FedEx">FedEx</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Tracking #</Label>
            <Input
              value={form.certified_tracking_number}
              onChange={(e) => setForm((p) => ({ ...p, certified_tracking_number: e.target.value }))}
              placeholder="9407 1123 4567 8901 2345"
            />
          </div>
          <div>
            <Label className="text-xs">Mailed Date</Label>
            <Input
              type="date"
              value={form.certified_mailed_date}
              onChange={(e) => setForm((p) => ({ ...p, certified_mailed_date: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs">Delivered Date</Label>
            <Input
              type="date"
              value={form.certified_delivered_date}
              onChange={(e) => setForm((p) => ({ ...p, certified_delivered_date: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs">Cost ($)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.certified_cost}
              onChange={(e) => setForm((p) => ({ ...p, certified_cost: e.target.value }))}
              placeholder="8.75"
            />
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Input
              value={form.certified_notes}
              onChange={(e) => setForm((p) => ({ ...p, certified_notes: e.target.value }))}
              placeholder="Green card returned, etc."
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            Save
          </Button>
          {trackUrl && (
            <Button size="sm" variant="outline" asChild>
              <a href={trackUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                Track on {form.certified_carrier}
              </a>
            </Button>
          )}
          {form.certified_mailed_date && !form.certified_delivered_date && (
            <span className="text-xs text-muted-foreground self-center">
              Mailed {format(new Date(form.certified_mailed_date), 'MMM d')} — awaiting delivery
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
