-- =====================================================
-- KS/HMS DATABASE SCHEMA
-- Kvalitetssikring, Helse, Miljø og Sikkerhet
-- =====================================================
-- Kjør denne SQL i Supabase SQL Editor

-- 1. Risikokategorier lookup-tabell
CREATE TABLE IF NOT EXISTS risikokategorier (
    id SERIAL PRIMARY KEY,
    navn TEXT NOT NULL UNIQUE,
    beskrivelse TEXT,
    ikon TEXT,
    farge TEXT,
    aktiv BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert standard risikokategorier
INSERT INTO risikokategorier (navn, beskrivelse, ikon, farge) VALUES
    ('Brann og eksplosjon', 'Risiko for brann, eksplosjon og røykutvikling', 'Flame', '#f44336'),
    ('Fall og høyder', 'Risiko for fall fra høyde eller på samme nivå', 'ArrowDown', '#ff9800'),
    ('Elektrisk sikkerhet', 'Risiko knyttet til elektriske installasjoner', 'Zap', '#2196f3'),
    ('Kjemikalier og helse', 'Eksponering for farlige kjemikalier og stoffer', 'FlaskConical', '#9c27b0'),
    ('Maskiner og utstyr', 'Risiko ved bruk av maskiner og teknisk utstyr', 'Cog', '#607d8b'),
    ('Ergonomi og belastning', 'Fysisk belastning og ergonomiske forhold', 'User', '#4caf50'),
    ('Trafikk og transport', 'Risiko knyttet til kjøretøy og transport', 'Truck', '#795548'),
    ('Miljø og forurensning', 'Miljørisiko og forurensning', 'Leaf', '#8bc34a'),
    ('Sikkerhet og innbrudd', 'Tyveri, innbrudd og sikkerhetstrusler', 'Shield', '#424242'),
    ('Arbeidsorganisering', 'Stress, arbeidspress og organisatoriske forhold', 'Users', '#ff5722')
ON CONFLICT (navn) DO NOTHING;

-- 2. Risikovurderinger tabell
CREATE TABLE IF NOT EXISTS risikovurderinger (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    kunde_id UUID REFERENCES customer(id) ON DELETE SET NULL,
    anlegg_id UUID REFERENCES anlegg(id) ON DELETE SET NULL,
    tittel TEXT NOT NULL,
    beskrivelse TEXT NOT NULL,
    risikokategori TEXT REFERENCES risikokategorier(navn),
    sannsynlighet INTEGER CHECK (sannsynlighet >= 1 AND sannsynlighet <= 5),
    konsekvens INTEGER CHECK (konsekvens >= 1 AND konsekvens <= 5),
    risikoscore INTEGER GENERATED ALWAYS AS (sannsynlighet * konsekvens) STORED,
    risikoniva TEXT GENERATED ALWAYS AS (
        CASE 
            WHEN (sannsynlighet * konsekvens) <= 5 THEN 'LAV'
            WHEN (sannsynlighet * konsekvens) <= 15 THEN 'MIDDELS'
            ELSE 'HØY'
        END
    ) STORED,
    status TEXT DEFAULT 'Utkast' CHECK (status IN ('Utkast', 'Under arbeid', 'Ferdig')),
    dato DATE DEFAULT CURRENT_DATE,
    registrert_av UUID REFERENCES ansatte(id) ON DELETE SET NULL,
    risiko_matrise JSONB,
    opprettet_av UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Hendelser tabell (ulykker, nestenulykker, miljøhendelser)
CREATE TABLE IF NOT EXISTS hendelser (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    kunde_id UUID REFERENCES customer(id) ON DELETE SET NULL,
    anlegg_id UUID REFERENCES anlegg(id) ON DELETE SET NULL,
    tittel TEXT NOT NULL,
    beskrivelse TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Ulykke', 'Nestenulykke', 'Miljøhendelse', 'Annet')),
    alvorlighetsgrad TEXT DEFAULT 'Lav' CHECK (alvorlighetsgrad IN ('Lav', 'Middels', 'Høy', 'Kritisk')),
    status TEXT DEFAULT 'Åpen' CHECK (status IN ('Åpen', 'Under utredning', 'Lukket')),
    dato DATE DEFAULT CURRENT_DATE,
    registrert_av UUID REFERENCES ansatte(id) ON DELETE SET NULL,
    sted TEXT,
    involverte_personer TEXT,
    vitner TEXT,
    aarsak_analyse TEXT,
    forebyggende_tiltak TEXT,
    opprettet_av UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Avvik tabell (avvik fra prosedyrer, standarder)
CREATE TABLE IF NOT EXISTS avvik (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    kunde_id UUID REFERENCES customer(id) ON DELETE SET NULL,
    anlegg_id UUID REFERENCES anlegg(id) ON DELETE SET NULL,
    tittel TEXT NOT NULL,
    beskrivelse TEXT NOT NULL,
    kategori TEXT NOT NULL CHECK (kategori IN ('Sikkerhet', 'Kvalitet', 'Miljø', 'Prosedyre')),
    alvorlighetsgrad TEXT DEFAULT 'Lav' CHECK (alvorlighetsgrad IN ('Lav', 'Middels', 'Høy', 'Kritisk')),
    status TEXT DEFAULT 'Åpen' CHECK (status IN ('Åpen', 'Under behandling', 'Lukket')),
    dato DATE DEFAULT CURRENT_DATE,
    registrert_av UUID REFERENCES ansatte(id) ON DELETE SET NULL,
    oppdaget_av TEXT,
    ansvarlig_for_lukking UUID REFERENCES ansatte(id) ON DELETE SET NULL,
    korrigerende_tiltak TEXT,
    forebyggende_tiltak TEXT,
    lukket_dato DATE,
    opprettet_av UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Opplæring tabell (kurs, sertifiseringer, workshops)
CREATE TABLE IF NOT EXISTS opplaering (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tittel TEXT NOT NULL,
    beskrivelse TEXT,
    type TEXT NOT NULL CHECK (type IN ('Kurs', 'Sertifisering', 'Workshop', 'E-læring', 'Intern opplæring')),
    varighet TEXT,
    status TEXT DEFAULT 'Planlagt' CHECK (status IN ('Planlagt', 'Pågående', 'Fullført', 'Kansellert')),
    dato DATE DEFAULT CURRENT_DATE,
    sluttdato DATE,
    registrert_av UUID REFERENCES ansatte(id) ON DELETE SET NULL,
    instruktor TEXT,
    deltakere JSONB,
    sertifikat_utloper DATE,
    opprettet_av UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tiltak tabell (korrigerende og forebyggende tiltak)
CREATE TABLE IF NOT EXISTS ks_tiltak (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    relatert_til_type TEXT CHECK (relatert_til_type IN ('risikovurdering', 'hendelse', 'avvik')),
    relatert_til_id UUID,
    tittel TEXT NOT NULL,
    beskrivelse TEXT NOT NULL,
    type TEXT CHECK (type IN ('Korrigerende', 'Forebyggende', 'Forbedring')),
    ansvarlig UUID REFERENCES ansatte(id) ON DELETE SET NULL,
    frist DATE,
    status TEXT DEFAULT 'Planlagt' CHECK (status IN ('Planlagt', 'Pågående', 'Fullført', 'Forsinket', 'Kansellert')),
    prioritet TEXT DEFAULT 'Middels' CHECK (prioritet IN ('Lav', 'Middels', 'Høy', 'Kritisk')),
    kostnad DECIMAL(10,2),
    kommentarer TEXT,
    fullfort_dato DATE,
    opprettet_av UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. KS/HMS dokumenter tabell
CREATE TABLE IF NOT EXISTS ks_hms_dokumenter (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    kunde_id UUID REFERENCES customer(id) ON DELETE SET NULL,
    anlegg_id UUID REFERENCES anlegg(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('Risikovurdering', 'Hendelsesrapport', 'Avviksmelding', 'Opplæringsbevis', 'Tiltak', 'Annet')),
    tittel TEXT NOT NULL,
    filnavn TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    relatert_til_type TEXT,
    relatert_til_id UUID,
    opprettet_av UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEKSER FOR YTELSE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_risikovurderinger_kunde ON risikovurderinger(kunde_id);
CREATE INDEX IF NOT EXISTS idx_risikovurderinger_anlegg ON risikovurderinger(anlegg_id);
CREATE INDEX IF NOT EXISTS idx_risikovurderinger_status ON risikovurderinger(status);
CREATE INDEX IF NOT EXISTS idx_risikovurderinger_dato ON risikovurderinger(dato);
CREATE INDEX IF NOT EXISTS idx_risikovurderinger_risikoniva ON risikovurderinger(risikoniva);

CREATE INDEX IF NOT EXISTS idx_hendelser_kunde ON hendelser(kunde_id);
CREATE INDEX IF NOT EXISTS idx_hendelser_anlegg ON hendelser(anlegg_id);
CREATE INDEX IF NOT EXISTS idx_hendelser_type ON hendelser(type);
CREATE INDEX IF NOT EXISTS idx_hendelser_status ON hendelser(status);
CREATE INDEX IF NOT EXISTS idx_hendelser_dato ON hendelser(dato);

CREATE INDEX IF NOT EXISTS idx_avvik_kunde ON avvik(kunde_id);
CREATE INDEX IF NOT EXISTS idx_avvik_anlegg ON avvik(anlegg_id);
CREATE INDEX IF NOT EXISTS idx_avvik_kategori ON avvik(kategori);
CREATE INDEX IF NOT EXISTS idx_avvik_status ON avvik(status);
CREATE INDEX IF NOT EXISTS idx_avvik_dato ON avvik(dato);

CREATE INDEX IF NOT EXISTS idx_opplaering_type ON opplaering(type);
CREATE INDEX IF NOT EXISTS idx_opplaering_status ON opplaering(status);
CREATE INDEX IF NOT EXISTS idx_opplaering_dato ON opplaering(dato);

CREATE INDEX IF NOT EXISTS idx_ks_tiltak_relatert ON ks_tiltak(relatert_til_type, relatert_til_id);
CREATE INDEX IF NOT EXISTS idx_ks_tiltak_ansvarlig ON ks_tiltak(ansvarlig);
CREATE INDEX IF NOT EXISTS idx_ks_tiltak_status ON ks_tiltak(status);
CREATE INDEX IF NOT EXISTS idx_ks_tiltak_frist ON ks_tiltak(frist);

CREATE INDEX IF NOT EXISTS idx_ks_hms_dokumenter_kunde ON ks_hms_dokumenter(kunde_id);
CREATE INDEX IF NOT EXISTS idx_ks_hms_dokumenter_anlegg ON ks_hms_dokumenter(anlegg_id);
CREATE INDEX IF NOT EXISTS idx_ks_hms_dokumenter_type ON ks_hms_dokumenter(type);
CREATE INDEX IF NOT EXISTS idx_ks_hms_dokumenter_relatert ON ks_hms_dokumenter(relatert_til_type, relatert_til_id);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_ks_hms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_risikovurderinger_updated_at ON risikovurderinger;
CREATE TRIGGER update_risikovurderinger_updated_at 
    BEFORE UPDATE ON risikovurderinger 
    FOR EACH ROW EXECUTE FUNCTION update_ks_hms_updated_at();

DROP TRIGGER IF EXISTS update_hendelser_updated_at ON hendelser;
CREATE TRIGGER update_hendelser_updated_at 
    BEFORE UPDATE ON hendelser 
    FOR EACH ROW EXECUTE FUNCTION update_ks_hms_updated_at();

DROP TRIGGER IF EXISTS update_avvik_updated_at ON avvik;
CREATE TRIGGER update_avvik_updated_at 
    BEFORE UPDATE ON avvik 
    FOR EACH ROW EXECUTE FUNCTION update_ks_hms_updated_at();

DROP TRIGGER IF EXISTS update_opplaering_updated_at ON opplaering;
CREATE TRIGGER update_opplaering_updated_at 
    BEFORE UPDATE ON opplaering 
    FOR EACH ROW EXECUTE FUNCTION update_ks_hms_updated_at();

DROP TRIGGER IF EXISTS update_ks_tiltak_updated_at ON ks_tiltak;
CREATE TRIGGER update_ks_tiltak_updated_at 
    BEFORE UPDATE ON ks_tiltak 
    FOR EACH ROW EXECUTE FUNCTION update_ks_hms_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE risikokategorier ENABLE ROW LEVEL SECURITY;
ALTER TABLE risikovurderinger ENABLE ROW LEVEL SECURITY;
ALTER TABLE hendelser ENABLE ROW LEVEL SECURITY;
ALTER TABLE avvik ENABLE ROW LEVEL SECURITY;
ALTER TABLE opplaering ENABLE ROW LEVEL SECURITY;
ALTER TABLE ks_tiltak ENABLE ROW LEVEL SECURITY;
ALTER TABLE ks_hms_dokumenter ENABLE ROW LEVEL SECURITY;

-- Policies for risikokategorier (alle kan lese)
DROP POLICY IF EXISTS "Authenticated can view risikokategorier" ON risikokategorier;
CREATE POLICY "Authenticated can view risikokategorier"
    ON risikokategorier FOR SELECT TO authenticated USING (true);

-- Policies for risikovurderinger
DROP POLICY IF EXISTS "Authenticated can view risikovurderinger" ON risikovurderinger;
CREATE POLICY "Authenticated can view risikovurderinger"
    ON risikovurderinger FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert risikovurderinger" ON risikovurderinger;
CREATE POLICY "Authenticated can insert risikovurderinger"
    ON risikovurderinger FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update risikovurderinger" ON risikovurderinger;
CREATE POLICY "Authenticated can update risikovurderinger"
    ON risikovurderinger FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can delete risikovurderinger" ON risikovurderinger;
CREATE POLICY "Authenticated can delete risikovurderinger"
    ON risikovurderinger FOR DELETE TO authenticated USING (true);

-- Policies for hendelser
DROP POLICY IF EXISTS "Authenticated can view hendelser" ON hendelser;
CREATE POLICY "Authenticated can view hendelser"
    ON hendelser FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert hendelser" ON hendelser;
CREATE POLICY "Authenticated can insert hendelser"
    ON hendelser FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update hendelser" ON hendelser;
CREATE POLICY "Authenticated can update hendelser"
    ON hendelser FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can delete hendelser" ON hendelser;
CREATE POLICY "Authenticated can delete hendelser"
    ON hendelser FOR DELETE TO authenticated USING (true);

-- Policies for avvik
DROP POLICY IF EXISTS "Authenticated can view avvik" ON avvik;
CREATE POLICY "Authenticated can view avvik"
    ON avvik FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert avvik" ON avvik;
CREATE POLICY "Authenticated can insert avvik"
    ON avvik FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update avvik" ON avvik;
CREATE POLICY "Authenticated can update avvik"
    ON avvik FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can delete avvik" ON avvik;
CREATE POLICY "Authenticated can delete avvik"
    ON avvik FOR DELETE TO authenticated USING (true);

-- Policies for opplaering
DROP POLICY IF EXISTS "Authenticated can view opplaering" ON opplaering;
CREATE POLICY "Authenticated can view opplaering"
    ON opplaering FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert opplaering" ON opplaering;
CREATE POLICY "Authenticated can insert opplaering"
    ON opplaering FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update opplaering" ON opplaering;
CREATE POLICY "Authenticated can update opplaering"
    ON opplaering FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can delete opplaering" ON opplaering;
CREATE POLICY "Authenticated can delete opplaering"
    ON opplaering FOR DELETE TO authenticated USING (true);

-- Policies for ks_tiltak
DROP POLICY IF EXISTS "Authenticated can view ks_tiltak" ON ks_tiltak;
CREATE POLICY "Authenticated can view ks_tiltak"
    ON ks_tiltak FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert ks_tiltak" ON ks_tiltak;
CREATE POLICY "Authenticated can insert ks_tiltak"
    ON ks_tiltak FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update ks_tiltak" ON ks_tiltak;
CREATE POLICY "Authenticated can update ks_tiltak"
    ON ks_tiltak FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can delete ks_tiltak" ON ks_tiltak;
CREATE POLICY "Authenticated can delete ks_tiltak"
    ON ks_tiltak FOR DELETE TO authenticated USING (true);

-- Policies for ks_hms_dokumenter
DROP POLICY IF EXISTS "Authenticated can view ks_hms_dokumenter" ON ks_hms_dokumenter;
CREATE POLICY "Authenticated can view ks_hms_dokumenter"
    ON ks_hms_dokumenter FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert ks_hms_dokumenter" ON ks_hms_dokumenter;
CREATE POLICY "Authenticated can insert ks_hms_dokumenter"
    ON ks_hms_dokumenter FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update ks_hms_dokumenter" ON ks_hms_dokumenter;
CREATE POLICY "Authenticated can update ks_hms_dokumenter"
    ON ks_hms_dokumenter FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can delete ks_hms_dokumenter" ON ks_hms_dokumenter;
CREATE POLICY "Authenticated can delete ks_hms_dokumenter"
    ON ks_hms_dokumenter FOR DELETE TO authenticated USING (true);

-- =====================================================
-- VIEWS FOR RAPPORTERING
-- =====================================================

CREATE OR REPLACE VIEW ks_hms_dashboard AS
SELECT 
    'risikovurderinger' as type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'Ferdig') as ferdig,
    COUNT(*) FILTER (WHERE status = 'Under arbeid') as under_arbeid,
    COUNT(*) FILTER (WHERE status = 'Utkast') as utkast,
    COUNT(*) FILTER (WHERE risikoniva = 'HØY') as hoy_risiko
FROM risikovurderinger
UNION ALL
SELECT 
    'hendelser' as type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'Lukket') as ferdig,
    COUNT(*) FILTER (WHERE status = 'Under utredning') as under_arbeid,
    COUNT(*) FILTER (WHERE status = 'Åpen') as utkast,
    COUNT(*) FILTER (WHERE alvorlighetsgrad IN ('Høy', 'Kritisk')) as hoy_risiko
FROM hendelser
UNION ALL
SELECT 
    'avvik' as type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'Lukket') as ferdig,
    COUNT(*) FILTER (WHERE status = 'Under behandling') as under_arbeid,
    COUNT(*) FILTER (WHERE status = 'Åpen') as utkast,
    COUNT(*) FILTER (WHERE alvorlighetsgrad IN ('Høy', 'Kritisk')) as hoy_risiko
FROM avvik
UNION ALL
SELECT 
    'opplaering' as type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'Fullført') as ferdig,
    COUNT(*) FILTER (WHERE status = 'Pågående') as under_arbeid,
    COUNT(*) FILTER (WHERE status = 'Planlagt') as utkast,
    0 as hoy_risiko
FROM opplaering
UNION ALL
SELECT 
    'tiltak' as type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'Fullført') as ferdig,
    COUNT(*) FILTER (WHERE status IN ('Pågående', 'Planlagt')) as under_arbeid,
    COUNT(*) FILTER (WHERE status = 'Forsinket') as utkast,
    COUNT(*) FILTER (WHERE prioritet IN ('Høy', 'Kritisk')) as hoy_risiko
FROM ks_tiltak;

-- =====================================================
-- KOMMENTARER FOR DOKUMENTASJON
-- =====================================================

COMMENT ON TABLE risikokategorier IS 'Lookup tabell for standardiserte risikokategorier';
COMMENT ON TABLE risikovurderinger IS 'Risikovurderinger for anlegg og aktiviteter';
COMMENT ON TABLE hendelser IS 'Hendelsesrapporter - ulykker, nestenulykker, miljøhendelser';
COMMENT ON TABLE avvik IS 'Avviksmeldinger fra prosedyrer og standarder';
COMMENT ON TABLE opplaering IS 'Opplæring, kurs og sertifiseringer';
COMMENT ON TABLE ks_tiltak IS 'Korrigerende og forebyggende tiltak';
COMMENT ON TABLE ks_hms_dokumenter IS 'Dokumenter relatert til KS/HMS aktiviteter';
COMMENT ON VIEW ks_hms_dashboard IS 'Dashboard view for KS/HMS statistikk';

-- =====================================================
-- VERIFISER OPPRETTELSE
-- =====================================================

SELECT 'risikokategorier' as tabell, COUNT(*) as antall FROM risikokategorier
UNION ALL SELECT 'risikovurderinger', COUNT(*) FROM risikovurderinger
UNION ALL SELECT 'hendelser', COUNT(*) FROM hendelser
UNION ALL SELECT 'avvik', COUNT(*) FROM avvik
UNION ALL SELECT 'opplaering', COUNT(*) FROM opplaering
UNION ALL SELECT 'ks_tiltak', COUNT(*) FROM ks_tiltak
UNION ALL SELECT 'ks_hms_dokumenter', COUNT(*) FROM ks_hms_dokumenter;
