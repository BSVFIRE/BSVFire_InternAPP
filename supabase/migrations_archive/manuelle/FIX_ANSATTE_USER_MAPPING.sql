-- First, let's see what's in the ansatte table
SELECT * FROM ansatte ORDER BY navn;

-- Check the structure of ansatte table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'ansatte'
ORDER BY ordinal_position;
