# Installasjon av Møtemodul

## Steg 1: Kjør database-migrering

Du må kjøre SQL-filene i Supabase for å opprette tabellene og synkronisering.

### Alternativ A: Via Supabase Dashboard
1. Gå til [Supabase Dashboard](https://supabase.com/dashboard)
2. Velg ditt prosjekt
3. Gå til "SQL Editor"
4. Kjør følgende filer i rekkefølge:
   - `supabase_migrations/create_moter_tables.sql`
   - `supabase_migrations/fix_oppgaver_nullable_fields.sql`
   - `supabase_migrations/add_mote_id_to_oppgaver.sql`
   - `supabase_migrations/sync_mote_oppgaver.sql`
5. Kopier innholdet fra hver fil og lim det inn i SQL Editor
6. Klikk "Run" for hver fil

### Alternativ B: Via Supabase CLI (hvis installert)
```bash
supabase db push
```

## Steg 2: Verifiser at tabellene er opprettet

Kjør denne SQL-spørringen i Supabase SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'mote%';
```

Du skal se:
- moter
- mote_deltakere
- mote_agendapunkter
- mote_referater
- mote_oppgaver

## Steg 3: Test modulen

1. Start utviklingsserveren:
```bash
npm run dev
```

2. Logg inn i applikasjonen
3. Gå til "Møter" i menyen
4. Opprett et testmøte
5. Legg til agendapunkter
6. Skriv referat
7. Opprett en oppgave og tildel til en tekniker
8. Gå til "Oppgaver" og verifiser at oppgaven vises der
9. Marker oppgaven som fullført i Oppgaver
10. Gå tilbake til Møter og se at statusen er synkronisert

## Feilsøking

### "Tabell eksisterer ikke"
- Sjekk at SQL-migreringen ble kjørt uten feil
- Verifiser at du er koblet til riktig Supabase-prosjekt

### "Permission denied"
- Sjekk at RLS-policies ble opprettet korrekt
- Verifiser at brukeren er autentisert

### "Kan ikke finne ansatte"
- Sørg for at `ansatte`-tabellen eksisterer og har data
- Sjekk at brukerens ID finnes i `ansatte`-tabellen

### "Foreign key constraint violation" (anlegg_id eller kunde_id)
- Kjør `fix_oppgaver_nullable_fields.sql` for å gjøre feltene nullable
- Dette er nødvendig for møteoppgaver som ikke alltid er knyttet til et anlegg

## Neste steg

Når modulen er installert og testet:
1. Opprett et fast tirsdagsmøte
2. Legg til faste agendapunkter
3. Inviter alle tenkikere som deltakere
4. Tildel en møteleder og referent

God møteadministrasjon! 🎉
