# Anlegg ToDo-liste - Implementert ✅

## Hva er nytt?
En komplett ToDo-liste funksjonalitet er nå tilgjengelig for hvert anlegg. Dette gjør det enkelt å holde oversikt over oppgaver som må gjøres for det spesifikke anlegget.

## Hurtigstart

### 1. Kjør SQL-migrering
```bash
# Åpne filen i Supabase SQL Editor og kjør:
supabase_migrations/add_anlegg_todos.sql
```

### 2. Bruk ToDo-listen
1. Gå til **Anlegg**-siden
2. Klikk på et anlegg
3. Finn ToDo-listen i høyre kolonne (under "Metadata")
4. Klikk **"Ny oppgave"** for å legge til en oppgave

## Funksjoner
✅ Opprett, rediger og slett oppgaver  
✅ Marker oppgaver som fullført  
✅ Sett prioritet (Lav, Medium, Høy)  
✅ Legg til forfallsdato  
✅ Tildel oppgaver til ansatte  
✅ Legg til beskrivelse  
✅ Vis/skjul fullførte oppgaver  
✅ Automatisk sortering etter prioritet  
✅ **Indikator i anleggslisten** - Se antall åpne oppgaver direkte i listen  

## Filer som er opprettet/endret

### Nye filer:
- `supabase_migrations/add_anlegg_todos.sql` - Database-migrering
- `src/components/AnleggTodoList.tsx` - ToDo-liste komponent
- `ANLEGG_TODO_INSTRUKSJONER.md` - Detaljert brukerveiledning

### Endrede filer:
- `src/pages/Anlegg.tsx` - Integrert ToDo-listen i AnleggDetails + indikator i anleggslisten
- `src/components/AnleggTodoList.tsx` - Callback for å oppdatere tellinger

## Database-tabell
Tabellen `anlegg_todos` inneholder:
- Tittel og beskrivelse
- Fullført-status
- Prioritet (Lav/Medium/Høy)
- Forfallsdato
- Tildelt til (ansatt)
- Opprettet av (bruker)
- Tidsstempler

## Neste steg
1. **Kjør SQL-migreringen** i Supabase
2. **Test funksjonaliteten** ved å opprette noen oppgaver
3. **Les instruksjonsfilen** for detaljert brukerveiledning

## Support
Se `ANLEGG_TODO_INSTRUKSJONER.md` for:
- Detaljert brukerveiledning
- Feilsøking
- Tips og triks
- Database-struktur
