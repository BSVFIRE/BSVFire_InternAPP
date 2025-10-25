# AI-forbedring av Servicerapporter

## ⚠️ VIKTIG: Konfigurer Azure OpenAI først!

Før du bruker denne funksjonen, må Azure OpenAI credentials være konfigurert i Supabase.

**Sjekk om secrets er satt:**
```bash
supabase secrets list
```

**Hvis secrets mangler, sett dem:**
```bash
supabase secrets set AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
supabase secrets set AZURE_OPENAI_API_KEY=your-api-key-here
supabase secrets set AZURE_GPT_DEPLOYMENT_NAME=gpt-4
```

Se `AZURE_OPENAI_SETUP.md` for full guide til Azure-oppsett.

## Oversikt

Denne funksjonen lar brukere skrive stikkord eller en kort beskrivelse i servicerapport-feltet, og deretter bruke AI til å generere en profesjonell, strukturert rapport.

## Hvordan det fungerer

1. **Bruker skriver stikkord** i "Rapport tekst"-feltet, for eksempel:
   ```
   - Kontrollert brannalarm
   - Testet alle detektorer
   - Byttet batteri i 3 detektorer
   - Funnet feil på detektor i rom 204
   - Anbefaler utskifting
   ```

2. **Klikker "Forbedre med AI"**-knappen (⚡ Sparkles-ikon)

3. **AI genererer en fullstendig rapport** med struktur:
   - INNLEDNING
   - UTFØRT ARBEID
   - FUNN OG OBSERVASJONER
   - KONKLUSJON

4. **Bruker godkjenner eller avslår** den genererte rapporten

## Deployment

### 1. Deploy Edge Function

```bash
cd /Users/eriksebastianskille/Documents/Firebase_BSVFire
supabase functions deploy ai-improve-servicerapport
```

### 2. Verifiser at Azure OpenAI er konfigurert

Edge Function bruker de samme Azure OpenAI-credentials som allerede er satt opp for kontrollnotater.

Sjekk at følgende secrets er konfigurert i Supabase:
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_GPT_DEPLOYMENT_NAME`

Hvis ikke, følg instruksjonene i `AZURE_OPENAI_SETUP.md`.

### 3. Test funksjonen

1. Gå til **Teknisk** → **Ny servicerapport**
2. Fyll ut header-informasjon (anlegg, dato, tekniker)
3. Skriv stikkord i "Rapport tekst"-feltet
4. Klikk **"Forbedre med AI"**
5. Godkjenn eller avslå den genererte rapporten

## Eksempel på bruk

### Input (stikkord):
```
Årlig service brannalarmanlegg
- Kontrollert alle 24 røykdetektorer
- Testet sentralen
- Byttet batteri i 3 detektorer (rom 101, 204, 305)
- Funnet feil på detektor i rom 204 - gir ikke alarm
- Anbefaler utskifting av defekt detektor
- Anlegget er ellers i god stand
```

### Output (AI-generert rapport):
```
1. INNLEDNING

Dette er en rapport fra årlig service av brannalarmanlegget utført den [dato].
Formålet med servicebesøket var å gjennomføre periodisk kontroll og vedlikehold
av brannalarmanlegget i henhold til gjeldende forskrifter.

2. UTFØRT ARBEID

Følgende arbeider ble utført under servicebesøket:

- Kontrollert alle 24 røykdetektorer i bygget
- Gjennomført funksjonstest av brannalarmsentral
- Utført batteribytte på 3 røykdetektorer i følgende rom:
  * Rom 101
  * Rom 204
  * Rom 305

Alle detektorer ble testet individuelt, og sentralen responderte korrekt
på testsignaler fra de fleste detektorer.

3. FUNN OG OBSERVASJONER

Under kontrollen ble følgende avvik identifisert:

**Kritisk avvik:**
- Røykdetektor i rom 204 gir ikke alarm ved testing
- Detektoren responderer ikke på testsignal fra sentralen
- Dette utgjør en sikkerhetsrisiko og må utbedres umiddelbart

**Anbefaling:**
Det anbefales sterkt å skifte ut den defekte detektoren i rom 204 snarest mulig.
Inntil utskifting er gjennomført, bør rommet overvåkes ekstra nøye.

**Øvrige observasjoner:**
Anlegget er for øvrig i god stand. Alle andre komponenter fungerer som forventet.

4. KONKLUSJON

Brannalarmanlegget er i hovedsak i god stand, men det er identifisert ett kritisk
avvik som må utbedres umiddelbart. Den defekte detektoren i rom 204 må skiftes ut.

Etter utskifting av defekt detektor vil anlegget være fullt funksjonelt og i
samsvar med gjeldende krav.

Neste ordinære service anbefales om 12 måneder, eller tidligere dersom det
oppstår problemer med anlegget.
```

## Kostnader

Funksjonen bruker Azure OpenAI GPT-4:
- **Estimert kostnad per rapport:** ~$0.05-0.10
- **Ved 20 rapporter/måned:** ~$1-2/måned

## Sikkerhet og GDPR

✅ Data behandles via Azure OpenAI i Norge/Europa  
✅ GDPR-kompatibel  
✅ Ingen data lagres hos OpenAI  
✅ Samme sikkerhetsnivå som kontrollnotater  

## Feilsøking

### "Kunne ikke forbedre rapporten med AI"

**Mulige årsaker:**
1. Edge Function er ikke deployet
2. Azure OpenAI credentials mangler
3. Quota er overskredet
4. Nettverksproblemer

**Løsning:**
1. Sjekk at Edge Function er deployet: `supabase functions list`
2. Verifiser secrets i Supabase Dashboard
3. Sjekk Azure OpenAI quota i Azure Portal
4. Se Edge Function logs: `supabase functions logs ai-improve-servicerapport`

### AI genererer ikke relevant innhold

**Mulige årsaker:**
1. For lite informasjon i stikkordene
2. Uklare eller tvetydige stikkord

**Løsning:**
1. Skriv mer detaljerte stikkord
2. Inkluder spesifikk informasjon om:
   - Hva som ble gjort
   - Hva som ble funnet
   - Eventuelle problemer
   - Anbefalinger

## Fremtidige forbedringer

- [ ] Mulighet til å velge rapportmal (kort/lang/teknisk)
- [ ] Støtte for flere språk
- [ ] Lagre tidligere genererte rapporter for referanse
- [ ] Mulighet til å redigere AI-prompt
- [ ] Batch-generering av flere rapporter

---

**Opprettet:** 25. oktober 2025  
**Sist oppdatert:** 25. oktober 2025
