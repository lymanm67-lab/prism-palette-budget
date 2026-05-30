import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';

const kycSchema = z.object({
  first_name: z.string().trim().min(1, 'First name required').max(50),
  last_name: z.string().trim().min(1, 'Last name required').max(50),
  email: z.string().trim().email('Invalid email').max(255),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s\-().]{7,20}$/, 'Enter a valid phone number (e.g. +15551234567)'),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth required (YYYY-MM-DD)'),
});

type Entity = {
  id: string;
  method_entity_id: string;
  status: string;
  kyc_first_name: string | null;
  kyc_last_name: string | null;
};

export default function MethodEntitySetup() {
  const { household } = useHousehold();
  const [entity, setEntity] = useState<Entity | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    dob: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!household?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('method_entities')
        .select('id, method_entity_id, status, kyc_first_name, kyc_last_name')
        .eq('household_id', household.id)
        .maybeSingle();
      if (!cancelled) {
        setEntity(data ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [household?.id]);

  const submit = async () => {
    if (!household?.id) return;
    setErrors({});
    const parsed = kycSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        if (i.path[0]) fieldErrors[i.path[0] as string] = i.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('method-create-entity', {
        body: { household_id: household.id, ...parsed.data },
      });
      if (error) throw error;
      if (data?.entity) {
        setEntity(data.entity);
        toast.success(
          data.already_exists
            ? 'Method profile already exists'
            : 'Method profile created — ready to link bills'
        );
        setOpen(false);
      } else {
        throw new Error('No entity returned');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create Method profile');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !household?.id) return null;

  if (entity) {
    return (
      <Alert className="border-emerald-500/30 bg-emerald-500/5">
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
        <AlertDescription className="text-xs flex items-center justify-between gap-2 flex-wrap">
          <span>
            <strong>Method™ profile active</strong> — {entity.kyc_first_name} {entity.kyc_last_name}.
            You can now link bills for real auto-pay.{' '}
            <Badge variant="outline" className="ml-1 text-[10px] capitalize">
              {entity.status}
            </Badge>
          </span>
          <span className="text-muted-foreground text-[10px]">ID: {entity.method_entity_id.slice(0, 16)}…</span>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <Alert className="border-primary/40 bg-primary/5">
        <Sparkles className="h-4 w-4 text-primary" />
        <AlertDescription className="text-xs flex items-center justify-between gap-3 flex-wrap">
          <span>
            <strong>Enable real auto-pay (beta).</strong> Connect a Method™ profile to pay credit cards, loans &amp; utilities
            via ACH directly from PrismMoney™.
          </span>
          <Button size="sm" onClick={() => setOpen(true)} className="shrink-0">
            Set up Method
          </Button>
        </AlertDescription>
      </Alert>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set up Method™ bill pay</DialogTitle>
            <DialogDescription className="text-xs">
              This creates an identity-verified profile with Method Financial (our ACH payments partner). Information
              is only used to verify you and authorize bill payments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="fn">First name</Label>
                <Input
                  id="fn"
                  value={form.first_name}
                  onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                  maxLength={50}
                />
                {errors.first_name && <p className="text-[11px] text-destructive">{errors.first_name}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="ln">Last name</Label>
                <Input
                  id="ln"
                  value={form.last_name}
                  onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                  maxLength={50}
                />
                {errors.last_name && <p className="text-[11px] text-destructive">{errors.last_name}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="em">Email</Label>
              <Input
                id="em"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                maxLength={255}
              />
              {errors.email && <p className="text-[11px] text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="ph">Phone (E.164 preferred)</Label>
              <Input
                id="ph"
                placeholder="+15551234567"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                maxLength={20}
              />
              {errors.phone && <p className="text-[11px] text-destructive">{errors.phone}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="dob">Date of birth</Label>
              <Input
                id="dob"
                type="date"
                value={form.dob}
                onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                max={new Date().toISOString().slice(0, 10)}
              />
              {errors.dob && <p className="text-[11px] text-destructive">{errors.dob}</p>}
            </div>

            <p className="text-[10px] text-muted-foreground leading-relaxed">
              By continuing, you agree to Method Financial's{' '}
              <a
                href="https://methodfi.com/end-user-terms"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                end-user terms
              </a>
              . PrismMoney™ does not store this data outside what's needed to identify your bill-pay profile.
            </p>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Create profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
