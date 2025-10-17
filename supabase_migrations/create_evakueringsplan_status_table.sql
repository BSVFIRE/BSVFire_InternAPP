-- Create evakueringsplan_status table for storing evacuation plan status per facility
CREATE TABLE IF NOT EXISTS evakueringsplan_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(anlegg_id)
);

-- Add RLS policies
ALTER TABLE evakueringsplan_status ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view evacuation plan status for facilities they have access to
CREATE POLICY "Users can view evakueringsplan_status" ON evakueringsplan_status
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Users can insert evacuation plan status
CREATE POLICY "Users can insert evakueringsplan_status" ON evakueringsplan_status
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Users can update evacuation plan status
CREATE POLICY "Users can update evakueringsplan_status" ON evakueringsplan_status
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Add comment
COMMENT ON TABLE evakueringsplan_status IS 'Stores evacuation plan status for each facility';
COMMENT ON COLUMN evakueringsplan_status.status IS 'Status of evacuation plans: Ja, Nei, or Må oppdateres';
