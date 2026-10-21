# Akron Dreams Online Application & Guide

## Result
Add **Akron Dreams Application & Guide** under **Home-Buying Readiness → Loans & Assistance**. Complete the application online and download or print the completed nine-page PDF.

## Preserve the attached document
- Use the uploaded **Application_Package.pdf** itself as the template, not a redesigned copy.
- Preserve all nine pages, original logos, wording, tables, spacing, page numbers and page order—including the two-page Application Guide, Required Document Checklist and Homebuyer Selection Plan.
- Keep the source’s existing dates, income table and wording unchanged; do not claim these are independently verified current program rules.

## Online completion
- Display original pages with precisely aligned fillable fields. Provide page navigation, zoom, and an accessible field-entry view for narrow screens.
- Cover applicant/co-applicant details, employment, other income, liabilities, assets, seven creditor rows for each applicant, seven household-member rows, property address, signature dates and checklist “Included” boxes.
- Keep **Office Use Only** areas and the checklist’s verification column unchanged and read-only.
- Offer drawn signatures or leave signature lines blank for signing after printing. Explain that acceptance of electronic signatures is determined by the program; do not automatically sign or imply submission.
- Start blank; do not infer personal information or copy financial figures into declarations without review.

## PDF and privacy
- **Download Completed PDF:** completed answers and signatures appear on the original pages, ready to print.
- **Download Fillable PDF:** retain editable PDF fields for continued completion in a compatible PDF reader.
- **Original Application & Guide:** allow downloading the unchanged blank package.
- Process answers in the browser only. Do not send SSNs, financial answers or signatures to AI, analytics or the database, and do not persist them automatically in browser storage. Show a clear warning that leaving/reloading clears unsaved answers; downloading saves a copy to the user’s device.
- No automatic emailing, program submission, uploaded supporting documents or application-status tracking in this scope.

## Technical approach
- Add a third subtab to `LoansAndAssistance.tsx`; reuse the existing protected `/home-buying` page and app controls.
- Store the blank original PDF through the project asset flow.
- Use existing PDF.js to render source pages and add `pdf-lib` for fillable fields and flattened export.
- Keep one coordinate-based field definition shared by the online controls and both PDF exports so placement remains consistent.
- Document the original-template export and browser-only privacy rules in `AGENTS.md`.

## Verification
- Check every source page and refine scanned-page field coordinates visually; the original has no fillable fields.
- Test field coverage, office-only exclusions, PDF field/answer round trips, checklist values and preserved nine-page dimensions/order.
- Walk through the signed-in Home-Buying flow with fictitious input, including both applicants, creditor and household tables, checklist and signature handling.
- Export filled examples, render all nine pages outside the browser and inspect for missing fields, clipping, overlap and changed source content.
- Check desktop and narrow-screen entry, keyboard navigation and current preview errors.

## Completion boundary
The finished result is an online completion tool and original-layout PDF exports—not a submission to EANDC or a guarantee of eligibility or electronic-signature acceptance.