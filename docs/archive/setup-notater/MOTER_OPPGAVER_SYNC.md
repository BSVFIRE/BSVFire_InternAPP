# Synkronisering mellom Møteoppgaver og Oppgaver

## Oversikt

Når du oppretter en oppgave fra et møte, blir oppgaven automatisk opprettet i **begge** systemer:
1. **Oppgaver-modulen** - Vises under "Oppgaver" og tildeles til ansvarlig tekniker
2. **Møtemodulen** - Vises under møtets "Oppgaver"-fane

## Hvordan det fungerer

### Opprettelse
Når du oppretter en oppgave fra et møte:
- ✅ Oppgaven får et unikt oppgavenummer (f.eks. `OPP-2025-0001`)
- ✅ Oppgaven vises i oppgavelisten til den ansvarlige teknikeren
- ✅ Oppgaven er merket som "Møteoppgave" type
- ✅ Oppgaven er koblet til møtet via `mote_id`
- ✅ Oppgaven vises også i møteoversikten

### Statussynkronisering
Statusendringer synkroniseres **automatisk** i begge retninger:

**Fra Oppgaver → Møter:**
- Når en tekniker markerer oppgaven som fullført i Oppgaver-modulen
- Oppdateres automatisk i møteoversikten

**Fra Møter → Oppgaver:**
- Når noen endrer status på oppgaven i møteoversikten
- Oppdateres automatisk i Oppgaver-modulen

### Status-mapping

| Oppgaver-status | Møte-status    |
|-----------------|----------------|
| Ikke påbegynt   | ikke_startet   |
| Pågående        | pagaende       |
| Fullført        | ferdig         |
| Avbrutt         | avbrutt        |

## Database-struktur

### Nye kolonner
- `oppgaver.mote_id` - Kobler oppgaven til et møte (nullable)

### Triggers
- `trigger_sync_oppgave_to_mote` - Synkroniserer fra oppgaver til mote_oppgaver
- `trigger_sync_mote_to_oppgave` - Synkroniserer fra mote_oppgaver til oppgaver

## Fordeler

✅ **Én kilde til sannhet** - Oppgaver opprettes kun én gang, men vises begge steder
✅ **Automatisk synkronisering** - Ingen manuell oppdatering nødvendig
✅ **Sporbarhet** - Se hvilke oppgaver som kom fra møter
✅ **Fleksibilitet** - Teknikere kan jobbe i Oppgaver-modulen, møteledere i Møter-modulen

## Eksempel-arbeidsflyt

1. **Under tirsdagsmøtet:**
   - Møteleder: "Erik, kan du følge opp med kunde X?"
   - Opprett oppgave i møtet
   - Tildel til Erik
   - Sett frist til fredag

2. **I Oppgaver-modulen:**
   - Erik ser oppgaven i sin oppgaveliste
   - Merket som "Møteoppgave"
   - Kan se den kom fra "Tirsdagsmøte"

3. **Når Erik fullfører:**
   - Markerer oppgaven som "Fullført" i Oppgaver
   - Status oppdateres automatisk i møteoversikten
   - Møteleder ser at oppgaven er ferdig

## Installasjon

Kjør disse SQL-filene i rekkefølge:
```bash
1. supabase_migrations/add_mote_id_to_oppgaver.sql
2. supabase_migrations/sync_mote_oppgaver.sql
```

## Verifisering

Test synkroniseringen:
```sql
-- Se alle møteoppgaver
SELECT 
  o.oppgave_nummer,
  o.tittel,
  o.status as oppgave_status,
  mo.status as mote_status,
  m.tittel as mote_tittel
FROM oppgaver o
LEFT JOIN mote_oppgaver mo ON o.mote_id = mo.mote_id AND o.tekniker_id = mo.ansvarlig_id
LEFT JOIN moter m ON o.mote_id = m.id
WHERE o.type = 'Møteoppgave';
```

## Tips

💡 **Bruk møteoppgaver for:**
- Oppfølgingsoppgaver fra møter
- Beslutninger som krever handling
- Delegerte oppgaver til teammedlemmer

💡 **Filtrer i Oppgaver-modulen:**
- Søk etter "Møteoppgave" for å se alle oppgaver fra møter
- Filtrer på tekniker for å se egne møteoppgaver

💡 **Se møtehistorikk:**
- Klikk på en oppgave i Oppgaver-modulen
- Se hvilket møte den kom fra (hvis relevant)
