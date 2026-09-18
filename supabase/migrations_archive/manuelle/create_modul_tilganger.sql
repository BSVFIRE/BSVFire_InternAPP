-- =====================================================
-- MODUL TILGANGER - Tilgangskontroll for moduler
-- =====================================================
-- Kjør denne SQL i Supabase SQL Editor

-- Tabell for å definere tilgjengelige moduler
CREATE TABLE IF NOT EXISTS moduler (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modul_key TEXT UNIQUE NOT NULL,
    navn TEXT NOT NULL,
    beskrivelse TEXT,
    kategori TEXT DEFAULT 'general', -- 'general', 'admin', 'priser'
    ikon TEXT,
    sortering INTEGER DEFAULT 0,
    aktiv BOOLEAN DEFAULT true,
    opprettet_dato TIMESTAMPTZ DEFAULT NOW()
);

-- Tabell for bruker-modul tilganger
CREATE TABLE IF NOT EXISTS modul_tilganger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ansatt_id UUID NOT NULL REFERENCES ansatte(id) ON DELETE CASCADE,
    modul_id UUID NOT NULL REFERENCES moduler(id) ON DELETE CASCADE,
    kan_se BOOLEAN DEFAULT false,
    kan_redigere BOOLEAN DEFAULT false,
    opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
    opprettet_av UUID REFERENCES ansatte(id),
    sist_oppdatert TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ansatt_id, modul_id)
);

-- Trigger for å oppdatere sist_oppdatert
CREATE OR REPLACE FUNCTION update_modul_tilganger_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sist_oppdatert = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS modul_tilganger_updated ON modul_tilganger;
CREATE TRIGGER modul_tilganger_updated
    BEFORE UPDATE ON modul_tilganger
    FOR EACH ROW
    EXECUTE FUNCTION update_modul_tilganger_timestamp();

-- Sett inn standard moduler
INSERT INTO moduler (modul_key, navn, beskrivelse, kategori, ikon, sortering) VALUES
    -- Admin moduler
    ('admin_aarsavslutning', 'Årsavslutning', 'Årsavslutning og statusoppdatering for alle anlegg', 'admin', 'CalendarCheck', 10),
    ('admin_prisadministrasjon', 'Prisadministrasjon', 'Administrer priser for tjenester', 'admin', 'DollarSign', 20),
    ('admin_poweroffice', 'PowerOffice', 'PowerOffice integrasjon og synkronisering', 'admin', 'Building', 30),
    ('admin_dropbox', 'Dropbox Mapper', 'Administrer Dropbox mappekoblinger', 'admin', 'Cloud', 40),
    ('admin_logger', 'System Logger', 'Se systemlogger og feilmeldinger', 'admin', 'Bug', 50),
    ('admin_ai_embeddings', 'AI Embeddings', 'Administrer AI embeddings for dokumenter', 'admin', 'Sparkles', 60),
    ('admin_ai_knowledge', 'AI Kunnskapsbase', 'Administrer AI kunnskapsbase', 'admin', 'BookOpen', 70),
    ('admin_modul_tilgang', 'Modul Tilganger', 'Administrer hvem som har tilgang til hva', 'admin', 'Shield', 80),
    
    -- Pris-relaterte moduler (under anlegg)
    ('anlegg_priser_se', 'Se priser (Anlegg)', 'Kan se priser under anlegg', 'priser', 'Eye', 100),
    ('anlegg_priser_rediger', 'Rediger priser (Anlegg)', 'Kan redigere priser under anlegg', 'priser', 'Edit', 110),
    
    -- Generelle moduler
    ('tilbud_serviceavtale', 'Tilbud Serviceavtale', 'Tilgang til å lage serviceavtale-tilbud', 'general', 'FileText', 200),
    ('tilbud_alarmoverforing', 'Tilbud Alarmoverføring', 'Tilgang til å lage alarmoverførings-tilbud', 'general', 'FileText', 210),
    ('send_rapporter', 'Send Rapporter', 'Tilgang til å sende rapporter via e-post', 'general', 'Mail', 220),
    
    -- KS/HMS moduler
    ('ks_hms_dashboard', 'KS/HMS Dashboard', 'Hovedoversikt for Kvalitetssikring, Helse, Miljø og Sikkerhet', 'ks_hms', 'ShieldCheck', 300),
    ('ks_hms_risikovurdering', 'Risikovurderinger', 'Opprett og administrer risikovurderinger', 'ks_hms', 'AlertTriangle', 310),
    ('ks_hms_hendelser', 'Hendelser', 'Registrer ulykker, nestenulykker og miljøhendelser', 'ks_hms', 'AlertCircle', 320),
    ('ks_hms_avvik', 'Avvik', 'Avvikshåndtering og oppfølging', 'ks_hms', 'XCircle', 330),
    ('ks_hms_opplaering', 'Opplæring', 'Kurs, sertifiseringer og kompetanseoversikt', 'ks_hms', 'GraduationCap', 340),
    ('ks_hms_tiltak', 'Tiltak', 'Korrigerende og forebyggende tiltak', 'ks_hms', 'CheckSquare', 350)
