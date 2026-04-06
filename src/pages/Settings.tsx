import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useHousehold } from '@/contexts/HouseholdContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Loader2, Save, User, Users, DollarSign, Calendar, Building2, Plus, Pencil, Trash2, Globe, Phone, Mail, MapPin, Sun, Moon, Monitor, Sparkles, Search, Tag, Volume2, Pause, Square, Play, BookOpen, BellRing, Send } from 'lucide-react';
import HouseholdInvitations from '@/components/HouseholdInvitations';
import { Switch } from '@/components/ui/switch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTTS } from '@/hooks/use-tts';

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
];

const ENTITY_TYPES = [
  { value: 'llc', label: 'LLC' },
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 's_corp', label: 'S-Corp' },
  { value: 'c_corp', label: 'C-Corp' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'nonprofit', label: 'Non-Profit' },
  { value: 'other', label: 'Other' },
];

const INDUSTRIES = [
  'Technology', 'Consulting', 'Real Estate', 'Retail', 'Healthcare',
  'Finance', 'Construction', 'Education', 'Food & Beverage', 'Marketing',
  'Legal Services', 'Transportation', 'Manufacturing', 'Entertainment', 'Other',
];

type BusinessProfile = {
  id: string;
  household_id: string;
  business_name: string;
  entity_type: string;
  ein: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  industry: string | null;
  fiscal_year_end: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const emptyBizForm = {
  business_name: '',
  entity_type: 'llc',
  ein: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  phone: '',
  email: '',
  website: '',
  industry: '',
  fiscal_year_end: '12',
  notes: '',
};

function ThemeCard() {
  const { theme, setTheme } = useTheme();
  const options = [
    { value: 'light', label: 'Light', icon: Sun, desc: 'Clean and bright' },
    { value: 'dark', label: 'Dark', icon: Moon, desc: 'Easy on the eyes' },
    { value: 'system', label: 'System', icon: Monitor, desc: 'Match your OS' },
  ];
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sun className="h-5 w-5 text-primary" />
          <CardTitle className="font-display">Appearance</CardTitle>
        </div>
        <CardDescription>Choose your preferred theme.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all hover:border-primary/40',
                theme === opt.value ? 'border-primary bg-primary/5' : 'border-border'
              )}
            >
              <opt.icon className={cn('h-6 w-6', theme === opt.value ? 'text-primary' : 'text-muted-foreground')} />
              <span className="text-sm font-medium">{opt.label}</span>
              <span className="text-[10px] text-muted-foreground">{opt.desc}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

const DEMO_RULES = [
  { merchant: 'netflix', category: 'Subscriptions', matches: 12 },
  { merchant: 'whole foods', category: 'Groceries', matches: 28 },
  { merchant: 'shell gas', category: 'Gas', matches: 8 },
  { merchant: 'starbucks', category: 'Dining Out', matches: 15 },
  { merchant: 'amazon', category: 'Shopping', matches: 34 },
];

const WALKTHROUGH_TEXT = `Welcome to Categorization Rules! Here's how to set up automatic transaction categorization.

Step 1: Create a rule by clicking the "Add Rule" button. Enter a merchant pattern — this is the text that appears in your transaction's merchant name. For example, type "netflix" to match all Netflix charges.

Step 2: Choose a category to assign. Every time a new transaction comes in with a matching merchant name, it will automatically be categorized for you.

Step 3: Rules are case-insensitive, so "Netflix", "NETFLIX", and "netflix" all match the same rule.

Tips: Rules also apply automatically when you import transactions via CSV. AI-generated rules are created when you use the Auto-categorize feature on the Transactions page. You can edit or delete any rule at any time.

That's it! Set up a few rules for your most common merchants and watch your transactions categorize themselves.`;

