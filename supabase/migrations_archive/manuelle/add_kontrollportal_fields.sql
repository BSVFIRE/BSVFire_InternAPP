-- Legg til felter for Kontrollportal-integrasjon i anlegg-tabellen
ALTER TABLE anlegg
ADD COLUMN IF NOT EXISTS unik_kode TEXT,
ADD COLUMN IF NOT EXISTS kontrollportal_url TEXT;

-- Legg til kommentar for dokumentasjon
COMMENT ON COLUMN anlegg.unik_kode IS 'Unik kode fra QR-klistremerke som brukes i Kontrollportal';
COMMENT ON COLUMN anlegg.kontrollportal_url IS 'Direkte link til loggboken i Kontrollportal';

-- Opprett indeks for raskere søk på unik_kode
CREATE INDEX IF NOT EXISTS idx_anlegg_unik_kode ON anlegg(unik_kode);
