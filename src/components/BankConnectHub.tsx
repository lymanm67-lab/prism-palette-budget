import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, Landmark, FileSpreadsheet, Zap, Lock, Crown, ArrowRight, CheckCircle2 } from 'lucide-react';
import CsvImportDialog from '@/components/CsvImportDialog';
import BankExportGuide from '@/components/BankExportGuide';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PlaidLinkButton from '@/components/PlaidLinkButton';
import { useAuth } from '@/contexts/AuthContext';
import { canUsePlaid } from '@/lib/stripe-plans';

const IMPORT_STEPS = [
  { step: 1, label: 'Open your bank website', icon: Landmark },
  { step: 2, label: 'Download transactions (CSV, OFX, or QIF)', icon: FileSpreadsheet },
  { step: 3, label: 'Upload here — done in 30 seconds', icon: Upload },
];

export default function BankConnectHub() {
  const [csvOpen, setCsvOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const { subscriptionTier } = useAuth();
  const hasPlaid = canUsePlaid(subscriptionTier);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {/* Primary: File Import — FREE */}
        <Card className="relative overflow-hidden border-2 border-prism-teal/30 bg-gradient-to-br from-prism-teal/5 to-background">
          <div className="absolute top-3 right-3">
            <Badge variant="secondary" className="bg-prism-teal/10 text-prism-teal border-prism-teal/20 text-[10px] font-semibold">
              <Zap className="h-3 w-3 mr-1" /> FREE — ALL PLANS
            </Badge>
          </div>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="h-5 w-5 text-prism-teal" />
              Import Bank File
            </CardTitle>
            <CardDescription>
              Download a CSV, OFX, or QIF file from your bank and upload it here. Works with every bank.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {IMPORT_STEPS.map((s) => (
                <div key={s.step} className="flex items-center gap-3 text-sm">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-prism-teal/10 text-prism-teal text-xs font-bold">
                    {s.step}
                  </div>
                  <span className="text-muted-foreground">{s.label}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={() => setCsvOpen(true)} className="w-full gap-2" size="lg">
                <Upload className="h-4 w-4" /> Upload Transactions
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setGuideOpen(true)} className="text-xs text-muted-foreground">
                Need help exporting from your bank? <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Secondary: Plaid — PREMIUM */}
        <Card className={`relative overflow-hidden ${hasPlaid ? 'border-primary/20' : 'border-border opacity-80'}`}>
          <div className="absolute top-3 right-3">
            <Badge variant="outline" className="text-[10px] font-semibold gap-1">
              <Crown className="h-3 w-3" /> PREMIUM+
            </Badge>
          </div>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Landmark className="h-5 w-5 text-primary" />
              Auto-Sync Bank
            </CardTitle>
            <CardDescription>
              Connect directly and sync transactions automatically every day. No manual downloads needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-prism-teal" /> Auto-sync daily
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-prism-teal" /> 12,000+ institutions
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-prism-teal" /> Bank-level encryption
              </div>
            </div>
            {hasPlaid ? (
              <PlaidLinkButton />
            ) : (
              <Button disabled className="w-full gap-2 opacity-70" size="lg">
                <Lock className="h-4 w-4" /> Upgrade to Unlock
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} />
      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>How to Export from Your Bank</DialogTitle>
          </DialogHeader>
          <BankExportGuide />
        </DialogContent>
      </Dialog>
    </>
  );
}
