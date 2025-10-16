# Sist Oppdatert - Implementasjonsguide

## Oversikt
Denne guiden beskriver implementeringen av `sist_oppdatert`-funksjonalitet for tabellene `anlegg`, `ordre`, `oppgaver` og `kontaktpersoner`.

## SQL-migrasjoner som må kjøres

Kjør følgende SQL-filer i Supabase SQL Editor i denne rekkefølgen:

1. **add_sist_oppdatert_to_anlegg.sql** ✅ (Allerede opprettet)
2. **add_sist_oppdatert_to_ordre.sql** ✅ (Ny)
3. **add_sist_oppdatert_to_oppgaver.sql** ✅ (Ny)
4. **add_sist_oppdatert_to_kontaktpersoner.sql** ✅ (Ny)

Hver migrasjon gjør følgende:
- Legger til `sist_oppdatert TIMESTAMPTZ` kolonne
- Oppdaterer eksisterende rader med `NOW()`
- Oppretter trigger-funksjon for automatisk oppdatering
- Oppretter trigger som kjører før UPDATE

## Kodeendringer gjort

### 1. TypeScript-typer (`src/lib/supabase.ts`)
Lagt til `sist_oppdatert: string | null` i følgende tabeller:
- ✅ `anlegg`
- ✅ `ordre`
- ✅ `oppgaver`
- ✅ `kontaktpersoner`

### 2. Ordre (`src/pages/Ordre.tsx`)
- ✅ Lagt til `sist_oppdatert` i `Ordre` interface
- ✅ Oppdaterer `sist_oppdatert` ved redigering av ordre (linje 825-828)
- ✅ Oppdaterer `sist_oppdatert` ved avslutning av ordre (linje 159-162)
- ✅ Oppdaterer `sist_oppdatert` ved avslutning fra detaljvisning (linje 1230-1233)
- ✅ Viser `sist_oppdatert` i detaljvisning (linje 1425-1430)

### 3. Oppgaver (`src/pages/Oppgaver.tsx`)
- ✅ Lagt til `sist_oppdatert` i `Oppgave` interface
- ✅ Oppdaterer `sist_oppdatert` ved redigering av oppgave (linje 626-629)
- ✅ Oppdaterer ordre sin `sist_oppdatert` når fakturaoppgave fullføres (linje 643-646)
- ✅ Viser `sist_oppdatert` i detaljvisning (linje 1000-1005)

### 4. Anlegg (`src/pages/Anlegg.tsx`)
- ✅ Allerede implementert (linje 638)
- ✅ Viser `sist_oppdatert` i detaljvisning (linje 1491-1496)

### 5. Kontaktpersoner (`src/pages/Kontaktpersoner.tsx`)
- ✅ Lagt til `sist_oppdatert` i `Kontaktperson` interface
- ✅ Viser `sist_oppdatert` i detaljvisning (linje 489-494)
- ℹ️ Ingen update-funksjonalitet implementert ennå (kun visning)

## Hvordan det fungerer

### Automatisk oppdatering (via database trigger)
Når en rad oppdateres i databasen, vil triggeren automatisk sette `sist_oppdatert` til `NOW()`.

### Manuell oppdatering (via kode)
I koden setter vi også `sist_oppdatert: new Date().toISOString()` eksplisitt når vi oppdaterer rader. Dette sikrer konsistens og gjør det tydelig i koden.

## Testing

Etter å ha kjørt migrasjonene, test følgende:

1. **Ordre**
   - Rediger en ordre → sjekk at `sist_oppdatert` oppdateres
   - Avslutt en ordre → sjekk at `sist_oppdatert` oppdateres
   - Vis ordredetaljer → sjekk at `sist_oppdatert` vises

2. **Oppgaver**
   - Rediger en oppgave → sjekk at `sist_oppdatert` oppdateres
   - Fullfør en fakturaoppgave → sjekk at både oppgave og ordre oppdateres
   - Vis oppgavedetaljer → sjekk at `sist_oppdatert` vises

3. **Anlegg**
   - Rediger et anlegg → sjekk at `sist_oppdatert` oppdateres
   - Vis anleggsdetaljer → sjekk at `sist_oppdatert` vises

4. **Kontaktpersoner**
   - Vis kontaktpersondetaljer → sjekk at `sist_oppdatert` vises (hvis den finnes)

## Fremtidige forbedringer

- Implementer redigeringsfunksjonalitet for kontaktpersoner
- Vurder å legge til `sist_oppdatert` i listevisninger (ikke bare detaljvisninger)
- Vurder å legge til `sist_oppdatert` i andre tabeller som `customer`, `prosjekter`, etc.