function CategorizationRulesSection({ householdId }: { householdId?: string }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingRule, setEditingRule] = useState<{ id: string; merchant_pattern: string; category_id: string } | null>(null);
  const [deleteRuleTarget, setDeleteRuleTarget] = useState<{ id: string; pattern: string } | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newMerchant, setNewMerchant] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [showDemo, setShowDemo] = useState(false);
  const tts = useTTS();

  const { data: rules, isLoading: rulesLoading } = useQuery({
    queryKey: ['categorization_rules', householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categorization_rules')
        .select('*, categories(name, color)')
        .eq('household_id', householdId!)
        .order('match_count', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['categories', householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, color')
        .eq('household_id', householdId!)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const createRule = useMutation({
    mutationFn: async ({ merchant_pattern, category_id }: { merchant_pattern: string; category_id: string }) => {
      const { error } = await supabase
        .from('categorization_rules')
        .insert({
          household_id: householdId!,
          merchant_pattern: merchant_pattern.toLowerCase().trim(),
          category_id,
          is_ai_generated: false,
          match_count: 0,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorization_rules'] });
      toast.success('Rule created');
      setCreateDialogOpen(false);
      setNewMerchant('');
      setNewCategoryId('');
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, merchant_pattern, category_id }: { id: string; merchant_pattern: string; category_id: string }) => {
      const { error } = await supabase
        .from('categorization_rules')
        .update({ merchant_pattern, category_id } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorization_rules'] });
      toast.success('Rule updated');
      setEditingRule(null);
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categorization_rules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorization_rules'] });
      toast.success('Rule deleted');
      setDeleteRuleTarget(null);
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const filteredRules = rules?.filter(r =>
    r.merchant_pattern.toLowerCase().includes(search.toLowerCase()) ||
    (r.categories as any)?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleTTSToggle = () => {
    if (tts.isSpeaking && !tts.isPaused) {
      tts.pause();
    } else if (tts.isPaused) {
      tts.resume();
    } else {
      tts.speak(WALKTHROUGH_TEXT);
    }
  };

  return (
    <>
      {/* TTS Walkthrough Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-semibold">How Categorization Rules Work</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Rules auto-categorize transactions by matching merchant names. They apply during CSV imports and AI categorization.
                  Listen to the full walkthrough or view demo data below.
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant={tts.isSpeaking ? 'default' : 'outline'}
                size="sm"
                className="gap-1.5"
                onClick={handleTTSToggle}
              >
                {tts.isSpeaking && !tts.isPaused ? (
                  <><Pause className="h-3.5 w-3.5" /> Pause</>
                ) : tts.isPaused ? (
                  <><Play className="h-3.5 w-3.5" /> Resume</>
                ) : (
                  <><Volume2 className="h-3.5 w-3.5" /> Listen</>
                )}
              </Button>
              {tts.isSpeaking && (
                <Button variant="ghost" size="sm" onClick={tts.stop}>
                  <Square className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setShowDemo(!showDemo)} className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> {showDemo ? 'Hide' : 'Show'} Demo
              </Button>
            </div>
          </div>

          {/* Demo Data */}
          {showDemo && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Example Rules</p>
              <div className="grid gap-2">
                {DEMO_RULES.map((demo, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border bg-background p-3">
                    <div className="flex items-center gap-3">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{demo.merchant}</span>
                      <span className="text-xs text-muted-foreground">→</span>
                      <Badge variant="secondary" className="text-xs">{demo.category}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{demo.matches} matches</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground italic">
                These are example rules. Create your own below to start auto-categorizing your transactions!
              </p>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Header with search & add button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">Categorization Rules</h2>
          <p className="text-sm text-muted-foreground">Manage merchant-to-category mappings used for auto-categorization.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search rules..."
              className="pl-9"
            />
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2" size="sm">
            <Plus className="h-4 w-4" /> Add Rule
          </Button>
        </div>
      </div>

      {rulesLoading ? (
        <div className="flex items-center justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (!filteredRules || filteredRules.length === 0) ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <Tag className="mx-auto h-10 w-10 opacity-30 mb-3" />
            <p>{search ? 'No rules match your search.' : 'No categorization rules yet. Click "Add Rule" to create one, or use "Auto-categorize" on the Transactions page.'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredRules.map(rule => (
            <Card key={rule.id} className="group transition-shadow hover:shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    {rule.is_ai_generated ? <Sparkles className="h-4 w-4 text-primary" /> : <Tag className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{rule.merchant_pattern}</span>
                      {rule.is_ai_generated && <Badge variant="secondary" className="text-[10px] shrink-0">AI</Badge>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: (rule.categories as any)?.color || 'hsl(var(--primary))' }} />
                        {(rule.categories as any)?.name || 'Unknown'}
                      </span>
                      <span>·</span>
                      <span>{rule.match_count} match{rule.match_count !== 1 ? 'es' : ''}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingRule({ id: rule.id, merchant_pattern: rule.merchant_pattern, category_id: rule.category_id })}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteRuleTarget({ id: rule.id, pattern: rule.merchant_pattern })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          <p className="text-xs text-muted-foreground text-right pt-1">{filteredRules.length} rule{filteredRules.length !== 1 ? 's' : ''}</p>
        </div>
      )}

      {/* Create Rule Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={open => { if (!open) { setNewMerchant(''); setNewCategoryId(''); } setCreateDialogOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Categorization Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Merchant Pattern</Label>
              <Input
                value={newMerchant}
                onChange={e => setNewMerchant(e.target.value)}
                placeholder="e.g. netflix, starbucks, whole foods"
              />
              <p className="text-xs text-muted-foreground">Transactions with this merchant name will be auto-categorized. Case-insensitive.</p>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories?.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => createRule.mutate({ merchant_pattern: newMerchant, category_id: newCategoryId })}
              disabled={createRule.isPending || !newMerchant.trim() || !newCategoryId}
              className="w-full gap-2"
            >
              {createRule.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Rule
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Rule Dialog */}
      <Dialog open={!!editingRule} onOpenChange={open => !open && setEditingRule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Categorization Rule</DialogTitle>
          </DialogHeader>
          {editingRule && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Merchant Pattern</Label>
                <Input
                  value={editingRule.merchant_pattern}
                  onChange={e => setEditingRule(r => r ? { ...r, merchant_pattern: e.target.value } : null)}
                  placeholder="e.g. Netflix, Starbucks"
                />
                <p className="text-xs text-muted-foreground">Transactions with merchants containing this text will be auto-categorized.</p>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={editingRule.category_id} onValueChange={v => setEditingRule(r => r ? { ...r, category_id: v } : null)}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories?.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => editingRule && updateRule.mutate(editingRule)}
                disabled={updateRule.isPending || !editingRule.merchant_pattern.trim()}
                className="w-full gap-2"
              >
                {updateRule.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Rule
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Rule Confirmation */}
      <AlertDialog open={!!deleteRuleTarget} onOpenChange={open => !open && setDeleteRuleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete rule?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete the rule for "{deleteRuleTarget?.pattern}"? Future transactions won't be auto-categorized by this pattern.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteRuleTarget && deleteRule.mutate(deleteRuleTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const Settings = () => {
  const { user } = useAuth();
  const { household } = useHousehold();
  const qc = useQueryClient();

  // Personal profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Business profiles
  const { data: businessProfiles, isLoading: bizLoading } = useQuery({
    queryKey: ['business_profiles', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('household_id', household!.id)
        .order('created_at');
      if (error) throw error;
      return data as BusinessProfile[];
    },
  });

  const SendTestDigestButton = () => {
    const [sending, setSending] = useState(false);
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={sending}
        className="gap-2"
        onClick={async () => {
          setSending(true);
          try {
            const { error } = await supabase.functions.invoke('weekly-digest', {
              body: { test: true },
            });
            if (error) throw error;
            toast.success('Test digest sent! Check your inbox.');
          } catch (err: any) {
            toast.error(err.message || 'Failed to send test digest');
          } finally {
            setSending(false);
          }
        }}
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Send Now
      </Button>
    );
  };

  const [displayName, setDisplayName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [fiscalDay, setFiscalDay] = useState('1');
  const [weeklyDigestEnabled, setWeeklyDigestEnabled] = useState(true);

  const [bizDialogOpen, setBizDialogOpen] = useState(false);
  const [editingBiz, setEditingBiz] = useState<string | null>(null);
  const [bizForm, setBizForm] = useState(emptyBizForm);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setCurrency(profile.currency || 'USD');
      setFiscalDay(String(profile.fiscal_month_start_day || 1));
      setWeeklyDigestEnabled((profile as any).weekly_digest_enabled !== false);
    }
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim() || null,
          currency,
          fiscal_month_start_day: parseInt(fiscalDay),
          weekly_digest_enabled: weeklyDigestEnabled,
        } as any)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Personal profile saved!');
    },
    onError: (e) => toast.error('Failed to save: ' + e.message),
  });

  const createBiz = useMutation({
    mutationFn: async (form: typeof emptyBizForm) => {
      const { error } = await supabase
        .from('business_profiles')
        .insert({
          household_id: household!.id,
          business_name: form.business_name,
          entity_type: form.entity_type,
          ein: form.ein || null,
          address: form.address || null,
          city: form.city || null,
          state: form.state || null,
          zip: form.zip || null,
          phone: form.phone || null,
          email: form.email || null,
          website: form.website || null,
          industry: form.industry || null,
          fiscal_year_end: form.fiscal_year_end || '12',
          notes: form.notes || null,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business_profiles'] });
      toast.success('Business added!');
      setBizDialogOpen(false);
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const updateBiz = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: typeof emptyBizForm }) => {
      const { error } = await supabase
        .from('business_profiles')
        .update({
          business_name: form.business_name,
          entity_type: form.entity_type,
          ein: form.ein || null,
          address: form.address || null,
          city: form.city || null,
          state: form.state || null,
          zip: form.zip || null,
          phone: form.phone || null,
          email: form.email || null,
          website: form.website || null,
          industry: form.industry || null,
          fiscal_year_end: form.fiscal_year_end || '12',
          notes: form.notes || null,
        } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business_profiles'] });
      toast.success('Business updated!');
      setBizDialogOpen(false);
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const deleteBiz = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('business_profiles')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business_profiles'] });
      toast.success('Business deleted');
      setDeleteTarget(null);
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const updatePassword = useMutation({
    mutationFn: async (newPassword: string) => {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => toast.success('Password updated!'),
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handlePasswordChange = () => {
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    updatePassword.mutate(newPassword);
    setNewPassword('');
    setConfirmPassword('');
  };

  const openCreateBiz = () => {
    setEditingBiz(null);
    setBizForm(emptyBizForm);
    setBizDialogOpen(true);
  };

  const openEditBiz = (biz: BusinessProfile) => {
    setEditingBiz(biz.id);
    setBizForm({
      business_name: biz.business_name,
      entity_type: biz.entity_type,
      ein: biz.ein || '',
      address: biz.address || '',
      city: biz.city || '',
      state: biz.state || '',
      zip: biz.zip || '',
      phone: biz.phone || '',
      email: biz.email || '',
      website: biz.website || '',
      industry: biz.industry || '',
      fiscal_year_end: biz.fiscal_year_end || '12',
      notes: biz.notes || '',
    });
    setBizDialogOpen(true);
  };

  const handleSaveBiz = () => {
    if (!bizForm.business_name.trim()) { toast.error('Business name is required'); return; }
    if (editingBiz) {
      updateBiz.mutate({ id: editingBiz, form: bizForm });
    } else {
      createBiz.mutate(bizForm);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your personal and business profiles.</p>
      </div>

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="personal" className="gap-2"><User className="h-4 w-4" /> Personal</TabsTrigger>
          <TabsTrigger value="household" className="gap-2"><Users className="h-4 w-4" /> Household</TabsTrigger>
          <TabsTrigger value="business" className="gap-2"><Building2 className="h-4 w-4" /> Business</TabsTrigger>
          <TabsTrigger value="rules" className="gap-2"><Tag className="h-4 w-4" /> Rules</TabsTrigger>
          <TabsTrigger value="recurring" className="gap-2"><Calendar className="h-4 w-4" /> Recurring</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* ==================== HOUSEHOLD ==================== */}
        <TabsContent value="household" className="space-y-6">
          <HouseholdInvitations />
        </TabsContent>

        {/* ==================== PERSONAL PROFILE ==================== */}
        <TabsContent value="personal" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle className="font-display">Personal Information</CardTitle>
              </div>
              <CardDescription>Your personal profile details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <CardTitle className="font-display">Preferences</CardTitle>
              </div>
              <CardDescription>Customize your budgeting experience.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => (
                      <SelectItem key={c.code} value={c.code}>
                        <span className="flex items-center gap-2">
                          <span className="text-muted-foreground">{c.symbol}</span>
                          {c.name} ({c.code})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Fiscal Month Start Day
                </Label>
                <Select value={fiscalDay} onValueChange={setFiscalDay}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                      <SelectItem key={d} value={String(d)}>
                        {d === 1 ? '1st (default)' : d === 15 ? '15th (mid-month)' : `${d}${d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Set the day your fiscal month begins.
                </p>
              </div>
            </CardContent>
          </Card>

          <ThemeCard />

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BellRing className="h-5 w-5 text-primary" />
                <CardTitle className="font-display">Notifications</CardTitle>
              </div>
              <CardDescription>Manage email notifications and digests.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Weekly Financial Digest</Label>
                  <p className="text-xs text-muted-foreground">
                    Receive a weekly email summary of your spending, budget status, and upcoming bills every Monday.
                  </p>
                </div>
                <Switch
                  checked={weeklyDigestEnabled}
                  onCheckedChange={setWeeklyDigestEnabled}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Send Test Digest</Label>
                  <p className="text-xs text-muted-foreground">
                    Send a preview digest email to your inbox right now.
                  </p>
                </div>
                <SendTestDigestButton />
              </div>
            </CardContent>
          </Card>

          <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending} className="gap-2">
            {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Personal Profile
          </Button>
        </TabsContent>

        {/* ==================== BUSINESS PROFILES ==================== */}
        <TabsContent value="business" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">Your Businesses</h2>
              <p className="text-sm text-muted-foreground">Manage your business accounts. Add as many as you need.</p>
            </div>
            <Button onClick={openCreateBiz} className="gap-2">
              <Plus className="h-4 w-4" /> Add Business
            </Button>
          </div>

          {bizLoading ? (
            <div className="flex items-center justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (!businessProfiles || businessProfiles.length === 0) ? (
            <Card>
              <CardContent className="p-10 text-center text-muted-foreground">
                <Building2 className="mx-auto h-10 w-10 opacity-30 mb-3" />
                <p>No businesses added yet. Click "Add Business" to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {businessProfiles.map(biz => (
                <Card key={biz.id} className="group transition-shadow hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                          <Building2 className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-display text-lg font-semibold">{biz.business_name}</h3>
                            <Badge variant="secondary" className="text-[10px]">
                              {ENTITY_TYPES.find(e => e.value === biz.entity_type)?.label || biz.entity_type}
                            </Badge>
                            {!biz.is_active && <Badge variant="outline" className="text-[10px] text-muted-foreground">Inactive</Badge>}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                            {biz.industry && <span>{biz.industry}</span>}
                            {biz.ein && <span>EIN: {biz.ein}</span>}
                            {biz.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{biz.email}</span>}
                            {biz.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{biz.phone}</span>}
                            {biz.website && <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{biz.website}</span>}
                            {(biz.city || biz.state) && (
                              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{[biz.city, biz.state].filter(Boolean).join(', ')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditBiz(biz)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ id: biz.id, name: biz.business_name })}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ==================== CATEGORIZATION RULES ==================== */}
        <TabsContent value="rules" className="space-y-6">
          <CategorizationRulesSection householdId={household?.id} />
        </TabsContent>

        {/* ==================== RECURRING ==================== */}
        <TabsContent value="recurring" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle className="font-display">Manage Recurring</CardTitle>
              </div>
              <CardDescription>View and manage all your recurring expenses and income from one place.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your recurring transactions are managed on the dedicated Recurring page where you can add, edit, and view them in list or calendar format.
              </p>
              <Button variant="outline" className="gap-2" onClick={() => window.location.href = '/recurring'}>
                <Calendar className="h-4 w-4" />
                Go to Recurring Transactions
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== SECURITY ==================== */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Change Password</CardTitle>
              <CardDescription>Update your account password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <Button variant="outline" onClick={handlePasswordChange} disabled={updatePassword.isPending || !newPassword} className="gap-2">
                {updatePassword.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Update Password
              </Button>
            </CardContent>
          </Card>

          {/* Biometric Auth */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="font-display">Biometric Lock</CardTitle>
              <CardDescription>Require Face ID or Touch ID when opening the app on mobile.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label>Enable biometric lock</Label>
                <Switch
                  checked={biometricEnabled}
                  onCheckedChange={(checked) => enableBiometric(checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Delete Account — Apple App Store Requirement */}
          <Card className="mt-6 border-destructive/30">
            <CardHeader>
              <CardTitle className="font-display text-destructive">Delete Account</CardTitle>
              <CardDescription>Permanently delete your account and all associated data. This action cannot be undone.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 text-sm text-muted-foreground">
                <p>This will permanently remove:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Your profile and preferences</li>
                  <li>All accounts, transactions, and budgets</li>
                  <li>Connected bank integrations</li>
                  <li>Goals, calculators, and reports</li>
                </ul>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="h-4 w-4" /> Delete My Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete your account and all data. You will be signed out immediately. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deletingAccount ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Yes, Delete Everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Business Profile Dialog */}
      <Dialog open={bizDialogOpen} onOpenChange={setBizDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editingBiz ? 'Edit Business' : 'Add Business'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Business Name *</Label>
                <Input value={bizForm.business_name} onChange={e => setBizForm(f => ({ ...f, business_name: e.target.value }))} placeholder="My Business LLC" />
              </div>
              <div className="space-y-2">
                <Label>Entity Type</Label>
                <Select value={bizForm.entity_type} onValueChange={v => setBizForm(f => ({ ...f, entity_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>EIN</Label>
                <Input value={bizForm.ein} onChange={e => setBizForm(f => ({ ...f, ein: e.target.value }))} placeholder="XX-XXXXXXX" />
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Select value={bizForm.industry} onValueChange={v => setBizForm(f => ({ ...f, industry: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fiscal Year End</Label>
                <Select value={bizForm.fiscal_year_end} onValueChange={v => setBizForm(f => ({ ...f, fiscal_year_end: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={bizForm.email} onChange={e => setBizForm(f => ({ ...f, email: e.target.value }))} placeholder="contact@business.com" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={bizForm.phone} onChange={e => setBizForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 123-4567" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Website</Label>
                <Input value={bizForm.website} onChange={e => setBizForm(f => ({ ...f, website: e.target.value }))} placeholder="https://mybusiness.com" />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Address</Label>
                <Input value={bizForm.address} onChange={e => setBizForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Main St" />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={bizForm.city} onChange={e => setBizForm(f => ({ ...f, city: e.target.value }))} placeholder="City" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input value={bizForm.state} onChange={e => setBizForm(f => ({ ...f, state: e.target.value }))} placeholder="CA" />
                </div>
                <div className="space-y-2">
                  <Label>ZIP</Label>
                  <Input value={bizForm.zip} onChange={e => setBizForm(f => ({ ...f, zip: e.target.value }))} placeholder="12345" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={bizForm.notes} onChange={e => setBizForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes about this business..." rows={3} />
            </div>

            <Button onClick={handleSaveBiz} disabled={createBiz.isPending || updateBiz.isPending || !bizForm.business_name.trim()} className="w-full gap-2">
              {(createBiz.isPending || updateBiz.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingBiz ? 'Update Business' : 'Add Business'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete business?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteBiz.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default Settings;
