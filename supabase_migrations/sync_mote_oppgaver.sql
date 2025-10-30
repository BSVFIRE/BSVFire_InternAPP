-- Funksjon for å synkronisere status fra oppgaver til mote_oppgaver
CREATE OR REPLACE FUNCTION sync_oppgave_status_to_mote()
RETURNS TRIGGER AS $$
BEGIN
  -- Hvis oppgaven har en mote_id, oppdater tilsvarende mote_oppgave
  IF NEW.mote_id IS NOT NULL THEN
    -- Konverter status fra oppgave-format til mote-format
    UPDATE mote_oppgaver
    SET status = CASE 
      WHEN NEW.status = 'Ikke påbegynt' THEN 'ikke_startet'
      WHEN NEW.status = 'Pågående' THEN 'pagaende'
      WHEN NEW.status = 'Fullført' THEN 'ferdig'
      WHEN NEW.status = 'Avbrutt' THEN 'avbrutt'
      ELSE 'ikke_startet'
    END,
    sist_oppdatert = NOW()
    WHERE mote_id = NEW.mote_id
    AND ansvarlig_id = NEW.tekniker_id
    AND tittel = NEW.tittel;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger som kjører når oppgaver oppdateres
DROP TRIGGER IF EXISTS trigger_sync_oppgave_to_mote ON oppgaver;
CREATE TRIGGER trigger_sync_oppgave_to_mote
  AFTER UPDATE OF status ON oppgaver
  FOR EACH ROW
  WHEN (NEW.mote_id IS NOT NULL)
  EXECUTE FUNCTION sync_oppgave_status_to_mote();

-- Funksjon for å synkronisere status fra mote_oppgaver til oppgaver
CREATE OR REPLACE FUNCTION sync_mote_oppgave_status_to_oppgave()
RETURNS TRIGGER AS $$
BEGIN
  -- Finn og oppdater tilsvarende oppgave
  UPDATE oppgaver
  SET status = CASE 
    WHEN NEW.status = 'ikke_startet' THEN 'Ikke påbegynt'
    WHEN NEW.status = 'pagaende' THEN 'Pågående'
    WHEN NEW.status = 'ferdig' THEN 'Fullført'
    WHEN NEW.status = 'avbrutt' THEN 'Avbrutt'
    ELSE 'Ikke påbegynt'
  END,
  sist_oppdatert = NOW()
  WHERE mote_id = NEW.mote_id
  AND tekniker_id = NEW.ansvarlig_id
  AND tittel = NEW.tittel
  AND type = 'Møteoppgave';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger som kjører når mote_oppgaver oppdateres
DROP TRIGGER IF EXISTS trigger_sync_mote_to_oppgave ON mote_oppgaver;
CREATE TRIGGER trigger_sync_mote_to_oppgave
  AFTER UPDATE OF status ON mote_oppgaver
  FOR EACH ROW
  EXECUTE FUNCTION sync_mote_oppgave_status_to_oppgave();

-- Kommentarer for dokumentasjon
COMMENT ON FUNCTION sync_oppgave_status_to_mote() IS 'Synkroniserer statusendringer fra oppgaver til mote_oppgaver';
COMMENT ON FUNCTION sync_mote_oppgave_status_to_oppgave() IS 'Synkroniserer statusendringer fra mote_oppgaver til oppgaver';
