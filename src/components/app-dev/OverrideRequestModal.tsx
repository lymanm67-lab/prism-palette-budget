import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useRequestOverride } from '@/hooks/use-app-dev-cutoff';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OverrideRequestModal({ open, onOpenChange }: Props) {
  const [reason, setReason] = useState('');
  const request = useRequestOverride();

  const submit = async () => {
    if (reason.trim().length < 10) {
      toast.error('Reason must be at least 10 characters');
      return;
    }
    try {
      await request.mutateAsync(reason.trim());
      toast.success('Override request submitted — awaiting admin approval');
      setReason('');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request emergency override</DialogTitle>
          <DialogDescription>
            Overrides last 24 hours and require admin approval. Be specific — why is this app-dev spend
            unavoidable this month?
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Production bug blocking customers, must ship a fix today."
          rows={4}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={request.isPending}>
            {request.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
