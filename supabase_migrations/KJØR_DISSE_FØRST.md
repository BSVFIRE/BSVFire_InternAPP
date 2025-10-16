# 🚀 Database-konsistens: Migrasjoner som må kjøres

**Mål:** Standardiser tidsstempler og legg til manglende `sist_oppdatert` kolonner  
**Estimert tid:** 10-15 minutter  
**Viktig:** Kjør disse i rekkefølge!

---

## 📋 Del 1: Endre created_at → opprettet_dato (4 migrasjoner)

Disse migrasjonene endrer kolonnenavn for konsistens.

### 1. Oppgaver
**Fil:** `rename_oppgaver_timestamps.sql`  
**Endrer:** `oppgaver.created_at` → `oppgaver.opprettet_dato`

```sql
-- Kopier innholdet fra filen og kjør i Supabase SQL Editor
```

### 2. Servicerapporter
**Fil:** `rename_servicerapporter_timestamps.sql`  
**Endrer:** 
- `servicerapporter.created_at` → `servicerapporter.opprettet_dato`
- `servicerapporter.updated_at` → `servicerapporter.sist_oppdatert`
- Legger til trigger for automatisk oppdatering

```sql
-- Kopier innholdet fra filen og kjør i Supabase SQL Editor
```

### 3. Nødlys-tabeller
**Fil:** `rename_nodlys_timestamps.sql`  
**Endrer:**
- `anleggsdata_nodlys.created_at` → `anleggsdata_nodlys.opprettet_dato`
- `nettverk_nodlys.created_at` → `nettverk_nodlys.opprettet_dato`

```sql
-- Kopier innholdet fra filen og kjør i Supabase SQL Editor
```

### 4. Brannalarm-tabeller
**Fil:** `rename_brannalarm_timestamps.sql`  
**Endrer:**
- `anleggsdata_brannalarm.created_at` → `anleggsdata_brannalarm.opprettet_dato` (hvis den finnes)
- `nettverk_brannalarm.created_at` → `nettverk_brannalarm.opprettet_dato` (hvis den finnes)

```sql
-- Kopier innholdet fra filen og kjør i Supabase SQL Editor
```

---

## 📋 Del 2: Legg til sist_oppdatert (7 migrasjoner)

Disse migrasjonene legger til `sist_oppdatert` kolonne og triggers.

### 5. Ordre (Allerede kjørt?)
**Fil:** `add_sist_oppdatert_to_ordre.sql`  
Sjekk om denne allerede er kjørt. Hvis ikke, kjør den.

### 6. Oppgaver (Allerede kjørt?)
**Fil:** `add_sist_oppdatert_to_oppgaver.sql`  
Sjekk om denne allerede er kjørt. Hvis ikke, kjør den.

### 7. Kontaktpersoner (Allerede kjørt?)
**Fil:** `add_sist_oppdatert_to_kontaktpersoner.sql`  
Sjekk om denne allerede er kjørt. Hvis ikke, kjør den.

### 8. Prosjekter (NY)
**Fil:** `add_sist_oppdatert_to_prosjekter.sql`  
**Legger til:** `prosjekter.sist_oppdatert` + trigger

```sql
-- Kopier innholdet fra filen og kjør i Supabase SQL Editor
```

### 9. Detektorlister (NY)
**Fil:** `add_sist_oppdatert_to_detektorlister.sql`  
**Legger til:** `detektorlister.sist_oppdatert` + trigger

```sql
-- Kopier innholdet fra filen og kjør i Supabase SQL Editor
```

### 10. Anleggsdata-tabeller (NY)
**Fil:** `add_sist_oppdatert_to_anleggsdata.sql`  
**Legger til `sist_oppdatert` + trigger for:**
- `anleggsdata_brannalarm`
- `anleggsdata_nodlys`
- `anleggsdata_brannslukkere`
- `anleggsdata_brannslanger`

```sql
-- Kopier innholdet fra filen og kjør i Supabase SQL Editor
```

### 11. Nettverk-tabeller (NY)
**Fil:** `add_sist_oppdatert_to_nettverk.sql`  
**Legger til `sist_oppdatert` + trigger for:**
- `nettverk_brannalarm`
- `nettverk_nodlys`

```sql
-- Kopier innholdet fra filen og kjør i Supabase SQL Editor
```

---

## ✅ Verifisering

Etter å ha kjørt alle migrasjonene, kjør denne SQL-en for å verifisere:

```sql
-- Sjekk at alle tidsstempler er standardisert
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND (column_name IN ('opprettet_dato', 'sist_oppdatert', 'created_at', 'updated_at'))
ORDER BY table_name, column_name;
```

**Forventet resultat:**
- Ingen kolonner skal hete `created_at` eller `updated_at`
- Alle relevante tabeller skal ha `opprettet_dato`
- Alle relevante tabeller skal ha `sist_oppdatert`

```sql
-- Sjekk at alle triggers er opprettet
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%sist_oppdatert%'
ORDER BY event_object_table;
```

**Forventet resultat:**
Du skal se triggers for:
- anlegg
- ordre
- oppgaver
- kontaktpersoner
- prosjekter
- detektorlister
- servicerapporter
- anleggsdata_brannalarm
- anleggsdata_nodlys
- anleggsdata_brannslukkere
- anleggsdata_brannslanger
- nettverk_brannalarm
- nettverk_nodlys

---

## 🐛 Feilsøking

### Feil: "column does not exist"
Dette betyr at kolonnen allerede er endret. Hopp over denne migrasjonen.

### Feil: "column already exists"
Dette betyr at kolonnen allerede finnes. Hopp over denne migrasjonen.

### Feil: "trigger already exists"
Migrasjonen dropper eksisterende triggers først, så dette skal ikke skje. Hvis det gjør det, kjør:
```sql
DROP TRIGGER IF EXISTS [trigger_navn] ON [tabell_navn];
```

---

## 📝 Neste steg

Etter å ha kjørt alle SQL-migrasjonene, må du:

1. ✅ Oppdatere TypeScript-typer i `src/lib/supabase.ts`
2. ✅ Oppdatere komponenter som bruker `created_at` → `opprettet_dato`
3. ✅ Teste at alt fungerer

Se `HANDLINGSPLAN_FORBEDRINGER.md` for detaljer.

---

## ⏱️ Estimert tid per migrasjon

| Migrasjon | Tid | Kompleksitet |
|-----------|-----|--------------|
| 1-4 (Rename) | 1-2 min hver | Lav |
| 5-7 (Eksisterende) | Hopp over hvis kjørt | - |
| 8-11 (Nye) | 2-3 min hver | Middels |
| **Total** | **10-15 min** | - |

---

**Lykke til!** 🚀

Hvis du støter på problemer, sjekk Supabase-loggen for feilmeldinger.
