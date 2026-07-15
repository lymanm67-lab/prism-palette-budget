import { useState, useMemo } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';

type Term = { term: string; short: string; long: string; example?: string; category: string };

const TERMS: Term[] = [
  // Core mortgage
  { category: 'Mortgage basics', term: 'Principal', short: 'The amount you still owe on the loan.', long: 'The remaining loan balance — not including interest. Each payment splits into principal (reduces what you owe) and interest (cost of borrowing).' },
  { category: 'Mortgage basics', term: 'Interest rate', short: 'Annual % the lender charges to borrow.', long: 'The yearly cost of the loan expressed as a percent. On a fixed mortgage it never changes; on a HELOC or ARM it can.' },
  { category: 'Mortgage basics', term: 'Amortization', short: 'How each payment is split between principal and interest.', long: 'A schedule showing how much of every monthly payment goes to interest vs. principal. Early on, most of the payment is interest; later, most goes to principal.' },
  { category: 'Mortgage basics', term: 'Term', short: 'How long the loan runs (e.g. 15 or 30 years).', long: 'The number of years to fully pay off the loan on schedule. Shorter terms mean higher payments but far less total interest.' },
  { category: 'Mortgage basics', term: 'PITI', short: 'Principal + Interest + Taxes + Insurance.', long: 'The four pieces of a typical monthly housing payment. Lenders use PITI (not just P&I) to judge affordability.', example: 'PITI = $1,800 P&I + $400 tax + $120 insurance = $2,320/mo.' },
  { category: 'Mortgage basics', term: 'Escrow', short: 'A holding account for taxes & insurance.', long: 'Your lender collects a slice of property tax and insurance with each payment, holds it in escrow, and pays those bills when due.' },
  { category: 'Mortgage basics', term: 'PMI', short: 'Private Mortgage Insurance — required if you put down < 20%.', long: 'Insurance that protects the lender (not you) when your down payment is small. It drops off automatically once your loan-to-value hits 78%.' },
  { category: 'Mortgage basics', term: 'HOA', short: 'Homeowners association dues.', long: 'Monthly or annual fees paid to a neighborhood association for shared amenities and maintenance. Not part of the mortgage itself but counts toward affordability.' },

  // Ratios
  { category: 'Ratios & metrics', term: 'LTV', short: 'Loan-to-Value: balance ÷ home value.', long: 'How much you still owe compared to what the home is worth. Below 80% means no PMI; below 20% means you have big equity.', example: '$300k owed on $500k home = 60% LTV.' },
  { category: 'Ratios & metrics', term: 'DTI', short: 'Debt-to-Income: monthly debts ÷ gross income.', long: 'Percent of your pre-tax income that goes to debt payments. Front-end DTI counts only housing; back-end DTI includes everything. Lenders generally like < 36%.' },
  { category: 'Ratios & metrics', term: 'Equity', short: 'Home value − mortgage balance.', long: 'The portion of the home you actually own. Grows as you pay down principal and as the home appreciates.' },
  { category: 'Ratios & metrics', term: 'Emergency fund (months)', short: 'How many months of expenses you have saved.', long: 'Liquid savings divided by monthly expenses. 3–6 months is the standard target before aggressively paying down a mortgage.' },
  { category: 'Ratios & metrics', term: 'Freedom Score', short: '0–100 score of mortgage-payoff readiness.', long: 'A composite of 10 factors (housing ratio, DTI, credit, equity, emergency fund, retirement, cash flow, acceleration potential, rate gap, stability). Higher = more ready to accelerate payoff.' },

  // Payoff strategies
  { category: 'Payoff strategies', term: 'Extra principal', short: 'Adding more to the principal each month.', long: 'The simplest acceleration: pay above your minimum, with the extra applied to principal. Shrinks the balance directly and cuts total interest.' },
  { category: 'Payoff strategies', term: 'Biweekly payments', short: 'Pay half your mortgage every 2 weeks.', long: 'Results in 26 half-payments per year = 13 full payments instead of 12. That one extra payment shaves years off most 30-yr loans.' },
  { category: 'Payoff strategies', term: 'HELOC', short: 'Home Equity Line of Credit.', long: 'A revolving credit line secured by your home equity. Usually variable rate. Can be used to "chunk" the mortgage in the HELOC acceleration strategy.' },
  { category: 'Payoff strategies', term: 'HELOC acceleration', short: 'Using a HELOC to chunk principal, then rapidly paying the HELOC down.', long: 'Draw a chunk from the HELOC, apply it to mortgage principal, then sweep your income through the HELOC to pay it back fast. Works when you have strong monthly surplus.' },
  { category: 'Payoff strategies', term: '1st-lien HELOC', short: 'A HELOC that replaces your mortgage entirely.', long: 'An all-in-one loan where your checking-style HELOC is the primary home loan. Every deposit reduces interest daily. Requires disciplined cash flow.' },
  { category: 'Payoff strategies', term: 'Recast', short: 'Re-amortize the loan after a lump-sum payment.', long: 'After a big principal payment, most servicers (for a small fee) will recalculate your monthly payment based on the new balance, keeping the same rate and term. Lowers your minimum without a refi.' },
  { category: 'Payoff strategies', term: 'Refinance', short: 'Replacing your mortgage with a new one.', long: 'A new loan pays off the old one — usually to get a lower rate, shorter term, or cash out. Has closing costs, so worth it only if breakeven comes before you\'d sell/move.' },
  { category: 'Payoff strategies', term: 'Break-even (refi)', short: 'How long until refi savings exceed closing costs.', long: 'Closing costs ÷ monthly savings = number of months to break even. If you\'ll stay past that, refi generally wins.' },

  // Concepts
  { category: 'Concepts', term: 'Effective mortgage rate', short: 'Your rate after the tax deduction.', long: 'If you itemize, mortgage interest is deductible. Your effective rate = stated rate × (1 − marginal tax rate). Only matters if your total itemized deductions beat the standard deduction.', example: '6.5% × (1 − 24%) ≈ 4.94% effective.' },
  { category: 'Concepts', term: 'Opportunity cost', short: 'What you give up by choosing payoff vs. investing.', long: 'A dollar toward the mortgage saves you your mortgage rate. The same dollar invested might earn more (or less). The tradeoff depends on rates, taxes, and risk tolerance.' },
  { category: 'Concepts', term: 'Rate shock', short: 'A stress test for a jump in rates.', long: 'Models what happens to your HELOC payment (or ARM) if rates rise 1–3%. Useful before relying on variable-rate strategies.' },
  { category: 'Concepts', term: 'Stress test', short: 'Simulating a bad scenario.', long: 'Checks whether your plan survives income loss, rate hikes, or a big expense — before you commit to it.' },
  { category: 'Concepts', term: 'Front-end / back-end ratio', short: 'Two flavors of DTI.', long: 'Front-end = housing ÷ income (target ≤ 28%). Back-end = all debts ÷ income (target ≤ 36%). Lenders check both.' },

  // Homebuying
  { category: 'Homebuying', term: 'Down payment', short: 'Cash you put in upfront.', long: 'Reduces the loan size and, if ≥ 20%, avoids PMI. Common minimums: 3% (conventional), 3.5% (FHA), 0% (VA/USDA if eligible).' },
  { category: 'Homebuying', term: 'Closing costs', short: 'Fees due at signing.', long: 'Origination, title, appraisal, taxes, prepaid interest, escrow setup. Typically 2–5% of the loan amount.' },
  { category: 'Homebuying', term: 'DPA', short: 'Down Payment Assistance.', long: 'State/local programs that offer grants, forgivable loans, or second liens to help cover down payment and closing costs. Eligibility varies by income and location.' },
  { category: 'Homebuying', term: 'FICO', short: 'Your credit score (300–850).', long: 'The primary score lenders use. Higher = better rate. Above 760 usually gets the best pricing.' },
];

