-- Create kommentar_brannslukkere table
CREATE TABLE IF NOT EXISTS kommentar_brannslukkere (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anlegg_id UUID NOT NULL,
  kommentar TEXT,
  opprettet_av TEXT,
  opprettet_dato DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create kommentar_brannslanger table
CREATE TABLE IF NOT EXISTS kommentar_brannslanger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anlegg_id UUID NOT NULL,
  kommentar TEXT,
  opprettet_av TEXT,
  opprettet_dato DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments to describe the tables
COMMENT ON TABLE kommentar_brannslukkere IS 'Kommentarer for brannslukkere per anlegg';
COMMENT ON TABLE kommentar_brannslanger IS 'Kommentarer for brannslanger per anlegg';

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_kommentar_brannslukkere_anlegg_id ON kommentar_brannslukkere(anlegg_id);
CREATE INDEX IF NOT EXISTS idx_kommentar_brannslanger_anlegg_id ON kommentar_brannslanger(anlegg_id);

-- Enable Row Level Security (RLS)
ALTER TABLE kommentar_brannslukkere ENABLE ROW LEVEL SECURITY;
ALTER TABLE kommentar_brannslanger ENABLE ROW LEVEL SECURITY;

-- Create policies for kommentar_brannslukkere
CREATE POLICY "Enable read access for authenticated users" ON kommentar_brannslukkere
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON kommentar_brannslukkere
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON kommentar_brannslukkere
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create policies for kommentar_brannslanger
CREATE POLICY "Enable read access for authenticated users" ON kommentar_brannslanger
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON kommentar_brannslanger
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON kommentar_brannslanger
  FOR DELETE USING (auth.role() = 'authenticated');
