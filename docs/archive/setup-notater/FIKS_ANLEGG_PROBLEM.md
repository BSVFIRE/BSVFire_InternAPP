# Fiks Anlegg-problem

## Problem 1: "opprettet_dato" kolonne finnes ikke

### Årsak:
Supabase sin schema cache er ikke oppdatert, eller kolonnen heter noe annet.

### Løsning:

#### Steg 1: Sjekk hvilke kolonner som finnes
Kjør denne SQL-en i Supabase SQL Editor:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'anlegg'
ORDER BY ordinal_position;
```

#### Steg 2: Finn kolonnen for opprettelsesdato
Se etter en kolonne som heter en av disse:
- `opprettet_dato`
- `opprettet`
- `created_at`
- `created_date`

#### Steg 3A: Hvis kolonnen IKKE finnes
Kjør denne SQL-en for å legge den til:

```sql
ALTER TABLE anlegg
ADD COLUMN IF NOT EXISTS opprettet_dato TIMESTAMP WITH TIME ZONE DEFAULT NOW();
```

#### Steg 3B: Hvis kolonnen heter noe annet (f.eks. "created_at")
Du trenger ikke gjøre noe! Koden er allerede oppdatert til å IKKE sende denne kolonnen.
Databasen setter den automatisk.

#### Steg 4: Refresh Supabase Schema Cache
1. Gå til Supabase Dashboard
2. Klikk på **Table Editor**
3. Velg `anlegg`-tabellen
4. Dette refresher schema cache

---

## Problem 2: Kan ikke slette anlegg (409 Conflict)

### Årsak:
Anlegget har relaterte data som må slettes først:
- Priser i `priser_kundenummer`
- Dokumenter i `dokumenter`
- Kontaktpersoner i `anlegg_kontaktpersoner`
- Ordre i `ordre`
- Oppgaver i `oppgaver`

### Løsning A: Slett relaterte data manuelt

Kjør disse SQL-ene i rekkefølge (erstatt `ANLEGG_ID` med faktisk ID):

```sql
-- 1. Slett priser
DELETE FROM priser_kundenummer WHERE anlegg_id = 'ANLEGG_ID';

-- 2. Slett dokumenter
DELETE FROM dokumenter WHERE anlegg_id = 'ANLEGG_ID';

-- 3. Slett kontaktperson-koblinger
DELETE FROM anlegg_kontaktpersoner WHERE anlegg_id = 'ANLEGG_ID';

-- 4. Slett ordre
DELETE FROM ordre WHERE anlegg_id = 'ANLEGG_ID';

-- 5. Slett oppgaver
DELETE FROM oppgaver WHERE anlegg_id = 'ANLEGG_ID';

-- 6. Slett anlegget
DELETE FROM anlegg WHERE id = 'ANLEGG_ID';
```

### Løsning B: Legg til CASCADE i foreign keys (anbefalt)

Dette gjør at relaterte data slettes automatisk når anlegget slettes.

```sql
-- Eksempel for priser_kundenummer
ALTER TABLE priser_kundenummer
DROP CONSTRAINT IF EXISTS priser_kundenummer_anlegg_id_fkey,
ADD CONSTRAINT priser_kundenummer_anlegg_id_fkey 
  FOREIGN KEY (anlegg_id) 
  REFERENCES anlegg(id) 
  ON DELETE CASCADE;

-- Gjør det samme for andre tabeller
ALTER TABLE dokumenter
DROP CONSTRAINT IF EXISTS dokumenter_anlegg_id_fkey,
ADD CONSTRAINT dokumenter_anlegg_id_fkey 
  FOREIGN KEY (anlegg_id) 
  REFERENCES anlegg(id) 
  ON DELETE CASCADE;

ALTER TABLE anlegg_kontaktpersoner
DROP CONSTRAINT IF EXISTS anlegg_kontaktpersoner_anlegg_id_fkey,
ADD CONSTRAINT anlegg_kontaktpersoner_anlegg_id_fkey 
  FOREIGN KEY (anlegg_id) 
  REFERENCES anlegg(id) 
  ON DELETE CASCADE;
```

---

## Rask løsning for testing

Hvis du bare vil teste på nytt raskt:

### 1. Finn anlegg ID
```sql
SELECT id, anleggsnavn FROM anlegg ORDER BY opprettet_dato DESC LIMIT 5;
```

### 2. Slett alt relatert til anlegget
```sql
-- Erstatt 'DIN_ANLEGG_ID' med faktisk ID
DO $$
DECLARE
  anlegg_id_var UUID := 'DIN_ANLEGG_ID';
BEGIN
  DELETE FROM priser_kundenummer WHERE anlegg_id = anlegg_id_var;
  DELETE FROM dokumenter WHERE anlegg_id = anlegg_id_var;
  DELETE FROM anlegg_kontaktpersoner WHERE anlegg_id = anlegg_id_var;
  DELETE FROM ordre WHERE anlegg_id = anlegg_id_var;
  DELETE FROM oppgaver WHERE anlegg_id = anlegg_id_var;
  DELETE FROM anlegg WHERE id = anlegg_id_var;
  
  RAISE NOTICE 'Anlegg og relaterte data slettet!';
END $$;
```

### 3. Slett også tilbudet hvis du vil
```sql
DELETE FROM serviceavtale_tilbud WHERE id = 'TILBUD_ID';
```

---

## Test igjen

Etter at du har fikset problemene:

1. **Opprett nytt tilbud**
2. **Fyll ut alle felt** (inkludert anleggsnavn)
3. **Godkjenn tilbudet**
4. **Sjekk at:**
   - ✅ Anlegg opprettes
   - ✅ Priser legges inn
   - ✅ PDF lagres
   - ✅ PDF kan åpnes

God testing! 🚀
