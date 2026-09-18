# Fiks: Kan ikke slette anlegg (409 Conflict)

## Problem
Når du prøver å slette et anlegg får du en 409 Conflict-feil. Dette skjer fordi det finnes tabeller i databasen som har foreign keys til `anlegg(id)` uten `ON DELETE CASCADE`.

## Årsak
Når en tabell har en foreign key til `anlegg(id)` uten `ON DELETE CASCADE`, vil PostgreSQL blokkere sletting av anlegget hvis det finnes data i den tabellen som refererer til anlegget. Dette er en sikkerhetsfunksjon for å forhindre utilsiktet tap av data.

## Løsning

### Steg 1: Kjør SQL-skriptet
1. Åpne Supabase Dashboard
2. Gå til SQL Editor
3. Åpne filen `FIX_ANLEGG_DELETE_CASCADE.sql`
4. Kopier innholdet og lim det inn i SQL Editor
5. Trykk "Run" eller Cmd+Enter

### Steg 2: Verifiser at det fungerer
1. Gå til applikasjonen
2. Prøv å slette et anlegg
3. Anlegget skal nå slettes uten feil

## Hva skriptet gjør
Skriptet gjør følgende:

1. **Finner alle foreign keys** som refererer til `anlegg(id)`
2. **Sjekker om de har CASCADE** delete
3. **Oppdaterer de som mangler** CASCADE delete

Dette betyr at når du sletter et anlegg, vil alle relaterte data (ordre, dokumenter, kontakter, etc.) automatisk bli slettet også.

## Tabeller som påvirkes
Følgende tabeller vil få CASCADE delete:
- `ordre` (hvis den har en foreign key til anlegg)
- `anlegg_kontaktpersoner` (hvis den eksisterer)
- Alle andre tabeller som har en foreign key til `anlegg(id)`

Følgende tabeller har allerede CASCADE delete:
- `dokumenter`
- `nodlys`
- `epost_logg`
- `servicerapporter`
- `evakueringsplan_status`
- `anleggsdata_roykluker`
- `kontroll_notater`

## Forbedret feilhåndtering
Koden i `Anlegg.tsx` er også oppdatert for å gi bedre feilmeldinger:

- **23503**: Foreign key constraint violation - viser melding om at det finnes tilknyttede data
- **42501**: Permission denied - viser melding om manglende tillatelser
- **Andre feil**: Viser den faktiske feilmeldingen fra databasen

## Viktig
Når du sletter et anlegg med CASCADE delete aktivert, vil **alle relaterte data bli slettet permanent**. Dette inkluderer:
- Ordre
- Dokumenter
- Kontakter
- Servicerapporter
- Nødlys-data
- Røykluke-data
- Og mer

Vær derfor sikker på at du virkelig vil slette anlegget før du bekrefter.

## Alternativ løsning
Hvis du ikke vil slette data, men bare skjule anlegget, kan du bruke "Skjul anlegg"-funksjonen i stedet. Dette vil skjule anlegget fra listen uten å slette noen data.
