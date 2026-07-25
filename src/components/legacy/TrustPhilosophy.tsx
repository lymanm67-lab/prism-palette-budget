import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, ScrollText, AlertTriangle } from 'lucide-react';

const ROLES = [
  { label: 'Acting Trustee', value: 'Dr. Lyman A. Montgomery' },
  { label: 'Successor Trustee at Death', value: 'Kateri L. Hargrove-Montgomery' },
  { label: 'Trust Protector', value: 'DeMeka Jackson' },
];

const VALUES = [
  {
    value: 'Financial discipline over consumption',
    meaning:
      'Resources should be managed carefully, with an emphasis on saving, investing, planning, and avoiding unnecessary consumption.',
  },
  {
    value: 'Education, growth, and service over excess',
    meaning:
      'Trust resources should encourage learning, responsible development, useful contribution, and service to others.',
  },
  {
    value: 'Stability over speculation',
    meaning:
      'The Trust should favor prudent, sustainable strategies over speculation, leverage, and avoidable risk.',
  },
  {
    value: 'Faith-driven generosity over impulse giving',
    meaning:
      'Giving should be thoughtful, faith-centered, documented, and aligned with enduring charitable purposes.',
  },
];

const PRINCIPAL = [
  'The Trust should generate sustainable income while preserving principal for future generations.',
  'Trust assets should be managed with patience, diversification, liquidity, and long-term discipline.',
  'Administrative expenses, taxes, liabilities, and prudent reserves should be considered before distributions are made.',
  'The Trustee should avoid decisions that sacrifice long-term continuity for short-term comfort.',
  'The governing distribution provisions and valid amendments control the calculation and timing of distributions.',
];

const TRUSTEE_EXPECTATIONS = [
  'Follow the signed Trust Agreement and valid amendments before policies, summaries, or family preferences.',
  'Protect Trust assets and maintain appropriate separation from personal and business assets.',
  'Use reliable financial, legal, tax, insurance, valuation, and investment advice when needed.',
  'Document material decisions, distributions, reserves, conflicts, and professional recommendations.',
  'Communicate clearly without promising a distribution or outcome that is not authorized.',
  'Prepare successor fiduciaries through organized records, current contacts, and accurate administration files.',
];

const RELATED_DOCS = [
  'The signed Trust Agreement and valid amendments are the controlling legal authority.',
  'The Annual Net Profit Distribution and Principal Preservation Policy governs the administrative distribution process to the extent consistent with the governing documents.',
  'Our Family Constitution provides nonbinding family values and stewardship guidance.',
  'A Letter to My Family provides personal and faith-based legacy guidance.',
  'The Reinforcement Fund Beneficiary Explainer provides a plain-language explanation and does not create a right to distributions.',
  'The Charitable Intentions and Successor Charities policy provides administrative guidance for charitable giving and recipient verification.',
];

const PROTECTOR_AUTHORITY = [
  'Interpret ambiguous provisions consistent with Trust intent',
  'Amend administrative provisions to comply with changes in law',
  'Modify situs or governing law to preserve Trust validity',
  'Resolve trustee disputes or deadlock',
  'Remove and replace a trustee for cause',
  'Ensure the Trust remains aligned with its dynasty purpose',
];

const PROTECTOR_LIMITS = [
  'Alter beneficial interests',
  'Increase distributions beyond Trust limits',
  'Convert income-only distributions into principal distributions',
];

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-base font-semibold text-foreground">
        {n}. {title}
      </h3>
      <div className="text-sm text-muted-foreground space-y-2">{children}</div>
    </section>
  );
}

