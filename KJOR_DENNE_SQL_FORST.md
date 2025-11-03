# ⚠️ VIKTIG: Kjør denne SQL-en først!

## Problem
Du får denne feilen når du prøver å opprette oppgaver fra møter:
```
insert or update on table "oppgaver" violates foreign key constraint "oppgaver_anlegg_id_fkey"
```

## Løsning: Kjør denne SQL-en NÅ

### Gå til Supabase Dashboard
1. Åpne [Supabase Dashboard](https://supabase.com/dashboard)
2. Velg prosjektet ditt
3. Klikk på "SQL Editor" i venstremenyen
4. Klikk "New query"

### Kopier og lim inn denne SQL-en (ALLE 4 FILER):

#### 1. Gjør felter nullable:
```sql
-- Gjør anlegg_id og kunde_id nullable i oppgaver-tabellen
ALTER TABLE oppgaver ALTER COLUMN anlegg_id DROP NOT NULL;
ALTER TABLE oppgaver ALTER COLUMN kunde_id DROP NOT NULL;

-- Oppdater foreign key constraints til å tillate NULL
ALTER TABLE oppgaver DROP CONSTRAINT IF EXISTS oppgaver_anlegg_id_fkey;
ALTER TABLE oppgaver ADD CONSTRAINT oppgaver_anlegg_id_fkey 
  FOREIGN KEY (anlegg_id) REFERENCES anlegg(id) ON DELETE SET NULL;

ALTER TABLE oppgaver DROP CONSTRAINT IF EXISTS oppgaver_kunde_id_fkey;
ALTER TABLE oppgaver ADD CONSTRAINT oppgaver_kunde_id_fkey 
  FOREIGN KEY (kunde_id) REFERENCES customer(id) ON DELETE SET NULL;
```

#### 2. Legg til mote_id:
```sql
-- Legg til mote_id kolonne i oppgaver-tabellen
ALTER TABLE oppgaver ADD COLUMN IF NOT EXISTS mote_id UUID REFERENCES moter(id) ON DELETE SET NULL;

-- Indeks for bedre ytelse
CREATE INDEX IF NOT EXISTS idx_oppgaver_mote_id ON oppgaver(mote_id);
```

#### 3. Opprett synkroniserings-triggers:
```sql
-- Funksjon for å synkronisere status fra oppgaver til mote_oppgaver
CREATE OR REPLACE FUNCTION sync_oppgave_status_to_mote()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.mote_id IS NOT NULL THEN
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

DROP TRIGGER IF EXISTS trigger_sync_mote_to_oppgave ON mote_oppgaver;
CREATE TRIGGER trigger_sync_mote_to_oppgave
  AFTER UPDATE OF status ON mote_oppgaver
  FOR EACH ROW
  EXECUTE FUNCTION sync_mote_oppgave_status_to_oppgave();
```

### Klikk "Run" (eller Ctrl/Cmd + Enter)

Du skal se:
```
Success. No rows returned
```

## Deretter:
1. **Refresh nettleseren** (Cmd+R / Ctrl+R)
2. Gå til Møter
3. Opprett en oppgave
4. Det skal nå fungere! ✅

## Hvis det fortsatt ikke fungerer:
- Sjekk at SQL-en ble kjørt uten feil
- Hard refresh: Cmd+Shift+R (Mac) eller Ctrl+Shift+R (Windows)
- Sjekk console for nye feilmeldinger
- Kontakt meg hvis problemet vedvarer

## Hva gjorde denne SQL-en?
- ✅ Tillater at `anlegg_id` kan være NULL (møteoppgaver trenger ikke anlegg)
- ✅ Tillater at `kunde_id` kan være NULL (møteoppgaver trenger ikke kunde)
- ✅ Oppdaterer foreign key constraints til å håndtere NULL-verdier
- ✅ Gjør det mulig å opprette generelle oppgaver fra møter

---

**Status:** Koden er oppdatert og klar. Du trenger bare å kjøre SQL-en! 🚀
