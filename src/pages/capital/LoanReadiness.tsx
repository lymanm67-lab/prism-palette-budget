import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { CheckCircle2, FileText, Upload } from "lucide-react";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PageOverview from "@/components/PageOverview";

const REQUIRED_DOCUMENTS = [
  { key: "bank_statements_3mo", label: "Business Bank Statements (3 months)", category: "Financial" },
  { key: "bank_statements_12mo", label: "Business Bank Statements (12 months)", category: "Financial" },
  { key: "profit_loss", label: "Profit & Loss Statement (YTD + Prior Year)", category: "Financial" },
  { key: "balance_sheet", label: "Balance Sheet (Current)", category: "Financial" },
  { key: "tax_returns_business", label: "Business Tax Returns (2 years)", category: "Tax" },
  { key: "tax_returns_personal", label: "Personal Tax Returns (2 years)", category: "Tax" },
  { key: "ar_aging", label: "Accounts Receivable Aging Report", category: "Operations" },
  { key: "ap_aging", label: "Accounts Payable Aging Report", category: "Operations" },
  { key: "owner_credit", label: "Owner Personal Credit Summary", category: "Credit" },
  { key: "business_credit", label: "Business Credit Report", category: "Credit" },
  { key: "business_plan", label: "Business Plan / Use of Funds Narrative", category: "Strategy" },
  { key: "entity_docs", label: "Articles of Organization / Incorporation", category: "Legal" },
  { key: "ein_letter", label: "EIN Confirmation Letter", category: "Legal" },
  { key: "business_license", label: "Business License(s)", category: "Legal" },
  { key: "insurance", label: "Business Insurance Certificate", category: "Legal" },
  { key: "lease_agreement", label: "Lease Agreement / Property Documents", category: "Legal" },
  { key: "debt_schedule", label: "Debt Schedule (All Outstanding Loans)", category: "Financial" },
  { key: "collateral_list", label: "Collateral List / Asset Register", category: "Financial" },
];

const LoanReadiness = () => {
  const { householdId } = useHousehold();
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["loan-readiness", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data } = await supabase
        .from("loan_readiness_items")
        .select("*")
        .eq("household_id", householdId);
      return data || [];
    },
    enabled: !!householdId,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ docKey, docLabel, checked }: { docKey: string; docLabel: string; checked: boolean }) => {
      if (!householdId) throw new Error("No household");
      const existing = items?.find(i => i.document_key === docKey);

      if (existing) {
        const { error } = await supabase
          .from("loan_readiness_items")
          .update({ is_uploaded: checked, uploaded_at: checked ? new Date().toISOString() : null })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("loan_readiness_items")
          .insert({
            household_id: householdId,
            document_key: docKey,
            document_label: docLabel,
            is_uploaded: checked,
            uploaded_at: checked ? new Date().toISOString() : null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loan-readiness", householdId] });
    },
    onError: () => toast.error("Failed to update checklist"),
  });

  const completedCount = REQUIRED_DOCUMENTS.filter(doc =>
    items?.some(i => i.document_key === doc.key && i.is_uploaded)
  ).length;
  const readinessScore = Math.round((completedCount / REQUIRED_DOCUMENTS.length) * 100);

  const categories = [...new Set(REQUIRED_DOCUMENTS.map(d => d.category))];

  return (
    <div className="space-y-6 pb-8">
      <PageOverview
        title="Loan Readiness Checklist"
        description="Track the documents lenders typically request when evaluating loan applications. A complete package accelerates the underwriting process."
      />

      {/* Score */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-muted-foreground">Readiness Score</p>
              <p className="text-3xl font-bold">{readinessScore}%</p>
            </div>
            <Badge variant={readinessScore >= 80 ? "default" : "secondary"}>
              {completedCount} / {REQUIRED_DOCUMENTS.length} documents
            </Badge>
          </div>
          <Progress value={readinessScore} className="h-3" />
        </CardContent>
      </Card>

      {/* Checklist by category */}
      {categories.map((category) => {
        const docs = REQUIRED_DOCUMENTS.filter(d => d.category === category);
        const catCompleted = docs.filter(doc =>
          items?.some(i => i.document_key === doc.key && i.is_uploaded)
        ).length;

        return (
          <Card key={category}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  {category}
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {catCompleted}/{docs.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {docs.map((doc) => {
                const isChecked = items?.some(i => i.document_key === doc.key && i.is_uploaded) || false;
                return (
                  <label
                    key={doc.key}
                    className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ docKey: doc.key, docLabel: doc.label, checked: !!checked })
                      }
                    />
                    <span className={`text-sm flex-1 ${isChecked ? "line-through text-muted-foreground" : ""}`}>
                      {doc.label}
                    </span>
                    {isChecked && <CheckCircle2 className="h-4 w-4 text-prism-teal shrink-0" />}
                  </label>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="py-4">
          <p className="text-xs text-muted-foreground">
            <strong>Compliance Notice:</strong> This platform provides financial education and operational intelligence tools.
            It does not provide lending services or guarantee credit approvals.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoanReadiness;
