import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Loader2 } from 'lucide-react';
import { useLogCredits } from '@/hooks/use-app-dev-cutoff';
import { toast } from 'sonner';

export function CreditLogQuickEntry() {
  const [credits, setCredits] = useState('');
  const [note, setNote] = useState('');
  const log = useLogCredits();

  const submit = async () => {
    const n = parseInt(credits, 10);
    if (!n || n <= 0) return;
    try {
      await log.mutateAsync({ credits_used: n, note: note || undefined });
      setCredits('');
      setNote('');
      toast.success(`Logged ${n} credits`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to log credits');
    }
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Input
        type="number"
        inputMode="numeric"
        placeholder="Credits used"
        value={credits}
        onChange={(e) => setCredits(e.target.value)}
        className="w-32"
      />
      <Input
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="flex-1 min-w-[180px]"
      />
      <Button onClick={submit} disabled={!credits || log.isPending} size="sm">
        {log.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
        Log
      </Button>
    </div>
  );
}
