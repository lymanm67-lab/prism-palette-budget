-- Remove duplicate Experian accounts (keep second id of each pair)
DELETE FROM credit_accounts WHERE id IN (
  'b8548433-bd7b-4527-aa1f-748ed8626264',
  '14ca1997-eb5a-4843-97bc-9093279ec752',
  'd197ddd0-a82a-41cf-9456-2b7c43a6bf13',
  '37b036e8-a2fc-4f16-bd53-215bfd5f4254',
  'c2356fdc-0377-4247-8000-f2c2d6f33ab3',
  '59dbc49a-a8e3-4cc6-9c4f-023c24ff006b',
  '2ba8c8b5-8131-4879-be76-f9c5eb7d6dbe',
  'ddb00974-6151-4944-9848-99ebeeb3f8a1',
  '0b322af8-c2c2-4f24-a3c3-03392a8ecbd9',
  '586857a3-e1b8-418b-b42f-991f08ce5fde',
  '13c77d58-6859-49cd-b3e1-284834e0077a'
);

-- Also remove any remaining Equifax duplicates if they still exist
DELETE FROM credit_accounts WHERE id IN (
  '64b766ce-361f-4d4f-bb82-304c87413ded',
  'e4a84d98-d8ca-4a47-988a-288ff6ea3a3c',
  '2553a580-578f-442e-975e-dd754645050e',
  '9595b8eb-e626-4b54-be97-5e18cbbbf275',
  '1c2fb3b9-7871-43dd-bf4d-540174561c34',
  '840d242d-7d95-4bfe-9ca5-799c484fd78c'
);

-- Prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_accounts_no_dupes 
ON credit_accounts (household_id, bureau, account_name, account_number) 
WHERE account_number IS NOT NULL;