import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend, CartesianGrid, PieChart, Pie,
} from 'recharts';

const CHART_COLORS = {
  mortgage: '#f59e0b',   // amber
  heloc: '#10b981',      // emerald
  principal: '#6366f1',  // indigo
  interest: '#ef4444',   // red
};

export type HelocReportData = {
  inputs: {
    balance: number;
    mortgageRate: number;
    termYears: number;
    helocRate: number;
    income: number;
    expenses: number;
  };
  mortgage: { payment: number; totalInterest: number; months: number };
  heloc: { netSurplus: number; totalInterest: number; months: number };
  interestSaved: number;
  yearsSaved: number;
  qualification?: {
    mortgage: { verdict: string; dti: number; reasons: string[] };
    heloc:    { verdict: string; dti: number; reasons: string[] };
  };
  profile?: {
    creditScore: string;
    totalIncome: number;
    debts: number;
    equity: number;
    ltv: number;
  };
};

function fmt(n: number) {
  if (!isFinite(n)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export default function HelocReportPreview({
  open,
  onOpenChange,
  data,
  householdId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  data: HelocReportData | null;
  householdId: string | null;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!data) return null;

  const handlePrint = () => {
    const el = document.getElementById('heloc-report-printable');
    if (!el) {
      toast.error('Report content not ready');
      return;
    }
    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) {
      toast.error('Please allow pop-ups to print the report.');
      return;
    }
    // Copy stylesheets from current document so Tailwind styles apply
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((n) => n.outerHTML)
      .join('\n');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>HELOC vs Mortgage Report</title>${styles}
      <style>
        body { background:#fff !important; color:#000 !important; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        table { width:100%; border-collapse: collapse; }
        table, th, td { border: 1px solid #000; }
        th, td { padding: 6px 8px; text-align: left; font-size: 13px; }
        h1 { font-size: 22px; margin: 0 0 4px; }
        h2 { font-size: 15px; margin: 16px 0 6px; }
        section { margin-bottom: 14px; }
        .muted { color:#555; font-size: 11px; }
        @page { size: letter; margin: 0.5in; }
      </style></head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  };

  const handleSave = async () => {
    if (!householdId) {
      toast.error('Sign in to save reports to the cloud.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('calculator_snapshots').insert({
        household_id: householdId,
        calculator_type: 'heloc_vs_mortgage',
        label: `HELOC vs Mortgage — ${new Date().toLocaleDateString()}`,
        inputs: data.inputs as any,
        results: {
          mortgage: data.mortgage,
          heloc: data.heloc,
          interestSaved: data.interestSaved,
          yearsSaved: data.yearsSaved,
          qualification: data.qualification,
          profile: data.profile,
        } as any,
      });
      if (error) throw error;
      setSaved(true);
      toast.success('Report saved to your household.');
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const helocWins = data.interestSaved > 0 && isFinite(data.heloc.months);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center justify-between">
            <span>Report Preview</span>
            <div className="flex gap-2 mr-6">
              <Button size="sm" variant="outline" onClick={handleSave} disabled={saving || saved}>
                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4 mr-1 text-prism-lime" /> : <Save className="w-4 h-4 mr-1" />}
                {saved ? 'Saved' : 'Save'}
              </Button>
              <Button size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-1" /> Print / PDF
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Printable report body */}
        <div id="heloc-report-printable" className="space-y-6 text-foreground print:text-black">
          <div className="border-b border-border pb-3 print:border-black">
            <h1 className="text-2xl font-bold">HELOC vs. Mortgage — Financial Report</h1>
            <p className="text-xs text-muted-foreground print:text-gray-600">
              Generated {new Date().toLocaleString()} · PrismMoney™ Calculators
            </p>
          </div>

          {/* Executive summary */}
          <section>
            <h2 className="text-lg font-semibold mb-2">Executive Summary</h2>
            <p className="text-sm leading-relaxed">
              {helocWins ? (
                <>Based on your inputs, a <strong>1st Lien HELOC</strong> strategy would save approximately{' '}
                <strong>{fmt(data.interestSaved)}</strong> in interest and pay the home off{' '}
                <strong>{data.yearsSaved.toFixed(1)} years</strong> sooner than a traditional mortgage.</>
              ) : (
                <>Under your inputs, a <strong>traditional mortgage</strong> is the better fit. The HELOC's variable rate outweighs the daily-balance advantage given your current cash flow.</>
              )}
            </p>
          </section>

          {/* Inputs */}
          <section>
            <h2 className="text-lg font-semibold mb-2">Your Inputs</h2>
            <table className="w-full text-sm border border-border print:border-black">
              <tbody>
                <tr className="border-b border-border print:border-black"><td className="p-2 w-1/2">Mortgage balance</td><td className="p-2 font-mono">{fmt(data.inputs.balance)}</td></tr>
                <tr className="border-b border-border print:border-black"><td className="p-2">Mortgage rate</td><td className="p-2 font-mono">{data.inputs.mortgageRate.toFixed(2)}%</td></tr>
                <tr className="border-b border-border print:border-black"><td className="p-2">Remaining years</td><td className="p-2 font-mono">{data.inputs.termYears}</td></tr>
                <tr className="border-b border-border print:border-black"><td className="p-2">HELOC rate (variable)</td><td className="p-2 font-mono">{data.inputs.helocRate.toFixed(2)}%</td></tr>
                <tr className="border-b border-border print:border-black"><td className="p-2">Monthly gross income</td><td className="p-2 font-mono">{fmt(data.inputs.income)}</td></tr>
                <tr><td className="p-2">Monthly expenses (excl. mortgage)</td><td className="p-2 font-mono">{fmt(data.inputs.expenses)}</td></tr>
              </tbody>
            </table>
          </section>

          {/* Side-by-side */}
          <section>
            <h2 className="text-lg font-semibold mb-2">Side-by-Side Results</h2>
            <table className="w-full text-sm border border-border print:border-black">
              <thead>
                <tr className="bg-muted print:bg-gray-100">
                  <th className="p-2 text-left">Metric</th>
                  <th className="p-2 text-left">Traditional Mortgage</th>
                  <th className="p-2 text-left">1st Lien HELOC</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border print:border-black">
                  <td className="p-2">Monthly payment (P&amp;I / net surplus)</td>
                  <td className="p-2 font-mono">{fmt(data.mortgage.payment)}</td>
                  <td className="p-2 font-mono">{fmt(data.heloc.netSurplus)}/mo surplus</td>
                </tr>
                <tr className="border-t border-border print:border-black">
                  <td className="p-2">Payoff time</td>
                  <td className="p-2 font-mono">{(data.mortgage.months / 12).toFixed(1)} yrs</td>
                  <td className="p-2 font-mono">{isFinite(data.heloc.months) ? `${(data.heloc.months / 12).toFixed(1)} yrs` : 'Never (negative surplus)'}</td>
                </tr>
                <tr className="border-t border-border print:border-black">
                  <td className="p-2">Total interest</td>
                  <td className="p-2 font-mono">{fmt(data.mortgage.totalInterest)}</td>
                  <td className="p-2 font-mono">{fmt(data.heloc.totalInterest)}</td>
                </tr>
                <tr className="border-t border-border print:border-black bg-muted/40 print:bg-gray-50">
                  <td className="p-2 font-semibold">Interest saved with HELOC</td>
                  <td className="p-2" colSpan={2}><strong>{fmt(data.interestSaved)}</strong> over <strong>{data.yearsSaved.toFixed(1)} years</strong></td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Qualification */}
          {data.qualification && (
            <section>
              <h2 className="text-lg font-semibold mb-2">Qualification Assessment</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="border border-border print:border-black rounded p-3">
                  <div className="font-semibold mb-1">Mortgage: <span className="uppercase">{data.qualification.mortgage.verdict}</span></div>
                  <div>DTI: {data.qualification.mortgage.dti.toFixed(1)}%</div>
                  {data.qualification.mortgage.reasons.length > 0 && (
                    <ul className="list-disc pl-4 mt-1 text-xs">
                      {data.qualification.mortgage.reasons.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  )}
                </div>
                <div className="border border-border print:border-black rounded p-3">
                  <div className="font-semibold mb-1">1st Lien HELOC: <span className="uppercase">{data.qualification.heloc.verdict}</span></div>
                  <div>DTI: {data.qualification.heloc.dti.toFixed(1)}%</div>
                  {data.qualification.heloc.reasons.length > 0 && (
                    <ul className="list-disc pl-4 mt-1 text-xs">
                      {data.qualification.heloc.reasons.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Profile snapshot */}
          {data.profile && (
            <section>
              <h2 className="text-lg font-semibold mb-2">Financial Profile Snapshot</h2>
              <table className="w-full text-sm border border-border print:border-black">
                <tbody>
                  <tr className="border-b border-border print:border-black"><td className="p-2 w-1/2">Credit score</td><td className="p-2 font-mono">{data.profile.creditScore || '—'}</td></tr>
                  <tr className="border-b border-border print:border-black"><td className="p-2">Household monthly income</td><td className="p-2 font-mono">{fmt(data.profile.totalIncome)}</td></tr>
                  <tr className="border-b border-border print:border-black"><td className="p-2">Monthly debt payments</td><td className="p-2 font-mono">{fmt(data.profile.debts)}</td></tr>
                  <tr className="border-b border-border print:border-black"><td className="p-2">Home equity</td><td className="p-2 font-mono">{fmt(data.profile.equity)}</td></tr>
                  <tr><td className="p-2">Current LTV</td><td className="p-2 font-mono">{data.profile.ltv.toFixed(1)}%</td></tr>
                </tbody>
              </table>
            </section>
          )}

          <section className="text-[11px] text-muted-foreground print:text-gray-600 border-t border-border print:border-black pt-3">
            <strong>Disclaimer:</strong> This report is educational and not a loan offer, quote, or commitment to lend. HELOC rates are variable and can change. Actual qualification, rate, and payoff time depend on the specific lender, program, and market conditions. Verify all figures with a licensed lender before making financial decisions.
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
