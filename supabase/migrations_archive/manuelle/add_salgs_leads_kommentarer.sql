-- Legg til rating-felt på salgs_leads
ALTER TABLE salgs_leads ADD COLUMN IF NOT EXISTS interesse_rating INTEGER CHECK (interesse_rating >= 1 AND interesse_rating <= 6);

-- Legg til felt for aktuelle tjenester
ALTER TABLE salgs_leads ADD COLUMN IF NOT EXISTS tjeneste_brannalarm BOOLEAN DEFAULT FALSE;
ALTER TABLE salgs_leads ADD COLUMN IF NOT EXISTS tjeneste_nodlys BOOLEAN DEFAULT FALSE;
ALTER TABLE salgs_leads ADD COLUMN IF NOT EXISTS tjeneste_slukkeutstyr BOOLEAN DEFAULT FALSE;
ALTER TABLE salgs_leads ADD COLUMN IF NOT EXISTS tjeneste_roykluker BOOLEAN DEFAULT FALSE;
ALTER TABLE salgs_leads ADD COLUMN IF NOT EXISTS tjeneste_forstehjelp BOOLEAN DEFAULT FALSE;
ALTER TABLE salgs_leads ADD COLUMN IF NOT EXISTS tjeneste_sprinkler BOOLEAN DEFAULT FALSE;
ALTER TABLE salgs_leads ADD COLUMN IF NOT EXISTS tjeneste_elektro BOOLEAN DEFAULT FALSE;
ALTER TABLE salgs_leads ADD COLUMN IF NOT EXISTS tjeneste_annet BOOLEAN DEFAULT FALSE;
ALTER TABLE salgs_leads ADD COLUMN IF NOT EXISTS tjeneste_annet_beskrivelse TEXT;

-- Tabell for kommentarer på salgs-leads
CREATE TABLE IF NOT EXISTS salgs_leads_kommentarer (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES salgs_leads(id) ON DELETE CASCADE,
  
  -- Kommentar
  kommentar TEXT NOT NULL,
  
  -- Hvem skrev kommentaren
  opprettet_av UUID REFERENCES auth.users(id),
  opprettet_av_navn TEXT, -- Lagrer navn for enkel visning
  opprettet_dato TIMESTAMPTZ DEFAULT NOW()
);

-- Indeks for raskere oppslag
CREATE INDEX IF NOT EXISTS idx_salgs_leads_kommentarer_lead_id ON salgs_leads_kommentarer(lead_id);
CREATE INDEX IF NOT EXISTS idx_salgs_leads_kommentarer_dato ON salgs_leads_kommentarer(opprettet_dato DESC);

-- RLS policies
ALTER TABLE salgs_leads_kommentarer ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autentiserte brukere kan lese kommentarer"
  ON salgs_leads_kommentarer FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Autentiserte brukere kan opprette kommentarer"
  ON salgs_leads_kommentarer FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Brukere kan slette egne kommentarer"
  ON salgs_leads_kommentarer FOR DELETE
  TO authenticated
  USING (opprettet_av = auth.uid());
