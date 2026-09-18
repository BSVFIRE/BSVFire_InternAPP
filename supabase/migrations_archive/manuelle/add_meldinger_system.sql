-- Legg til mottaker og lest-status i intern_kommentar tabellen
ALTER TABLE intern_kommentar
ADD COLUMN IF NOT EXISTS mottaker_id UUID REFERENCES ansatte(id),
ADD COLUMN IF NOT EXISTS lest BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS lest_dato TIMESTAMP WITH TIME ZONE;

-- Kommentarer
COMMENT ON COLUMN intern_kommentar.mottaker_id IS 'Tekniker som skal motta notatet som melding';
COMMENT ON COLUMN intern_kommentar.lest IS 'Om meldingen er lest av mottaker';
COMMENT ON COLUMN intern_kommentar.lest_dato IS 'Tidspunkt når meldingen ble lest';

-- Opprett indeks for raskere søk etter uleste meldinger
CREATE INDEX IF NOT EXISTS idx_intern_kommentar_mottaker_lest 
ON intern_kommentar(mottaker_id, lest) 
WHERE mottaker_id IS NOT NULL;

-- Opprett en view for å hente uleste meldinger med anleggsinformasjon
CREATE OR REPLACE VIEW uleste_meldinger AS
SELECT 
  ik.id,
  ik.anlegg_id,
  ik.kunde,
  ik.intern_kommentar,
  ik.created_at,
  ik.mottaker_id,
  a.anleggsnavn,
  c.navn as kunde_navn
FROM intern_kommentar ik
LEFT JOIN anlegg a ON ik.anlegg_id = a.id
LEFT JOIN customer c ON a.kundenr = c.id
WHERE ik.mottaker_id IS NOT NULL 
  AND ik.lest = FALSE;

COMMENT ON VIEW uleste_meldinger IS 'Viser alle uleste meldinger med anleggs- og kundeinformasjon';
