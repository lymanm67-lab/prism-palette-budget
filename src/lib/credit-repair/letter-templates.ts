/**
 * Credit-repair letter template library.
 * 18 templates across 4 categories with variable substitution.
 *
 * Variables use {{name}} syntax. Substitute with mergeTemplate(body, vars).
 */

export type LetterCategory = 'creditor' | 'bureau' | 'escalation' | 'specialty';

export interface LetterTemplate {
  id: string;
  name: string;
  category: LetterCategory;
  description: string;
  legalBasis: string;
  requiredFields: string[];       // variable names required in vars
  subject?: string;
  body: string;                   // template body with {{var}} placeholders
}

const HEADER = `{{fullName}}
{{streetAddress}}
{{cityStateZip}}
{{today}}

`;

export const LETTER_TEMPLATES: LetterTemplate[] = [
  // ─── CREDITOR-DIRECT ──────────────────────────────────────
  {
    id: 'goodwill-late-payment',
    name: 'Goodwill Letter — Late Payment',
    category: 'creditor',
    description: 'Ask a creditor to remove a late payment as a courtesy after you have caught up.',
    legalBasis: 'Voluntary (no legal claim). Effective when payment history is otherwise strong.',
    requiredFields: ['fullName', 'streetAddress', 'cityStateZip', 'creditorName', 'creditorAddress', 'accountLast4', 'lateDate', 'hardshipReason'],
    subject: 'Goodwill adjustment request — Account ending {{accountLast4}}',
    body: `${HEADER}{{creditorName}}
{{creditorAddress}}

Re: Account ending {{accountLast4}} — Goodwill adjustment request

To Whom It May Concern:

I have been a customer of {{creditorName}} and value the relationship we've built. I am writing to respectfully request a goodwill adjustment for the late payment reported on {{lateDate}}.

At the time, I experienced {{hardshipReason}}. Since then I have brought the account current and maintained an on-time payment history. My overall record with your company reflects my genuine commitment to meeting my obligations.

I am asking that you remove the late-payment notation from all three credit bureaus (Equifax, Experian, TransUnion) as a one-time courtesy. This adjustment would materially help my credit standing as I work toward {{goal}}.

Thank you for considering this request. I appreciate your time.

Sincerely,

{{fullName}}
`,
  },
  {
    id: 'goodwill-charge-off',
    name: 'Goodwill Letter — Charge-off (Paid)',
    category: 'creditor',
    description: 'Request removal of a paid charge-off after settlement.',
    legalBasis: 'Voluntary. Best sent after the account is paid or settled in full.',
    requiredFields: ['fullName', 'streetAddress', 'cityStateZip', 'creditorName', 'creditorAddress', 'accountLast4', 'paidDate'],
    subject: 'Goodwill removal — paid charge-off, account {{accountLast4}}',
    body: `${HEADER}{{creditorName}}
{{creditorAddress}}

Re: Paid charge-off — Account ending {{accountLast4}}

To Whom It May Concern:

I am writing regarding the above account, which was paid/settled in full on {{paidDate}}. I take full responsibility for the circumstances that led to that outcome.

Now that the balance has been resolved, I respectfully request that {{creditorName}} exercise its goodwill discretion and instruct all three credit bureaus to remove the charge-off notation from my credit reports. Retention of the tradeline serves no ongoing reporting purpose, and removal would help me rebuild my financial standing.

I would be grateful for any goodwill consideration you can extend. Thank you for your time.

Sincerely,

{{fullName}}
`,
  },
  {
    id: 'pay-for-delete',
    name: 'Pay-for-Delete Offer',
    category: 'creditor',
    description: 'Offer to pay a collection or charge-off in exchange for full deletion from credit reports.',
    legalBasis: 'Negotiated settlement. Get any agreement in WRITING before paying.',
    requiredFields: ['fullName', 'streetAddress', 'cityStateZip', 'creditorName', 'creditorAddress', 'accountLast4', 'originalBalance', 'offerAmount'],
    subject: 'Settlement offer with deletion — {{accountLast4}}',
    body: `${HEADER}{{creditorName}}
{{creditorAddress}}

Re: Account {{accountLast4}} — Settlement offer conditional on deletion

To Whom It May Concern:

I am writing to propose a settlement of the referenced account. Without admitting liability and to resolve this matter, I offer to pay \${{offerAmount}} in full satisfaction of the balance of \${{originalBalance}}.

This offer is conditional on the following:

1. {{creditorName}} accepts \${{offerAmount}} as payment in full.
2. Upon receipt of payment, {{creditorName}} will instruct Equifax, Experian, and TransUnion to DELETE (not merely update) the tradeline for this account within 30 days.
3. {{creditorName}} confirms this arrangement IN WRITING before I remit payment.
4. No portion of this letter shall be construed as an acknowledgement of debt or a waiver of any consumer rights.

If these terms are acceptable, please countersign and return a copy to the address above. Upon receipt of the signed agreement, I will remit the settlement funds via certified funds within 10 business days.

Sincerely,

{{fullName}}
`,
  },
  {
    id: 'debt-validation',
    name: 'Debt Validation Request',
    category: 'creditor',
    description: 'Force a debt collector to prove the debt is valid and that they have the right to collect it.',
    legalBasis: 'FDCPA §809(b) — 15 U.S.C. §1692g. Must be sent within 30 days of first contact.',
    requiredFields: ['fullName', 'streetAddress', 'cityStateZip', 'collectorName', 'collectorAddress', 'referenceNumber'],
    subject: 'Debt validation request — Ref {{referenceNumber}}',
    body: `${HEADER}{{collectorName}}
{{collectorAddress}}

Re: Reference {{referenceNumber}} — Debt validation demand under FDCPA §809(b)

To Whom It May Concern:

This letter is a formal notice disputing the alleged debt referenced above. Pursuant to the Fair Debt Collection Practices Act, 15 U.S.C. §1692g(b), I demand validation of this debt.

Specifically, provide the following within 30 days:

1. The name and address of the original creditor.
2. Verification of the amount owed with a full itemization of principal, interest, and fees.
3. Proof that {{collectorName}} owns the debt or is legally authorized to collect it (chain of assignment).
4. A copy of the original signed contract or credit agreement.
5. Documentation that {{collectorName}} is licensed to collect debts in my state.

Until this debt is validated, {{collectorName}} must cease all collection activity and MUST NOT report or continue to report this debt to any credit reporting agency. Continued reporting during a validation dispute is a per-se violation of FDCPA §807(8) and 15 U.S.C. §1692e.

Please treat this letter as my formal dispute for the purpose of the FCRA as well. All communications must be in writing.

Sincerely,

{{fullName}}
`,
  },
  {
    id: 'cease-and-desist',
    name: 'Cease-and-Desist (Collector Contact)',
    category: 'creditor',
    description: 'Order a debt collector to stop all contact except formal legal notices.',
    legalBasis: 'FDCPA §805(c) — 15 U.S.C. §1692c(c).',
    requiredFields: ['fullName', 'streetAddress', 'cityStateZip', 'collectorName', 'collectorAddress', 'referenceNumber'],
    subject: 'Cease-and-desist — Ref {{referenceNumber}}',
    body: `${HEADER}{{collectorName}}
{{collectorAddress}}

Re: Reference {{referenceNumber}}

Pursuant to the Fair Debt Collection Practices Act, 15 U.S.C. §1692c(c), I hereby demand that {{collectorName}} CEASE AND DESIST all further communication with me regarding this alleged debt. This includes phone calls, text messages, emails, and all other communication channels EXCEPT:

(a) formal legal notices required by law, or
(b) written notice that {{collectorName}} is terminating collection efforts.

Any further contact in violation of this notice will subject {{collectorName}} to statutory damages of up to \$1,000 per violation under 15 U.S.C. §1692k.

Sincerely,

{{fullName}}
`,
  },

  // ─── BUREAU DISPUTES / ESCALATION ────────────────────────
  {
    id: 'bureau-initial-dispute',
    name: 'Bureau Dispute — Initial (Round 1)',
    category: 'bureau',
    description: 'Standard FCRA §611 dispute to a credit bureau.',
    legalBasis: 'FCRA §611 — 15 U.S.C. §1681i.',
    requiredFields: ['fullName', 'streetAddress', 'cityStateZip', 'ssnLast4', 'dob', 'bureau', 'bureauAddress', 'creditorName', 'accountLast4', 'disputeReason'],
    subject: 'FCRA §611 dispute — account {{accountLast4}}',
    body: `${HEADER}{{bureau}}
{{bureauAddress}}

Re: Dispute of inaccurate information — SSN last 4: {{ssnLast4}}, DOB: {{dob}}

To Whom It May Concern:

I am writing to dispute inaccurate information appearing on my credit report as maintained by {{bureau}}. Under the Fair Credit Reporting Act, 15 U.S.C. §1681i, you are required to reinvestigate and delete or correct inaccurate information within 30 days.

Account in dispute:
- Creditor: {{creditorName}}
- Account ending: {{accountLast4}}

Reason for dispute:
{{disputeReason}}

Under FCRA §611(a), please:
1. Reinvestigate this item with the furnisher.
2. Provide me the results of your reinvestigation in writing.
3. If the information cannot be verified, delete it.

If the item remains, please provide the METHOD of verification used, the name/address/phone of the entity that verified it, and a description of the procedure followed, as required by FCRA §611(a)(7).

Sincerely,

{{fullName}}
`,
  },
  {
    id: 'mov-letter',
    name: 'Method of Verification (MOV) — Round 2',
    category: 'bureau',
    description: 'After a "verified" response, demand HOW the bureau verified. Most cannot produce this.',
    legalBasis: 'FCRA §611(a)(7) — 15 U.S.C. §1681i(a)(7).',
    requiredFields: ['fullName', 'streetAddress', 'cityStateZip', 'bureau', 'bureauAddress', 'creditorName', 'accountLast4', 'priorDisputeDate'],
    subject: 'Method of Verification demand — account {{accountLast4}}',
    body: `${HEADER}{{bureau}}
{{bureauAddress}}

Re: Method of Verification demand — account {{accountLast4}}
Prior dispute filed: {{priorDisputeDate}}

To Whom It May Concern:

On {{priorDisputeDate}} I disputed the {{creditorName}} account ending in {{accountLast4}}. You responded that the item was "verified." I am now exercising my right under FCRA §611(a)(7), 15 U.S.C. §1681i(a)(7), to demand the METHOD OF VERIFICATION.

Within 15 days, please provide:

1. A description of the procedure used to determine the accuracy and completeness of the disputed information.
2. The business name, address, and telephone number of the source of the verification.
3. The name of the individual employed by {{bureau}} who conducted the reinvestigation, along with copies of all documents used to verify the item.
4. Confirmation that a "reasonable" reinvestigation was performed, not merely a rubber-stamp reconfirmation from an e-OSCAR/ACDV auto-response.

If you cannot produce this documentation, the item must be DELETED per FCRA §611(a)(5). A parroted "verified" response absent underlying evidence is not a reasonable reinvestigation and constitutes a violation of the FCRA.

Sincerely,

{{fullName}}
`,
  },
  {
    id: 'reinvestigation-demand',
    name: 'Reinvestigation Demand — Frivolous Rejection',
    category: 'bureau',
    description: 'Response when a bureau rejects a dispute as "frivolous" or claims duplicate.',
    legalBasis: 'FCRA §611(a)(3) — 15 U.S.C. §1681i(a)(3).',
    requiredFields: ['fullName', 'streetAddress', 'cityStateZip', 'bureau', 'bureauAddress', 'creditorName', 'accountLast4'],
    subject: 'Improper "frivolous" designation — account {{accountLast4}}',
    body: `${HEADER}{{bureau}}
{{bureauAddress}}

To Whom It May Concern:

You have designated my dispute regarding {{creditorName}} account {{accountLast4}} as "frivolous" or "irrelevant." I formally object to this designation.

FCRA §611(a)(3) permits a "frivolous" designation ONLY when the dispute is substantially the same as one previously investigated AND the consumer has not provided new material information. My dispute contains material new information and represents a good-faith challenge to the accuracy of the reported data.

You must:
1. Reinvestigate the item as required by FCRA §611(a)(1).
2. Provide me the results in writing.
3. Delete the item if it cannot be verified.

Failure to reinvestigate is a willful violation subjecting {{bureau}} to statutory damages of \$100 to \$1,000 per occurrence under FCRA §616.

Sincerely,

{{fullName}}
`,
  },
  {
    id: 'estoppel-by-silence',
    name: 'Estoppel by Silence — 15-Day Follow-Up',
    category: 'bureau',
    description: 'Follow-up when bureau exceeds the 30-day investigation window.',
    legalBasis: 'FCRA §611(a)(1)(A) — automatic deletion required when investigation exceeds 30 days.',
    requiredFields: ['fullName', 'streetAddress', 'cityStateZip', 'bureau', 'bureauAddress', 'creditorName', 'accountLast4', 'priorDisputeDate'],
    subject: 'FCRA 30-day window exceeded — automatic deletion demand',
    body: `${HEADER}{{bureau}}
{{bureauAddress}}

To Whom It May Concern:

On {{priorDisputeDate}} I filed a dispute regarding {{creditorName}} account {{accountLast4}}. To date, more than 30 days have elapsed and I have received no response.

Under FCRA §611(a)(1)(A), 15 U.S.C. §1681i(a)(1)(A), the credit reporting agency must complete its reinvestigation within 30 days. Failure to do so requires the disputed item to be deleted.

I hereby demand IMMEDIATE deletion of the disputed item and a corrected credit report be mailed to the address above within 10 days. Continued reporting of unverified information is a willful FCRA violation.

Sincerely,

{{fullName}}
`,
  },

  // ─── FURNISHER / DIRECT ──────────────────────────────────
  {
    id: 'furnisher-direct-dispute',
    name: 'Direct Furnisher Dispute (§623)',
    category: 'creditor',
    description: 'Dispute inaccurate reporting directly with the data furnisher (creditor).',
    legalBasis: 'FCRA §623(b) — 15 U.S.C. §1681s-2(b).',
    requiredFields: ['fullName', 'streetAddress', 'cityStateZip', 'creditorName', 'creditorAddress', 'accountLast4', 'disputeReason'],
    subject: 'FCRA §623(b) direct dispute — account {{accountLast4}}',
    body: `${HEADER}{{creditorName}}
{{creditorAddress}}

Re: Direct dispute of furnisher reporting — Account {{accountLast4}}

To Whom It May Concern:

Pursuant to FCRA §623(b), 15 U.S.C. §1681s-2(b), and 12 C.F.R. §1022.43, I am submitting a direct dispute regarding your reporting on the referenced account.

Nature of the dispute:
{{disputeReason}}

You are required to:
1. Conduct a reasonable investigation of the disputed information.
2. Review all information provided by me.
3. Report the results to me AND to each nationwide consumer reporting agency to which you previously furnished the information.
4. Modify, delete, or block reporting if the information cannot be verified as accurate and complete.

This obligation must be completed within 30 days of receipt of this notice.

Sincerely,

{{fullName}}
`,
  },

  // ─── ESCALATION ──────────────────────────────────────────
  {
    id: 'cfpb-complaint',
    name: 'CFPB Complaint (Round 4)',
    category: 'escalation',
    description: 'Copy this to consumerfinance.gov/complaint. CFPB forwards to bureau within 15 days.',
    legalBasis: 'Dodd-Frank Act §1013(b)(3).',
    requiredFields: ['fullName', 'bureau', 'creditorName', 'accountLast4', 'disputeReason', 'priorDisputeDate'],
    subject: 'CFPB Complaint against {{bureau}}',
    body: `Consumer Financial Protection Bureau
Complaint against: {{bureau}}
Product: Credit reporting, credit repair services, or other personal consumer reports
Issue: Problem with a credit reporting company's investigation into an existing problem

My complaint:

On {{priorDisputeDate}}, I disputed inaccurate information reported by {{creditorName}} (account ending {{accountLast4}}) on my credit report. Despite following FCRA §611 procedures, {{bureau}} has failed to conduct a reasonable reinvestigation.

Nature of the inaccuracy:
{{disputeReason}}

{{bureau}} either (a) did not complete the reinvestigation within 30 days as required by FCRA §611(a)(1)(A); (b) rubber-stamped a "verified" response from the furnisher without conducting an independent reasonable investigation; or (c) failed to provide the method of verification as required by FCRA §611(a)(7).

Resolution requested:
- Immediate deletion of the disputed item.
- Written confirmation and an updated credit report.

Submitted by: {{fullName}}
`,
  },
  {
    id: 'state-ag-complaint',
    name: 'State Attorney General Complaint',
    category: 'escalation',
    description: 'Consumer protection complaint under state UDAP laws.',
    legalBasis: 'State Unfair and Deceptive Acts and Practices (UDAP) statutes.',
    requiredFields: ['fullName', 'streetAddress', 'cityStateZip', 'stateName', 'bureau', 'creditorName', 'accountLast4', 'disputeReason'],
    subject: 'Consumer complaint — {{bureau}} / {{creditorName}}',
    body: `${HEADER}Attorney General of {{stateName}}
Consumer Protection Division

Re: Complaint against {{bureau}} and {{creditorName}}

Dear Consumer Protection Division:

I am filing this complaint against {{bureau}} and {{creditorName}} for violations of the Fair Credit Reporting Act (15 U.S.C. §1681 et seq.) and {{stateName}}'s consumer protection statutes.

Facts:
- {{creditorName}} is reporting inaccurate information about my account ending {{accountLast4}}.
- Nature of the inaccuracy: {{disputeReason}}
- I have exhausted the FCRA dispute process (multiple rounds with the bureau and a direct §623 dispute with the furnisher).
- Both parties have failed to correct the record or produce evidence of verification.

Relief requested:
- Investigation of both parties for consumer protection violations.
- An enforcement action if warranted.
- Any remedies available under {{stateName}} law.

Thank you for your attention.

Sincerely,

{{fullName}}
`,
  },
  {
    id: 'bbb-complaint',
    name: 'BBB Complaint',
    category: 'escalation',
    description: 'Better Business Bureau complaint — public record often prompts creditor response.',
    legalBasis: 'Voluntary — leverages BBB dispute resolution.',
    requiredFields: ['fullName', 'creditorName', 'accountLast4', 'disputeReason'],
    subject: 'BBB Complaint — {{creditorName}}',
    body: `BBB Complaint

Business: {{creditorName}}
Complaint from: {{fullName}}
Account/Reference: {{accountLast4}}

Description:
{{disputeReason}}

I have attempted to resolve this directly with {{creditorName}} without success. I request that {{creditorName}} correct the inaccurate credit reporting for account {{accountLast4}} and provide written confirmation.

Desired resolution: Correction or deletion of the inaccurate credit report entry.
`,
  },
  {
    id: 'arbitration-notice',
    name: 'Arbitration Notice / Pre-Litigation Demand',
    category: 'escalation',
    description: 'Final escalation before filing suit. FCRA allows $1,000+ per willful violation.',
    legalBasis: 'FCRA §616 (willful) and §617 (negligent) — 15 U.S.C. §1681n, §1681o.',
    requiredFields: ['fullName', 'streetAddress', 'cityStateZip', 'bureau', 'bureauAddress', 'creditorName', 'accountLast4'],
    subject: 'Notice of intent to arbitrate / litigate — FCRA violations',
    body: `${HEADER}{{bureau}}
{{bureauAddress}}

Re: NOTICE OF INTENT TO ARBITRATE / LITIGATE — Account {{accountLast4}}

To Whom It May Concern:

This letter serves as formal notice of my intent to pursue arbitration and/or litigation for willful violations of the Fair Credit Reporting Act by {{bureau}} in connection with the {{creditorName}} tradeline ending {{accountLast4}}.

Documented violations include:
1. Failure to conduct a reasonable reinvestigation (FCRA §611).
2. Failure to provide method of verification (FCRA §611(a)(7)).
3. Continued reporting of information known or suspected to be inaccurate (FCRA §623).

Under FCRA §616, willful violations entitle a consumer to actual damages OR statutory damages of \$100 to \$1,000 per violation, plus costs and attorneys' fees. Multiple violations across multiple bureaus can quickly exceed \$10,000.

FINAL OPPORTUNITY: If the disputed item is not deleted within 15 days of the date of this letter, I will proceed with arbitration and/or file suit in the appropriate court without further notice.

Sincerely,

{{fullName}}
`,
  },

  // ─── SPECIALTY ───────────────────────────────────────────
  {
    id: 'hipaa-medical-debt',
    name: 'Medical Debt — HIPAA Dispute',
    category: 'specialty',
    description: 'Challenge medical collections. Collector cannot verify without violating HIPAA.',
    legalBasis: 'HIPAA Privacy Rule (45 CFR §164) + FDCPA §809.',
    requiredFields: ['fullName', 'streetAddress', 'cityStateZip', 'collectorName', 'collectorAddress', 'accountLast4'],
    subject: 'HIPAA / FDCPA dispute — medical account {{accountLast4}}',
    body: `${HEADER}{{collectorName}}
{{collectorAddress}}

Re: Account {{accountLast4}} — HIPAA and FDCPA dispute

To Whom It May Concern:

I dispute the validity and reporting of the above medical debt.

Under HIPAA and the FDCPA §809(b), please provide:

1. A signed HIPAA authorization from me permitting {{collectorName}} to receive my Protected Health Information (PHI).
2. An itemized statement showing exactly what services are being billed.
3. Proof of chain of assignment from the original provider to {{collectorName}}.
4. Documentation that any PHI shared with credit bureaus was legally permitted.

If {{collectorName}} cannot produce a valid HIPAA authorization AND validate the debt, you must (a) cease collection, (b) delete the tradeline from all three bureaus, and (c) not resell the account.

Sincerely,

{{fullName}}
`,
  },
  {
    id: 'identity-theft-block',
    name: 'Identity Theft Block Request',
    category: 'specialty',
    description: 'Block accounts opened fraudulently. Requires FTC IdentityTheft.gov affidavit.',
    legalBasis: 'FCRA §605B — 15 U.S.C. §1681c-2.',
    requiredFields: ['fullName', 'streetAddress', 'cityStateZip', 'bureau', 'bureauAddress', 'creditorName', 'accountLast4', 'ftcReportNumber'],
    subject: 'FCRA §605B block request — identity theft',
    body: `${HEADER}{{bureau}}
{{bureauAddress}}

Re: FCRA §605B block request — I am a victim of identity theft

To Whom It May Concern:

Pursuant to FCRA §605B, 15 U.S.C. §1681c-2, I request that {{bureau}} block the following account from my credit report:

- Creditor: {{creditorName}}
- Account ending: {{accountLast4}}

This account was opened without my authorization as a result of identity theft.

Enclosed:
1. FTC Identity Theft Report — reference {{ftcReportNumber}} (from IdentityTheft.gov)
2. Copy of my government-issued ID
3. Proof of my current address

{{bureau}} must block the account from appearing on my consumer report within 4 business days of receipt and notify the furnisher. Please provide written confirmation of the block.

Sincerely,

{{fullName}}
`,
  },
  {
    id: 'duplicate-account',
    name: 'Duplicate Account Dispute',
    category: 'specialty',
    description: 'Same account reported twice (e.g. original creditor AND collection).',
    legalBasis: 'FCRA §611 + Metro 2 accuracy standard.',
    requiredFields: ['fullName', 'streetAddress', 'cityStateZip', 'bureau', 'bureauAddress', 'creditorName', 'accountLast4', 'duplicateCreditor'],
    subject: 'Duplicate account dispute — {{accountLast4}}',
    body: `${HEADER}{{bureau}}
{{bureauAddress}}

To Whom It May Concern:

The same debt appears on my credit report as two separate tradelines:

1. {{creditorName}} — account {{accountLast4}}
2. {{duplicateCreditor}} — same account

Under Metro 2 reporting standards, when a debt is transferred or sold, the original tradeline must be updated to show a zero balance and "transferred/sold" status — it must NOT continue to reflect an active balance. Reporting both entries with active balances double-counts the debt and violates FCRA §611 accuracy requirements.

Please investigate and delete the duplicate reporting. If {{creditorName}} no longer owns the debt, its tradeline must be updated to zero balance immediately.

Sincerely,

{{fullName}}
`,
  },
  {
    id: 're-aging-violation',
    name: 'Re-aging Violation',
    category: 'specialty',
    description: 'A collector illegally reset the date-of-first-delinquency to keep the debt on your report longer.',
    legalBasis: 'FCRA §605(c) — 15 U.S.C. §1681c(c). Re-aging is prohibited.',
    requiredFields: ['fullName', 'streetAddress', 'cityStateZip', 'bureau', 'bureauAddress', 'creditorName', 'accountLast4', 'originalDelinquencyDate', 'reportedDelinquencyDate'],
    subject: 'Re-aging violation — account {{accountLast4}}',
    body: `${HEADER}{{bureau}}
{{bureauAddress}}

To Whom It May Concern:

The tradeline reported by {{creditorName}} for account {{accountLast4}} shows a date of first delinquency of {{reportedDelinquencyDate}}. The correct date of first delinquency is {{originalDelinquencyDate}}.

This appears to be an unlawful re-aging of the debt, in violation of FCRA §605(c), 15 U.S.C. §1681c(c). The 7-year reporting period runs from the ORIGINAL delinquency date and cannot be extended by transfer, sale, or account update.

Please:
1. Correct the date of first delinquency to {{originalDelinquencyDate}}, or
2. Delete the tradeline entirely if the 7-year period has elapsed.

Sincerely,

{{fullName}}
`,
  },
  {
    id: 'inquiry-dispute',
    name: 'Unauthorized Hard Inquiry Dispute',
    category: 'specialty',
    description: 'Dispute a hard inquiry made without your permission.',
    legalBasis: 'FCRA §604 — 15 U.S.C. §1681b (permissible purpose).',
    requiredFields: ['fullName', 'streetAddress', 'cityStateZip', 'ssnLast4', 'dob', 'bureau', 'bureauAddress', 'inquirerName', 'inquiryDate'],
    subject: 'Unauthorized inquiry dispute — {{inquirerName}}',
    body: `${HEADER}{{bureau}}
{{bureauAddress}}

Re: Unauthorized inquiry — {{inquirerName}} on {{inquiryDate}}
SSN last 4: {{ssnLast4}}, DOB: {{dob}}

To Whom It May Concern:

The following hard inquiry appears on my credit report and was made WITHOUT a permissible purpose under FCRA §604, 15 U.S.C. §1681b:

- Inquirer: {{inquirerName}}
- Date: {{inquiryDate}}

I did not apply for credit, initiate a transaction, or otherwise authorize {{inquirerName}} to access my consumer report. Any access without a permissible purpose is a violation of FCRA §604 and subjects the inquirer to civil liability under §616.

Please:
1. Investigate this inquiry with {{inquirerName}}.
2. If {{inquirerName}} cannot produce written authorization or documented permissible purpose, delete the inquiry.

Sincerely,

{{fullName}}
`,
  },
];

/** Merge {{var}} placeholders with values. Missing values become "[VARIABLE MISSING]". */
export function mergeTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_m, key) => {
    const v = vars[key];
    return v && v.trim() ? v : `[${key.toUpperCase()} MISSING]`;
  });
}

export function extractVariables(body: string): string[] {
  const set = new Set<string>();
  const re = /\{\{(\w+)\}\}/g;
  let m;
  while ((m = re.exec(body)) !== null) set.add(m[1]);
  return Array.from(set);
}

export const LETTER_CATEGORIES: { id: LetterCategory; label: string; description: string }[] = [
  { id: 'bureau', label: 'Bureau', description: 'FCRA §611 disputes to Equifax, Experian, TransUnion' },
  { id: 'creditor', label: 'Creditor / Collector', description: 'Goodwill, Pay-for-Delete, §623 furnisher disputes, validation, cease' },
  { id: 'escalation', label: 'Escalation', description: 'CFPB, State AG, BBB, arbitration' },
  { id: 'specialty', label: 'Specialty', description: 'Medical (HIPAA), identity theft, duplicates, re-aging, inquiries' },
];