export default function Glossary() {
  const [q, setQ] = useState('');

  const groups = useMemo(() => {
    const filter = q.trim().toLowerCase();
    const filtered = filter
      ? TERMS.filter(t =>
          t.term.toLowerCase().includes(filter) ||
          t.short.toLowerCase().includes(filter) ||
          t.long.toLowerCase().includes(filter))
      : TERMS;
    const byCat: Record<string, Term[]> = {};
    for (const t of filtered) (byCat[t.category] ||= []).push(t);
    return byCat;
  }, [q]);

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5 text-primary" />
          Glossary — Terms used on this page
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Plain-English definitions for every term in the Mortgage Freedom Center. Search or browse by category.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search terms… (e.g. LTV, HELOC, recast)"
            className="pl-9"
          />
        </div>

        {Object.keys(groups).length === 0 && (
          <p className="text-sm text-muted-foreground italic">No terms match "{q}".</p>
        )}

        {Object.entries(groups).map(([cat, items]) => (
          <div key={cat} className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{cat}</h4>
            <Accordion type="multiple" className="rounded-xl border border-border/40 bg-muted/10">
              {items.map((t) => (
                <AccordionItem key={t.term} value={t.term} className="border-b border-border/30 last:border-b-0 px-3">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex flex-col items-start text-left gap-0.5">
                      <span className="text-sm font-semibold text-foreground">{t.term}</span>
                      <span className="text-xs text-muted-foreground font-normal">{t.short}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground space-y-2 pb-3">
                    <p>{t.long}</p>
                    {t.example && (
                      <p className="text-xs rounded-md bg-primary/5 border border-primary/20 px-2 py-1.5">
                        <span className="font-semibold text-primary">Example: </span>{t.example}
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
