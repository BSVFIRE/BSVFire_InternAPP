# Testprotokoll

Sjekkliste for å gå gjennom systemet med testdata. Opprett testdataene under
**Administrator → Testdata**, gå gjennom det du vil teste, og slett dem etterpå.

Testkunden heter **TEST – Systemtest** (kundenr. 9999) og har fire anlegg:

| Anlegg | Innhold | Brukes til å teste |
|---|---|---|
| Kontorbygg Nord | Brannalarm, nødlys, slukkeutstyr | NS 3960, det vanligste anlegget |
| Lagerhall Sør | Brannalarm, røykluker, slukkeutstyr | FG-790 og røykventilasjon |
| Leilighetsbygg Vest | Nødlys, førstehjelp | Leilighetsvisning og utløpsdatoer |
| Tomt anlegg Øst | Ingenting | Tomme tilstander, import, førstegangsregistrering |

Kontaktpersonen på hvert anlegg får **din egen e-postadresse**, så e-post sendt
under test havner hos deg.

Du trenger ikke gå gjennom alt. Velg modulen du har endret, og ta **Alltid**-listen
i tillegg.

---

## Alltid

Dette er feil som har oppstått før, og som ikke merkes før noen ser etter.

- [ ] **Rapporten kom til Dropbox, ikke bare til anlegget.** Etter lagring skal det
      komme to bekreftelser: «lagret på anlegget» og «lagret i Dropbox». Kommer bare
      den første, åpne Dropbox og se etter filen. Den har vært lagret i Storage og
      manglet i Dropbox uten at noe sa fra.
- [ ] **PDF-en åpner uten feil.** Forhåndsvisning på et anlegg med ufullstendige data –
      en nettverksrad uten id veltet hele genereringen.
- [ ] **Forsiden er komplett:** forskriftslinjen under anleggsnavnet, «Neste kontroll»
      gulmerket, kontrollørens navn, sertifikat, telefon og e-post.
- [ ] **Ingenting kolliderer i PDF-en.** Se særlig på forsiden når kontaktpersonen har
      både telefon og e-post, og på liggende sider.
- [ ] **Offline.** Slå av nettet i nettleseren, registrer noe, slå det på igjen og
      last siden på nytt. Det du registrerte skal fortsatt være der. Punkter lagret
      offline har blitt forkastet i stillhet før.
- [ ] **Pauset og deaktivert teller ikke med.** Sett et testanlegg til Pauset og
      kontroller at det forsvinner fra kontrollplan, ukesplan og tellinger.

## Brannalarm – NS 3960

- [ ] Start kontroll, sett noen punkter til Kontrollert, ett til Avvik med beskrivelse.
- [ ] Legg to bilder på avviket. De skal dukke opp i bildebanken på anlegget.
- [ ] Lagre, gå ut, gå inn igjen: **samme utkast** fortsetter, det lages ikke et nytt.
- [ ] Ta et bilde med nettet av. Det skal vises med skyikon og lastes opp når nettet
      er tilbake.
- [ ] Generer rapport. Sjekk: enhetstabellen (antall kun på typelinjene), avvikstabellen,
      og at bildene kommer med under «Bilder til avvikene» med riktig avviksnummer.
- [ ] Ferdigstill kontrollen og se at anlegget får status fullført.

## Brannalarm – FG-790

- [ ] Samme som over, i tillegg:
- [ ] Poengtrekk og AG-verdi regnes riktig i summen nederst.
- [ ] Antall avvik > 1 multipliserer poengtrekket.
- [ ] Lagre samme kontroll to ganger – punktene skal ikke dupliseres.

## Nødlys

- [ ] Filtrer listen og scroll – flere armaturer skal lastes etter hvert (24 i testdataene).
- [ ] Merk flere armaturer og slett. Dialogen skal si hvor mange.
- [ ] Importer fra Excel og fra Apple Numbers på det tomme anlegget.
- [ ] Generer rapport – den liggende listesiden skal ha sidefot og ingen kuttede kolonner.

## Slukkeutstyr

- [ ] Brannslangen fra 2010 har forfalt trykktest og skal vises som avvik.
- [ ] Statistikken for trykktest stemmer med listen.
- [ ] Rapport for både slukkere og slanger.

## Røykluker

- [ ] Kontroller én sentral: sjekkpunkter, kretser, byttet utstyr, konklusjon.
- [ ] Autolagring – gå ut midt i utfyllingen og inn igjen.
- [ ] Rapport: omfang (sentral-, motor- og luketyper telles automatisk), tabell per
      plassering, avvik og anbefalinger.

## Førstehjelp

- [ ] To enheter har passert utløpsdato og skal vises under «Utløper».
- [ ] Merk flere og rediger i bulk.
- [ ] Rapport.

## Kunde og anlegg

- [ ] Sett testkunden til Pauset mens et anlegg er aktivt – det skal komme en advarsel.
- [ ] Sett anleggene til Pauset først, så kunden. Nå skal det gå.
- [ ] Bildebanken: last opp, åpne i full størrelse, slett.
- [ ] Dokumentfanen skal ikke vise bildene.

## Planlegging

- [ ] Legg testanleggene i en ukesplan, endre rekkefølge, flytt mellom dager.
- [ ] Klokkeslett vises som 24-timers.
- [ ] Lagre flere ganger – det skal ikke bli nye versjoner.
- [ ] Slett ukesplanen.

## E-post

- [ ] Send en rapport til deg selv.
- [ ] Send til flere mottakere samtidig – det har vært den som feilet.
- [ ] Sjekk Nedlastinger: sendingen skal være logget med status.

---

## Etter testen

1. **Administrator → Testdata → Slett testdata.** Kvitteringen viser hva som ble
   slettet, tabell for tabell.
2. **Dropbox**: mappen `9999_TEST – Systemtest` slettes manuelt. Stien kan kopieres
   fra kvitteringen.
3. **Systemloggen**: se om testen la igjen feil du ikke la merke til underveis.
