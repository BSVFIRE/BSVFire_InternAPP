# Anlegg ToDo-liste - Instruksjoner

## Oversikt
En ToDo-liste funksjonalitet er nå lagt til for hvert anlegg. Dette gjør det enkelt å holde oversikt over oppgaver som må gjøres for det spesifikke anlegget.

## Oppsett

### 1. Kjør SQL-migrering
Før du kan bruke ToDo-listen, må du kjøre SQL-filen i Supabase:

1. Gå til Supabase Dashboard
2. Velg ditt prosjekt
3. Gå til SQL Editor
4. Åpne filen: `supabase_migrations/add_anlegg_todos.sql`
5. Kopier innholdet og lim det inn i SQL Editor
6. Kjør scriptet

Dette vil opprette:
- `anlegg_todos` tabell
- Nødvendige indekser
- RLS (Row Level Security) policies
- Trigger for automatisk oppdatering av `updated_at`

### 2. Verifiser tabellen
Sjekk at tabellen er opprettet:
```sql
SELECT * FROM anlegg_todos LIMIT 1;
```

## Bruk

### Hvor finner jeg ToDo-listen?
1. Gå til **Anlegg**-siden
2. Klikk på et anlegg for å se detaljer
3. Scroll ned til høyre kolonne
4. ToDo-listen vises mellom "Metadata" og "Ordre og Oppgaver"

### Opprette ny oppgave
1. Klikk på **"Ny oppgave"** knappen
2. Fyll ut:
   - **Tittel** (påkrevd): Kort beskrivelse av oppgaven
   - **Beskrivelse** (valgfritt): Detaljer om oppgaven
   - **Prioritet**: Velg Lav, Medium eller Høy
   - **Forfallsdato** (valgfritt): Når oppgaven skal være ferdig
   - **Tildel til** (valgfritt): Velg en ansatt som skal utføre oppgaven
3. Klikk **"Opprett oppgave"**

### Administrere oppgaver

#### Markere som fullført
- Klikk på avkrysningsboksen til venstre for oppgaven
- Oppgaven flyttes til "Fullførte oppgaver"-seksjonen

#### Redigere oppgave
- Klikk på blyant-ikonet (✏️) på oppgaven
- Oppdater feltene du ønsker å endre
- Klikk **"Lagre endringer"**

#### Slette oppgave
- Klikk på søppelbøtte-ikonet (🗑️) på oppgaven
- Bekreft slettingen

#### Vise fullførte oppgaver
- Klikk på **"Fullførte oppgaver (X)"** for å utvide/skjule listen
- Fullførte oppgaver vises med lavere opasitet
- Du kan angre fullføring ved å klikke på avkrysningsboksen igjen

## Funksjoner

### Indikator i anleggslisten
Når et anlegg har åpne (ikke fullførte) oppgaver, vises en **oransje badge** i anleggslisten:
- **Mobile visning**: Vises under kontrollstatus og kontrollmåned
- **Desktop visning**: Vises under kontrollstatus i Status-kolonnen
- **Format**: "X åpen" eller "X åpne" (avhengig av antall)
- **Ikon**: ClipboardList-ikon for enkel gjenkjenning

Dette gjør det enkelt å se hvilke anlegg som har ventende oppgaver uten å måtte åpne hvert anlegg.

### Prioritetsnivåer
- **Høy**: Rød farge - viktige oppgaver som må gjøres raskt
- **Medium**: Gul farge - normale oppgaver
- **Lav**: Blå farge - oppgaver med lav prioritet

### Sortering
Oppgaver sorteres automatisk:
1. Aktive oppgaver først, deretter fullførte
2. Etter prioritet (Høy → Medium → Lav)
3. Etter opprettelsesdato (nyeste først)

### Visuell indikasjon
- Aktive oppgaver har en farget venstre kant basert på prioritet
- Fullførte oppgaver vises med grønn hake og lavere opasitet
- Forfallsdato vises med kalender-ikon
- Tildelt person vises med bruker-ikon

## Database-struktur

### Tabell: `anlegg_todos`
- `id`: UUID (primærnøkkel)
- `anlegg_id`: UUID (referanse til anlegg)
- `tittel`: TEXT (påkrevd)
- `beskrivelse`: TEXT (valgfritt)
- `fullfort`: BOOLEAN (standard: false)
- `prioritet`: TEXT ('Lav', 'Medium', 'Høy')
- `forfallsdato`: DATE (valgfritt)
- `opprettet_av`: UUID (referanse til auth.users)
- `tildelt_til`: UUID (referanse til ansatte)
- `created_at`: TIMESTAMPTZ (automatisk)
- `updated_at`: TIMESTAMPTZ (automatisk oppdatert)

## Sikkerhet
- RLS (Row Level Security) er aktivert
- Alle autentiserte brukere kan:
  - Lese alle todos
  - Opprette nye todos
  - Oppdatere todos
  - Slette todos

## Tips
1. **Bruk prioritet**: Sett høy prioritet på kritiske oppgaver
2. **Legg til forfallsdato**: Hjelper med å holde oversikt over deadlines
3. **Tildel oppgaver**: Gjør det tydelig hvem som er ansvarlig
4. **Bruk beskrivelse**: Legg til detaljer for å unngå misforståelser
5. **Marker som fullført**: Hold listen ryddig ved å markere ferdige oppgaver

## Feilsøking

### Får ikke opprettet oppgave
- Sjekk at du har fylt ut tittel (påkrevd felt)
- Verifiser at du er logget inn
- Sjekk at SQL-migreringen er kjørt

### Ser ikke ToDo-listen
- Sjekk at du er inne på et spesifikt anlegg (ikke listen)
- Verifiser at komponenten er lastet (se etter loading-spinner)
- Sjekk konsollen for feilmeldinger

### Kan ikke redigere/slette
- Sjekk at du har nødvendige tillatelser
- Verifiser at RLS policies er satt opp korrekt

## Fremtidige forbedringer
Mulige utvidelser:
- E-postvarsling ved tildeling av oppgave
- Kommentarer på oppgaver
- Vedlegg/filer til oppgaver
- Filtrering og søk i oppgaver
- Eksport av oppgaver til PDF/Excel
- Integrasjon med kalender
