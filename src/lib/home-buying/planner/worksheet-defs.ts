// Config-driven definitions for all 18 special worksheets.
// Each renders via <GenericWorksheet /> which stores state in hp_worksheets.data (jsonb).

export type FieldType = 'text' | 'number' | 'currency' | 'percent' | 'date' | 'checkbox' | 'textarea' | 'select';

export interface WorksheetField {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  help?: string;
}

export interface WorksheetSection {
  title: string;
  fields?: WorksheetField[];
  checklist?: { key: string; label: string }[];
  rows?: { key: string; label: string; fields: WorksheetField[] }[];
}

export interface WorksheetDef {
  type: string;
  title: string;
  description: string;
  sections: WorksheetSection[];
}

export const WORKSHEETS: WorksheetDef[] = [
  {
    type: 'mortgage_approval_checklist',
    title: 'Mortgage Approval Checklist',
    description: 'Everything a lender needs to say yes.',
    sections: [
      { title: 'Identity & Employment', checklist: [
        { key: 'id_verified', label: 'Government-issued photo ID on file' },
        { key: 'ssn_verified', label: 'Social Security number verified' },
        { key: 'employment_2y', label: '2 years of continuous employment history' },
        { key: 'employer_letter', label: 'Employer verification letter obtained' },
      ]},
      { title: 'Income', checklist: [
        { key: 'paystubs_60d', label: 'Last 60 days of pay stubs' },
        { key: 'w2_2y', label: 'Last 2 years of W-2s' },
        { key: 'tax_returns_2y', label: 'Last 2 years of federal tax returns' },
        { key: 'ytd_income', label: 'YTD income documented' },
      ]},
      { title: 'Assets', checklist: [
        { key: 'bank_2mo', label: '2 months of bank statements (all accounts)' },
        { key: 'investment_stmt', label: 'Investment account statements' },
        { key: 'retirement_stmt', label: 'Retirement account statements' },
        { key: 'gift_letter', label: 'Gift letter (if using gift funds)' },
      ]},
      { title: 'Credit & Debt', checklist: [
        { key: 'credit_pulled', label: 'Tri-merge credit report pulled' },
        { key: 'utilization_lt30', label: 'All revolving balances under 30% util' },
        { key: 'collections_resolved', label: 'All collections resolved / paid' },
        { key: 'dti_calculated', label: 'Front-end and back-end DTI calculated' },
      ]},
    ],
  },
  {
    type: 'mortgage_underwriting_checklist',
    title: 'Mortgage Underwriting Checklist',
    description: 'What underwriting looks for during conditional approval.',
    sections: [
      { title: 'Capacity', checklist: [
        { key: 'income_stable', label: 'Stable, documented income' },
        { key: 'dti_under_43', label: 'Back-end DTI under 43%' },
        { key: 'ability_to_repay', label: 'ATR (Ability-to-Repay) rule met' },
      ]},
      { title: 'Credit', checklist: [
        { key: 'min_score_met', label: 'Minimum credit score for loan type met' },
        { key: 'no_recent_delinq', label: 'No 30+ day late in last 12 months' },
        { key: 'no_open_disputes', label: 'No open credit disputes' },
      ]},
      { title: 'Collateral', checklist: [
        { key: 'appraisal_ordered', label: 'Appraisal ordered' },
        { key: 'appraisal_meets_value', label: 'Appraisal at or above contract price' },
        { key: 'title_clear', label: 'Title search clear' },
        { key: 'insurance_bound', label: 'Homeowners insurance bound at closing' },
      ]},
      { title: 'Capital', checklist: [
        { key: 'down_verified', label: 'Down payment funds sourced and seasoned (60 days)' },
        { key: 'reserves_documented', label: 'Post-closing reserves documented (2-6 months)' },
        { key: 'closing_costs_ready', label: 'Closing cost funds available' },
      ]},
    ],
  },
  {
    type: 'credit_improvement_tracker',
    title: 'Credit Improvement Tracker',
    description: 'Track score movement across all three bureaus month by month.',
    sections: [
      { title: 'Current Baseline', fields: [
        { key: 'experian_start', label: 'Experian starting score', type: 'number' },
        { key: 'equifax_start', label: 'Equifax starting score', type: 'number' },
        { key: 'transunion_start', label: 'TransUnion starting score', type: 'number' },
      ]},
      { title: 'Current Snapshot', fields: [
        { key: 'experian_now', label: 'Experian today', type: 'number' },
        { key: 'equifax_now', label: 'Equifax today', type: 'number' },
        { key: 'transunion_now', label: 'TransUnion today', type: 'number' },
        { key: 'utilization', label: 'Overall utilization %', type: 'percent' },
      ]},
      { title: 'Actions Taken', checklist: [
        { key: 'paid_below_30', label: 'Paid all revolving below 30% util' },
        { key: 'paid_below_10', label: 'Paid all revolving below 10% util' },
        { key: 'disputed_errors', label: 'Disputed all inaccurate items' },
        { key: 'requested_cli', label: 'Requested credit limit increases (soft pull)' },
        { key: 'no_new_credit', label: 'No new credit lines opened' },
      ]},
    ],
  },
  {
    type: 'debt_settlement_tracker',
    title: 'Debt Settlement Tracker',
    description: 'Track every debt from settled → paid → letter of satisfaction on file.',
    sections: [
      { title: 'Settlements', rows: [
        { key: 'debt1', label: 'Debt 1', fields: [
          { key: 'creditor', label: 'Creditor', type: 'text' },
          { key: 'original', label: 'Original balance', type: 'currency' },
          { key: 'settled_for', label: 'Settled for', type: 'currency' },
          { key: 'paid_date', label: 'Paid date', type: 'date' },
          { key: 'letter_received', label: 'Paid-in-full letter received', type: 'checkbox' },
          { key: 'shows_zero', label: 'Report shows $0 balance', type: 'checkbox' },
        ]},
        { key: 'debt2', label: 'Debt 2', fields: [
          { key: 'creditor', label: 'Creditor', type: 'text' },
          { key: 'original', label: 'Original balance', type: 'currency' },
          { key: 'settled_for', label: 'Settled for', type: 'currency' },
          { key: 'paid_date', label: 'Paid date', type: 'date' },
          { key: 'letter_received', label: 'Paid-in-full letter received', type: 'checkbox' },
          { key: 'shows_zero', label: 'Report shows $0 balance', type: 'checkbox' },
        ]},
        { key: 'debt3', label: 'Debt 3', fields: [
          { key: 'creditor', label: 'Creditor', type: 'text' },
          { key: 'original', label: 'Original balance', type: 'currency' },
          { key: 'settled_for', label: 'Settled for', type: 'currency' },
          { key: 'paid_date', label: 'Paid date', type: 'date' },
          { key: 'letter_received', label: 'Paid-in-full letter received', type: 'checkbox' },
          { key: 'shows_zero', label: 'Report shows $0 balance', type: 'checkbox' },
        ]},
      ]},
    ],
  },
  {
    type: 'savings_tracker',
    title: 'Savings Tracker',
    description: 'Track total savings toward your home purchase.',
    sections: [
      { title: 'Targets', fields: [
        { key: 'target_down', label: 'Down payment target', type: 'currency' },
        { key: 'target_closing', label: 'Closing costs target', type: 'currency' },
        { key: 'target_reserves', label: 'Reserves target (6 months expenses)', type: 'currency' },
        { key: 'target_moving', label: 'Moving budget target', type: 'currency' },
      ]},
      { title: 'Current', fields: [
        { key: 'current_down', label: 'Saved for down payment', type: 'currency' },
        { key: 'current_closing', label: 'Saved for closing costs', type: 'currency' },
        { key: 'current_reserves', label: 'Emergency fund balance', type: 'currency' },
        { key: 'monthly_contribution', label: 'Monthly auto-transfer amount', type: 'currency' },
      ]},
    ],
  },
  {
    type: 'down_payment_tracker',
    title: 'Down Payment Tracker',
    description: 'Sources of down payment funds, seasoning status, and gap-to-goal.',
    sections: [
      { title: 'Sources', rows: [
        { key: 's1', label: 'Source 1', fields: [
          { key: 'source', label: 'Source (savings / gift / 401k loan / sale)', type: 'text' },
          { key: 'amount', label: 'Amount', type: 'currency' },
          { key: 'seasoned', label: 'Seasoned 60+ days', type: 'checkbox' },
          { key: 'documented', label: 'Documented for lender', type: 'checkbox' },
        ]},
        { key: 's2', label: 'Source 2', fields: [
          { key: 'source', label: 'Source', type: 'text' },
          { key: 'amount', label: 'Amount', type: 'currency' },
          { key: 'seasoned', label: 'Seasoned 60+ days', type: 'checkbox' },
          { key: 'documented', label: 'Documented for lender', type: 'checkbox' },
        ]},
        { key: 's3', label: 'Source 3', fields: [
          { key: 'source', label: 'Source', type: 'text' },
          { key: 'amount', label: 'Amount', type: 'currency' },
          { key: 'seasoned', label: 'Seasoned 60+ days', type: 'checkbox' },
          { key: 'documented', label: 'Documented for lender', type: 'checkbox' },
        ]},
      ]},
    ],
  },
  {
    type: 'closing_cost_tracker',
    title: 'Closing Cost Tracker',
    description: 'Line-item estimate of every closing cost.',
    sections: [
      { title: 'Loan Costs', fields: [
        { key: 'origination', label: 'Origination fee', type: 'currency' },
        { key: 'discount_points', label: 'Discount points', type: 'currency' },
        { key: 'appraisal', label: 'Appraisal fee', type: 'currency' },
        { key: 'credit_report', label: 'Credit report fee', type: 'currency' },
      ]},
      { title: 'Title & Government', fields: [
        { key: 'title_insurance', label: 'Title insurance', type: 'currency' },
        { key: 'title_search', label: 'Title search / settlement', type: 'currency' },
        { key: 'recording', label: 'Recording fees', type: 'currency' },
        { key: 'transfer_tax', label: 'Transfer tax / stamps', type: 'currency' },
      ]},
      { title: 'Prepaids', fields: [
        { key: 'homeowners_ins', label: 'Homeowners insurance (1 yr)', type: 'currency' },
        { key: 'property_tax', label: 'Property tax reserves', type: 'currency' },
        { key: 'prepaid_interest', label: 'Prepaid interest', type: 'currency' },
        { key: 'hoa_prorated', label: 'HOA prorated', type: 'currency' },
      ]},
    ],
  },
  {
    type: 'moving_budget',
    title: 'Moving Budget',
    description: "Don't blow your reserves on the move.",
    sections: [
      { title: 'Movers & Trucks', fields: [
        { key: 'movers', label: 'Professional movers', type: 'currency' },
        { key: 'truck_rental', label: 'Truck rental', type: 'currency' },
        { key: 'packing_supplies', label: 'Boxes / packing supplies', type: 'currency' },
        { key: 'tips', label: 'Tips', type: 'currency' },
      ]},
      { title: 'Utilities & Setup', fields: [
        { key: 'utility_deposits', label: 'Utility deposits', type: 'currency' },
        { key: 'internet_install', label: 'Internet install', type: 'currency' },
        { key: 'appliances', label: 'Appliances', type: 'currency' },
        { key: 'furniture', label: 'Essential furniture', type: 'currency' },
      ]},
      { title: 'Immediate Home Needs', fields: [
        { key: 'cleaning', label: 'Deep cleaning supplies', type: 'currency' },
        { key: 'window_treatments', label: 'Window treatments', type: 'currency' },
        { key: 'safety', label: 'Locks / smoke detectors / safety', type: 'currency' },
        { key: 'other', label: 'Other', type: 'currency' },
      ]},
    ],
  },
  {
    type: 'utility_transfer_checklist',
    title: 'Utility Transfer Checklist',
    description: 'Schedule every service turn-on for closing day.',
    sections: [
      { title: 'Essential Services', checklist: [
        { key: 'electric', label: 'Electric — scheduled for closing day' },
        { key: 'gas', label: 'Gas — scheduled for closing day' },
        { key: 'water_sewer', label: 'Water & sewer — scheduled' },
        { key: 'trash', label: 'Trash / recycling — scheduled' },
      ]},
      { title: 'Communications', checklist: [
        { key: 'internet', label: 'Internet — scheduled install' },
        { key: 'phone', label: 'Phone / mobile — address updated' },
        { key: 'cable', label: 'Cable / streaming — transferred' },
      ]},
      { title: 'Address Changes', checklist: [
        { key: 'usps', label: 'USPS mail forwarding filed' },
        { key: 'dmv', label: 'DMV / driver license updated' },
        { key: 'voter', label: 'Voter registration updated' },
        { key: 'bank', label: 'Bank / credit cards updated' },
        { key: 'insurance', label: 'Auto insurance updated' },
        { key: 'employer', label: 'Employer / payroll updated' },
      ]},
    ],
  },
  {
    type: 'home_inspection_worksheet',
    title: 'Home Inspection Worksheet',
    description: 'What to check yourself before and during the inspector\'s visit.',
    sections: [
      { title: 'Exterior', checklist: [
        { key: 'roof_age', label: 'Roof age and condition documented' },
        { key: 'siding', label: 'Siding — no rot, gaps, damage' },
        { key: 'foundation', label: 'Foundation — no major cracks' },
        { key: 'grading', label: 'Grading slopes away from house' },
        { key: 'gutters', label: 'Gutters intact and draining' },
      ]},
      { title: 'Systems', checklist: [
        { key: 'hvac_age', label: 'HVAC age noted' },
        { key: 'water_heater', label: 'Water heater age noted' },
        { key: 'electrical', label: 'Electrical panel adequate (200A)' },
        { key: 'plumbing', label: 'No visible leaks; no galvanized/lead' },
      ]},
      { title: 'Interior', checklist: [
        { key: 'windows', label: 'Windows open, close, seal' },
        { key: 'floors', label: 'Floors level; no soft spots' },
        { key: 'walls_ceilings', label: 'No water stains on ceilings' },
        { key: 'basement', label: 'Basement dry; no mold' },
        { key: 'attic', label: 'Attic insulated and ventilated' },
      ]},
      { title: 'Findings', fields: [
        { key: 'major_issues', label: 'Major issues found', type: 'textarea' },
        { key: 'estimated_repair_cost', label: 'Estimated repair cost', type: 'currency' },
        { key: 'ask_credit', label: 'Ask seller for credit / repair', type: 'checkbox' },
      ]},
    ],
  },
  {
    type: 'property_comparison_worksheet',
    title: 'Property Comparison Worksheet',
    description: 'Score up to 3 homes side by side against your criteria.',
    sections: [
      { title: 'Properties', rows: [
        { key: 'p1', label: 'Property 1', fields: [
          { key: 'address', label: 'Address', type: 'text' },
          { key: 'price', label: 'List price', type: 'currency' },
          { key: 'beds', label: 'Beds', type: 'number' },
          { key: 'baths', label: 'Baths', type: 'number' },
          { key: 'sqft', label: 'Sq ft', type: 'number' },
          { key: 'hoa', label: 'HOA / mo', type: 'currency' },
          { key: 'tax', label: 'Annual tax', type: 'currency' },
          { key: 'insurance', label: 'Insurance est / yr', type: 'currency' },
          { key: 'score', label: 'Your score (1-10)', type: 'number' },
        ]},
        { key: 'p2', label: 'Property 2', fields: [
          { key: 'address', label: 'Address', type: 'text' },
          { key: 'price', label: 'List price', type: 'currency' },
          { key: 'beds', label: 'Beds', type: 'number' },
          { key: 'baths', label: 'Baths', type: 'number' },
          { key: 'sqft', label: 'Sq ft', type: 'number' },
          { key: 'hoa', label: 'HOA / mo', type: 'currency' },
          { key: 'tax', label: 'Annual tax', type: 'currency' },
          { key: 'insurance', label: 'Insurance est / yr', type: 'currency' },
          { key: 'score', label: 'Your score (1-10)', type: 'number' },
        ]},
        { key: 'p3', label: 'Property 3', fields: [
          { key: 'address', label: 'Address', type: 'text' },
          { key: 'price', label: 'List price', type: 'currency' },
          { key: 'beds', label: 'Beds', type: 'number' },
          { key: 'baths', label: 'Baths', type: 'number' },
          { key: 'sqft', label: 'Sq ft', type: 'number' },
          { key: 'hoa', label: 'HOA / mo', type: 'currency' },
          { key: 'tax', label: 'Annual tax', type: 'currency' },
          { key: 'insurance', label: 'Insurance est / yr', type: 'currency' },
          { key: 'score', label: 'Your score (1-10)', type: 'number' },
        ]},
      ]},
    ],
  },
  {
    type: 'offer_evaluation_worksheet',
    title: 'Offer Evaluation Worksheet',
    description: 'Test every offer against your rules before you sign.',
    sections: [
      { title: 'Deal Terms', fields: [
        { key: 'offer_price', label: 'Offer price', type: 'currency' },
        { key: 'down_pct', label: 'Down payment %', type: 'percent' },
        { key: 'rate_est', label: 'Estimated rate %', type: 'percent' },
        { key: 'total_piti', label: 'Total PITI at these terms', type: 'currency' },
        { key: 'hoa', label: 'HOA / mo', type: 'currency' },
      ]},
      { title: 'Contingencies', checklist: [
        { key: 'inspection_contingency', label: 'Inspection contingency included' },
        { key: 'appraisal_contingency', label: 'Appraisal contingency included' },
        { key: 'financing_contingency', label: 'Financing contingency included' },
        { key: 'earnest_money', label: 'Earnest money reasonable (1-3%)' },
      ]},
      { title: 'Rule Check', checklist: [
        { key: 'within_payment_rule', label: 'PITI within monthly payment rule' },
        { key: 'within_hoa_rule', label: 'HOA within HOA rule' },
        { key: 'emergency_fund_intact', label: 'Emergency fund still 6 months after close' },
        { key: 'retirement_intact', label: 'Retirement contributions unchanged' },
      ]},
    ],
  },
  {
    type: 'loan_estimate_comparison',
    title: 'Loan Estimate Comparison',
    description: 'Compare Loan Estimates from up to 3 lenders. Look beyond the rate.',
    sections: [
      { title: 'Lenders', rows: [
        { key: 'l1', label: 'Lender 1', fields: [
          { key: 'name', label: 'Lender name', type: 'text' },
          { key: 'rate', label: 'Rate %', type: 'percent' },
          { key: 'apr', label: 'APR %', type: 'percent' },
          { key: 'points', label: 'Points ($)', type: 'currency' },
          { key: 'origination', label: 'Origination fee', type: 'currency' },
          { key: 'total_closing', label: 'Total closing costs', type: 'currency' },
          { key: 'monthly_pi', label: 'Monthly P&I', type: 'currency' },
        ]},
        { key: 'l2', label: 'Lender 2', fields: [
          { key: 'name', label: 'Lender name', type: 'text' },
          { key: 'rate', label: 'Rate %', type: 'percent' },
          { key: 'apr', label: 'APR %', type: 'percent' },
          { key: 'points', label: 'Points ($)', type: 'currency' },
          { key: 'origination', label: 'Origination fee', type: 'currency' },
          { key: 'total_closing', label: 'Total closing costs', type: 'currency' },
          { key: 'monthly_pi', label: 'Monthly P&I', type: 'currency' },
        ]},
        { key: 'l3', label: 'Lender 3', fields: [
          { key: 'name', label: 'Lender name', type: 'text' },
          { key: 'rate', label: 'Rate %', type: 'percent' },
          { key: 'apr', label: 'APR %', type: 'percent' },
          { key: 'points', label: 'Points ($)', type: 'currency' },
          { key: 'origination', label: 'Origination fee', type: 'currency' },
          { key: 'total_closing', label: 'Total closing costs', type: 'currency' },
          { key: 'monthly_pi', label: 'Monthly P&I', type: 'currency' },
        ]},
      ]},
    ],
  },
  {
    type: 'closing_disclosure_review',
    title: 'Closing Disclosure Review',
    description: 'Every CD number should match the most recent Loan Estimate ± tolerance.',
    sections: [
      { title: 'Match Check', checklist: [
        { key: 'loan_amount_match', label: 'Loan amount matches LE' },
        { key: 'rate_match', label: 'Rate matches lock' },
        { key: 'monthly_pi_match', label: 'Monthly P&I matches LE' },
        { key: 'closing_costs_match', label: 'Total closing costs within 10% of LE' },
        { key: 'cash_to_close_match', label: 'Cash to close matches expected wire amount' },
      ]},
      { title: 'Escrow Verify', checklist: [
        { key: 'tax_reserves_correct', label: 'Property tax reserves reasonable' },
        { key: 'ins_reserves_correct', label: 'Insurance reserves reasonable' },
        { key: 'no_surprise_fees', label: 'No new fees vs LE' },
      ]},
      { title: 'Discrepancies', fields: [
        { key: 'issues_found', label: 'Issues to raise with lender', type: 'textarea' },
      ]},
    ],
  },
  {
    type: 'first_year_homeowner_budget',
    title: 'First-Year Homeowner Budget',
    description: 'What you\'ll actually spend in year one — beyond the mortgage payment.',
    sections: [
      { title: 'Recurring Monthly', fields: [
        { key: 'piti', label: 'PITI', type: 'currency' },
        { key: 'utilities', label: 'Utilities est', type: 'currency' },
        { key: 'internet', label: 'Internet / TV', type: 'currency' },
        { key: 'hoa', label: 'HOA', type: 'currency' },
        { key: 'lawn_care', label: 'Lawn / snow', type: 'currency' },
      ]},
      { title: 'Annual One-Timers', fields: [
        { key: 'furniture', label: 'Furniture / decor', type: 'currency' },
        { key: 'appliances', label: 'Appliances / upgrades', type: 'currency' },
        { key: 'window_treatments', label: 'Window treatments', type: 'currency' },
        { key: 'yard_setup', label: 'Yard / tools', type: 'currency' },
      ]},
      { title: 'Maintenance Fund', fields: [
        { key: 'maint_pct', label: 'Set aside % of home value / yr (1-3% typical)', type: 'percent' },
        { key: 'maint_monthly', label: 'Monthly maintenance auto-transfer', type: 'currency' },
      ]},
    ],
  },
  {
    type: 'maintenance_planner',
    title: 'Maintenance Planner',
    description: 'Schedule seasonal home upkeep so nothing sneaks up on you.',
    sections: [
      { title: 'Spring', checklist: [
        { key: 'hvac_service', label: 'HVAC service' },
        { key: 'gutters', label: 'Clean gutters' },
        { key: 'exterior_wash', label: 'Wash exterior' },
        { key: 'yard_prep', label: 'Yard fertilization' },
      ]},
      { title: 'Summer', checklist: [
        { key: 'deck_seal', label: 'Deck seal / stain' },
        { key: 'ac_filter', label: 'AC filter replacement' },
        { key: 'attic_check', label: 'Attic ventilation check' },
      ]},
      { title: 'Fall', checklist: [
        { key: 'furnace_service', label: 'Furnace service' },
        { key: 'gutters_fall', label: 'Clean gutters (leaves)' },
        { key: 'weather_stripping', label: 'Check weather stripping' },
        { key: 'winterize_hose', label: 'Winterize outdoor faucets' },
      ]},
      { title: 'Winter', checklist: [
        { key: 'smoke_detectors', label: 'Test smoke / CO detectors' },
        { key: 'fireplace', label: 'Fireplace / chimney sweep' },
        { key: 'pipe_insulation', label: 'Insulate exposed pipes' },
      ]},
    ],
  },
  {
    type: 'warranty_tracker',
    title: 'Warranty Tracker',
    description: 'Log every appliance, system, and home warranty so you\'re never paying for something covered.',
    sections: [
      { title: 'Items', rows: [
        { key: 'w1', label: 'Item 1', fields: [
          { key: 'item', label: 'Item', type: 'text' },
          { key: 'provider', label: 'Warranty provider', type: 'text' },
          { key: 'expires', label: 'Expires', type: 'date' },
          { key: 'claim_phone', label: 'Claim phone', type: 'text' },
        ]},
        { key: 'w2', label: 'Item 2', fields: [
          { key: 'item', label: 'Item', type: 'text' },
          { key: 'provider', label: 'Warranty provider', type: 'text' },
          { key: 'expires', label: 'Expires', type: 'date' },
          { key: 'claim_phone', label: 'Claim phone', type: 'text' },
        ]},
        { key: 'w3', label: 'Item 3', fields: [
          { key: 'item', label: 'Item', type: 'text' },
          { key: 'provider', label: 'Warranty provider', type: 'text' },
          { key: 'expires', label: 'Expires', type: 'date' },
          { key: 'claim_phone', label: 'Claim phone', type: 'text' },
        ]},
        { key: 'w4', label: 'Item 4', fields: [
          { key: 'item', label: 'Item', type: 'text' },
          { key: 'provider', label: 'Warranty provider', type: 'text' },
          { key: 'expires', label: 'Expires', type: 'date' },
          { key: 'claim_phone', label: 'Claim phone', type: 'text' },
        ]},
      ]},
    ],
  },
  {
    type: 'emergency_fund_planner',
    title: 'Emergency Fund Planner',
    description: 'Homeowners need bigger reserves than renters. Target 6-9 months of housing + expenses.',
    sections: [
      { title: 'Baseline', fields: [
        { key: 'monthly_expenses', label: 'Total monthly expenses (post-purchase)', type: 'currency' },
        { key: 'target_months', label: 'Target months of reserves', type: 'number' },
        { key: 'target_amount', label: 'Target amount', type: 'currency' },
      ]},
      { title: 'Current', fields: [
        { key: 'current_balance', label: 'Current emergency fund balance', type: 'currency' },
        { key: 'monthly_contribution', label: 'Monthly auto-transfer', type: 'currency' },
        { key: 'account_apy', label: 'HYSA APY %', type: 'percent' },
      ]},
      { title: 'Rules', checklist: [
        { key: 'separate_account', label: 'Kept in separate HYSA (not checking)' },
        { key: 'not_invested', label: 'Not in stocks or crypto' },
        { key: 'accessible_48h', label: 'Accessible within 48 hours' },
        { key: 'wont_drain_for_down', label: 'Will NOT drain for down payment' },
      ]},
    ],
  },
];
