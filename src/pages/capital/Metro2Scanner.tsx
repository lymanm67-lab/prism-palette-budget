import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSearch, AlertTriangle, CheckCircle2, Info, Scan, Shield, ChevronDown, ChevronRight, CheckCheck, FileText, Gavel } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import PageOverview from '@/components/PageOverview';
import { useMetro2Findings } from '@/hooks/use-metro2-findings';
import { useCreditAccounts } from '@/hooks/use-credit-accounts';
import { useDisputes, type DisputeInsert } from '@/hooks/use-disputes';
import { useHousehold } from '@/contexts/HouseholdContext';
import { format } from 'date-fns';
import { toast } from 'sonner';

const severityConfig: Record<string, { color: string; icon: typeof AlertTriangle; label: string; badgeVariant: 'destructive' | 'secondary' | 'outline' }> = {
  high: { color: 'text-destructive', icon: AlertTriangle, label: 'High', badgeVariant: 'destructive' },
  medium: { color: 'text-amber-500', icon: Info, label: 'Medium', badgeVariant: 'secondary' },
  low: { color: 'text-muted-foreground', icon: Info, label: 'Low', badgeVariant: 'outline' },
};

const Metro2Scanner = () => {
  const navigate = useNavigate();
  const { household } = useHousehold();
  const householdId = household?.id;
  const { findings, high, medium, low, scanning, runScan, toggleResolved, isLoading } = useMetro2Findings();
  const { accounts } = useCreditAccounts();
  const { createDisputeAsync, isCreating } = useDisputes();
  const [showResolved, setShowResolved] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [creatingDisputeFor, setCreatingDisputeFor] = useState<string | null>(null);
  const [bulkCreating, setBulkCreating] = useState(false);

  const toggle = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const displayed = showResolved ? findings : findings.filter(f => !f.is_resolved);
  const resolvedCount = findings.filter(f => f.is_resolved).length;
  const compliantCount = accounts.length - new Set(findings.filter(f => !f.is_resolved).map(f => f.credit_account_id)).size;

  const criticalHighFindings = findings.filter(f => (f.severity === 'high') && !f.is_resolved);

  const getAccountName = (id: string) => {
    const acct = accounts.find(a => a.id === id);
    return acct ? `${acct.account_name} (${acct.bureau})` : 'Unknown Account';
  };

  const buildDisputePayload = (finding: typeof findings[0]): DisputeInsert | null => {
    if (!householdId) return null;
    const acct = accounts.find(a => a.id === finding.credit_account_id);
    return {
      household_id: householdId,
      bureau: acct?.bureau || 'Equifax',
      dispute_reason: finding.title,
      explanation: `${finding.explanation}\n\nMetro2 Principle: ${finding.metro2_principle || 'N/A'}\nRecommended: ${finding.recommended_action || 'N/A'}`,
      credit_account_id: finding.credit_account_id,
      metro2_violation: finding.violation_type,
      status: 'draft',
    };
  };

  const handleCreateDispute = async (finding: typeof findings[0]) => {
    const payload = buildDisputePayload(finding);
    if (!payload) return;
    setCreatingDisputeFor(finding.id);
    try {
      await createDisputeAsync(payload);
      toast.success('Draft dispute created');
      navigate('/capital/disputes');
    } catch {
      // error handled by hook
    } finally {
      setCreatingDisputeFor(null);
    }
  };

  const handleBulkDispute = async () => {
    if (!householdId) return;
    setBulkCreating(true);
    try {
      let created = 0;
      for (const finding of criticalHighFindings) {
        const payload = buildDisputePayload(finding);
        if (payload) {
          await createDisputeAsync(payload);
          created++;
        }
      }
      toast.success(`${created} draft dispute${created !== 1 ? 's' : ''} created`);
      navigate('/capital/disputes');
    } catch {
      // error handled by hook
    } finally {
      setBulkCreating(false);
    }
  };

  const lastScanDate = findings.length > 0
    ? format(new Date(findings[0].created_at), 'MMM d, yyyy h:mm a')
    : null;

  return (
    <div className="space-y-6 pb-8">
      <PageOverview
        title="Metro2 Risk Scanner"
        description="AI-powered compliance analysis against Metro2 reporting standards"
        icon={FileSearch}
        ttsScript="Welcome to the Metro2 Risk Scanner. This tool uses AI to analyze your credit accounts against the Metro2 data reporting format — the industry standard used by creditors to report to bureaus. It checks for ten types of violations including incorrect delinquency dates, conflicting status codes, duplicate reporting across bureaus, and stale negative items that should have aged off. Each finding is classified as high, medium, or low severity with a specific recommended action. Scenario: Imagine a collection account shows a date of first delinquency that is two years newer than it should be. This violation is illegally resetting the 7-year reporting clock. The scanner flags it as high severity and recommends disputing with the bureau citing FCRA Section 605."
        features={['Scan for 10+ Metro2 violation types', 'High, medium, and low severity classification', 'One-click dispute creation from findings', 'Track resolved vs unresolved violations']}
      />

      {/* Action Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button onClick={runScan} disabled={scanning || accounts.length === 0} className="gap-2">
            <Scan className="h-4 w-4" />
            {scanning ? 'Scanning…' : 'Run Metro2 Scan'}
          </Button>
          {lastScanDate && (
            <span className="text-xs text-muted-foreground">Last scan: {lastScanDate}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {criticalHighFindings.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDispute}
              disabled={bulkCreating}
              className="gap-2"
            >
              <Gavel className="h-4 w-4" />
              {bulkCreating ? 'Creating…' : `Dispute All High Issues (${criticalHighFindings.length})`}
            </Button>
          )}
          {resolvedCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setShowResolved(!showResolved)}>
              {showResolved ? 'Hide' : 'Show'} {resolvedCount} resolved
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div>
              <p className="text-2xl font-bold">{high}</p>
              <p className="text-xs text-muted-foreground">High Severity</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Info className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{medium}</p>
              <p className="text-xs text-muted-foreground">Medium Severity</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Info className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{low}</p>
              <p className="text-xs text-muted-foreground">Low Severity</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold">{Math.max(0, compliantCount)}</p>
              <p className="text-xs text-muted-foreground">Accounts Compliant</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Findings List */}
      {accounts.length === 0 ? (
        <Card className="p-12 text-center">
          <FileSearch className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold text-lg mb-2">No Accounts to Scan</h3>
          <p className="text-sm text-muted-foreground">
            Import credit report data in the Credit Overview module first
          </p>
        </Card>
      ) : displayed.length === 0 && !scanning ? (
        <Card className="p-12 text-center">
          <Shield className="h-12 w-12 mx-auto text-emerald-500/40 mb-4" />
          <h3 className="font-semibold text-lg mb-2">
            {findings.length === 0 ? 'No Scan Results' : 'All Issues Resolved'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {findings.length === 0
              ? 'Click "Run Metro2 Scan" to analyze your credit accounts'
              : 'Great work! All identified issues have been marked as resolved.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayed.map(finding => {
            const config = severityConfig[finding.severity] || severityConfig.low;
            const Icon = config.icon;
            const isOpen = expandedIds.has(finding.id);

            return (
              <Collapsible key={finding.id} open={isOpen} onOpenChange={() => toggle(finding.id)}>
                <Card className={finding.is_resolved ? 'opacity-60' : ''}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer py-3 px-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                        <Icon className={`h-5 w-5 shrink-0 ${config.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={config.badgeVariant} className="text-[10px]">{config.label}</Badge>
                            <span className="font-medium text-sm truncate">{finding.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{getAccountName(finding.credit_account_id)}</p>
                        </div>
                        {finding.is_resolved && <CheckCheck className="h-4 w-4 text-emerald-500 shrink-0" />}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 px-4 pb-4 space-y-3 ml-12">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Explanation</p>
                        <p className="text-sm">{finding.explanation}</p>
                      </div>
                      {finding.metro2_principle && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Metro2 Principle Violated</p>
                          <p className="text-sm font-mono bg-muted/50 rounded px-2 py-1">{finding.metro2_principle}</p>
                        </div>
                      )}
                      {finding.recommended_action && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Recommended Action</p>
                          <p className="text-sm">{finding.recommended_action}</p>
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        {!finding.is_resolved && (
                          <Button
                            size="sm"
                            onClick={() => handleCreateDispute(finding)}
                            disabled={creatingDisputeFor === finding.id}
                            className="gap-1.5"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            {creatingDisputeFor === finding.id ? 'Creating…' : 'Create Dispute'}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleResolved(finding.id, !finding.is_resolved)}
                        >
                          {finding.is_resolved ? 'Mark Unresolved' : 'Mark Resolved'}
                        </Button>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        This analysis is for educational purposes. It does not constitute credit repair services or guarantee removal of credit report items.
      </p>
    </div>
  );
};

export default Metro2Scanner;
