# Feilsøking - Google Maps Adressesøk

## Problem
Adressesøk med Google Maps fungerer ikke i Anlegg-skjemaet.

## Mulige årsaker og løsninger

### 1. API-nøkkel mangler

**Symptom**: Du ser meldingen "Google Maps API-nøkkel mangler. Autofullføring er deaktivert."

**Løsning**:
1. Sjekk at du har en `.env` eller `.env.local` fil i prosjektets rotmappe
2. Filen skal inneholde:
   ```
   VITE_GOOGLE_MAPS_API_KEY=din-api-nøkkel-her
   ```
3. Restart utviklingsserveren etter å ha lagt til API-nøkkelen

### 2. Places API ikke aktivert

**Symptom**: Du ser feilmelding i browser console: "This API project is not authorized to use this API"

**Løsning**:
1. Gå til [Google Cloud Console](https://console.cloud.google.com/)
2. Velg ditt prosjekt
3. Gå til "APIs & Services" > "Library"
4. Søk etter "Places API"
5. Klikk "Enable"

### 3. API-nøkkel har feil restriksjoner

**Symptom**: Ingen søkeresultater vises, eller feilmelding i console

**Løsning**:
1. Gå til [Google Cloud Console](https://console.cloud.google.com/)
2. Gå til "APIs & Services" > "Credentials"
3. Klikk på din API-nøkkel
4. Under "Application restrictions":
   - Velg "HTTP referrers (web sites)"
   - Legg til: `http://localhost:5173/*` (Vite default port)
   - Legg til: `http://localhost:5174/*` (Vite alternativ port)
   - Legg til: `http://localhost:*` (alle localhost porter)
   - Legg til: `https://yourdomain.com/*` (for produksjon)
5. Under "API restrictions":
   - Velg "Restrict key"
   - Velg kun "Places API"
6. Klikk "Save"

### 4. Billing ikke aktivert

**Symptom**: API fungerer ikke selv om alt annet er riktig konfigurert

**Løsning**:
1. Google Maps krever at billing er aktivert (selv om du har gratis kvote)
2. Gå til [Google Cloud Console](https://console.cloud.google.com/)
3. Gå til "Billing"
4. Aktiver billing for prosjektet
5. Du får $200 gratis kreditt per måned

### 5. Nettverksproblemer

**Symptom**: "Laster Google Maps..." vises permanent

**Løsning**:
1. Sjekk internettforbindelsen
2. Sjekk browser console for nettverksfeil
3. Prøv å laste siden på nytt

## Slik tester du at det fungerer

1. Gå til "Anlegg" > "Nytt anlegg"
2. Klikk i adressefeltet
3. Begynn å skrive en adresse (f.eks. "Storgata 1")
4. Du skal se en dropdown med forslag fra Google Maps
5. Velg en adresse
6. Postnummer og poststed skal fylles automatisk ut

## Nye feilmeldinger (etter oppdatering)

Komponenten viser nå bedre feilmeldinger:

- **"Google Maps API-nøkkel mangler. Autofullføring er deaktivert."**
  → API-nøkkel ikke funnet i .env

- **"Kunne ikke laste Google Maps. Sjekk API-nøkkel."**
  → API-nøkkel er ugyldig eller Places API er ikke aktivert

- **"Laster Google Maps..."**
  → Komponenten laster, vent litt

## Kontakt support

Hvis problemet vedvarer etter å ha prøvd løsningene over:
1. Sjekk browser console for detaljerte feilmeldinger
2. Verifiser at alle steg i `docs/GOOGLE_MAPS_SETUP.md` er fulgt
3. Kontakt utvikler med skjermbilde av feilmeldingen

## Kostnader

- Google Maps Places API har en gratis kvote på $200 per måned
- For de fleste brukstilfeller vil dette være tilstrekkelig
- Autocomplete koster ca. $2.83 per 1000 requests
- Les mer: [Google Maps Platform Pricing](https://mapsplatform.google.com/pricing/)
