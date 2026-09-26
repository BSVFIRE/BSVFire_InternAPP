# Testprotokoll

Sjekklisten ligger i appen, under **Administrator → Testdata**, sammen med knappene
for å opprette og slette testdataene. Den leses mens man står i systemet med
testanleggene oppe, og avhukingen huskes på enheten til man nullstiller.

Innholdet redigeres i [`src/lib/testprotokoll.ts`](../src/lib/testprotokoll.ts).
Legg til punkter der når noe går galt i produksjon – et punkt som forklarer hva
som faktisk feilet, blir sjekket neste gang. Ett uten begrunnelse blir hoppet over.

## Testdataene

Kunde **TEST – Systemtest** (kundenr. 9999) med fire anlegg:

| Anlegg | Innhold | Dekker |
|---|---|---|
| Kontorbygg Nord | Brannalarm, nødlys, slukkeutstyr | NS 3960, det vanligste anlegget |
| Lagerhall Sør | Brannalarm, røykluker, slukkeutstyr | FG-790 og røykventilasjon |
| Leilighetsbygg Vest | Nødlys, førstehjelp | Leilighetsvisning og utløpsdatoer |
| Tomt anlegg Øst | Ingenting | Tomme tilstander, import, førstegangsregistrering |

Kontaktpersonen får adressen til den som er logget inn, så e-post sendt under test
havner hos testeren.

Testdataene teller med i kontrollplan, ukesplan og dashbord mens de finnes – det er
nettopp derfor de kan brukes til å teste de sidene. Derfor skal de slettes etterpå.

## Etter testen

1. **Administrator → Testdata → Slett testdata.** Kvitteringen viser hva som ble
   fjernet, tabell for tabell.
2. **Dropbox**: mappen `9999_TEST – Systemtest` slettes manuelt. Stien kan kopieres
   fra kvitteringen.
3. **Systemloggen**: se om testen la igjen feil du ikke la merke til underveis.

Slettingen finner tabellene i databasekatalogen, ikke i en liste – se
`supabase/migrations/20260927_testdata_slett_rekkefolge.sql`. Nye tabeller kommer
derfor med av seg selv.
