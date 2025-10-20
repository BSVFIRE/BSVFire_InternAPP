# Prissystem for Serviceavtaler - Brukerveiledning

## Oversikt
Komplett prissystem for automatisk beregning av serviceavtaletilbud med konfigurerbare priser og tier-basert enhetsprising.

## 🚀 Kom i gang

### 1. Kjør database-migrasjoner
Kjør følgende SQL-filer i Supabase SQL Editor:

```sql
-- Først: Opprett serviceavtale_tilbud tabell
-- Fil: create_serviceavtale_tilbud_table_v2.sql

-- Deretter: Opprett pristabeller
-- Fil: create_pricing_tables.sql
```

### 2. Tilgang til prissystemet
- **Administrator-meny** → **Prisadministrasjon** (kun for admin-brukere)
- **Dokumentasjon** → **Tilbud Serviceavtale** (alle brukere)

## 📊 Prisadministrasjon

### Tilgang
URL: `/admin/prisadministrasjon`

Kun brukere med e-post i `ADMIN_EMAILS` (Layout.tsx) kan se denne siden.

### Funksjoner

#### For hver tjeneste (Brannalarm, Nødlys, Slukkeuttsyr, Røkluker, Eksternt):

1. **Minstepris (kr)**
   - Minimum beløp som alltid skal belastes
   - Hvis beregnet pris er lavere, brukes minstepris

2. **Rapport (kr)**
   - Fast pris for rapport
   - Kan velges på/av i tilbudet

3. **Sentralenhet - Første (kr)**
   - Pris for første sentralenhet

4. **Sentralenhet - Ekstra (kr)**
   - Pris per ekstra sentralenhet (fra nr 2 og oppover)

5. **Enhetspriser (tier-basert)**
   - Definerer pris per enhet basert på totalt antall enheter
   - Standard for Brannalarm:
     - 0-50 enheter: 25 kr/stk
     - 51-100 enheter: 20 kr/stk
     - 101-200 enheter: 17 kr/stk
     - 201+ enheter: 12 kr/stk

### Eksempel: Brannalarm-priser

```
Minstepris: 4500 kr
Rapport: 750 kr
Sentralenhet første: 1200 kr
Sentralenhet ekstra: 600 kr

Enhetspriser:
- Fra 0 til 50: 25 kr
- Fra 51 til 100: 20 kr
- Fra 101 til 200: 17 kr
- Fra 201 til ubegrenset: 12 kr
```

## 💰 Prisberegning i tilbud

### Når du oppretter/redigerer tilbud:

1. **Velg tjenester** (Brannalarm, Nødlys, etc.)
2. **Prisberegning-seksjonen vises automatisk**
3. For hver valgt tjeneste, angi:
   - **Antall enheter** (detektorer, lamper, etc.)
   - **Antall sentralenheter**
   - **Inkluder rapport** (checkbox)

### Automatisk beregning

Systemet beregner automatisk:

1. **Enhetspris** basert på antall:
   - Finner riktig tier (f.eks. 75 enheter = 20 kr/stk)
   - Multipliserer: 75 × 20 kr = 1500 kr

2. **Sentralenhetspris**:
   - Første enhet: 1200 kr
   - Ekstra enheter: (antall - 1) × 600 kr
   - Eksempel med 3 enheter: 1200 + (2 × 600) = 2400 kr

3. **Rapport**:
   - Hvis valgt: + 750 kr

4. **Totalpris per tjeneste**:
   - Sum av enheter + sentralenheter + rapport
   - Hvis < minstepris: bruk minstepris

5. **Totalpris for tilbud**:
   - Sum av alle valgte tjenester

### Eksempel-beregning

**Brannalarm med:**
- 75 enheter
- 2 sentralenheter
- Rapport inkludert

**Beregning:**
```
Enheter: 75 × 20 kr = 1500 kr (tier 51-100)
Sentralenheter: 1200 + 600 = 1800 kr
Rapport: 750 kr
---
Totalt: 4050 kr

Minstepris: 4500 kr
Endelig pris: 4500 kr (minstepris anvendt)
```

## 📋 Visning av priser

### I tilbudslisten
- **Pris-kolonne** viser totalpris for hvert tilbud
- Formatert som: "4 500,00 kr"

### I tilbudsdetaljer
- **Prisoppsummering-seksjon** viser:
  - Breakdown per tjeneste
  - Antall enheter og sentralenheter
  - Om rapport er inkludert
  - Pris per tjeneste
  - **Total pris** (fremhevet)

## 🔧 Teknisk informasjon

### Database-struktur

**serviceavtale_priser**
```sql
- id: UUID
- tjeneste_type: TEXT (brannalarm, nodlys, etc.)
- minstepris: DECIMAL
- enhetspriser: JSONB (array av tiers)
- rapport_pris: DECIMAL
- sentralenhet_forste: DECIMAL
- sentralenhet_ekstra: DECIMAL
```

**serviceavtale_tilbud** (nye kolonner)
```sql
- pris_detaljer: JSONB (breakdown per tjeneste)
- total_pris: DECIMAL
```

### Komponenter

1. **PrisAdministrasjon.tsx**
   - Admin-grensesnitt for å endre priser
   - CRUD for pristabeller

2. **PricingSection.tsx**
   - Prisberegner i tilbudsskjema
   - Real-time beregning
   - Visuell feedback

3. **TilbudDetails.tsx**
   - Viser prisoppsummering
   - Breakdown per tjeneste

## 🎯 Beste praksis

### For administratorer:
1. **Gjennomgå priser regelmessig** (f.eks. årlig)
2. **Test beregninger** etter prisendringer
3. **Dokumenter prisendringer** i notater

### For brukere:
1. **Velg tjenester først**, deretter angi antall
2. **Sjekk prisoppsummeringen** før lagring
3. **Bruk beskrivelse-feltet** for spesielle avtaler
4. **Notater-feltet** for interne kommentarer

## ❓ FAQ

**Q: Kan jeg ha forskjellige priser for forskjellige kunder?**
A: Nei, prisene er globale. Men du kan justere antall enheter eller legge til notater om spesielle avtaler.

**Q: Hva skjer hvis jeg endrer priser etter at tilbud er opprettet?**
A: Eksisterende tilbud beholder sine priser. Kun nye tilbud bruker oppdaterte priser.

**Q: Kan jeg ha mer enn 4 tiers?**
A: Ja, du kan legge til flere tiers i Prisadministrasjon.

**Q: Hvordan håndteres desimaler?**
A: Alle priser støtter 2 desimaler (øre).

## 🔐 Sikkerhet

- Kun admin-brukere kan endre priser
- Alle brukere kan se priser og opprette tilbud
- RLS policies sikrer datatilgang
- Prishistorikk lagres ikke (vurder å legge til hvis nødvendig)

## 📈 Fremtidige forbedringer

Potensielle utvidelser:
- [ ] Prishistorikk og versjonering
- [ ] Kunde-spesifikke rabatter
- [ ] Sesongbaserte priser
- [ ] Bulk-rabatter
- [ ] PDF-generering med priser
- [ ] E-post med tilbud
- [ ] Prissammenligning (konkurrenter)
- [ ] Automatisk prisindeksering
