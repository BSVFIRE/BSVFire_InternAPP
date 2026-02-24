-- =====================================================
-- FDV / Datablad Modul - Database Schema
-- =====================================================

-- Tabell for leverandører
CREATE TABLE IF NOT EXISTS fdv_leverandorer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    navn TEXT NOT NULL UNIQUE,
    beskrivelse TEXT,
    nettside TEXT,
    opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
    sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

-- Tabell for produkttyper/kategorier
CREATE TABLE IF NOT EXISTS fdv_produkttyper (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    navn TEXT NOT NULL UNIQUE,
    beskrivelse TEXT,
    opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
    sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

-- Hovedtabell for datablader
CREATE TABLE IF NOT EXISTS fdv_datablader (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leverandor_id UUID REFERENCES fdv_leverandorer(id) ON DELETE SET NULL,
    produkttype_id UUID REFERENCES fdv_produkttyper(id) ON DELETE SET NULL,
    tittel TEXT NOT NULL,
    produktnavn TEXT,
    artikkelnummer TEXT,
    revisjon TEXT,
    revisjon_dato DATE,
    beskrivelse TEXT,
    filnavn TEXT NOT NULL,
    fil_url TEXT NOT NULL,
    fil_storrelse INTEGER,
    opprettet_av UUID,
    opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
    sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

-- Koblingstabell mellom FDV-dokumenter og anlegg
CREATE TABLE IF NOT EXISTS fdv_anlegg_datablader (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
    datablad_id UUID NOT NULL REFERENCES fdv_datablader(id) ON DELETE CASCADE,
    antall INTEGER DEFAULT 1,
    plassering TEXT,
    notater TEXT,
    opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(anlegg_id, datablad_id)
);

-- Tabell for genererte FDV-dokumenter
CREATE TABLE IF NOT EXISTS fdv_genererte_dokumenter (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
    tittel TEXT NOT NULL,
    beskrivelse TEXT,
    fil_url TEXT,
    inkluderte_datablader UUID[] DEFAULT '{}',
    generert_av UUID,
    generert_dato TIMESTAMPTZ DEFAULT NOW()
);

-- Indekser for bedre ytelse
CREATE INDEX IF NOT EXISTS idx_fdv_datablader_leverandor ON fdv_datablader(leverandor_id);
CREATE INDEX IF NOT EXISTS idx_fdv_datablader_produkttype ON fdv_datablader(produkttype_id);
CREATE INDEX IF NOT EXISTS idx_fdv_datablader_revisjon ON fdv_datablader(revisjon);
CREATE INDEX IF NOT EXISTS idx_fdv_anlegg_datablader_anlegg ON fdv_anlegg_datablader(anlegg_id);
CREATE INDEX IF NOT EXISTS idx_fdv_anlegg_datablader_datablad ON fdv_anlegg_datablader(datablad_id);
CREATE INDEX IF NOT EXISTS idx_fdv_genererte_dokumenter_anlegg ON fdv_genererte_dokumenter(anlegg_id);

-- RLS Policies
ALTER TABLE fdv_leverandorer ENABLE ROW LEVEL SECURITY;
ALTER TABLE fdv_produkttyper ENABLE ROW LEVEL SECURITY;
ALTER TABLE fdv_datablader ENABLE ROW LEVEL SECURITY;
ALTER TABLE fdv_anlegg_datablader ENABLE ROW LEVEL SECURITY;
ALTER TABLE fdv_genererte_dokumenter ENABLE ROW LEVEL SECURITY;

-- Leverandører - alle autentiserte brukere kan lese og skrive
CREATE POLICY "Authenticated users can read fdv_leverandorer"
ON fdv_leverandorer FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert fdv_leverandorer"
ON fdv_leverandorer FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update fdv_leverandorer"
ON fdv_leverandorer FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete fdv_leverandorer"
ON fdv_leverandorer FOR DELETE TO authenticated USING (true);

-- Produkttyper - alle autentiserte brukere kan lese og skrive
CREATE POLICY "Authenticated users can read fdv_produkttyper"
ON fdv_produkttyper FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert fdv_produkttyper"
ON fdv_produkttyper FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update fdv_produkttyper"
ON fdv_produkttyper FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete fdv_produkttyper"
ON fdv_produkttyper FOR DELETE TO authenticated USING (true);

-- Datablader - alle autentiserte brukere kan lese og skrive
CREATE POLICY "Authenticated users can read fdv_datablader"
ON fdv_datablader FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert fdv_datablader"
ON fdv_datablader FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update fdv_datablader"
ON fdv_datablader FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete fdv_datablader"
ON fdv_datablader FOR DELETE TO authenticated USING (true);

-- Anlegg-datablader kobling
CREATE POLICY "Authenticated users can read fdv_anlegg_datablader"
ON fdv_anlegg_datablader FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert fdv_anlegg_datablader"
ON fdv_anlegg_datablader FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update fdv_anlegg_datablader"
ON fdv_anlegg_datablader FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete fdv_anlegg_datablader"
ON fdv_anlegg_datablader FOR DELETE TO authenticated USING (true);

-- Genererte dokumenter
CREATE POLICY "Authenticated users can read fdv_genererte_dokumenter"
ON fdv_genererte_dokumenter FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert fdv_genererte_dokumenter"
ON fdv_genererte_dokumenter FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update fdv_genererte_dokumenter"
ON fdv_genererte_dokumenter FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete fdv_genererte_dokumenter"
ON fdv_genererte_dokumenter FOR DELETE TO authenticated USING (true);

-- Trigger for å oppdatere sist_oppdatert
CREATE OR REPLACE FUNCTION update_fdv_sist_oppdatert()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sist_oppdatert = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fdv_leverandorer_updated
    BEFORE UPDATE ON fdv_leverandorer
    FOR EACH ROW EXECUTE FUNCTION update_fdv_sist_oppdatert();

CREATE TRIGGER fdv_produkttyper_updated
    BEFORE UPDATE ON fdv_produkttyper
    FOR EACH ROW EXECUTE FUNCTION update_fdv_sist_oppdatert();

CREATE TRIGGER fdv_datablader_updated
    BEFORE UPDATE ON fdv_datablader
    FOR EACH ROW EXECUTE FUNCTION update_fdv_sist_oppdatert();

-- Legg til noen standard leverandører
INSERT INTO fdv_leverandorer (navn) VALUES 
    ('Autronica'),
    ('Hochiki'),
    ('Honeywell'),
    ('Siemens'),
    ('Bosch'),
    ('Notifier'),
    ('Apollo'),
    ('System Sensor'),
    ('Hekatron'),
    ('Esser'),
    ('Schrack Seconet'),
    ('Tyco'),
    ('UTC Fire & Security'),
    ('Annet')
ON CONFLICT (navn) DO NOTHING;

-- Legg til noen standard produkttyper
INSERT INTO fdv_produkttyper (navn) VALUES 
    ('Røykdetektor'),
    ('Varmedetektor'),
    ('Flammedetektor'),
    ('Multidetektor'),
    ('Linjedetektor'),
    ('Aspirerende detektor'),
    ('Brannmelder'),
    ('Sirene'),
    ('Klokke'),
    ('Blitzlys'),
    ('Talevarsler'),
    ('Brannsentral'),
    ('Sløyfekort'),
    ('Strømforsyning'),
    ('Batteri'),
    ('Kabel'),
    ('Røykluke'),
    ('Nødlys'),
    ('Slukkeutstyr'),
    ('Sprinkler'),
    ('Annet')
ON CONFLICT (navn) DO NOTHING;

-- Storage bucket for FDV datablader (public for direct PDF access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('fdv-datablader', 'fdv-datablader', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for FDV datablader bucket
CREATE POLICY "Authenticated users can upload FDV datablader"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'fdv-datablader');

CREATE POLICY "Authenticated users can read FDV datablader"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'fdv-datablader');

CREATE POLICY "Authenticated users can update FDV datablader"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'fdv-datablader');

CREATE POLICY "Authenticated users can delete FDV datablader"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'fdv-datablader');
