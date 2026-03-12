import { Bot, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import PageOverview from '@/components/PageOverview';

const SUGGESTED_TOPICS = [
  'How do I read my credit report?',
  'What is Metro2 compliance?',
  'How to build business credit from scratch',
  'Explain debt-to-income ratio',
  'How does Medicaid reimbursement work?',
  'What is receivable factoring?',
];

const AiCoach = () => {
  return (
    <div className="space-y-6 pb-8">
      <PageOverview title="AI Financial Readiness Coach" description="AI assistant for credit education, business credit strategy, and agency financial management" icon={Bot} ttsScript="AI assistant for credit education and capital planning." features={['Credit report explanations', 'Metro2 interpretation', 'Capital planning guidance']} />

      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-prism-amber/10">
              <Bot className="h-5 w-5 text-prism-amber" />
            </div>
            <div>
              <CardTitle className="text-base">FocusOS Capital Coach</CardTitle>
              <CardDescription className="text-xs">Credit education • Business credit • Agency finance • Capital planning</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Suggested Topics */}
          <div className="mb-6">
            <p className="text-xs text-muted-foreground mb-3">Suggested topics:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_TOPICS.map(topic => (
                <Badge key={topic} variant="outline" className="cursor-pointer hover:bg-muted text-xs">
                  {topic}
                </Badge>
              ))}
            </div>
          </div>

          {/* Chat placeholder */}
          <div className="rounded-lg bg-muted/30 p-8 text-center mb-4">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Ask me anything about credit, business finance, or agency operations</p>
          </div>

          <div className="flex gap-2">
            <Input placeholder="Type your question..." className="flex-1" />
            <Button size="icon"><Send className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AiCoach;