export function TrustPhilosophy() {
  return (
    <div className="space-y-4 print:space-y-3">
      <Card className="print:border-0 print:shadow-none">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-prism-amber" />
              Trust Philosophy and Intent Statement
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Lyman Montgomery Family Trust · Trust Date: September 13, 2024
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
            <Printer className="h-4 w-4 mr-1.5" /> Print
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-2 sm:grid-cols-3">
            {ROLES.map((r) => (
              <div key={r.label} className="rounded-md border border-border/50 bg-muted/30 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{r.label}</p>
                <p className="text-sm font-medium text-foreground mt-0.5">{r.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-md border border-prism-amber/40 bg-prism-amber/10 p-3">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Guidance statement, not a trust amendment
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              This statement explains the purpose, values, and long-term intent of the Trust. It does not amend the
              signed Trust Agreement, create a beneficiary right, increase a distribution, or override the legal duties
              and authority stated in the governing Trust documents.
            </p>
          </div>

          <div className="rounded-md border border-border/50 bg-muted/20 p-3 text-xs text-muted-foreground">
            <b className="text-foreground">Binder filing location:</b> Tab 5, Taxes, Digital Assets, and Legacy · Place
            after the Reinforcement Fund Beneficiary Explainer · Place before Our Family Constitution.
          </div>

          <Section n="1" title="Foundational Declaration">
            <p className="text-foreground font-medium">This Trust exists to preserve legacy, not merely wealth.</p>
            <p>
              The purpose of this Trust is to steward resources across generations in a way that reflects faith,
              responsibility, service, and long-term wisdom. The Trust is designed to generate sustainable income while
              preserving principal so that future generations benefit without dependency or entitlement.
            </p>
          </Section>

          <Section n="2" title="Core Trust Values">
            <div className="grid gap-2 sm:grid-cols-2">
              {VALUES.map((v) => (
                <div key={v.value} className="rounded-md border border-border/50 p-3">
                  <p className="text-sm font-medium text-foreground">{v.value}</p>
                  <p className="text-xs mt-1">{v.meaning}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section n="3" title="Purpose of Distributions">
            <p>
              Distributions are intended to support lives of purpose, not comfort without contribution. Distributions
              should reinforce responsibility, growth, education, stability, service, and meaningful contribution. They
              should not be interpreted as an automatic entitlement or as permission to consume Trust resources without
              regard for future generations.
            </p>
          </Section>

          <Section n="4" title="Principal Preservation and Sustainable Income">
            <ol className="list-decimal pl-5 space-y-1">
              {PRINCIPAL.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ol>
          </Section>

          <Section n="5" title="Charitable Stewardship">
            <p>
              Charitable giving is not an afterthought. It is a permanent expression of gratitude, stewardship, and
              responsibility to the community and to God. Charitable decisions should reflect gratitude, faith,
              accountability, community responsibility, and careful stewardship. Annual giving and final charitable
              distributions must follow the governing Trust documents and the Charitable Intentions and Successor
              Charities policy.
            </p>
          </Section>

          <Section n="6" title="Expectations of Trustees">
            <p>
              Trustees are expected to act with prudence, humility, transparency, and courage, honoring both the letter
              and the spirit of this Trust.
            </p>
            <ol className="list-decimal pl-5 space-y-1">
              {TRUSTEE_EXPECTATIONS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
          </Section>

          <Section n="7" title="Continuity and Generational Impact">
            <p>
              This Trust is meant to outlive trends, markets, and individual circumstances. Its mission is continuity,
              clarity, and generational impact. Every Trustee and beneficiary should understand that the Trust is
              intended to serve more than one person, one market cycle, or one generation. Its success should be
              measured by preserved opportunity, responsible stewardship, family stability, charitable impact, and the
              strength of the legacy transferred to future generations.
            </p>
          </Section>

          <Section n="8" title="Relationship to Other Trust Documents">
            <ol className="list-decimal pl-5 space-y-1">
              {RELATED_DOCS.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ol>
          </Section>
        </CardContent>
      </Card>

      <Card className="print:border-0 print:shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Policy Adoption and Review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            This Trust Philosophy and Intent Statement is adopted as a nonbinding administrative and legacy guidance
            document. It should be reviewed with the Trust Agreement, amendments, current fiduciary authority summary,
            and related policies.
          </p>
          <dl className="grid gap-2 sm:grid-cols-2">
            {[
              ['Adopted by', 'Dr. Lyman A. Montgomery'],
              ['Role', 'Settlor and Acting Trustee'],
              ['Redesign date', 'July 25, 2026'],
              ['Next scheduled review', 'July 23, 2027'],
              ['Notarization', 'Not required unless counsel directs otherwise'],
              ['Attorney review', 'Optional for this statement; required for any amendment or fiduciary appointment'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-md border border-border/50 p-2.5">
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</dt>
                <dd className="text-sm text-foreground mt-0.5">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="pt-4 text-sm text-foreground">
            <p>Settlor and Acting Trustee Signature: ______________________________________</p>
            <p className="mt-2">Date Signed: ____________________________</p>
          </div>
        </CardContent>
      </Card>

      <Card className="print:border-0 print:shadow-none">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Appendix A — Trust Protector Appointment (Source)
            <Badge variant="outline" className="text-[10px]">Verify before execution</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs">
            The source included a separate Trust Protector Appointment Letter using the name "Lyman Montgomery 2024
            Trust" and a 2025 signature line. The wording below has been formatted but is not treated as an executed
            appointment. The legal trust name, amendment or appointment authority, appointee name, date, signature
            requirements, and notarization requirements must be reconciled with the signed Trust Agreement before
            signing.
          </div>
          <p>
            I, Lyman Montgomery, as Settlor of the Lyman Montgomery 2024 Trust, hereby appoint a Trust Protector to
            safeguard the long-term intent, adaptability, and integrity of this Trust.
          </p>
          <div>
            <p className="font-medium text-foreground">Authority of Trust Protector</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              {PROTECTOR_AUTHORITY.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground">Limitations — the Trust Protector may not:</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              {PROTECTOR_LIMITS.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground">Fiduciary Standard</p>
            <p className="mt-1">
              The Trust Protector shall act in a fiduciary capacity and in good faith, with loyalty to the Trust purpose
              and beneficiaries as a whole. This appointment ensures continuity, protection, and flexibility for future
              generations.
            </p>
          </div>
          <p className="text-xs">Source signature language: Signed this ___ day of ________, 2025 | Lyman Montgomery, Settlor</p>
        </CardContent>
      </Card>
    </div>
  );
}
