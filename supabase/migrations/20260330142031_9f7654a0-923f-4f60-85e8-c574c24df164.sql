
UPDATE transactions 
SET is_transfer = true, category_id = NULL
WHERE id IN (
  '6daefd00-d763-44ff-9414-4e394b0c9089',
  'b5ede6f4-3ebc-46ba-8795-76b86a0e1768',
  '91b7f397-76be-4169-944b-2fc8d26c1ae7'
);
