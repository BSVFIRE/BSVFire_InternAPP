# Nødlys: Marker alle som kontrollert

## Ny funksjon
Det er nå lagt til en knapp for å markere alle nødlysenheter som kontrollert med ett klikk.

## Hvordan bruke
1. Gå til **Nødlys**-siden
2. Velg kunde og anlegg
3. Klikk på den grønne knappen **"Marker alle som kontrollert"**
4. Bekreft at du vil markere alle enheter
5. Alle nødlysenheter blir nå markert som kontrollert i databasen

## Tilgjengelig i
- **Normal visning**: Knappen vises sammen med andre handlingsknapper
- **Fullskjermvisning**: Knappen vises også i fullskjerm for enkel tilgang
- **Mobil**: Viser kortere tekst "Alle OK" på små skjermer

## Funksjonalitet
- **Bulk-oppdatering**: Oppdaterer alle nødlysenheter i ett klikk
- **Bekreftelse**: Spør om bekreftelse før oppdatering
- **Visuell feedback**: Viser antall enheter som blir oppdatert
- **Automatisk deaktivering**: Knappen er deaktivert hvis alle enheter allerede er kontrollert
- **Feilhåndtering**: Viser feilmelding hvis noe går galt

## Tekniske detaljer
- Oppdaterer `kontrollert`-feltet til `true` for alle enheter
- Oppdaterer både database og lokal state
- Nullstiller ulagrede endringer etter oppdatering
- Viser suksessmelding med antall oppdaterte enheter

## Bruksområder
- **Etter kontroll**: Når du har kontrollert alle enheter fysisk
- **Masseoppdatering**: Når du vil markere alle som kontrollert uten å klikke hver enkelt
- **Tidsbesparende**: Sparer tid ved store anlegg med mange enheter

## Sikkerhet
- Krever bekreftelse før oppdatering
- Kan ikke angres (men du kan fjerne markeringen manuelt etterpå)
- Oppdaterer kun enheter for valgt anlegg
