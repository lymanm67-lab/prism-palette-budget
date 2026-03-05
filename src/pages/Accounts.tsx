import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MOCK_ACCOUNTS, formatCurrency, formatDate } from '@/lib/seed-data';
import { Plus, RefreshCw, Landmark, CreditCard, TrendingUp, PiggyBank, Car } from 'lucide-react';

const ACCOUNT_ICONS: Record<string, React.ElementType> = {
  checking: Landmark,
  savings: PiggyBank,
  credit: CreditCard,
  investment: TrendingUp,
  loan: Car,
};

const TYPE_COLORS: Record<string, string> = {
  checking: 'bg-prism-violet/10 text-prism-violet',
  savings: 'bg-prism-teal/10 text-prism-teal',
  credit: 'bg-prism-rose/10 text-prism-rose',
  investment: 'bg-prism-sky/10 text-prism-sky',
  loan: 'bg-prism-amber/10 text-prism-amber',
};

// Group by institution
const grouped = MOCK_ACCOUNTS.reduce((acc, acct) => {
  (acc[acct.institution] = acc[acct.institution] || []).push(acct);
  return acc;
}, {} as Record<string, typeof MOCK_ACCOUNTS>);

const Accounts = () => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Accounts</h1>
          <p className="text-muted-foreground">All your connected financial accounts.</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Connect Account
        </Button>
      </div>

      {Object.entries(grouped).map(([institution, accounts]) => (
        <Card key={institution}>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="font-display text-lg">{institution}</CardTitle>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5" /> Sync
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {accounts.map((acc) => {
              const Icon = ACCOUNT_ICONS[acc.type] || Landmark;
              return (
                <div key={acc.id} className="flex items-center gap-4 rounded-lg border border-border/50 p-4 transition-colors hover:bg-muted/30">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${TYPE_COLORS[acc.type]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{acc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Last synced {formatDate(acc.lastSync)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs capitalize">{acc.type}</Badge>
                  <span className={`font-display text-lg font-semibold ${acc.balance >= 0 ? 'text-prism-teal' : 'text-prism-rose'}`}>
                    {formatCurrency(acc.balance)}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </motion.div>
  );
};

export default Accounts;
