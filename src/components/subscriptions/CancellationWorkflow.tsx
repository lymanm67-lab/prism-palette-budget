import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, Mail, MessageSquare, ExternalLink, Copy, CheckCircle2, Clock,
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  subscription: any;
  onClose: () => void;
  onUpdate: (id: string, updates: any) => Promise<void>;
  formatCurrency: (n: number) => string;
}

function generateEmail(merchant: string) {
  return `Subject: Cancellation Request – My Account

Dear ${merchant} Support Team,

I am writing to request the immediate cancellation of my ${merchant} subscription/service.

Please confirm the cancellation via email and ensure no further charges are applied to my account.

If there are any remaining steps required on my end, please let me know.

Thank you for your time.

Best regards,
[Your Name]
[Your Account Email]`;
}

function generateChatScript(merchant: string) {
  return `Hi, I'd like to cancel my ${merchant} subscription, please.

My account email is: [Your Account Email]

I'd like the cancellation to take effect immediately and would like confirmation that no further charges will be applied.

Can you please process this and send me a confirmation email?

Thank you.`;
}

function generateGuide(merchant: string) {
  return [
    `1. Log in to your ${merchant} account at their website`,
    `2. Navigate to Account Settings or Subscription/Billing section`,
    `3. Look for "Cancel Subscription" or "Manage Plan" option`,
    `4. Follow the cancellation prompts — decline any retention offers if you're sure`,
    `5. Take a screenshot of the cancellation confirmation`,
    `6. Check your email for a cancellation confirmation message`,
    `7. Monitor your bank/card statements to ensure no further charges`,
  ];
}

export function CancellationWorkflow({ subscription: sub, onClose, onUpdate, formatCurrency }: Props) {
  const [step, setStep] = useState<'confirm' | 'assist'>('confirm');
  const [emailText, setEmailText] = useState(generateEmail(sub.merchant));
  const chatScript = generateChatScript(sub.merchant);
  const guide = generateGuide(sub.merchant);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleConfirmCancel = () => {
    setStep('assist');
    onUpdate(sub.id, { cancellation_status: 'requested', cancellation_requested_at: new Date().toISOString() });
  };

  const handleRemindLater = () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    onUpdate(sub.id, { cancel_reminder_date: nextWeek.toISOString().split('T')[0] });
    toast.success('We\'ll remind you in 7 days');
    onClose();
  };

  const handleKeep = () => {
    onUpdate(sub.id, { user_usage_override: 'still_using', cancellation_status: 'not_started' });
    toast.info('Subscription marked as keeper');
    onClose();
  };

  const handleMarkStatus = (status: string) => {
    const updates: any = { cancellation_status: status };
    if (status === 'canceled') {
      updates.cancellation_confirmed_at = new Date().toISOString();
      updates.is_cancelled = true;
    }
    onUpdate(sub.id, updates);
    if (status === 'canceled') {
      toast.success(`${sub.merchant} marked as canceled!`);
    } else {
      toast.info(`Status updated to ${status.replace('_', ' ')}`);
    }
  };

  if (step === 'confirm') {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-prism-violet/30">
          <CardHeader className="pb-3 flex flex-row items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="font-display text-lg">Cancel {sub.merchant}?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Do you want help canceling your <span className="font-semibold text-foreground">{sub.merchant}</span> subscription?
              This will save you <span className="font-semibold text-prism-teal">{formatCurrency(sub.average_amount)}/{sub.frequency}</span>.
            </p>

            <div className="space-y-2">
              <Button className="w-full" onClick={handleConfirmCancel}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Yes, help me cancel
              </Button>
              <Button variant="outline" className="w-full" onClick={handleRemindLater}>
                <Clock className="h-4 w-4 mr-2" />
                Remind me later
              </Button>
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={handleKeep}>
                Keep subscription
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground text-center">
              We will never send emails or messages on your behalf
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-prism-violet/30">
        <CardHeader className="pb-3 flex flex-row items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setStep('confirm')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <CardTitle className="font-display text-lg">Cancel {sub.merchant}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Choose your preferred cancellation method</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="email" className="text-xs gap-1">
                <Mail className="h-3 w-3" /> Email
              </TabsTrigger>
              <TabsTrigger value="chat" className="text-xs gap-1">
                <MessageSquare className="h-3 w-3" /> Chat Script
              </TabsTrigger>
              <TabsTrigger value="guide" className="text-xs gap-1">
                <ExternalLink className="h-3 w-3" /> DIY Guide
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-3 mt-3">
              <p className="text-xs text-muted-foreground">Edit and copy this email to send to {sub.merchant}'s support.</p>
              <Textarea
                value={emailText}
                onChange={(e) => setEmailText(e.target.value)}
                rows={10}
                className="text-xs font-mono"
              />
              <Button variant="outline" className="w-full" onClick={() => copyToClipboard(emailText, 'Email')}>
                <Copy className="h-4 w-4 mr-2" /> Copy Email
              </Button>
            </TabsContent>

            <TabsContent value="chat" className="space-y-3 mt-3">
              <p className="text-xs text-muted-foreground">Use this script when chatting with {sub.merchant}'s support.</p>
              <div className="rounded-lg border border-border/30 p-3 text-xs font-mono whitespace-pre-wrap bg-muted/30">
                {chatScript}
              </div>
              <Button variant="outline" className="w-full" onClick={() => copyToClipboard(chatScript, 'Chat script')}>
                <Copy className="h-4 w-4 mr-2" /> Copy Script
              </Button>
            </TabsContent>

            <TabsContent value="guide" className="space-y-3 mt-3">
              <p className="text-xs text-muted-foreground">Step-by-step guide to cancel {sub.merchant}.</p>
              <div className="space-y-2">
                {guide.map((step, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <Badge variant="outline" className="h-5 w-5 shrink-0 flex items-center justify-center p-0 text-[10px]">
                      {i + 1}
                    </Badge>
                    <span>{step.replace(/^\d+\.\s*/, '')}</span>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Tracking Status */}
          <div className="border-t border-border/50 pt-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Update Status</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => handleMarkStatus('pending')}>
                Pending Confirmation
              </Button>
              <Button size="sm" className="text-xs bg-prism-teal hover:bg-prism-teal/90" onClick={() => handleMarkStatus('canceled')}>
                Confirmed Canceled
              </Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => handleMarkStatus('still_active')}>
                Still Being Charged
              </Button>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleMarkStatus('not_started')}>
                Cancel Process
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
