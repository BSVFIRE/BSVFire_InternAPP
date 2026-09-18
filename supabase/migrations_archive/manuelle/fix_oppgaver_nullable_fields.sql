-- Gjør anlegg_id og kunde_id nullable i oppgaver-tabellen
-- Dette er nødvendig for møteoppgaver som ikke alltid er knyttet til et spesifikt anlegg

-- Fjern NOT NULL constraint på anlegg_id hvis den eksisterer
ALTER TABLE oppgaver ALTER COLUMN anlegg_id DROP NOT NULL;

-- Fjern NOT NULL constraint på kunde_id hvis den eksisterer
ALTER TABLE oppgaver ALTER COLUMN kunde_id DROP NOT NULL;

-- Oppdater foreign key constraints til å tillate NULL
ALTER TABLE oppgaver DROP CONSTRAINT IF EXISTS oppgaver_anlegg_id_fkey;
ALTER TABLE oppgaver ADD CONSTRAINT oppgaver_anlegg_id_fkey 
  FOREIGN KEY (anlegg_id) REFERENCES anlegg(id) ON DELETE SET NULL;

ALTER TABLE oppgaver DROP CONSTRAINT IF EXISTS oppgaver_kunde_id_fkey;
ALTER TABLE oppgaver ADD CONSTRAINT oppgaver_kunde_id_fkey 
  FOREIGN KEY (kunde_id) REFERENCES customer(id) ON DELETE SET NULL;

-- Kommentar for dokumentasjon
COMMENT ON COLUMN oppgaver.anlegg_id IS 'Anlegg-ID (nullable for generelle oppgaver og møteoppgaver)';
COMMENT ON COLUMN oppgaver.kunde_id IS 'Kunde-ID (nullable for generelle oppgaver og møteoppgaver)';
