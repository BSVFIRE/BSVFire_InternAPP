# 🚀 SQL-migrasjoner som må kjøres

## Instruksjoner

1. Gå til Supabase Dashboard: https://supabase.com/dashboard
2. Velg ditt prosjekt
3. Gå til **SQL Editor** i venstremenyen
4. Kjør følgende SQL-filer i rekkefølge:

---

## ✅ Migrasjon 1: Anlegg (Allerede kjørt?)

**Fil:** `add_sist_oppdatert_to_anlegg.sql`

Sjekk om denne allerede er kjørt ved å kjøre:
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'anlegg' AND column_name = 'sist_oppdatert';
```

Hvis den returnerer en rad, er migrasjonen allerede kjørt. ✅  
Hvis ikke, kjør `add_sist_oppdatert_to_anlegg.sql`.

---

## 🆕 Migrasjon 2: Ordre

**Fil:** `add_sist_oppdatert_to_ordre.sql`

**Hva den gjør:**
- Legger til `sist_oppdatert` kolonne i `ordre` tabellen
- Oppdaterer eksisterende ordre med dagens dato
- Oppretter trigger for automatisk oppdatering

**Kjør denne:**
```sql
-- Kopier innholdet fra add_sist_oppdatert_to_ordre.sql og lim inn her
```

---

## 🆕 Migrasjon 3: Oppgaver

**Fil:** `add_sist_oppdatert_to_oppgaver.sql`

**Hva den gjør:**
- Legger til `sist_oppdatert` kolonne i `oppgaver` tabellen
- Oppdaterer eksisterende oppgaver med dagens dato
- Oppretter trigger for automatisk oppdatering

**Kjør denne:**
```sql
-- Kopier innholdet fra add_sist_oppdatert_to_oppgaver.sql og lim inn her
```

---

## 🆕 Migrasjon 4: Kontaktpersoner

**Fil:** `add_sist_oppdatert_to_kontaktpersoner.sql`

**Hva den gjør:**
- Legger til `sist_oppdatert` kolonne i `kontaktpersoner` tabellen
- Oppdaterer eksisterende kontaktpersoner med dagens dato
- Oppretter trigger for automatisk oppdatering

**Kjør denne:**
```sql
-- Kopier innholdet fra add_sist_oppdatert_to_kontaktpersoner.sql og lim inn her
```

---

## ✅ Verifisering

Etter å ha kjørt alle migrasjonene, verifiser at alt er OK:

```sql
-- Sjekk at alle kolonner er opprettet
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND column_name = 'sist_oppdatert'
  AND table_name IN ('anlegg', 'ordre', 'oppgaver', 'kontaktpersoner')
ORDER BY table_name;
```

Du skal få 4 rader tilbake (en for hver tabell).

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

Du skal få 4 rader tilbake (en trigger for hver tabell).

---

## 🧪 Test funksjonaliteten

1. **Test Ordre:**
   - Gå til Ordre-siden i appen
   - Rediger en ordre
   - Sjekk at "Sist oppdatert" vises i detaljvisningen

2. **Test Oppgaver:**
   - Gå til Oppgaver-siden
   - Rediger en oppgave
   - Sjekk at "Sist oppdatert" vises i detaljvisningen

3. **Test Anlegg:**
   - Gå til Anlegg-siden
   - Rediger et anlegg
   - Sjekk at "Sist oppdatert" vises i detaljvisningen

4. **Test Kontaktpersoner:**
   - Gå til Kontaktpersoner-siden
   - Vis en kontaktperson
   - Sjekk at "Sist oppdatert" vises (hvis den har blitt oppdatert)

---

## 🐛 Feilsøking

### Feil: "column already exists"
Dette betyr at kolonnen allerede er opprettet. Du kan hoppe over denne migrasjonen.

### Feil: "trigger already exists"
Kjør først:
```sql
DROP TRIGGER IF EXISTS update_[tabell]_sist_oppdatert ON [tabell];
```
Deretter kjør migrasjonen på nytt.

### Feil: "function already exists"
Kjør først:
```sql
DROP FUNCTION IF EXISTS update_[tabell]_sist_oppdatert_column();
```
Deretter kjør migrasjonen på nytt.

---

## 📝 Notater

- Alle migrasjoner bruker `IF NOT EXISTS` for å unngå feil hvis de kjøres flere ganger
- Triggers oppdaterer automatisk `sist_oppdatert` ved hver UPDATE
- Eksisterende data får `NOW()` som verdi første gang
- Nye rader får `NULL` som standardverdi (oppdateres ved første UPDATE)
