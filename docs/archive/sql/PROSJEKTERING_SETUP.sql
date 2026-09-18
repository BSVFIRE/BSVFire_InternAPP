-- ============================================================================
-- PROSJEKTERING MODUL - DATABASE SETUP
-- Kjør denne i Supabase SQL Editor
-- ============================================================================

-- Hovedtabell for prosjekteringer
CREATE TABLE IF NOT EXISTS prosjekteringer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Kunde og anlegg (kan være null for nye kunder/anlegg)
  kunde_id UUID REFERENCES customer(id) ON DELETE SET NULL,
  anlegg_id UUID REFERENCES anlegg(id) ON DELETE SET NULL,
  
  -- Prosjektinfo
  prosjekt_navn TEXT NOT NULL,
  prosjekt_nummer TEXT,
  beskrivelse TEXT,
  
  -- Kontaktinfo (for nye kunder som ikke finnes i systemet)
  ny_kunde_navn TEXT,
  ny_kunde_adresse TEXT,
  ny_kunde_postnummer TEXT,
  ny_kunde_poststed TEXT,
  ny_kunde_kontakt TEXT,
  ny_kunde_telefon TEXT,
  ny_kunde_epost TEXT,
  
  -- Standarder og forskrifter
  tek17_referanse TEXT,
  ns3960_referanse TEXT,
  ns3961_referanse TEXT,
  andre_standarder TEXT,
  
  -- Status og metadata
  status TEXT DEFAULT 'Utkast' CHECK (status IN ('Utkast', 'Under arbeid', 'Til godkjenning', 'Godkjent', 'Ferdig', 'Arkivert')),
  prosjektleder TEXT,
  ansvarlig_prosjekterende TEXT,
  
  -- Datoer
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW(),
  planlagt_ferdig DATE,
  faktisk_ferdig DATE,
  
  -- Bruker som opprettet
  opprettet_av UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Risiko- og behovsanalyse
