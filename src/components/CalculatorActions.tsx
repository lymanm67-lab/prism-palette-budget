import { useState } from 'react';
import { Save, Copy, Download, Check, History, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import CalculatorPrintView from '@/components/CalculatorPrintView';

interface CalculatorActionsProps {
  calculatorType: string;
  inputs: Record<string, any>;
  results: Record<string, any>;
  hasResults: boolean;
  summaryText: string;
  onOpenHistory?: () => void;
  printData?: {
    inputs: { label: string; value: string }[];
    results: { label: string; value: string; highlight?: boolean }[];
    notes?: string;
  };
}

export default function CalculatorActions({ calculatorType, inputs, results, hasResults, summaryText, onOpenHistory, printData }: CalculatorActionsProps) {
  const { household } = useHousehold();
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);


  if (!hasResults) return null;

  const handleSave = async () => {
    if (!household?.id) {
      toast.error('Sign in and select a household to save results');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('calculator_snapshots' as any).insert({
        household_id: household.id,
        calculator_type: calculatorType,
        label: `${calculatorType.charAt(0).toUpperCase() + calculatorType.slice(1)} calculation`,
        inputs,
        results,
      } as any);
      if (error) throw error;
      toast.success('Calculation saved');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      toast.success('Summary copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleExport = () => {
    const blob = new Blob([summaryText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${calculatorType}-calculation.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('File downloaded');
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 text-xs">
        <Save className="h-3.5 w-3.5" />
        {saving ? 'Saving…' : 'Save'}
      </Button>
      <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
        {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </Button>
      <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 text-xs">
        <Download className="h-3.5 w-3.5" />
        Export
      </Button>
      {printData && (
        <CalculatorPrintView
          calculatorType={calculatorType}
          inputs={printData.inputs}
          results={printData.results}
          notes={printData.notes}
        />
      )}
      {onOpenHistory && (
        <Button variant="ghost" size="sm" onClick={onOpenHistory} className="gap-1.5 text-xs ml-auto">
          <History className="h-3.5 w-3.5" />
          History
        </Button>
      )}
    </div>
  );
}
