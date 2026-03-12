import { Lock, Upload, FileText, FolderOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PageOverview from '@/components/PageOverview';

const VAULT_CATEGORIES = [
  { label: 'Credit Reports', icon: FileText, count: 0 },
  { label: 'Dispute Documents', icon: FileText, count: 0 },
  { label: 'Financial Statements', icon: FileText, count: 0 },
  { label: 'Funding Applications', icon: FileText, count: 0 },
  { label: 'Agency Formation Docs', icon: FolderOpen, count: 0 },
];

const DocumentVault = () => {
  return (
    <div className="space-y-6 pb-8">
      <PageOverview title="Secure Financial Document Vault" description="Encrypted storage for credit reports, disputes, and agency financials" icon={Lock} ttsScript="Encrypted storage for financial documents." features={['End-to-end encryption', 'Role-based access', 'Organized categories']} />

      <div className="flex items-start gap-3 rounded-lg border border-prism-teal/30 bg-prism-teal/5 p-4">
        <Lock className="h-5 w-5 text-prism-teal shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium">End-to-End Encrypted Storage</p>
          <p className="text-xs text-muted-foreground">Documents are encrypted at rest and secured with role-based access controls</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {VAULT_CATEGORIES.map(cat => (
          <Card key={cat.label} className="group hover:border-primary/30 cursor-pointer transition-colors">
            <CardContent className="p-6 text-center">
              <cat.icon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="font-medium text-sm">{cat.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{cat.count} documents</p>
              <Button variant="ghost" size="sm" className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload className="h-3 w-3 mr-1" /> Upload
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DocumentVault;
