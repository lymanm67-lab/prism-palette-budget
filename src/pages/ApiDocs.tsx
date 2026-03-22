import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Check, Code, Database, Shield, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const BASE_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/api/v1`;

const RESOURCES = [
  { name: 'accounts', description: 'Bank accounts, credit cards, investments' },
  { name: 'transactions', description: 'All financial transactions' },
  { name: 'budgets', description: 'Monthly budget allocations by category' },
  { name: 'categories', description: 'Transaction categories' },
  { name: 'category_groups', description: 'Category groups (personal/business)' },
  { name: 'recurring_transactions', description: 'Recurring bills and income' },
  { name: 'subscriptions', description: 'Detected subscriptions' },
  { name: 'financial_goals', description: 'Savings and financial goals' },
  { name: 'financial_insights', description: 'AI-generated spending insights' },
  { name: 'debt_plans', description: 'Debt payoff plans' },
  { name: 'debt_items', description: 'Individual debts within a plan' },
  { name: 'business_profiles', description: 'Business entity profiles' },
  { name: 'profiles', description: 'User profile and preferences' },
  { name: 'subcategories', description: 'Sub-categories under categories' },
  { name: 'categorization_rules', description: 'Auto-categorization rules' },
  { name: 'merchant_normalizations', description: 'Merchant name mappings' },
  { name: 'transaction_splits', description: 'Split transaction line items' },
  { name: 'homebuyer_checklist', description: 'Home buying readiness checklist' },
  { name: 'roadmap_progress', description: 'Financial roadmap progress' },
];

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  POST: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  PATCH: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  DELETE: 'bg-red-500/10 text-red-600 border-red-500/20',
};

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group">
      <pre className="bg-muted/50 border rounded-lg p-4 overflow-x-auto text-sm font-mono whitespace-pre-wrap break-all">
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
        onClick={copy}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

export default function ApiDocs() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">API Documentation</h1>
        <p className="text-muted-foreground mt-1">
          Integrate PrismMoney data into your other apps using the REST API.
        </p>
      </motion.div>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quick Start
          </CardTitle>
          <CardDescription>Authenticate and make your first API call</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">1. Get your JWT token</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Sign in using the same authentication system (email/password or Google OAuth) to get a session token.
            </p>
            <CodeBlock code={`// In your other Lovable app, use the same Supabase project:
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  '${import.meta.env.VITE_SUPABASE_URL}',
  '${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}'
);

// Sign in (user must have an existing account)
const { data } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password',
});

const token = data.session?.access_token;`} language="typescript" />
          </div>

          <div>
            <h3 className="font-semibold mb-2">2. Make API calls</h3>
            <CodeBlock code={`const BASE = '${BASE_URL}';

