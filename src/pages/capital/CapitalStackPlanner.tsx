import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ArrowRight, Building2, CreditCard, Wrench, DollarSign, FileText, Landmark, Layers } from "lucide-react";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageOverview from "@/components/PageOverview";

const STAGES = [
  {
    key: "vendor_credit",
    label: "Vendor Credit",
    icon: Building2,
    description: "Net-30/60 accounts with vendors that report to business credit bureaus",
    requirements: ["EIN obtained", "D-U-N-S number registered", "Business bank account open"],
    typicalTimeline: "0-3 months",
    color: "text-prism-teal",
  },
  {
    key: "business_credit_cards",
    label: "Business Credit Cards",
    icon: CreditCard,
    description: "Secured and unsecured business credit cards to build revolving credit history",
    requirements: ["3+ vendor tradelines reporting", "Personal credit 650+", "6+ months in business"],
    typicalTimeline: "3-6 months",
    color: "text-prism-sky",
  },
  {
    key: "equipment_financing",
    label: "Equipment Financing",
    icon: Wrench,
    description: "Lease or finance business equipment with the asset serving as collateral",
    requirements: ["Business credit established", "Revenue documentation", "12+ months in business"],
    typicalTimeline: "6-12 months",
    color: "text-prism-amber",
  },
  {
    key: "working_capital",
    label: "Working Capital Lines",
    icon: DollarSign,
    description: "Revolving lines of credit for operational expenses and cash flow management",
    requirements: ["Strong business credit scores", "Stable revenue 12+ months", "Positive cash flow"],
    typicalTimeline: "12-18 months",
    color: "text-prism-lime",
  },
  {
    key: "receivable_financing",
    label: "Receivable Financing",
    icon: FileText,
    description: "Factor or finance accounts receivable (ideal for Medicaid reimbursement cycles)",
    requirements: ["Consistent receivables", "Government contract documentation", "Clean aging report"],
    typicalTimeline: "6-18 months",
    color: "text-prism-orange",
  },
  {
    key: "sba_loans",
    label: "SBA Loans",
    icon: Landmark,
    description: "Government-backed loans with favorable terms for qualified small businesses",
    requirements: ["2+ years in business", "Strong personal & business credit", "Detailed business plan", "Collateral available"],
    typicalTimeline: "18-24+ months",
    color: "text-prism-indigo",
  },
];

const CapitalStackPlanner = () => {
  const { household } = useHousehold();
  const householdId = household?.id;

  const { data: creditSteps } = useQuery({
    queryKey: ["business-credit-steps", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data } = await supabase
        .from("business_credit_steps")
        .select("*")
        .eq("household_id", householdId);
      return data || [];
    },
    enabled: !!householdId,
  });

  const { data: creditAccounts } = useQuery({
    queryKey: ["credit-accounts-stack", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data } = await supabase
        .from("credit_accounts")
        .select("*")
        .eq("household_id", householdId);
      return data || [];
    },
    enabled: !!householdId,
  });

  // Simple readiness calculation per stage
  const getStageReadiness = (stageKey: string): number => {
    const completedSteps = creditSteps?.filter(s => s.is_completed).length || 0;
    const totalSteps = 6;
    const accountCount = creditAccounts?.length || 0;
    
    switch (stageKey) {
      case "vendor_credit":
        return Math.min(100, (completedSteps / 3) * 100);
      case "business_credit_cards":
        return Math.min(100, ((completedSteps / totalSteps) * 50) + (accountCount > 2 ? 50 : accountCount * 15));
      case "equipment_financing":
        return Math.min(100, ((completedSteps / totalSteps) * 40) + (accountCount > 4 ? 60 : accountCount * 12));
      case "working_capital":
        return Math.min(100, ((completedSteps / totalSteps) * 30) + (accountCount > 6 ? 70 : accountCount * 10));
      case "receivable_financing":
        return Math.min(100, ((completedSteps / totalSteps) * 25) + (accountCount > 5 ? 75 : accountCount * 12));
      case "sba_loans":
        return Math.min(100, ((completedSteps / totalSteps) * 20) + (accountCount > 8 ? 80 : accountCount * 8));
      default:
        return 0;
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <PageOverview
        title="Capital Stack Planner"
        description="A visual roadmap showing the sequence of funding sources your business can access as credit and financial history strengthen over time."
        icon={Layers}
        ttsScript="The Capital Stack Planner shows the typical sequence of funding sources businesses can access as they build credit."
        features={["Visual funding roadmap", "Readiness tracking per stage", "Requirements checklist"]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Funding Roadmap</CardTitle>
          <p className="text-sm text-muted-foreground">
            Progress through each stage to unlock increasingly powerful financing options.
          </p>
        </CardHeader>
        <CardContent className="space-y-0">
          {STAGES.map((stage, idx) => {
            const readiness = Math.round(getStageReadiness(stage.key));
            const isReady = readiness >= 75;
            const Icon = stage.icon;

            return (
              <div key={stage.key}>
                <div className="flex gap-4 py-5">
                  {/* Timeline line */}
                  <div className="flex flex-col items-center">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                      isReady ? 'border-prism-teal bg-prism-teal/10' : 'border-muted-foreground/30 bg-muted/50'
                    }`}>
                      {isReady ? (
                        <CheckCircle2 className="h-5 w-5 text-prism-teal" />
                      ) : (
                        <Icon className={`h-5 w-5 ${stage.color}`} />
                      )}
                    </div>
                    {idx < STAGES.length - 1 && (
                      <div className={`w-0.5 flex-1 mt-2 ${isReady ? 'bg-prism-teal/40' : 'bg-border'}`} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{stage.label}</h3>
                        <p className="text-sm text-muted-foreground">{stage.description}</p>
                      </div>
                      <Badge variant={isReady ? "default" : "outline"} className="shrink-0">
                        {stage.typicalTimeline}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3">
                      <Progress value={readiness} className="flex-1 h-2" />
                      <span className="text-sm font-medium w-10 text-right">{readiness}%</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {stage.requirements.map((req) => (
                        <Badge key={req} variant="secondary" className="text-xs font-normal">
                          {req}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {idx < STAGES.length - 1 && <div className="ml-5 border-b border-border/50" />}
              </div>
            );
          })}
        </CardContent>
      </Card>

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

export default CapitalStackPlanner;
