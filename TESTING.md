# Testing Guide

## 🚀 Start appen

```bash
cd /Users/eriksebastianskille/Documents/Firebase_BSVFire
npm run dev
```

Appen kjører på: `http://localhost:5173`

## 🔐 Login

Bruk en eksisterende Supabase-bruker for å logge inn.

**Hvis du ikke har en bruker:**
1. Gå til Supabase Dashboard: https://snyzduzqyjsllzvwuahh.supabase.co
2. Gå til Authentication → Users
3. Opprett en ny bruker

## 📋 Test Kunder-modul

### 1. **Vis kundeliste**
- Naviger til "Kunder" i sidebar
- Verifiser at eksisterende kunder vises
- Sjekk at statistikk-kortene viser riktige tall

### 2. **Søk**
- Skriv i søkefeltet
- Verifiser at listen filtreres i sanntid
- Test søk på navn, org.nr og poststed

### 3. **Opprett ny kunde**
- Klikk "Ny kunde"
- Fyll ut skjemaet (kun navn er påkrevd)
- Klikk "Opprett kunde"
- Verifiser at kunden vises i listen

### 4. **Vis kundedetaljer**
- Klikk øye-ikonet på en kunde
- Verifiser at all informasjon vises korrekt
- Test "Tilbake"-knappen

### 5. **Rediger kunde**
- Klikk blyant-ikonet på en kunde
- Endre informasjon
- Klikk "Oppdater kunde"
- Verifiser at endringene er lagret

### 6. **Slett kunde**
- Klikk søppelbøtte-ikonet
- Bekreft sletting
- Verifiser at kunden er fjernet

## 🎨 Test Design

### Lys/Mørk modus
- Klikk på "Lys modus" / "Mørk modus" i sidebar
- Verifiser at farger endres
- Sjekk at valget lagres (refresh siden)

### Responsivitet
- Test på forskjellige skjermstørrelser
- Verifiser at tabellen er scrollbar på mobil
- Sjekk at grid-layout tilpasser seg

## 🐛 Kjente problemer

Ingen kjente problemer per nå.

## 📊 Database-sjekk

Verifiser data i Supabase:
```sql
-- Se alle kunder
SELECT * FROM kunder ORDER BY navn;

-- Tell kunder
SELECT COUNT(*) FROM kunder;

-- Kunder med kontaktinfo
SELECT navn, telefon, epost FROM kunder 
WHERE telefon IS NOT NULL OR epost IS NOT NULL;
```

## 🔄 Neste moduler å teste

1. **Anlegg** - Knyttet til kunder
2. **Ordre** - Serviceordre per anlegg
3. **Oppgaver** - Arbeidsoppgaver
4. **Prosjekter** - Større prosjekter
5. **Rapporter** - PDF-generering
