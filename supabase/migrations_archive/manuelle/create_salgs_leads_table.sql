-- Tabell for salgs-leads fra Brønnøysundregistrene
-- Brukes for å lagre potensielle kunder (sameier, borettslag, etc.)

CREATE TABLE IF NOT EXISTS salgs_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Organisasjonsinfo fra BRREG
  organisasjonsnummer VARCHAR(9) NOT NULL UNIQUE,
  navn TEXT NOT NULL,
  organisasjonsform VARCHAR(100), -- SAMEI, BRL, etc.
  organisasjonsform_beskrivelse TEXT, -- Sameie, Borettslag, etc.
  
  -- Adresse
  forretningsadresse_gate TEXT,
  forretningsadresse_postnummer VARCHAR(4),
  forretningsadresse_poststed TEXT,
  forretningsadresse_kommune TEXT,
  forretningsadresse_land TEXT DEFAULT 'Norge',
  
  -- Kontaktinfo (fra BRREG eller manuelt lagt til)
  epost TEXT,
  telefon TEXT,
  hjemmeside TEXT,
  
  -- Styre/kontaktperson info
  daglig_leder TEXT,
  styreleder TEXT,
  kontaktperson_navn TEXT,
  kontaktperson_epost TEXT,
  kontaktperson_telefon TEXT,
  
  -- Ekstra info fra BRREG
  stiftelsesdato DATE,
  antall_ansatte INTEGER,
  naeringskode_1 VARCHAR(10),
  naeringskode_1_beskrivelse TEXT,
  
  -- Salgs-status
  status VARCHAR(50) DEFAULT 'ny' CHECK (status IN ('ny', 'kontaktet', 'interessert', 'ikke_interessert', 'kunde', 'avvist')),
  epost_sendt BOOLEAN DEFAULT FALSE,
  epost_sendt_dato TIMESTAMPTZ,
  epost_sendt_av UUID REFERENCES auth.users(id),
  
  -- Notater og oppfølging
  notater TEXT,
  neste_oppfolging DATE,
  prioritet VARCHAR(20) DEFAULT 'normal' CHECK (prioritet IN ('lav', 'normal', 'høy')),
  
  -- Metadata
  kilde VARCHAR(50) DEFAULT 'brreg', -- brreg, manuell, import
  opprettet_av UUID REFERENCES auth.users(id),
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  oppdatert_dato TIMESTAMPTZ DEFAULT NOW(),
  
  -- Hvis konvertert til kunde
  kunde_id UUID REFERENCES customer(id)
);

-- Indekser for raskere søk
CREATE INDEX IF NOT EXISTS idx_salgs_leads_orgnr ON salgs_leads(organisasjonsnummer);
CREATE INDEX IF NOT EXISTS idx_salgs_leads_postnummer ON salgs_leads(forretningsadresse_postnummer);
CREATE INDEX IF NOT EXISTS idx_salgs_leads_kommune ON salgs_leads(forretningsadresse_kommune);
CREATE INDEX IF NOT EXISTS idx_salgs_leads_orgform ON salgs_leads(organisasjonsform);
CREATE INDEX IF NOT EXISTS idx_salgs_leads_status ON salgs_leads(status);
CREATE INDEX IF NOT EXISTS idx_salgs_leads_epost_sendt ON salgs_leads(epost_sendt);

-- Trigger for å oppdatere oppdatert_dato
CREATE OR REPLACE FUNCTION update_salgs_leads_oppdatert_dato()
RETURNS TRIGGER AS $$
BEGIN
  NEW.oppdatert_dato = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_salgs_leads_oppdatert_dato ON salgs_leads;
CREATE TRIGGER trigger_update_salgs_leads_oppdatert_dato
  BEFORE UPDATE ON salgs_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_salgs_leads_oppdatert_dato();

-- RLS Policies
ALTER TABLE salgs_leads ENABLE ROW LEVEL SECURITY;

-- Policy for å lese leads (alle autentiserte brukere)
CREATE POLICY "Autentiserte brukere kan lese salgs_leads"
  ON salgs_leads FOR SELECT
  TO authenticated
  USING (true);

-- Policy for å opprette leads
CREATE POLICY "Autentiserte brukere kan opprette salgs_leads"
  ON salgs_leads FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy for å oppdatere leads
CREATE POLICY "Autentiserte brukere kan oppdatere salgs_leads"
  ON salgs_leads FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy for å slette leads
CREATE POLICY "Autentiserte brukere kan slette salgs_leads"
  ON salgs_leads FOR DELETE
  TO authenticated
  USING (true);

-- Tabell for å logge e-poster sendt til leads
CREATE TABLE IF NOT EXISTS salgs_leads_epost_logg (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES salgs_leads(id) ON DELETE CASCADE,
  epost_adresse TEXT NOT NULL,
  emne TEXT NOT NULL,
  innhold TEXT,
  sendt_av UUID REFERENCES auth.users(id),
  sendt_dato TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'sendt' CHECK (status IN ('sendt', 'levert', 'åpnet', 'feilet'))
);

-- RLS for epost-logg
ALTER TABLE salgs_leads_epost_logg ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autentiserte brukere kan lese epost_logg"
  ON salgs_leads_epost_logg FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Autentiserte brukere kan opprette epost_logg"
  ON salgs_leads_epost_logg FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Legg til Salg-modul i modul-oversikten
INSERT INTO moduler (modul_key, navn, beskrivelse, kategori, ikon, sortering) VALUES
  ('admin_salg', 'Salg', 'Prospektering og lead-håndtering med BRREG-integrasjon', 'admin', 'TrendingUp', 5)
ON CONFLICT (modul_key) DO NOTHING;
