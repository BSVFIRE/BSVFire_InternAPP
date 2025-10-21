# Google Maps API Oppsett

## Oversikt

Applikasjonen bruker Google Maps Places API for adressesøk og autofullføring i anleggsregistrering. Dette gjør det enkelt å søke etter adresser og automatisk fylle ut postnummer og poststed.

## Funksjonalitet

- **Adressesøk**: Søk etter norske adresser med Google Maps autocomplete
- **Automatisk utfylling**: Postnummer og poststed fylles automatisk ut når en adresse velges
- **Norsk fokus**: Søket er begrenset til norske adresser

## Oppsett

### 1. Opprett Google Cloud Project

1. Gå til [Google Cloud Console](https://console.cloud.google.com/)
2. Opprett et nytt prosjekt eller velg et eksisterende
3. Naviger til "APIs & Services" > "Library"

### 2. Aktiver Places API

1. Søk etter "Places API"
2. Klikk på "Places API"
3. Klikk "Enable" for å aktivere API-et

### 3. Opprett API-nøkkel

1. Gå til "APIs & Services" > "Credentials"
2. Klikk "Create Credentials" > "API key"
3. Kopier API-nøkkelen som genereres

### 4. Begrens API-nøkkelen (Anbefalt)

For sikkerhet, begrens API-nøkkelen:

1. Klikk på API-nøkkelen du nettopp opprettet
2. Under "Application restrictions":
   - Velg "HTTP referrers (web sites)"
   - Legg til ditt domene (f.eks. `https://yourdomain.com/*`)
   - For lokal utvikling: `http://localhost:*`
3. Under "API restrictions":
   - Velg "Restrict key"
   - Velg kun "Places API"
4. Klikk "Save"

### 5. Legg til API-nøkkel i prosjektet

1. Kopier `.env.example` til `.env` (hvis du ikke allerede har gjort det)
2. Legg til din Google Maps API-nøkkel:

```env
VITE_GOOGLE_MAPS_API_KEY=din-api-nøkkel-her
```

3. Start applikasjonen på nytt

## Bruk

### I Anlegg-skjemaet

1. Gå til "Anlegg" > "Nytt anlegg"
2. I adressefeltet, begynn å skrive en adresse
3. Velg en adresse fra dropdown-listen
4. Postnummer og poststed fylles automatisk ut

### Uten API-nøkkel

Hvis API-nøkkelen ikke er konfigurert, vil adressefeltet fungere som et vanlig tekstfelt uten autocomplete-funksjonalitet.

## Kostnader

Google Maps Places API har en gratis kvote:
- **Autocomplete - Per Session**: $2.83 per 1000 requests
- **Gratis kvote**: $200 kreditt per måned

For de fleste små til mellomstore applikasjoner vil den gratis kvoten være tilstrekkelig.

Les mer om priser: [Google Maps Platform Pricing](https://mapsplatform.google.com/pricing/)

## Feilsøking

### Autocomplete fungerer ikke

1. Sjekk at `VITE_GOOGLE_MAPS_API_KEY` er satt i `.env`
2. Verifiser at Places API er aktivert i Google Cloud Console
3. Sjekk browser console for feilmeldinger
4. Verifiser at API-nøkkelen har riktige restriksjoner

### "This API project is not authorized to use this API"

- Gå til Google Cloud Console og aktiver Places API for prosjektet ditt

### Ingen resultater vises

- API-nøkkelen kan være begrenset til feil domener
- Sjekk API-nøkkelens restriksjoner i Google Cloud Console

## Teknisk implementering

Komponenten bruker:
- `@vis.gl/react-google-maps` for React-integrasjon
- Google Maps Places Autocomplete API
- Komponentrestriksjon til norske adresser (`country: 'no'`)

Se `src/components/GoogleMapsAddressAutocomplete.tsx` for implementasjonsdetaljer.
