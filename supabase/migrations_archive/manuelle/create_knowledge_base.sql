-- Opprett kunnskapsbase tabell for AI
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  source TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeks for søk
CREATE INDEX IF NOT EXISTS knowledge_base_category_idx ON knowledge_base (category);
CREATE INDEX IF NOT EXISTS knowledge_base_source_idx ON knowledge_base (source);

-- RLS policies
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read knowledge base"
  ON knowledge_base FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage knowledge base"
  ON knowledge_base FOR ALL
  TO service_role
  USING (true);

-- Eksempel data: NS3960 krav til manuell melder
INSERT INTO knowledge_base (title, content, category, source, metadata) VALUES
(
  'NS3960 - Krav til manuelle meldere',
  'Manuelle meldere skal plasseres slik at de er lett tilgjengelige og synlige. 
  
Krav:
- Monteringshøyde: 0,9-1,5 meter over gulv
- Maksimal avstand mellom meldere: 40 meter
- Maksimal avstand til nærmeste melder: 25 meter
- Skal være synlig merket med "BRANNALARM"
- Skal ha rød farge
- Skal være beskyttet mot utilsiktet aktivering
- Skal kunne aktiveres med én hånd
- Skal gi tydelig tilbakemelding når aktivert

Plassering:
- Ved alle utganger
- I alle rømningsveier
- Ved trapper
- I alle etasjer

Testing:
- Skal testes minimum én gang per år
- Alle meldere skal testes
- Skal dokumenteres i kontrollrapport',
  'Standard',
  'NS3960:2022',
  '{"standard": "NS3960", "versjon": "2022", "kapittel": "Manuelle meldere"}'
),
(
  'NS3960 - Krav til røykdetektorer',
  'Røykdetektorer skal plasseres i henhold til NS3960 standard.

Krav:
- Maksimal avstand mellom detektorer: 10 meter (åpent rom)
- Maksimal avstand til vegg: 5 meter
- Minimum avstand fra vegg: 0,5 meter
- Skal monteres i tak eller høyt på vegg
- Skal ikke plasseres i hjørner
- Skal ikke plasseres nær ventilasjonsåpninger

Vedlikehold:
- Skal testes minimum én gang per år
- Skal rengjøres ved behov
- Skal skiftes etter produsentens anbefalinger (typisk 10 år)

Dokumentasjon:
- Alle detektorer skal registreres
- Plassering skal dokumenteres i tegninger
- Testing skal dokumenteres i kontrollrapport',
  'Standard',
  'NS3960:2022',
  '{"standard": "NS3960", "versjon": "2022", "kapittel": "Røykdetektorer"}'
);

-- Legg til kommentar
COMMENT ON TABLE knowledge_base IS 'Kunnskapsbase for AI-assistent - inneholder standarder, prosedyrer og annen dokumentasjon';
