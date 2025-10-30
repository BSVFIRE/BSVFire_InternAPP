-- Tabell for møter
CREATE TABLE IF NOT EXISTS moter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tittel TEXT NOT NULL,
  beskrivelse TEXT,
  mote_dato TIMESTAMPTZ NOT NULL,
  varighet_minutter INTEGER DEFAULT 60,
  lokasjon TEXT,
  status TEXT DEFAULT 'planlagt' CHECK (status IN ('planlagt', 'pagaende', 'avsluttet', 'avlyst')),
  opprettet_av UUID REFERENCES auth.users(id),
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

-- Tabell for møtedeltakere
CREATE TABLE IF NOT EXISTS mote_deltakere (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mote_id UUID NOT NULL REFERENCES moter(id) ON DELETE CASCADE,
  ansatt_id UUID NOT NULL REFERENCES ansatte(id) ON DELETE CASCADE,
  rolle TEXT DEFAULT 'deltaker' CHECK (rolle IN ('deltaker', 'moteleder', 'referent')),
  status TEXT DEFAULT 'invitert' CHECK (status IN ('invitert', 'bekreftet', 'avslatt', 'motte_opp')),
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mote_id, ansatt_id)
);

-- Tabell for agendapunkter
CREATE TABLE IF NOT EXISTS mote_agendapunkter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mote_id UUID NOT NULL REFERENCES moter(id) ON DELETE CASCADE,
  tittel TEXT NOT NULL,
  beskrivelse TEXT,
  rekkefolgje INTEGER NOT NULL,
  estimert_tid_minutter INTEGER,
  ansvarlig_id UUID REFERENCES ansatte(id),
  status TEXT DEFAULT 'ikke_startet' CHECK (status IN ('ikke_startet', 'pagaende', 'ferdig', 'utsatt')),
  opprettet_av UUID REFERENCES auth.users(id),
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

-- Tabell for møtereferat
CREATE TABLE IF NOT EXISTS mote_referater (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mote_id UUID NOT NULL REFERENCES moter(id) ON DELETE CASCADE,
  agendapunkt_id UUID REFERENCES mote_agendapunkter(id) ON DELETE SET NULL,
  innhold TEXT NOT NULL,
  type TEXT DEFAULT 'notat' CHECK (type IN ('notat', 'beslutning', 'oppgave', 'informasjon')),
  skrevet_av UUID REFERENCES auth.users(id),
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

-- Tabell for møteoppgaver (oppfølging fra møter)
CREATE TABLE IF NOT EXISTS mote_oppgaver (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mote_id UUID NOT NULL REFERENCES moter(id) ON DELETE CASCADE,
  agendapunkt_id UUID REFERENCES mote_agendapunkter(id) ON DELETE SET NULL,
  tittel TEXT NOT NULL,
  beskrivelse TEXT,
  ansvarlig_id UUID REFERENCES ansatte(id),
  forfallsdato DATE,
  status TEXT DEFAULT 'ikke_startet' CHECK (status IN ('ikke_startet', 'pagaende', 'ferdig', 'avbrutt')),
  prioritet TEXT DEFAULT 'medium' CHECK (prioritet IN ('lav', 'medium', 'hoy', 'kritisk')),
  opprettet_av UUID REFERENCES auth.users(id),
  opprettet_dato TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW()
);

-- Indekser for bedre ytelse
CREATE INDEX IF NOT EXISTS idx_moter_dato ON moter(mote_dato);
CREATE INDEX IF NOT EXISTS idx_moter_status ON moter(status);
CREATE INDEX IF NOT EXISTS idx_mote_deltakere_mote ON mote_deltakere(mote_id);
CREATE INDEX IF NOT EXISTS idx_mote_deltakere_ansatt ON mote_deltakere(ansatt_id);
CREATE INDEX IF NOT EXISTS idx_mote_agendapunkter_mote ON mote_agendapunkter(mote_id);
CREATE INDEX IF NOT EXISTS idx_mote_referater_mote ON mote_referater(mote_id);
CREATE INDEX IF NOT EXISTS idx_mote_oppgaver_mote ON mote_oppgaver(mote_id);
CREATE INDEX IF NOT EXISTS idx_mote_oppgaver_ansvarlig ON mote_oppgaver(ansvarlig_id);

-- Trigger for å oppdatere sist_oppdatert
CREATE OR REPLACE FUNCTION update_moter_sist_oppdatert()
RETURNS TRIGGER AS $$
BEGIN
  NEW.sist_oppdatert = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER moter_sist_oppdatert
  BEFORE UPDATE ON moter
  FOR EACH ROW
  EXECUTE FUNCTION update_moter_sist_oppdatert();

CREATE TRIGGER mote_agendapunkter_sist_oppdatert
  BEFORE UPDATE ON mote_agendapunkter
  FOR EACH ROW
  EXECUTE FUNCTION update_moter_sist_oppdatert();

CREATE TRIGGER mote_referater_sist_oppdatert
  BEFORE UPDATE ON mote_referater
  FOR EACH ROW
  EXECUTE FUNCTION update_moter_sist_oppdatert();

CREATE TRIGGER mote_oppgaver_sist_oppdatert
  BEFORE UPDATE ON mote_oppgaver
  FOR EACH ROW
  EXECUTE FUNCTION update_moter_sist_oppdatert();

-- RLS Policies
ALTER TABLE moter ENABLE ROW LEVEL SECURITY;
ALTER TABLE mote_deltakere ENABLE ROW LEVEL SECURITY;
ALTER TABLE mote_agendapunkter ENABLE ROW LEVEL SECURITY;
ALTER TABLE mote_referater ENABLE ROW LEVEL SECURITY;
ALTER TABLE mote_oppgaver ENABLE ROW LEVEL SECURITY;

-- Policies for moter
CREATE POLICY "Alle kan se møter" ON moter FOR SELECT USING (true);
CREATE POLICY "Autentiserte kan opprette møter" ON moter FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Møteleder kan oppdatere møter" ON moter FOR UPDATE USING (
  auth.uid() IN (SELECT ansatt_id FROM mote_deltakere WHERE mote_id = id AND rolle = 'moteleder')
  OR auth.uid() = opprettet_av
);
CREATE POLICY "Møteleder kan slette møter" ON moter FOR DELETE USING (
  auth.uid() IN (SELECT ansatt_id FROM mote_deltakere WHERE mote_id = id AND rolle = 'moteleder')
  OR auth.uid() = opprettet_av
);

