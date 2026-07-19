import { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, Loader2, CheckCircle2, XCircle, AlertTriangle, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { recommendEscalationFromOutcome, type DisputeOutcome } from '@/lib/credit-repair/escalation-engine';
import { LETTER_TEMPLATES, mergeTemplate } from '@/lib/credit-repair/letter-templates';

const BUREAU_ADDR: Record<string, string> = {
  Equifax: 'Equifax Information Services LLC\nP.O. Box 740256\nAtlanta, GA 30374',
  Experian: 'Experian\nP.O. Box 4500\nAllen, TX 75013',
  TransUnion: 'TransUnion LLC\nP.O. Box 2000\nChester, PA 19016',
};

interface Props {
  disputeId: string;
  currentRound: number;
  onProcessed?: (outcome: DisputeOutcome) => void;
}

interface ParseResult {
  outcome: DisputeOutcome;
  outcome_reason: string;
  stall_tactics: string[];
  bureau_or_furnisher: string;
  raw_summary: string;
}

const outcomeIcon = {
  deleted: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
  updated: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
  verified: <XCircle className="h-4 w-4 text-destructive" />,
  frivolous: <AlertTriangle className="h-4 w-4 text-amber-600" />,
  no_response: <AlertTriangle className="h-4 w-4 text-amber-600" />,
  pending: <FileText className="h-4 w-4 text-muted-foreground" />,
};

export default function ResponseUpload({ disputeId, currentRound, onProcessed }: Props) {
  const { household } = useHousehold();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);

  const handleFile = async (file: File) => {
    if (!household) return;
    setUploading(true);
    setResult(null);
    try {
      // 1. Upload to vault
      const ts = format(new Date(), 'yyyyMMdd-HHmmss');
      const fileName = `response-${ts}-${file.name}`;
      const storagePath = `${household.id}/responses/${fileName}`;
      const { error: upErr } = await supabase.storage.from('credit-documents').upload(storagePath, file);
      if (upErr) throw upErr;

      // 2. Read as base64 for parse function
      const b64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve((r.result as string).split(',')[1]);
        r.onerror = reject;
        r.readAsDataURL(file);
      });

      // 3. Invoke edge function to parse
      const { data, error } = await supabase.functions.invoke('parse-dispute-response', {
        body: {
          fileBase64: b64,
          mimeType: file.type || 'application/pdf',
          disputeId,
        },
      });
      if (error) throw error;
      const parsed = data as ParseResult;
      setResult(parsed);

      // 4. Save document + link to dispute
      await (supabase as any).from('credit_documents').insert({
        household_id: household.id,
        document_type: 'dispute_response',
        file_name: fileName,
        storage_path: storagePath,
        file_size: file.size,
        dispute_id: disputeId,
        notes: `Response parsed: ${parsed.outcome} — ${parsed.outcome_reason}`,
      });

      // 5. Update dispute with outcome
      const disputeUpdate: any = {
        response_received_date: format(new Date(), 'yyyy-MM-dd'),
        outcome: parsed.outcome,
        outcome_notes: parsed.outcome_reason,
      };
      let scheduledNextRound: number | null = null;
      if (parsed.outcome === 'deleted' || parsed.outcome === 'updated') {
        disputeUpdate.status = 'resolved';
      } else if (parsed.outcome === 'verified' || parsed.outcome === 'frivolous' || parsed.outcome === 'no_response') {
        disputeUpdate.status = 'in_progress';
        const nextStep = recommendEscalationFromOutcome(parsed.outcome, currentRound);
        if (nextStep) {
          disputeUpdate.next_action_type = nextStep.actionType;
          scheduledNextRound = nextStep.round;
        }
      }
      // Fetch original dispute to carry context into the follow-up
      const { data: original } = await (supabase as any)
        .from('credit_disputes').select('*').eq('id', disputeId).maybeSingle();

      await (supabase as any).from('credit_disputes').update(disputeUpdate).eq('id', disputeId);

      // 5b. Auto-schedule next round as a draft dispute
      if (scheduledNextRound && original) {
        const nextStep = recommendEscalationFromOutcome(parsed.outcome, currentRound)!;
        await (supabase as any).from('credit_disputes').insert({
          household_id: household.id,
          bureau: original.bureau,
          credit_account_id: original.credit_account_id,
          dispute_reason: `${nextStep.actionLabel} — follow-up to ${original.dispute_reason}`,
          metro2_violation: original.metro2_violation,
          explanation: `Auto-scheduled ${nextStep.actionLabel}. Prior outcome: ${parsed.outcome} — ${parsed.outcome_reason}${
            parsed.stall_tactics.length ? `\n\nStall tactics detected: ${parsed.stall_tactics.join('; ')}` : ''
          }\n\nStep: ${nextStep.description}`,
          status: 'draft',
          round: nextStep.round,
          escalation_channel: nextStep.channel,
          next_action_type: nextStep.actionType,
          parent_dispute_id: disputeId,
        });
        toast.success(`Next round drafted: ${nextStep.actionLabel}`);
      }

      // 6. Log escalation entry
      await (supabase as any).from('dispute_escalation_log').insert({
        household_id: household.id,
        dispute_id: disputeId,
        round: currentRound,
        action: 'response-received',
        channel: 'bureau',
        response_date: format(new Date(), 'yyyy-MM-dd'),
        outcome: parsed.outcome,
        notes: parsed.outcome_reason + (parsed.stall_tactics.length ? ` | Stall tactics: ${parsed.stall_tactics.join(', ')}` : ''),
        document_url: storagePath,
      });

      toast.success(`Response parsed: ${parsed.outcome}`);
      onProcessed?.(parsed.outcome);
    } catch (e: any) {
      toast.error(`Parse failed: ${e.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" />
          Upload Bureau Response
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          type="file"
          ref={fileInput}
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <Button
          variant="outline"
          className="w-full"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Parsing with AI…</>
          ) : (
            <><Upload className="h-4 w-4 mr-2" />Upload PDF or photo of bureau response</>
          )}
        </Button>
        <p className="text-[10px] text-muted-foreground">
          AI extracts the outcome (deleted / verified / frivolous), detects stall tactics, and auto-updates the dispute.
        </p>

        {result && (
          <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
            <div className="flex items-center gap-2">
              {outcomeIcon[result.outcome]}
              <span className="font-semibold text-sm capitalize">{result.outcome.replace('_', ' ')}</span>
              <Badge variant="outline" className="text-[9px]">{result.bureau_or_furnisher}</Badge>
            </div>
            <p className="text-xs">{result.outcome_reason}</p>
            {result.stall_tactics.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-amber-600">Stall tactics detected:</p>
                <ul className="text-[10px] text-muted-foreground list-disc list-inside">
                  {result.stall_tactics.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
