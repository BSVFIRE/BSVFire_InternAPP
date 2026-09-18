# Fiks: Foreign Key Constraint Error

## Problem
Når du prøver å opprette en oppgave fra et møte får du denne feilen:
```
insert or update on table "oppgaver" violates foreign key constraint "oppgaver_anlegg_id_fkey"
```

## Årsak
`oppgaver`-tabellen krever at `anlegg_id` og `kunde_id` må referere til eksisterende rader i `anlegg` og `customer` tabellene. Møteoppgaver er ikke alltid knyttet til et spesifikt anlegg eller kunde, så disse feltene må være nullable.

## Løsning

### Steg 1: Kjør SQL-fiks
Gå til Supabase Dashboard → SQL Editor og kjør:

```sql
-- Gjør anlegg_id og kunde_id nullable
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

Eller kjør filen:
```
supabase_migrations/fix_oppgaver_nullable_fields.sql
```

### Steg 2: Verifiser
Test at det fungerer:
1. Gå til Møter
2. Opprett et møte
3. Legg til en oppgave
4. Tildel til en tekniker
5. Oppgaven skal nå opprettes uten feil

### Steg 3: Sjekk at oppgaven ble opprettet
```sql
-- Se alle møteoppgaver
SELECT 
  oppgave_nummer,
  tittel,
  type,
  status,
  tekniker_id,
  mote_id,
  anlegg_id,
  kunde_id
FROM oppgaver
WHERE type = 'Møteoppgave'
ORDER BY opprettet_dato DESC;
```

## Hva skjer nå?
- ✅ Møteoppgaver kan opprettes uten anlegg_id eller kunde_id
- ✅ Vanlige oppgaver kan fortsatt ha anlegg_id og kunde_id
- ✅ Hvis et anlegg eller kunde slettes, settes oppgavens referanse til NULL (i stedet for å feile)

## Hvis det fortsatt ikke fungerer
1. Sjekk at SQL-en ble kjørt uten feil
2. Refresh nettleseren
3. Sjekk console for andre feilmeldinger
4. Verifiser at du har tilgang til å opprette oppgaver (RLS policies)
