-- Fix RLS policies for ansatte table to allow authenticated users to read

-- Enable RLS if not already enabled
ALTER TABLE ansatte ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all ansatte" ON ansatte;
DROP POLICY IF EXISTS "Authenticated users can view ansatte" ON ansatte;

-- Create policy to allow all authenticated users to read ansatte
CREATE POLICY "Authenticated users can view ansatte"
  ON ansatte FOR SELECT
  TO authenticated
  USING (true);

-- Optional: Allow users to update their own record
CREATE POLICY "Users can update own ansatte record"
  ON ansatte FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Verify policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'ansatte';
