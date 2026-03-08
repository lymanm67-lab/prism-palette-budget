import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const BANK_GUIDES = [
  {
    name: 'Chase',
    format: 'CSV or QFX',
    steps: [
      'Log in to chase.com',
      'Go to your account activity',
      'Click "Download account activity" (↓ icon)',
      'Select date range and format (QFX recommended)',
      'Click "Download"',
    ],
  },
  {
    name: 'Bank of America',
    format: 'CSV or OFX',
    steps: [
      'Log in to bankofamerica.com',
      'Select your account',
      'Click "Download" in the account activity section',
      'Choose file type (OFX recommended) and date range',
      'Click "Download"',
    ],
  },
  {
    name: 'Wells Fargo',
    format: 'CSV or QFX',
    steps: [
      'Log in to wellsfargo.com',
      'Go to your account and click "Download Activity"',
      'Select date range and format (Quicken/QFX recommended)',
      'Click "Download"',
    ],
  },
  {
    name: 'Capital One',
    format: 'CSV or OFX',
    steps: [
      'Log in to capitalone.com',
      'Go to your account and click "Download Transactions"',
      'Select date range and format',
      'Click "Download"',
    ],
  },
  {
    name: 'Citi',
    format: 'CSV or QFX',
    steps: [
      'Log in to online.citi.com',
      'Go to account details → "View All Transactions"',
      'Click "Download" and choose date range',
      'Select Quicken (QFX) or CSV format',
    ],
  },
  {
    name: 'Other Banks',
    format: 'CSV, OFX, QFX, or QBO',
    steps: [
      'Log in to your bank\'s website',
      'Find "Download", "Export", or "Download Transactions"',
      'Choose OFX, QFX, or QBO format if available (most reliable)',
      'Otherwise choose CSV — we auto-detect most formats',
    ],
  },
];

const BankExportGuide = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <TooltipProvider>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
            <HelpCircle className="h-4 w-4" />
            How to export from your bank
            {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <Card className="border-border/50 bg-muted/30">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-4">
                Most banks let you download transactions as a file. Here's how for popular banks:
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {BANK_GUIDES.map((bank) => (
                  <div
                    key={bank.name}
                    className="rounded-lg border border-border/40 bg-background/60 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{bank.name}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {bank.format}
                      </Badge>
                    </div>
                    <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                      {bank.steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                💡 <strong>Tip:</strong> OFX, QFX, and QBO files are the most reliable since they include structured data. CSV works too — we auto-detect formats from Chase, BofA, Wells Fargo, Capital One, Citi, YNAB, Mint, and more.
              </p>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </TooltipProvider>
  );
};

export default BankExportGuide;
