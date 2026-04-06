import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Gift, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrency } from '@/hooks/use-currency';
import { cn } from '@/lib/utils';
import AnimatedNumber from '@/components/AnimatedNumber';
import CalculatorActions from '@/components/CalculatorActions';
import CalculatorGuide from '@/components/CalculatorGuide';
import CalculatorScenariosAndPitfalls from '@/components/CalculatorScenariosAndPitfalls';

interface Recipient { name: string; budget: string; }

export default function HolidayGiftCalculator() {
  const { formatCurrency } = useCurrency();
  const [recipients, setRecipients] = useState<Recipient[]>([
    { name: 'Partner', budget: '100' },
    { name: 'Mom', budget: '75' },
    { name: 'Dad', budget: '75' },
    { name: 'Sibling', budget: '50' },
  ]);
  const [extras, setExtras] = useState('200'); // decorations, food, travel
  const [monthsToSave, setMonthsToSave] = useState([6]);

  const addRecipient = () => setRecipients([...recipients, { name: '', budget: '50' }]);
  const removeRecipient = (i: number) => setRecipients(recipients.filter((_, idx) => idx !== i));
  const updateRecipient = (i: number, field: keyof Recipient, val: string) => {
    const copy = [...recipients];
    copy[i] = { ...copy[i], [field]: val };
    setRecipients(copy);
  };

  const result = useMemo(() => {
    const giftTotal = recipients.reduce((sum, r) => sum + (parseFloat(r.budget) || 0), 0);
    const extra = parseFloat(extras) || 0;
    const totalBudget = giftTotal + extra;
    const months = monthsToSave[0] || 1;
    const monthly = totalBudget / months;
    const weekly = totalBudget / (months * 4.33);
    return { giftTotal, extra, totalBudget, monthly, weekly, months, recipientCount: recipients.length };
  }, [recipients, extras, monthsToSave]);

  return (
    <div className="space-y-6">
      <CalculatorGuide title="Holiday & Gift Budget" icon={Gift} iconColor="text-prism-rose"
        ttsScript="Plan holiday spending and gift budgets to avoid seasonal debt."
        instructions={['Add recipients and set per-person budgets', 'Include extras like food and travel', 'See monthly savings needed']} />

      <CalculatorScenariosAndPitfalls
        scenarios={[
          { title: 'Family of 6 ($600)', description: '$100 per person with thoughtful, personalized gifts. Start shopping in October to catch early sales and avoid rush shipping fees.' },
          { title: 'Extended Family ($1,200)', description: 'Set a family-wide spending cap or do a Secret Santa. Instead of 12 gifts at $100, buy 1 great gift for $100 and save $1,100.' },
          { title: 'Homemade + Experiences', description: 'A $30 homemade gift basket or experience voucher (dinner, movie night) often means more than a $100 generic item.' },
        ]}
        pitfalls={[
          { title: 'Credit Card Holiday Debt', description: 'The average American carries holiday debt into March. If you cannot pay cash, you are spending too much. Scale back — nobody remembers the gift, they remember the thought.' },
          { title: 'Last-Minute Premium', description: 'Rush shipping, airport gift shops, and panic buying cost 30-50% more. Plan early and save.' },
          { title: 'Forgetting Extras', description: 'Wrapping paper, shipping, holiday meals, decorations, and travel add 25-40% on top of gift budgets. Include these in your plan.' },
          { title: 'Guilt Spending', description: 'Spending more than you can afford out of guilt or social pressure leads to January regret. Set a firm cap and communicate it.' },
        ]}
        tips={[
          { title: 'Start a Sinking Fund in January', description: 'Divide your total holiday budget by 12 and auto-save monthly. By December you have cash ready — zero debt, zero stress.' },
          { title: 'Propose a Family Spending Cap', description: 'Suggest a $25-50 per-person limit or Secret Santa. Most families are relieved — they want permission to spend less too.' },
          { title: 'Shop Post-Holiday for Next Year', description: 'Buy wrapping paper, decorations, and non-perishable gifts at 50-75% off in January. Store them and save hundreds next December.' },
        ]}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Gift Recipients</Label>
          <Button variant="outline" size="sm" onClick={addRecipient} className="gap-1"><Plus className="h-3.5 w-3.5" /> Add</Button>
        </div>
        <div className="grid gap-2">
          {recipients.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input placeholder="Name" value={r.name} onChange={e => updateRecipient(i, 'name', e.target.value)} className="flex-1" />
              <Input type="number" min="0" placeholder="$" value={r.budget} onChange={e => updateRecipient(i, 'budget', e.target.value)} className="w-24" />
              <Button variant="ghost" size="icon" onClick={() => removeRecipient(i)} className="shrink-0"><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label>Extras (decorations, food, travel)</Label><Input type="number" min="0" value={extras} onChange={e => setExtras(e.target.value)} /></div>
        <div className="space-y-2">
          <Label>Months to Save: {monthsToSave[0]}</Label>
          <Slider min={1} max={12} step={1} value={monthsToSave} onValueChange={setMonthsToSave} />
        </div>
      </div>

      {result.totalBudget > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            {[
              { label: 'Total Budget', val: result.totalBudget, accent: true },
              { label: `Gifts (${result.recipientCount} people)`, val: result.giftTotal },
              { label: 'Monthly Savings', val: result.monthly, accent: true },
              { label: 'Weekly Savings', val: result.weekly },
            ].map(r => (
              <Card key={r.label} className={cn('border', r.accent && 'border-primary/30 bg-primary/5')}>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">{r.label}</p>
                  <p className={cn('text-lg font-bold', r.accent && 'text-primary')}><AnimatedNumber value={r.val} formatFn={formatCurrency} /></p>
                </CardContent>
              </Card>
            ))}
          </div>
          <CalculatorActions calculatorType="holiday" inputs={{ recipients, extras, monthsToSave: monthsToSave[0] }}
            results={result} hasResults={result.totalBudget > 0}
            summaryText={`Holiday Budget: ${formatCurrency(result.totalBudget)} for ${result.recipientCount} people — save ${formatCurrency(result.monthly)}/mo.`} />
        </motion.div>
      )}
    </div>
  );
}
