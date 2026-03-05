import { useState } from 'react';
import { FileText, Shield, Database, KeyRound, Download, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const DOCUMENTS = [
  {
    id: 'info-security',
    title: 'Information Security Policy',
    description: 'Comprehensive security controls, risk management, and data protection standards.',
    icon: Shield,
    color: 'text-prism-teal',
    bgColor: 'bg-prism-teal/10',
    fileName: 'Information_Security_Policy.pdf',
  },
  {
    id: 'access-controls',
    title: 'Access Controls Policy',
    description: 'Authentication, authorization, and access management procedures.',
    icon: KeyRound,
    color: 'text-prism-sky',
    bgColor: 'bg-prism-sky/10',
    fileName: 'Access_Controls_Policy.pdf',
  },
  {
    id: 'data-retention',
    title: 'Data Retention & Deletion Policy',
    description: 'Data lifecycle management, retention schedules, and secure deletion procedures.',
    icon: Database,
    color: 'text-prism-orange',
    bgColor: 'bg-prism-orange/10',
    fileName: 'Data_Retention_and_Deletion_Policy.pdf',
  },
  {
    id: 'mfa-critical',
    title: 'Critical Systems MFA Statement',
    description: 'Multi-factor authentication enforcement for critical infrastructure systems.',
    icon: Shield,
    color: 'text-prism-lime',
    bgColor: 'bg-prism-lime/10',
    fileName: 'Critical_Systems_MFA_Statement.pdf',
  },
  {
    id: 'mfa-consumer',
    title: 'Consumer MFA Statement',
    description: 'Multi-factor authentication availability and options for consumer-facing applications.',
    icon: FileText,
    color: 'text-prism-amber',
    bgColor: 'bg-prism-amber/10',
    fileName: 'Consumer_MFA_Statement.pdf',
  },
];

function getPublicUrl(fileName: string) {
  return supabase.storage.from('legal-documents').getPublicUrl(fileName).data.publicUrl;
}

const Legal = () => {
  const [activeDoc, setActiveDoc] = useState(DOCUMENTS[0]);
  const pdfUrl = getPublicUrl(activeDoc.fileName);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Legal & Compliance
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Security policies, compliance documents, and regulatory statements.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Document list */}
        <div className="space-y-2">
          {DOCUMENTS.map((doc) => {
            const isActive = activeDoc.id === doc.id;
            return (
              <button
                key={doc.id}
                onClick={() => setActiveDoc(doc)}
                className={cn(
                  'w-full text-left rounded-xl p-3 transition-all duration-200 border',
                  isActive
                    ? 'bg-card border-primary/30 shadow-sm'
                    : 'bg-card/50 border-transparent hover:bg-card hover:border-border'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn('rounded-lg p-2 shrink-0', doc.bgColor)}>
                    <doc.icon className={cn('h-4 w-4', doc.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className={cn(
                      'text-sm font-medium truncate',
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {doc.title}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-2">
                      {doc.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* PDF Viewer */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/30">
            <div className="flex items-center gap-2">
              <activeDoc.icon className={cn('h-4 w-4', activeDoc.color)} />
              <span className="text-sm font-medium text-foreground">{activeDoc.title}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={pdfUrl} download>
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Download
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Open
                </a>
              </Button>
            </div>
          </div>
          <CardContent className="p-0">
            <iframe
              key={activeDoc.id}
              src={pdfUrl + '#toolbar=0'}
              className="w-full border-0"
              style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}
              title={activeDoc.title}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Legal;
