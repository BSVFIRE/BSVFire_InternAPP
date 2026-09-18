# Møtemodul

En komplett løsning for å administrere møter, agendapunkter, referater og oppfølgingsoppgaver.

## Funksjoner

### 1. Møteadministrasjon
- **Opprett møter** med tittel, beskrivelse, dato/tid, varighet og lokasjon
- **Legg til deltakere** med roller (deltaker, møteleder, referent)
- **Statusadministrasjon**: Planlagt → Pågående → Avsluttet
- **Filtrer møter** etter status
- **Slett møter** (kun møteleder/opprettet av)

### 2. Agendapunkter
- Legg til agendapunkter med tittel og beskrivelse
- Sett estimert tid per punkt
- Tildel ansvarlig person
- Spor status: Ikke startet → Pågående → Ferdig → Utsatt
- Automatisk rekkefølge

### 3. Referat
- Skriv referat under møtet
- Kategoriser notater:
  - **Notat**: Generelle notater
  - **Beslutning**: Vedtak og beslutninger
  - **Oppgave**: Oppgaver som må følges opp
  - **Informasjon**: Viktig informasjon
- Koble referat til spesifikke agendapunkter
- Tidsstempel på alle notater

### 4. Oppfølgingsoppgaver
- Opprett oppgaver fra møtet
- Tildel ansvarlig person
- Sett forfallsdato
- Prioritetsnivåer: Lav, Medium, Høy, Kritisk
- Koble oppgaver til agendapunkter
- Spor status: Ikke startet → Pågående → Ferdig → Avbrutt

## Database-struktur

### Tabeller
- **moter**: Hovedtabell for møter
- **mote_deltakere**: Kobler ansatte til møter med roller
- **mote_agendapunkter**: Agendapunkter for hvert møte
- **mote_referater**: Referat og notater fra møter
- **mote_oppgaver**: Oppfølgingsoppgaver fra møter

### RLS (Row Level Security)
- Alle kan se møter, deltakere, agendapunkter, referater og oppgaver
- Kun autentiserte brukere kan opprette innhold
- Møteleder og opprettet av kan oppdatere/slette møter
- Forfatter kan oppdatere egne referater

## Bruk

### Opprett et møte
1. Klikk "Nytt møte"
2. Fyll inn møtedetaljer
3. Velg deltakere og tildel roller
4. Klikk "Opprett møte"

### Under møtet
1. Start møtet ved å klikke "Start møte"-knappen
2. Gå gjennom agendapunkter og marker dem som pågående/ferdig
3. Skriv referat i "Referat"-fanen
4. Opprett oppgaver i "Oppgaver"-fanen
5. Avslutt møtet når dere er ferdige

### Etter møtet
- Gjennomgå referatet
- Følg opp oppgaver
- Forbered neste møte ved å legge til nye agendapunkter

## Navigasjon
Møtemodulen er tilgjengelig i hovedmenyen under "Møter" (📅 ikon).

## Migrering
Kjør følgende SQL-fil for å opprette databasestrukturen:
```bash
supabase_migrations/create_moter_tables.sql
```

## Komponenter
- `src/pages/Moter.tsx` - Hovedside
- `src/components/moter/MoteDialog.tsx` - Dialog for å opprette møter
- `src/components/moter/MoteDetaljer.tsx` - Detaljvisning av møte
- `src/components/moter/AgendaDialog.tsx` - Dialog for agendapunkter
- `src/components/moter/ReferatDialog.tsx` - Dialog for referat
- `src/components/moter/OppgaveDialog.tsx` - Dialog for oppgaver

## Tips
- Bruk "Tirsdagsmøte" som mal for ukentlige møter
- Legg til faste agendapunkter som "Gjennomgang av forrige uke" og "Planlegging av neste uke"
- Tildel en referent for hvert møte
- Opprett oppgaver direkte fra møtet for rask oppfølging
