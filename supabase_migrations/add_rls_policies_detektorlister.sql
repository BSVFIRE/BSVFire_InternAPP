-- Add Row Level Security policies for detektorlister and detektor_items tables
-- This fixes the "42501" error: "new row violates row-level security policy"

-- ============================================
-- Drop existing policies if they exist
-- ============================================

-- detektorlister
DROP POLICY IF EXISTS "Users can view all detektorlister" ON detektorlister;
DROP POLICY IF EXISTS "Users can insert detektorlister" ON detektorlister;
DROP POLICY IF EXISTS "Users can update detektorlister" ON detektorlister;
DROP POLICY IF EXISTS "Users can delete detektorlister" ON detektorlister;

-- detektor_items
DROP POLICY IF EXISTS "Users can view all detektor_items" ON detektor_items;
DROP POLICY IF EXISTS "Users can insert detektor_items" ON detektor_items;
DROP POLICY IF EXISTS "Users can update detektor_items" ON detektor_items;
DROP POLICY IF EXISTS "Users can delete detektor_items" ON detektor_items;

-- ============================================
-- RLS Policies for detektorlister
-- ============================================

-- Enable Row Level Security
ALTER TABLE detektorlister ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read all detektorlister
CREATE POLICY "Users can view all detektorlister"
  ON detektorlister
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for authenticated users to insert detektorlister
CREATE POLICY "Users can insert detektorlister"
  ON detektorlister
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy for authenticated users to update detektorlister
CREATE POLICY "Users can update detektorlister"
  ON detektorlister
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policy for authenticated users to delete detektorlister
CREATE POLICY "Users can delete detektorlister"
  ON detektorlister
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- RLS Policies for detektor_items
-- ============================================

-- Enable Row Level Security
ALTER TABLE detektor_items ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read all detektor_items
CREATE POLICY "Users can view all detektor_items"
  ON detektor_items
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for authenticated users to insert detektor_items
CREATE POLICY "Users can insert detektor_items"
  ON detektor_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy for authenticated users to update detektor_items
CREATE POLICY "Users can update detektor_items"
  ON detektor_items
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policy for authenticated users to delete detektor_items
CREATE POLICY "Users can delete detektor_items"
  ON detektor_items
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comments
COMMENT ON TABLE detektorlister IS 'Detektorlister for teknisk seksjon - header information';
COMMENT ON TABLE detektor_items IS 'Individual detector items belonging to detektorlister';
