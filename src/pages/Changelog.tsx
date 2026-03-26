import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, ShieldCheck, FileSearch, Copy, Scale, Receipt, Shuffle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LandingNav from '@/components/landing/LandingNav';
import LandingFooter from '@/components/landing/LandingFooter';

const ENTRIES = [
  {
    date: 'March 26, 2026',
    version: 'v2.8.0',
    badge: 'New',
    badgeColor: 'bg-accent text-accent-foreground',
    title: 'AI-Powered Monthly Reconciliation & Audit',
    description: 'Prism now automatically audits every account and transaction across personal and business entities — catching errors, duplicates, and tax-readiness gaps before they become problems.',
    highlights: [
      { icon: FileSearch, text: 'Missing categorization detection — flags uncategorized transactions and unassigned business expenses' },
      { icon: Copy, text: 'Duplicate transaction detection — catches double-entries across accounts by matching date, amount, and merchant' },
      { icon: Scale, text: 'Balance reconciliation — verifies account balances match your actual transaction totals' },
      { icon: Receipt, text: 'Tax-readiness audit — identifies missing deductions, uncategorized business expenses, and Schedule C gaps' },
      { icon: Shuffle, text: 'Entity misclassification detection — flags personal expenses in business categories and business expenses in personal categories' },
      { icon: ShieldCheck, text: 'AI narrative summary — plain-English audit report you can share with your accountant' },
      { icon: Sparkles, text: 'Downloadable PDF export — one-click audit report for your records' },
    ],
    cta: { label: 'Try It Now', path: '/reconciliation' },
  },
];

const Changelog = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <div className="pt-28 pb-20">
        <div className="mx-auto max-w-3xl px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-14">
            <Badge variant="outline" className="mb-4 text-xs font-semibold tracking-widest uppercase">
              What's New
            </Badge>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight">
              Changelog
            </h1>
            <p className="mt-3 text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
              Every improvement we ship to help you take control of your money.
            </p>
          </motion.div>

          <div className="space-y-10">
            {ENTRIES.map((entry, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="border-border overflow-hidden">
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <span className="text-sm font-medium text-muted-foreground">{entry.date}</span>
                      <Badge variant="outline" className="text-xs">{entry.version}</Badge>
                      <Badge className={entry.badgeColor}>{entry.badge}</Badge>
                    </div>
                    <h2 className="font-display text-xl sm:text-2xl font-bold mb-3">{entry.title}</h2>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-6">{entry.description}</p>
                    <ul className="space-y-3 mb-6">
                      {entry.highlights.map((h, hi) => (
                        <li key={hi} className="flex items-start gap-3 text-sm">
                          <h.icon className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                          <span className="text-foreground">{h.text}</span>
                        </li>
                      ))}
                    </ul>
                    {entry.cta && (
                      <Button onClick={() => navigate(entry.cta.path)}
                        className="prism-gradient-teal text-white hover:opacity-90 rounded-xl gap-2 font-semibold">
                        {entry.cta.label} <ArrowRight className="h-4 w-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      <LandingFooter />
    </div>
  );
};

export default Changelog;
