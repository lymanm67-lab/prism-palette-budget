import { ExternalLink, Snowflake, Phone, Mail, Globe, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import PageOverview from '@/components/PageOverview';
import FreezeLetterGenerator from '@/components/capital/FreezeLetterGenerator';
import FreezeVerificationDocs from '@/components/capital/FreezeVerificationDocs';

type Bureau = {
  order: number;
  name: string;
  purpose: string;
  freezeUrl?: string;
  phone?: string;
  mail?: string;
  notes: string;
  priority: 'high' | 'medium' | 'low';
};

const SECONDARY_BUREAUS: Bureau[] = [
  {
    order: 1,
    name: 'LexisNexis Risk Solutions',
    purpose: 'Feeds insurance, banking, tenant screening, and background checks. High-impact freeze.',
    freezeUrl: 'https://consumer.risk.lexisnexis.com/freeze',
    phone: '1-888-497-0011',
    mail: 'LexisNexis Consumer Center, P.O. Box 105108, Atlanta, GA 30348-5108',
    notes: 'Also request a free "Full File Disclosure" first so you can dispute errors before freezing.',
    priority: 'high',
  },
  {
    order: 2,
    name: 'SageStream (LexisNexis)',
    purpose: 'Alternative credit data used by lenders for thin-file / subprime decisioning.',
    freezeUrl: 'https://consumer.risk.lexisnexis.com/request',
    phone: '1-888-395-0277',
    mail: 'SageStream, LLC, Consumer Office, P.O. Box 503793, San Diego, CA 92150',
    notes: 'SageStream is now managed by LexisNexis — freeze via the LexisNexis Consumer Portal (link above), selecting "SageStream" as the report type. Often overlooked; closes a common backdoor when the Big 3 are frozen.',
    priority: 'high',
  },
  {
    order: 3,
    name: 'ChexSystems',
    purpose: 'Used by banks/credit unions to approve new checking & savings accounts.',
    freezeUrl: 'https://www.chexsystems.com/security-freeze/place-freeze',
    phone: '1-800-887-7652',
    mail: 'Chex Systems, Inc., Attn: Security Freeze, 7805 Hudson Rd, Suite 100, Woodbury, MN 55125',
    notes: 'Freeze here before opening any new bank account is denied — a freeze must be lifted temporarily to apply.',
    priority: 'high',
  },
  {
    order: 4,
    name: 'Innovis',
    purpose: 'The "4th credit bureau." Used for pre-approved offers and identity verification.',
    freezeUrl: 'https://www.innovis.com/personal/securityFreeze',
    phone: '1-800-540-2505',
    mail: 'Innovis Consumer Assistance, P.O. Box 26, Pittsburgh, PA 15230-0026',
    notes: 'Freeze here in addition to the Big 3 to close the pre-screened offer loophole.',
    priority: 'high',
  },
  {
    order: 5,
    name: 'ARS (Advanced Resolution Services)',
    purpose: 'Consumer report used by lenders and financial institutions.',
    freezeUrl: 'https://www.consumerfinance.gov/consumer-tools/credit-reports-and-scores/consumer-reporting-companies/companies-list/advanced-resolution-services/',
    phone: '1-800-392-8911',
    mail: 'ARS Consumer Office, P.O. Box 201, Wilmington, DE 19899',
    notes: 'Written request required. Include copy of ID and proof of address.',
    priority: 'medium',
  },
  {
    order: 6,
    name: 'CoreLogic Credco',
    purpose: 'Mortgage lenders pull tri-merge reports through CoreLogic. Critical before a home purchase.',
    freezeUrl: 'https://www.cotality.com/legal/credco-consumer-assistance',
    phone: '1-800-637-2422',
    mail: 'CoreLogic Credco, P.O. Box 509124, San Diego, CA 92150',
    notes: 'Freeze BEFORE mortgage shopping is not recommended — but freeze immediately after closing.',
    priority: 'medium',
  },
  {
    order: 7,
    name: 'The Work Number (Equifax)',
    purpose: 'Employment & income verification database used by lenders and employers.',
    freezeUrl: 'https://theworknumber.com/employees/data-freeze',
    phone: '1-866-604-6570',
    notes: 'Freezing prevents unauthorized income verification pulls. Lift temporarily before a mortgage application.',
    priority: 'medium',
  },
  {
    order: 8,
    name: 'NCTUE (National Consumer Telecom & Utilities Exchange)',
    purpose: 'Used by phone, cable, and utility companies for new account decisions.',
    freezeUrl: 'https://www.nctue.com/consumers',
    phone: '1-866-349-5185',
    notes: 'Prevents ID thieves from opening utility accounts in your name.',
    priority: 'medium',
  },
  {
    order: 9,
    name: 'MicroBilt / PRBC',
    purpose: 'Alternative credit reporting used by payday, auto, and subprime lenders.',
    freezeUrl: 'https://www.microbilt.com/consumer',
    phone: '1-800-884-4747',
    notes: 'Written request required.',
    priority: 'low',
  },
  {
    order: 10,
    name: 'Teletrack (CoreLogic)',
    purpose: 'Subprime & payday lender reporting.',
    phone: '1-877-309-5226',
    notes: 'Freeze via mail — no online portal. Send certified letter with ID and SSN.',
    priority: 'low',
  },
];


const priorityColor: Record<Bureau['priority'], string> = {
  high: 'bg-destructive/15 text-destructive border-destructive/30',
  medium: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  low: 'bg-muted text-muted-foreground',
};

const SecondaryBureauFreeze = () => {
  return (
    <div className="space-y-6 pb-8">
      <PageOverview
        title="Secondary Bureau Freeze Hub"
        description="Freeze the 10+ hidden bureaus lenders check beyond Equifax, Experian, and TransUnion"
        icon={Snowflake}
        ttsScript="Welcome to the Secondary Bureau Freeze Hub. Beyond Equifax, Experian, and TransUnion, at least ten additional bureaus feed your data to lenders, banks, insurers, and employers. Freezing only the Big 3 leaves these back-channels wide open. Start with LexisNexis, SageStream, ChexSystems, and Innovis — these are the highest-impact. All freezes are free under federal or state law."
        features={[
          'Direct freeze links, phone numbers, and mailing addresses',
          'Prioritized: freeze high-impact bureaus first (LexisNexis, ChexSystems, SageStream, Innovis)',
          'Notes on when to lift each freeze (mortgage, new bank account, employment verification)',
          'Free under federal law — no fees at any bureau',
        ]}
      />

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Why this matters</AlertTitle>
        <AlertDescription>
          Freezing only Equifax, Experian, and TransUnion still leaves 10+ back-channel bureaus open. Identity thieves and
          subprime lenders routinely pull from these. Freezes are <strong>free</strong> and required by federal/state law.
        </AlertDescription>
      </Alert>

      <FreezeVerificationDocs />

      <div className="grid gap-4 md:grid-cols-2">
        {[...SECONDARY_BUREAUS].sort((a, b) => a.order - b.order).map((b) => (
          <Card key={b.name} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary/15 text-primary text-sm font-bold border border-primary/30 shrink-0">
                    {b.order}
                  </span>
                  {b.name}
                </CardTitle>
                <Badge variant="outline" className={priorityColor[b.priority]}>
                  {b.priority.toUpperCase()}
                </Badge>
              </div>
              <CardDescription>{b.purpose}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-3 text-sm">
              {b.freezeUrl && (
                <a
                  href={b.freezeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <Globe className="h-4 w-4" />
                  Online freeze portal
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {b.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${b.phone.replace(/[^0-9]/g, '')}`} className="hover:underline">
                    {b.phone}
                  </a>
                </div>
              )}
              {b.mail && (
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-muted-foreground">{b.mail}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-2 mt-2">{b.notes}</p>
              <FreezeLetterGenerator bureau={{ name: b.name, mail: b.mail }} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recommended Order</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p><strong>1. Big 3 first:</strong> Equifax, Experian, TransUnion (via Credit Overview).</p>
          <p><strong>2. High-priority secondaries:</strong> LexisNexis → SageStream → ChexSystems → Innovis.</p>
          <p><strong>3. Medium-priority:</strong> ARS, CoreLogic Credco (after mortgage), The Work Number, NCTUE.</p>
          <p><strong>4. Low-priority:</strong> MicroBilt, Teletrack.</p>
          <p className="text-muted-foreground pt-2">
            Keep a record of freeze PINs in a password manager. Some bureaus require the PIN to lift the freeze later.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecondaryBureauFreeze;
