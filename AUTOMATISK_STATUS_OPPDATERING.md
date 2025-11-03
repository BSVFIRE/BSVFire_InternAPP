# Automatisk Oppdatering av Kontroll Status

## Hva gjør denne funksjonen?

Når du setter alle tjenester til "fullført" under et anlegg, vil `kontroll_status` automatisk oppdateres til **"Utført"**.

### Eksempel:
- Anlegg har kontrolltyper: **Brannalarm**, **Nødlys**, **Røykluker**
- Når du setter alle tre til fullført:
  - ✅ Brannalarm fullført
  - ✅ Nødlys fullført  
  - ✅ Røykluker fullført
- **Status oppdateres automatisk til "Utført"**

## Hvordan aktivere funksjonen?

### Metode 1: Kjør SQL direkte i Supabase Dashboard (ANBEFALT)

1. Åpne [Supabase Dashboard](https://supabase.com/dashboard)
2. Velg ditt prosjekt
3. Gå til **SQL Editor** (i venstre meny)
4. Åpne filen `KJOR_DENNE_I_SUPABASE.sql` i dette prosjektet
5. Kopier **hele** innholdet
6. Lim inn i SQL Editor
7. Trykk **"Run"** eller `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)
8. ✅ Ferdig!

### Metode 2: Via migrasjonsfil

Migrasjonen ligger i:
```
supabase_migrations/auto_update_kontroll_status.sql
```

Du kan kjøre denne via Supabase CLI eller direkte i SQL Editor.

## Hvordan fungerer det?

### Database Trigger
Systemet bruker en PostgreSQL trigger som automatisk kjører når:
- En tjenestestatus endres (brannalarm_fullfort, nodlys_fullfort, etc.)
- Kontrolltyper oppdateres

### Logikk
1. **Sjekker hvilke kontrolltyper anlegget har**
   - Hvis anlegget har "Brannalarm" og "Nødlys", sjekkes kun disse
   - Hvis "Ekstern" ikke er valgt, ignoreres den

2. **Sjekker om alle aktuelle tjenester er fullført**
   - Går gjennom hver kontrolltype
   - Sjekker tilhørende `_fullfort` status

3. **Oppdaterer status automatisk**
   - Hvis alle er fullført → Status = "Utført"
   - Hvis noen ikke er fullført → Status = "Ikke utført" (kun hvis den var "Utført" før)

## Eksempler

### Eksempel 1: Alle tjenester fullført
```
Kontrolltyper: [Brannalarm, Nødlys]
brannalarm_fullfort: true
nodlys_fullfort: true
→ kontroll_status: "Utført" ✅
```

### Eksempel 2: Ikke alle fullført
```
Kontrolltyper: [Brannalarm, Nødlys, Røykluker]
brannalarm_fullfort: true
nodlys_fullfort: true
roykluker_fullfort: false
→ kontroll_status: "Ikke utført" ❌
```

### Eksempel 3: Kun relevante tjenester sjekkes
```
Kontrolltyper: [Brannalarm]  (kun Brannalarm valgt)
brannalarm_fullfort: true
nodlys_fullfort: false        (ignoreres, ikke valgt)
roykluker_fullfort: false     (ignoreres, ikke valgt)
→ kontroll_status: "Utført" ✅
```

## Testing

Etter at du har kjørt migrasjonen:

1. Gå til **Anlegg** i systemet
2. Velg et anlegg som har kontrolltyper
3. Rediger anlegget
4. Sett alle tjenester til "fullført"
5. Lagre anlegget
6. ✅ Status skal nå være "Utført"

## Feilsøking

### Statusen oppdateres ikke?
- Sjekk at migrasjonen er kjørt uten feil
- Verifiser at anlegget har kontrolltyper definert
- Sjekk at alle relevante tjenester er satt til fullført

### Hvordan sjekke om trigger er aktivert?
Kjør denne SQL-spørringen i Supabase:
```sql
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_auto_update_kontroll_status';
```

Du skal se:
- trigger_name: `trigger_auto_update_kontroll_status`
- event_object_table: `anlegg`

## Teknisk informasjon

### Database-objekter opprettet:
- **Funksjon**: `check_and_update_kontroll_status()`
- **Trigger**: `trigger_auto_update_kontroll_status`

### Trigger kjører ved:
- `INSERT` på anlegg-tabellen
- `UPDATE` av følgende kolonner:
  - brannalarm_fullfort
  - nodlys_fullfort
  - roykluker_fullfort
  - slukkeutstyr_fullfort
  - ekstern_fullfort
  - kontroll_type

### Ytelse:
Triggeren kjører **før** INSERT/UPDATE, så den påvirker ikke ytelsen merkbart.

## Vedlikehold

### Slette trigger (hvis nødvendig):
```sql
DROP TRIGGER IF EXISTS trigger_auto_update_kontroll_status ON anlegg;
DROP FUNCTION IF EXISTS check_and_update_kontroll_status();
```

### Oppdatere logikk:
Rediger `supabase_migrations/auto_update_kontroll_status.sql` og kjør på nytt.
