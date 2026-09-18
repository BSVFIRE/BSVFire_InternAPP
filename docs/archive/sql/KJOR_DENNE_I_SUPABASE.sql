-- ============================================================================
-- INSTRUKSJONER:
-- 1. Åpne Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Gå til SQL Editor
-- 3. Kopier og lim inn HELE denne filen
-- 4. Trykk "Run" eller Cmd+Enter
-- ============================================================================

-- Automatisk oppdatering av kontroll_status basert på tjenestestatus
-- Når alle aktuelle tjenester er fullført, settes kontroll_status til 'Utført'

-- Funksjon som sjekker om alle tjenester er fullført
CREATE OR REPLACE FUNCTION check_and_update_kontroll_status()
RETURNS TRIGGER AS $$
DECLARE
  alle_fullfort BOOLEAN;
  har_tjenester BOOLEAN;
BEGIN
  -- Sjekk om anlegget har noen kontrolltyper definert
  har_tjenester := NEW.kontroll_type IS NOT NULL AND array_length(NEW.kontroll_type, 1) > 0;
  
  -- Hvis ingen kontrolltyper er definert, ikke oppdater status
  IF NOT har_tjenester THEN
    RETURN NEW;
  END IF;
  
  -- Initialiser som true, vil bli false hvis noen ikke er fullført
  alle_fullfort := TRUE;
  
  -- Sjekk hver kontrolltype og tilhørende status
  IF 'Brannalarm' = ANY(NEW.kontroll_type) THEN
    IF NOT COALESCE(NEW.brannalarm_fullfort, FALSE) THEN
      alle_fullfort := FALSE;
    END IF;
  END IF;
  
  IF 'Nødlys' = ANY(NEW.kontroll_type) THEN
    IF NOT COALESCE(NEW.nodlys_fullfort, FALSE) THEN
      alle_fullfort := FALSE;
    END IF;
  END IF;
  
  IF 'Røykluker' = ANY(NEW.kontroll_type) THEN
    IF NOT COALESCE(NEW.roykluker_fullfort, FALSE) THEN
      alle_fullfort := FALSE;
    END IF;
  END IF;
  
  IF 'Slukkeutstyr' = ANY(NEW.kontroll_type) THEN
    IF NOT COALESCE(NEW.slukkeutstyr_fullfort, FALSE) THEN
      alle_fullfort := FALSE;
    END IF;
  END IF;
  
  IF 'Ekstern' = ANY(NEW.kontroll_type) THEN
    IF NOT COALESCE(NEW.ekstern_fullfort, FALSE) THEN
      alle_fullfort := FALSE;
    END IF;
  END IF;
  
  -- Oppdater kontroll_status basert på om alle er fullført
  IF alle_fullfort THEN
    NEW.kontroll_status := 'Utført';
  ELSIF NEW.kontroll_status = 'Utført' THEN
    -- Hvis status var 'Utført' men ikke alle er fullført lenger, sett til 'Ikke utført'
    NEW.kontroll_status := 'Ikke utført';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Opprett trigger som kjører før INSERT eller UPDATE
DROP TRIGGER IF EXISTS trigger_auto_update_kontroll_status ON anlegg;
CREATE TRIGGER trigger_auto_update_kontroll_status
  BEFORE INSERT OR UPDATE OF 
    brannalarm_fullfort, 
    nodlys_fullfort, 
    roykluker_fullfort, 
    slukkeutstyr_fullfort, 
    ekstern_fullfort,
    kontroll_type
  ON anlegg
  FOR EACH ROW
  EXECUTE FUNCTION check_and_update_kontroll_status();

-- Kommentar for dokumentasjon
COMMENT ON FUNCTION check_and_update_kontroll_status() IS 
  'Automatisk oppdaterer kontroll_status til Utført når alle aktuelle tjenester er fullført';

-- ============================================================================
-- FERDIG! 
-- Nå vil kontroll_status automatisk oppdateres når du endrer tjenestestatus
-- ============================================================================