ON CONFLICT (modul_key) DO NOTHING;

-- Enable RLS
ALTER TABLE moduler ENABLE ROW LEVEL SECURITY;
ALTER TABLE modul_tilganger ENABLE ROW LEVEL SECURITY;

-- RLS Policies for moduler (alle autentiserte kan lese)
DROP POLICY IF EXISTS "Authenticated users can view moduler" ON moduler;
CREATE POLICY "Authenticated users can view moduler"
    ON moduler FOR SELECT
    TO authenticated
    USING (true);

-- RLS Policies for modul_tilganger
DROP POLICY IF EXISTS "Authenticated users can view modul_tilganger" ON modul_tilganger;
CREATE POLICY "Authenticated users can view modul_tilganger"
    ON modul_tilganger FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admin can insert modul_tilganger" ON modul_tilganger;
CREATE POLICY "Admin can insert modul_tilganger"
    ON modul_tilganger FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can update modul_tilganger" ON modul_tilganger;
CREATE POLICY "Admin can update modul_tilganger"
    ON modul_tilganger FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can delete modul_tilganger" ON modul_tilganger;
CREATE POLICY "Admin can delete modul_tilganger"
    ON modul_tilganger FOR DELETE
    TO authenticated
    USING (true);

-- Funksjon for å sjekke om bruker har tilgang til en modul
CREATE OR REPLACE FUNCTION har_modul_tilgang(
    p_user_email TEXT,
    p_modul_key TEXT,
    p_tilgang_type TEXT DEFAULT 'se' -- 'se' eller 'rediger'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_har_tilgang BOOLEAN := false;
BEGIN
    SELECT 
        CASE 
            WHEN p_tilgang_type = 'rediger' THEN mt.kan_redigere
            ELSE mt.kan_se
        END INTO v_har_tilgang
    FROM modul_tilganger mt
    JOIN ansatte a ON a.id = mt.ansatt_id
    JOIN moduler m ON m.id = mt.modul_id
    WHERE a.epost = p_user_email
      AND m.modul_key = p_modul_key
      AND m.aktiv = true;
    
    RETURN COALESCE(v_har_tilgang, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Indekser for ytelse
CREATE INDEX IF NOT EXISTS idx_modul_tilganger_ansatt ON modul_tilganger(ansatt_id);
CREATE INDEX IF NOT EXISTS idx_modul_tilganger_modul ON modul_tilganger(modul_id);
CREATE INDEX IF NOT EXISTS idx_moduler_key ON moduler(modul_key);

-- Verifiser at tabellene ble opprettet
SELECT 'moduler' as tabell, COUNT(*) as antall FROM moduler
UNION ALL
SELECT 'modul_tilganger' as tabell, COUNT(*) as antall FROM modul_tilganger;
