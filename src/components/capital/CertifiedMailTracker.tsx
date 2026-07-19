import { useState } from 'react';
import { Mail, ExternalLink, Save, Loader2, ShoppingCart, FileDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
    label_url?: string | null;
  };
}

const CARRIER_URLS: Record<string, (t: string) => string> = {
  USPS: (t) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(t)}`,
  UPS: (t) => `https://www.ups.com/track?tracknum=${encodeURIComponent(t)}`,
  FedEx: (t) => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(t)}`,
};

const EMPTY_ADDR = { name: '', street1: '', street2: '', city: '', state: '', zip: '', phone: '' };

export default function CertifiedMailTracker({ disputeId, initial }: Props) {
  const [form, setForm] = useState({
    certified_tracking_number: initial?.certified_tracking_number ?? '',
    certified_mailed_date: initial?.certified_mailed_date ?? '',
    certified_delivered_date: initial?.certified_delivered_date ?? '',
    certified_carrier: initial?.certified_carrier ?? 'USPS',
    certified_cost: initial?.certified_cost ?? '',
    certified_notes: initial?.certified_notes ?? '',
    label_url: initial?.label_url ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [buying, setBuying] = useState(false);
  const [from, setFrom] = useState(() => {
    try { return { ...EMPTY_ADDR, ...JSON.parse(localStorage.getItem('prism.certifiedMailFrom') ?? '{}') }; }
    catch { return EMPTY_ADDR; }
  });
  const [to, setTo] = useState(EMPTY_ADDR);

  const save = async () => {
    setSaving(true);
    const { error } = await (supabase as any).from('credit_disputes').update({
      certified_tracking_number: form.certified_tracking_number || null,
      certified_mailed_date: form.certified_mailed_date || null,
      certified_delivered_date: form.certified_delivered_date || null,
      certified_carrier: form.certified_carrier || null,
      certified_cost: form.certified_cost ? Number(form.certified_cost) : null,
      certified_notes: form.certified_notes || null,
      label_url: form.label_url || null,
    }).eq('id', disputeId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Certified mail info saved');
  };

  const buyLabel = async () => {
    if (!from.street1 || !to.street1) return toast.error('Fill both addresses');
    setBuying(true);
    try {
      const { data, error } = await supabase.functions.invoke('purchase-certified-label', {
        body: { from, to, return_receipt: true },
      });
      if (error) throw error;
      if ((data as any)?.error) {
        toast.error((data as any).error);
        if ((data as any).fallback_url) window.open((data as any).fallback_url, '_blank');
        return;
      }
      localStorage.setItem('prism.certifiedMailFrom', JSON.stringify(from));
      const next = {
        ...form,
        certified_tracking_number: data.tracking_code,
        certified_carrier: 'USPS',
        certified_cost: String(data.rate ?? ''),
        certified_mailed_date: format(new Date(), 'yyyy-MM-dd'),
        label_url: data.label_url,
      };
      setForm(next);
      await (supabase as any).from('credit_disputes').update({
        certified_tracking_number: data.tracking_code,
        certified_carrier: 'USPS',
        certified_cost: data.rate,
        certified_mailed_date: format(new Date(), 'yyyy-MM-dd'),
        label_url: data.label_url,
        label_purchase_id: data.shipment_id,
        label_rate: data.rate,
      }).eq('id', disputeId);
      toast.success(`Label purchased — tracking ${data.tracking_code}`);
      setBuyOpen(false);
      if (data.label_url) window.open(data.label_url, '_blank');
    } catch (e: any) {
      toast.error(e.message ?? 'Purchase failed');
    } finally {
      setBuying(false);
    }
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
            <Input type="date" value={form.certified_mailed_date}
              onChange={(e) => setForm((p) => ({ ...p, certified_mailed_date: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Delivered Date</Label>
            <Input type="date" value={form.certified_delivered_date}
              onChange={(e) => setForm((p) => ({ ...p, certified_delivered_date: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Cost ($)</Label>
            <Input type="number" step="0.01" value={form.certified_cost}
              onChange={(e) => setForm((p) => ({ ...p, certified_cost: e.target.value }))} placeholder="8.75" />
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Input value={form.certified_notes}
              onChange={(e) => setForm((p) => ({ ...p, certified_notes: e.target.value }))} placeholder="Green card returned, etc." />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            Save
          </Button>
          <Button size="sm" variant="default" onClick={() => setBuyOpen(true)}>
            <ShoppingCart className="h-3.5 w-3.5 mr-1" />
            Mail Certified (Manual Options)
          </Button>
          {form.label_url && (
            <Button size="sm" variant="outline" asChild>
              <a href={form.label_url} target="_blank" rel="noopener noreferrer">
                <FileDown className="h-3.5 w-3.5 mr-1" /> Reprint label
              </a>
            </Button>
          )}
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

        <Dialog open={buyOpen} onOpenChange={setBuyOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Send Certified Mail</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground text-xs">
                Pick a method below, mail your letter, then paste the USPS tracking number into the "Tracking #" field above and save.
              </p>

              <div className="rounded-md border p-3 space-y-1">
                <div className="font-semibold text-sm">Option 1 — USPS Post Office (in person)</div>
                <p className="text-xs text-muted-foreground">
                  Bring your printed dispute letter. Ask for <strong>Certified Mail + Return Receipt (Green Card)</strong>. Cost ~$8–11. Keep the receipt — the tracking # is on it.
                </p>
              </div>

              <div className="rounded-md border p-3 space-y-2">
                <div className="font-semibold text-sm">Option 2 — USPS Click-N-Ship (online, no API)</div>
                <p className="text-xs text-muted-foreground">
                  Print a Certified Mail label from home. Requires a USPS.com account.
                </p>
                <Button size="sm" variant="outline" asChild>
                  <a href="https://cns.usps.com/labelInformation.shtml" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open USPS Click-N-Ship
                  </a>
                </Button>
              </div>

              <div className="rounded-md border p-3 space-y-2">
                <div className="font-semibold text-sm">Option 3 — Online mail services (upload & send)</div>
                <p className="text-xs text-muted-foreground">
                  These services print, stuff, and mail Certified for you. No API key needed.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <a href="https://www.letterstream.com/" target="_blank" rel="noopener noreferrer">LetterStream</a>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a href="https://www.certifiedmaillabels.com/" target="_blank" rel="noopener noreferrer">CertifiedMailLabels</a>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a href="https://www.onlinecertifiedmail.com/" target="_blank" rel="noopener noreferrer">OnlineCertifiedMail</a>
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBuyOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
