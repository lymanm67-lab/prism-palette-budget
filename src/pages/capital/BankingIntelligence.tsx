import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Building2, ExternalLink, DollarSign, MapPin, Users } from "lucide-react";
import PageOverview from "@/components/PageOverview";

// Static curated list of banks known for small business/commercial lending
const BANK_DATABASE = [
  { name: "JPMorgan Chase", state: "NY", totalAssets: "$3.9T", branches: 4700, sbaLending: "Top 10 SBA Lender", commercialFocus: "High", website: "https://www.chase.com/business" },
  { name: "Bank of America", state: "NC", totalAssets: "$3.1T", branches: 3900, sbaLending: "Top 10 SBA Lender", commercialFocus: "High", website: "https://www.bankofamerica.com/smallbusiness/" },
  { name: "Wells Fargo", state: "CA", totalAssets: "$1.9T", branches: 4500, sbaLending: "Top 15 SBA Lender", commercialFocus: "High", website: "https://www.wellsfargo.com/biz/" },
  { name: "U.S. Bank", state: "MN", totalAssets: "$675B", branches: 2200, sbaLending: "Top 10 SBA Lender", commercialFocus: "High", website: "https://www.usbank.com/business.html" },
  { name: "PNC Financial", state: "PA", totalAssets: "$560B", branches: 2600, sbaLending: "Top 20 SBA Lender", commercialFocus: "High", website: "https://www.pnc.com/en/small-business.html" },
  { name: "Truist Financial", state: "NC", totalAssets: "$535B", branches: 2000, sbaLending: "Top 25 SBA Lender", commercialFocus: "Medium", website: "https://www.truist.com/small-business" },
  { name: "TD Bank", state: "NJ", totalAssets: "$400B", branches: 1100, sbaLending: "Top 15 SBA Lender", commercialFocus: "High", website: "https://www.td.com/us/en/small-business/" },
  { name: "Citizens Financial", state: "RI", totalAssets: "$220B", branches: 1100, sbaLending: "Top 30 SBA Lender", commercialFocus: "Medium", website: "https://www.citizensbank.com/business/" },
  { name: "Huntington Bancshares", state: "OH", totalAssets: "$190B", branches: 1000, sbaLending: "#1 SBA 7(a) Lender", commercialFocus: "Very High", website: "https://www.huntington.com/smallbusiness" },
  { name: "M&T Bank", state: "NY", totalAssets: "$200B", branches: 700, sbaLending: "Top 20 SBA Lender", commercialFocus: "High", website: "https://www.mtb.com/business" },
  { name: "Regions Financial", state: "AL", totalAssets: "$155B", branches: 1300, sbaLending: "Top 30 SBA Lender", commercialFocus: "Medium", website: "https://www.regions.com/small-business" },
  { name: "KeyBank", state: "OH", totalAssets: "$190B", branches: 950, sbaLending: "Top 25 SBA Lender", commercialFocus: "High", website: "https://www.key.com/small-business/" },
  { name: "Live Oak Bank", state: "NC", totalAssets: "$10B", branches: 1, sbaLending: "Top 5 SBA Lender", commercialFocus: "Very High", website: "https://www.liveoakbank.com/" },
  { name: "Celtic Bank", state: "UT", totalAssets: "$2B", branches: 1, sbaLending: "Top 10 SBA Lender", commercialFocus: "Very High", website: "https://www.celticbank.com/" },
  { name: "Newtek Small Business Finance", state: "FL", totalAssets: "$1B", branches: 1, sbaLending: "Top 15 SBA Lender", commercialFocus: "Very High", website: "https://www.newtekone.com/" },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

const BankingIntelligence = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [focusFilter, setFocusFilter] = useState<string>("all");

  const filtered = BANK_DATABASE.filter((bank) => {
    const matchesSearch = bank.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesState = stateFilter === "all" || bank.state === stateFilter;
    const matchesFocus = focusFilter === "all" || bank.commercialFocus === focusFilter;
    return matchesSearch && matchesState && matchesFocus;
  });

  return (
    <div className="space-y-6 pb-8">
      <PageOverview
        title="Banking Intelligence"
        description="Research banks by location, asset size, and commercial lending activity. Identify the best banking partners for your business financing needs."
        icon={Building2}
        ttsScript="Banking Intelligence helps you research banks by location, asset size, and commercial lending activity."
        features={["Bank search and filtering", "SBA lending rankings", "Commercial focus ratings"]}
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search banks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {US_STATES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={focusFilter} onValueChange={setFocusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Commercial Focus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Focus Levels</SelectItem>
                <SelectItem value="Very High">Very High</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((bank) => (
          <Card key={bank.name} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{bank.name}</CardTitle>
                <Badge variant={bank.commercialFocus === "Very High" ? "default" : "secondary"} className="text-xs shrink-0">
                  {bank.commercialFocus}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{bank.state}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span>{bank.totalAssets}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span>{bank.branches.toLocaleString()} branches</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="truncate">{bank.sbaLending}</span>
                </div>
              </div>
              <a
                href={bank.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Visit Business Banking
              </a>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No banks match your search criteria. Try adjusting filters.
          </CardContent>
        </Card>
      )}

      {/* External resources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Research Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "iBanknet", url: "https://www.ibanknet.com/", desc: "Bank financial data & research" },
              { name: "FDIC BankFind", url: "https://www.fdic.gov/bankfind", desc: "Official FDIC bank search" },
              { name: "SBA Lender Match", url: "https://www.sba.gov/funding-programs/loans/lender-match", desc: "Find SBA-approved lenders" },
              { name: "CDFI Fund", url: "https://www.cdfifund.gov/", desc: "Community development lenders" },
              { name: "Bankrate", url: "https://www.bankrate.com/banking/", desc: "Bank comparisons & rates" },
              { name: "NerdWallet Business", url: "https://www.nerdwallet.com/best/small-business/small-business-loans", desc: "Loan comparison tools" },
            ].map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border p-3 hover:bg-accent/50 transition-colors"
              >
                <ExternalLink className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-sm">{link.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{link.desc}</p>
                </div>
              </a>
            ))}
          </div>
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

export default BankingIntelligence;