// List accounts
const res = await fetch(\`\${BASE}/accounts\`, {
  headers: { 'Authorization': \`Bearer \${token}\` }
});
const { data } = await res.json();`} language="typescript" />
          </div>
        </CardContent>
      </Card>

      {/* Auth */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>All requests require a valid JWT Bearer token in the <code className="bg-muted px-1.5 py-0.5 rounded text-xs">Authorization</code> header.</p>
          <p>Data is automatically scoped to the user's household via Row-Level Security — you can only access data you own.</p>
          <CodeBlock code={`Authorization: Bearer eyJhbGciOiJIUzI1NiIs...`} />
        </CardContent>
      </Card>

      {/* Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Endpoints
          </CardTitle>
          <CardDescription>All endpoints follow the pattern: <code className="text-xs bg-muted px-1 py-0.5 rounded">/v1/&#123;resource&#125;</code></CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="resources">
            <TabsList>
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="operations">Operations</TabsTrigger>
              <TabsTrigger value="filtering">Filtering</TabsTrigger>
            </TabsList>

            <TabsContent value="resources" className="mt-4">
              <div className="grid gap-2">
                {RESOURCES.map((r) => (
                  <div key={r.name} className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <div>
                      <code className="text-sm font-semibold">/v1/{r.name}</code>
                      <p className="text-xs text-muted-foreground">{r.description}</p>
                    </div>
                    <div className="flex gap-1">
                      {['GET', 'POST', 'PATCH', 'DELETE'].map((m) => (
                        <Badge key={m} variant="outline" className={`text-[10px] ${METHOD_COLORS[m]}`}>{m}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="operations" className="mt-4 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={METHOD_COLORS.GET}>GET</Badge>
                  <code className="text-sm">/v1/transactions</code>
                  <span className="text-xs text-muted-foreground">List all</span>
                </div>
                <CodeBlock code={`// List transactions with pagination
GET /v1/transactions?limit=25&offset=0&order=date.desc`} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={METHOD_COLORS.GET}>GET</Badge>
                  <code className="text-sm">/v1/transactions/&#123;id&#125;</code>
                  <span className="text-xs text-muted-foreground">Get single</span>
                </div>
                <CodeBlock code={`GET /v1/transactions/550e8400-e29b-41d4-a716-446655440000`} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={METHOD_COLORS.POST}>POST</Badge>
                  <code className="text-sm">/v1/transactions</code>
                  <span className="text-xs text-muted-foreground">Create</span>
                </div>
                <CodeBlock code={`POST /v1/transactions
Content-Type: application/json

{
  "date": "2026-03-09",
  "merchant": "Grocery Store",
  "amount": -52.30,
  "account_id": "...",
  "household_id": "...",
  "category_id": "..."
}`} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={METHOD_COLORS.PATCH}>PATCH</Badge>
                  <code className="text-sm">/v1/transactions/&#123;id&#125;</code>
                  <span className="text-xs text-muted-foreground">Update</span>
                </div>
                <CodeBlock code={`PATCH /v1/transactions/550e8400-...
Content-Type: application/json

{ "category_id": "new-category-id" }`} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={METHOD_COLORS.DELETE}>DELETE</Badge>
                  <code className="text-sm">/v1/transactions/&#123;id&#125;</code>
                  <span className="text-xs text-muted-foreground">Delete</span>
                </div>
                <CodeBlock code={`DELETE /v1/transactions/550e8400-...`} />
              </div>
            </TabsContent>

            <TabsContent value="filtering" className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Use PostgREST-style query parameters to filter results.
              </p>
              <CodeBlock code={`# Filter by exact value
GET /v1/transactions?account_id.eq=some-uuid

# Filter by date range
GET /v1/transactions?date.gte=2026-01-01&date.lte=2026-03-31

# Search merchants (case-insensitive)
GET /v1/transactions?merchant.ilike=%grocery%

# Select specific columns
GET /v1/transactions?select=id,date,merchant,amount

# Order and paginate
GET /v1/transactions?order=date.desc&limit=10&offset=20

# Combine filters
GET /v1/budgets?month.eq=2026-03-01&category_id.eq=some-uuid`} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Response Format */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5 text-primary" />
            Response Format
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-sm mb-2">Success</h3>
            <CodeBlock code={`{
  "data": [
    { "id": "...", "date": "2026-03-09", "merchant": "Grocery Store", "amount": -52.30 }
  ]
}`} language="json" />
          </div>
          <div>
            <h3 className="font-semibold text-sm mb-2">Error</h3>
            <CodeBlock code={`{
  "error": "Description of what went wrong"
}`} language="json" />
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong>Status codes:</strong></p>
            <p>200 — Success &nbsp;|&nbsp; 201 — Created &nbsp;|&nbsp; 400 — Bad request &nbsp;|&nbsp; 401 — Unauthorized &nbsp;|&nbsp; 404 — Not found &nbsp;|&nbsp; 405 — Method not allowed</p>
          </div>
        </CardContent>
      </Card>

      {/* Base URL */}
      <Card>
        <CardHeader>
          <CardTitle>Base URL</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock code={BASE_URL} />
        </CardContent>
      </Card>
    </div>
  );
}
