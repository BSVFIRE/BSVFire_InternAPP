# Instruksjoner: Legg til Ekstern Type-kolonner

## Problem
Når du prøver å lagre et tilbud med ekstern tjeneste, får du en feilmelding fordi kolonnene `ekstern_type` og `ekstern_type_annet` ikke eksisterer i databasen ennå.

## Løsning

### Steg 1: Åpne Supabase SQL Editor

1. Gå til [Supabase Dashboard](https://supabase.com/dashboard)
2. Velg ditt prosjekt
3. Klikk på **SQL Editor** i venstre meny

### Steg 2: Kjør SQL-migrasjonen

1. Kopier innholdet fra filen `LEGG_TIL_EKSTERN_TYPE.sql`
2. Lim inn i SQL Editor
3. Klikk **Run** eller trykk `Ctrl+Enter` / `Cmd+Enter`

### Steg 3: Verifiser at kolonnene er lagt til

Kjør denne SQL-en for å sjekke:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'serviceavtale_tilbud' 
  AND column_name IN ('ekstern_type', 'ekstern_type_annet');
```

Du skal se to rader:
- `ekstern_type` | `text`
- `ekstern_type_annet` | `text`

### Steg 4: Test applikasjonen

1. Gå tilbake til applikasjonen
2. Opprett et nytt tilbud
3. Velg "Eksternt" tjeneste
4. Velg en type (f.eks. "Sprinkler")
5. Lagre tilbudet
6. Det skal nå fungere uten feil! ✅

## Hva gjør SQL-en?

SQL-migrasjonen legger til to nye kolonner i `serviceavtale_tilbud`-tabellen:

1. **`ekstern_type`** (TEXT)
   - Lagrer valgt type: Sprinkler, Elektro, Ventilasjon, Rør, Gass anlegg, Slukke anlegg, eller Annet
   - Valgfri (kan være NULL)

2. **`ekstern_type_annet`** (TEXT)
   - Lagrer fritekst beskrivelse når "Annet" er valgt
   - Valgfri (kan være NULL)

## Hvis du får feil

### Feil: "permission denied"
- Du må ha admin-tilgang til Supabase-prosjektet
- Kontakt prosjektadministrator

### Feil: "column already exists"
- Kolonnene er allerede lagt til
- Applikasjonen skal fungere nå

### Feil: "table does not exist"
- Sjekk at du er koblet til riktig database
- Verifiser at tabellen `serviceavtale_tilbud` eksisterer

## Etter migrasjonen

Når SQL-en er kjørt, vil alle nye tilbud kunne lagre ekstern type-informasjon:

- ✅ Dropdown for ekstern type vises
- ✅ Valgt type lagres i databasen
- ✅ Type vises i tilbudslisten
- ✅ Type vises i tilbudsdetaljer
- ✅ Type inkluderes i PDF-en
- ✅ Type lagres ved godkjenning

## Eksisterende tilbud

Eksisterende tilbud som allerede har "Eksternt" valgt:
- Vil ha `ekstern_type = NULL`
- Vil vise bare "Eksternt" (uten type)
- Kan redigeres for å legge til type

## Spørsmål?

Hvis du har problemer, sjekk:
1. At du er logget inn i riktig Supabase-prosjekt
2. At du har admin-tilgang
3. At SQL-en kjørte uten feil
4. At kolonnene vises i tabellstrukturen