-- Policies for mote_deltakere
CREATE POLICY "Alle kan se deltakere" ON mote_deltakere FOR SELECT USING (true);
CREATE POLICY "Møteleder kan legge til deltakere" ON mote_deltakere FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT ansatt_id FROM mote_deltakere WHERE mote_id = mote_id AND rolle = 'moteleder')
  OR auth.uid() IN (SELECT opprettet_av FROM moter WHERE id = mote_id)
);
CREATE POLICY "Møteleder kan oppdatere deltakere" ON mote_deltakere FOR UPDATE USING (
  auth.uid() IN (SELECT ansatt_id FROM mote_deltakere WHERE mote_id = mote_id AND rolle = 'moteleder')
  OR auth.uid() IN (SELECT opprettet_av FROM moter WHERE id = mote_id)
);
CREATE POLICY "Møteleder kan slette deltakere" ON mote_deltakere FOR DELETE USING (
  auth.uid() IN (SELECT ansatt_id FROM mote_deltakere WHERE mote_id = mote_id AND rolle = 'moteleder')
  OR auth.uid() IN (SELECT opprettet_av FROM moter WHERE id = mote_id)
);

-- Policies for mote_agendapunkter
CREATE POLICY "Alle kan se agendapunkter" ON mote_agendapunkter FOR SELECT USING (true);
CREATE POLICY "Autentiserte kan opprette agendapunkter" ON mote_agendapunkter FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autentiserte kan oppdatere agendapunkter" ON mote_agendapunkter FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Møteleder kan slette agendapunkter" ON mote_agendapunkter FOR DELETE USING (
  auth.uid() IN (SELECT ansatt_id FROM mote_deltakere WHERE mote_id = mote_id AND rolle = 'moteleder')
  OR auth.uid() = opprettet_av
);

-- Policies for mote_referater
CREATE POLICY "Alle kan se referater" ON mote_referater FOR SELECT USING (true);
CREATE POLICY "Autentiserte kan skrive referater" ON mote_referater FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Forfatter kan oppdatere referater" ON mote_referater FOR UPDATE USING (auth.uid() = skrevet_av);
CREATE POLICY "Forfatter kan slette referater" ON mote_referater FOR DELETE USING (auth.uid() = skrevet_av);

-- Policies for mote_oppgaver
CREATE POLICY "Alle kan se møteoppgaver" ON mote_oppgaver FOR SELECT USING (true);
CREATE POLICY "Autentiserte kan opprette møteoppgaver" ON mote_oppgaver FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autentiserte kan oppdatere møteoppgaver" ON mote_oppgaver FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Opprettet av kan slette møteoppgaver" ON mote_oppgaver FOR DELETE USING (auth.uid() = opprettet_av);
