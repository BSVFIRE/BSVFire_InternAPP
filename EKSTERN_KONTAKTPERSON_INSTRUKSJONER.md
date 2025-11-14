# Ekstern kontaktperson - Implementering

## Oversikt
Systemet er nå oppdatert til å bruke en sentral database for eksterne kontaktpersoner som kan gjenbrukes på tvers av anlegg. Dette betyr at du ikke lenger trenger å skrive inn samme informasjon (f.eks. Steinar Wedaa fra Total Sprinkler) på hvert anlegg.

## Steg for å ta i bruk

### 1. Kjør SQL-skriptet i Supabase
Åpne filen `OPPRETT_KONTAKTPERSON_EKSTERN.sql` og kjør innholdet i Supabase SQL Editor. Dette vil:
- Opprette tabellen `kontaktperson_ekstern`
- Legge til kolonnen `ekstern_kontaktperson_id` i `anlegg`-tabellen
- Sette opp nødvendige policies og indekser

### 2. Slik bruker du systemet

#### A. Administrer eksterne kontaktpersoner
1. Gå til den nye siden **Eksterne kontaktpersoner** (via `/ekstern-kontaktpersoner`)
2. Klikk på **"Ny kontaktperson"**
3. Fyll ut informasjon:
   - **Navn** (påkrevd) - f.eks. "Steinar Wedaa"
   - **Firma** - f.eks. "Total Sprinkler"
   - **Type ekstern tjeneste** - f.eks. "Sprinkler"
   - **Telefon** - f.eks. "92647569"
   - **E-post** - f.eks. "steinar@total-sprinkler.no"
   - **Notater** - Interne notater om kontaktpersonen
4. Klikk **"Opprett"**

#### B. Bruk eksterne kontaktpersoner på anlegg
1. Gå til **Anlegg** og opprett/rediger et anlegg
2. Velg **"Ekstern"** som kontrolltype
3. I seksjonen **"Ekstern informasjon"**:
   - **Søk** etter kontaktperson i søkefeltet (søker i navn, firma og type)
   - Velg kontaktperson fra dropdown-listen
   - All informasjon (navn, firma, telefon, e-post) fylles automatisk ut
   - Klikk på søppelbøtte-ikonet (🗑️) for å tømme valget
4. Lagre anlegget

#### C. Opprette nye eksterne kontaktpersoner
Du kan opprette nye eksterne kontaktpersoner på to måter:
1. **Fra Anlegg-siden**: Klikk på "Administrer eksterne kontakter" i ekstern-seksjonen
   - Du vil automatisk bli sendt tilbake til anlegget etter lagring
   - Bruk tilbake-pilen (←) for å gå tilbake uten å lagre
2. **Direkte**: Gå til `/ekstern-kontaktpersoner`

### 3. Fordeler med denne løsningen

✅ **Gjenbruk**: Skriv inn informasjon én gang, bruk på mange anlegg
✅ **Konsistens**: Samme informasjon på alle anlegg
✅ **Enkelt å oppdatere**: Endre telefonnummer ett sted, oppdateres overalt
✅ **Oversikt**: Se alle eksterne kontakter på ett sted
✅ **Søk**: Finn raskt kontakter basert på navn, firma eller type

### 4. Datastruktur

#### Tabell: `kontaktperson_ekstern`
- `id` - Unik ID
- `navn` - Navn på kontaktpersonen
- `firma` - Firmanavn
- `telefon` - Telefonnummer
- `epost` - E-postadresse
- `ekstern_type` - Type tjeneste (Sprinkler, Elektro, etc.)
- `notater` - Interne notater

#### Tabell: `anlegg` (nye kolonner)
- `ekstern_kontaktperson_id` - Referanse til `kontaktperson_ekstern`
- Eksisterende kolonner (`ekstern_type`, `ekstern_firma`, etc.) beholdes for kompatibilitet

### 5. Migrering av eksisterende data

Hvis du har eksisterende anlegg med ekstern informasjon:
1. Opprett eksterne kontaktpersoner basert på eksisterende data
2. Rediger anleggene og velg riktig kontaktperson fra dropdown
3. Systemet vil automatisk oppdatere alle felt

### 6. Feilsøking

**Problem**: Kan ikke se eksterne kontaktpersoner i dropdown
- **Løsning**: Sjekk at SQL-skriptet er kjørt og at tabellen eksisterer

**Problem**: Får feilmelding ved lagring
- **Løsning**: Sjekk at RLS policies er satt opp korrekt i Supabase

**Problem**: Gamle anlegg viser ikke ekstern informasjon
- **Løsning**: Rediger anlegget og velg kontaktperson på nytt fra dropdown

## Teknisk informasjon

### Filer som er endret/opprettet:
1. `OPPRETT_KONTAKTPERSON_EKSTERN.sql` - SQL-skript for database
2. `src/pages/EksternKontaktpersoner.tsx` - Ny side for administrasjon
3. `src/pages/Anlegg.tsx` - Oppdatert med dropdown og ny logikk
4. `src/App.tsx` - Lagt til rute for eksterne kontaktpersoner

### API-endepunkter:
- `GET /kontaktperson_ekstern` - Hent alle eksterne kontaktpersoner
- `POST /kontaktperson_ekstern` - Opprett ny ekstern kontaktperson
- `PATCH /kontaktperson_ekstern/:id` - Oppdater ekstern kontaktperson
- `DELETE /kontaktperson_ekstern/:id` - Slett ekstern kontaktperson

## Support
Hvis du har spørsmål eller problemer, kontakt utvikler.