CREATE TABLE IF NOT EXISTS prosjektering_risikoanalyse (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prosjektering_id UUID NOT NULL REFERENCES prosjekteringer(id) ON DELETE CASCADE,
  
  -- Bygningsinfo
  bygningstype TEXT,
  bruksklasse TEXT,
  risikoklasse TEXT,
  antall_etasjer INTEGER,
  bruttoareal NUMERIC,
  
  -- Risikovurdering
  brannbelastning TEXT,
  personbelastning TEXT,
  spesielle_risikoer TEXT,
  
  -- Behov
  deteksjonsbehov TEXT,
  varslingsbehov TEXT,
  slukkebehov TEXT,
  evakueringsbehov TEXT,
  
  -- Konklusjon
  anbefalt_system TEXT,
  kategori TEXT, -- Kategori 1, 2, 3 etc.
  begrunnelse TEXT,
  
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

-- Systemplanlegging
CREATE TABLE IF NOT EXISTS prosjektering_systemplan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prosjektering_id UUID NOT NULL REFERENCES prosjekteringer(id) ON DELETE CASCADE,
  
  -- Sentralutstyr
  sentral_type TEXT,
  sentral_produsent TEXT,
  sentral_modell TEXT,
  antall_sloyfekort INTEGER,
  antall_sloyfer INTEGER,
  
  -- Detektorer
  antall_roykdetektorer INTEGER,
  antall_varmedetektorer INTEGER,
  antall_flammedetektorer INTEGER,
  antall_multidetektorer INTEGER,
  antall_linjedetektorer INTEGER,
  antall_aspirerende INTEGER,
  
  -- Alarmgivere
  antall_sirener INTEGER,
  antall_klokker INTEGER,
  antall_blitzlys INTEGER,
  antall_talevarslere INTEGER,
  
  -- Manuelle meldere
  antall_brannmeldere INTEGER,
  
  -- Overføring
  overforingstype TEXT,
  alarmstasjon TEXT,
  
  -- Strømforsyning
  stromforsyning_type TEXT,
  batterireserve_timer INTEGER,
  
  -- Talevarsling (NS 3961)
  talevarsling_aktiv BOOLEAN DEFAULT FALSE,
  talevarsling_soner TEXT,
  talevarsling_meldinger TEXT,
  
  notater TEXT,
  
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

-- Tegninger og dokumentasjon
CREATE TABLE IF NOT EXISTS prosjektering_dokumenter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prosjektering_id UUID NOT NULL REFERENCES prosjekteringer(id) ON DELETE CASCADE,
  
  dokument_type TEXT NOT NULL, -- 'Plantegning', 'Systemskjema', 'Sløyfeskjema', 'Kabelplan', 'Annet'
  tittel TEXT NOT NULL,
  beskrivelse TEXT,
  filnavn TEXT,
  fil_url TEXT,
  fil_storrelse INTEGER,
  
  versjon TEXT DEFAULT '1.0',
  status TEXT DEFAULT 'Utkast',
  
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW(),
  opprettet_av UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Integrasjoner med andre systemer
CREATE TABLE IF NOT EXISTS prosjektering_integrasjoner (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prosjektering_id UUID NOT NULL REFERENCES prosjekteringer(id) ON DELETE CASCADE,
  
  system_type TEXT NOT NULL, -- 'Sprinkler', 'Røykventilasjon', 'Adgangskontroll', 'Heis', 'HVAC', 'BMS', 'Annet'
  system_navn TEXT,
  produsent TEXT,
  
  integrasjonstype TEXT, -- 'Hardwired', 'Protokoll', 'Potensialfritt'
  protokoll TEXT, -- 'Modbus', 'BACnet', 'OPC', etc.
  
  beskrivelse TEXT,
  krav TEXT,
  
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

-- Sjekkliste for prosjektering
CREATE TABLE IF NOT EXISTS prosjektering_sjekkliste (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prosjektering_id UUID NOT NULL REFERENCES prosjekteringer(id) ON DELETE CASCADE,
  
  kategori TEXT NOT NULL,
  punkt TEXT NOT NULL,
  beskrivelse TEXT,
  status TEXT DEFAULT 'Ikke startet' CHECK (status IN ('Ikke startet', 'Under arbeid', 'Fullført', 'Ikke aktuelt')),
  kommentar TEXT,
  
  rekkefølge INTEGER DEFAULT 0,
  
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

-- Indekser for bedre ytelse
CREATE INDEX IF NOT EXISTS idx_prosjekteringer_kunde ON prosjekteringer(kunde_id);
CREATE INDEX IF NOT EXISTS idx_prosjekteringer_anlegg ON prosjekteringer(anlegg_id);
CREATE INDEX IF NOT EXISTS idx_prosjekteringer_status ON prosjekteringer(status);
CREATE INDEX IF NOT EXISTS idx_prosjektering_risikoanalyse_prosjektering ON prosjektering_risikoanalyse(prosjektering_id);
CREATE INDEX IF NOT EXISTS idx_prosjektering_systemplan_prosjektering ON prosjektering_systemplan(prosjektering_id);
CREATE INDEX IF NOT EXISTS idx_prosjektering_dokumenter_prosjektering ON prosjektering_dokumenter(prosjektering_id);
CREATE INDEX IF NOT EXISTS idx_prosjektering_integrasjoner_prosjektering ON prosjektering_integrasjoner(prosjektering_id);

-- Trigger for automatisk oppdatering av sist_oppdatert
CREATE OR REPLACE FUNCTION update_prosjektering_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.sist_oppdatert = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prosjekteringer_updated ON prosjekteringer;
CREATE TRIGGER trigger_prosjekteringer_updated
  BEFORE UPDATE ON prosjekteringer
  FOR EACH ROW
  EXECUTE FUNCTION update_prosjektering_timestamp();

DROP TRIGGER IF EXISTS trigger_prosjektering_risikoanalyse_updated ON prosjektering_risikoanalyse;
CREATE TRIGGER trigger_prosjektering_risikoanalyse_updated
  BEFORE UPDATE ON prosjektering_risikoanalyse
  FOR EACH ROW
  EXECUTE FUNCTION update_prosjektering_timestamp();

DROP TRIGGER IF EXISTS trigger_prosjektering_systemplan_updated ON prosjektering_systemplan;
CREATE TRIGGER trigger_prosjektering_systemplan_updated
  BEFORE UPDATE ON prosjektering_systemplan
  FOR EACH ROW
  EXECUTE FUNCTION update_prosjektering_timestamp();

-- RLS Policies
ALTER TABLE prosjekteringer ENABLE ROW LEVEL SECURITY;
ALTER TABLE prosjektering_risikoanalyse ENABLE ROW LEVEL SECURITY;
ALTER TABLE prosjektering_systemplan ENABLE ROW LEVEL SECURITY;
ALTER TABLE prosjektering_dokumenter ENABLE ROW LEVEL SECURITY;
ALTER TABLE prosjektering_integrasjoner ENABLE ROW LEVEL SECURITY;
ALTER TABLE prosjektering_sjekkliste ENABLE ROW LEVEL SECURITY;

-- Tillat alle autentiserte brukere å lese og skrive
CREATE POLICY "Authenticated users can read prosjekteringer" ON prosjekteringer
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert prosjekteringer" ON prosjekteringer
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update prosjekteringer" ON prosjekteringer
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete prosjekteringer" ON prosjekteringer
  FOR DELETE TO authenticated USING (true);

-- Samme for relaterte tabeller
CREATE POLICY "Authenticated users can all on risikoanalyse" ON prosjektering_risikoanalyse
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can all on systemplan" ON prosjektering_systemplan
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can all on dokumenter" ON prosjektering_dokumenter
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can all on integrasjoner" ON prosjektering_integrasjoner
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can all on sjekkliste" ON prosjektering_sjekkliste
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- FERDIG! 
-- Prosjektering-tabellene er nå opprettet
-- ============================================================================
