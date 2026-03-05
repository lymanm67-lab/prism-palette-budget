import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MOCK_TRANSACTIONS, CATEGORIES, MOCK_ACCOUNTS, formatCurrency, formatDate } from '@/lib/seed-data';
import { Search, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const Transactions = () => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return MOCK_TRANSACTIONS.filter(
      (t) =>
        t.merchant.toLowerCase().includes(q) ||
        CATEGORIES.find((c) => c.id === t.categoryId)?.name.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Transactions</h1>
        <p className="text-muted-foreground">All your recent transactions in one place.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search transactions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filtered.map((txn) => {
              const cat = CATEGORIES.find((c) => c.id === txn.categoryId);
              const acc = MOCK_ACCOUNTS.find((a) => a.id === txn.accountId);
              const isIncome = txn.amount > 0;
              return (
                <div key={txn.id} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/30">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isIncome ? 'bg-prism-teal/10' : 'bg-prism-rose/10'}`}>
                    {isIncome ? <ArrowUpRight className="h-4 w-4 text-prism-teal" /> : <ArrowDownRight className="h-4 w-4 text-prism-rose" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{txn.merchant}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(txn.date)} · {acc?.name}
                    </p>
                  </div>
                  {cat && (
                    <Badge variant="outline" className="text-xs" style={{ borderColor: cat.color, color: cat.color }}>
                      {cat.name}
                    </Badge>
                  )}
                  <span className={`font-display font-semibold whitespace-nowrap ${isIncome ? 'text-prism-teal' : 'text-foreground'}`}>
                    {isIncome ? '+' : ''}{formatCurrency(txn.amount)}
                  </span>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="p-10 text-center text-muted-foreground">No transactions found.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default Transactions;
