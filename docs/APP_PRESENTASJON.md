# BSV Fire - Komplett App Presentasjon

> **Moderne bedriftsapp for brannvernbransjen**  
> Utviklet for BSV Fire AS

---

## 📱 Om Appen

BSV Fire-appen er en komplett digital løsning for administrasjon av brannvernstjenester. Appen dekker alt fra kundeadministrasjon og anleggshåndtering til rapportering, tilbudsskriving og KS/HMS-dokumentasjon.

**Teknologi:** React + TypeScript + Supabase (PostgreSQL)  
**Tilgjengelig på:** Web (responsiv for mobil, nettbrett og desktop)

---

## 🏠 Hovedmoduler

### 1. Dashboard
**Formål:** Oversikt over hele virksomheten på én side

**Funksjoner:**
- Statistikk over kunder, anlegg og ordre
- Kommende oppgaver og frister
- Siste aktivitet
- Hurtiglenker til vanlige handlinger
- Varsler og påminnelser

---

### 2. Kunder
**Formål:** Komplett kundeadministrasjon

**Funksjoner:**
- Opprett, rediger og slett kunder
- Kundenummer-håndtering
- Kontaktinformasjon (adresse, telefon, e-post)
- Organisasjonsnummer
- Kobling til anlegg og kontaktpersoner
- Søk og filtrering
- Eksport av kundelister

---

### 3. Anlegg
**Formål:** Administrasjon av alle brannalarmanlegg

**Funksjoner:**
- Registrering av anlegg med komplett informasjon
- Adresse med Google Maps-integrasjon
- Kobling til kunde og kontaktpersoner
- Anleggstype og status
- Sentraltype og detektorinformasjon
- Kontrollhistorikk
- Neste kontrolldato
- TODO-liste per anlegg
- Notatfunksjon
- Dropbox-integrasjon for dokumenter
- Søk, filtrering og sortering

---

### 4. Kontaktpersoner
**Formål:** Administrasjon av kontaktpersoner

**Funksjoner:**
- Interne kontaktpersoner (ansatte)
- Eksterne kontaktpersoner (kunder/leverandører)
- Kobling til kunder og anlegg
- Kontaktinformasjon (telefon, e-post)
- Rolle/stilling
- Søk og filtrering

---

### 5. Kontrollplan
**Formål:** Planlegging av kontroller

**Funksjoner:**
- Oversikt over alle planlagte kontroller
- Kalendervisning
- Filtrering på dato, kunde, anlegg
- Status på kontroller
- Automatisk påminnelse

---

### 6. Ordre
**Formål:** Ordrehåndtering og fakturering

**Funksjoner:**
- Opprett ordre fra anlegg
- Ordrelinjer med produkter/tjenester
- Priskalkulator
- Status-håndtering (ny, pågår, fakturert, etc.)
- Kobling til PowerOffice for fakturering
- Ordrehistorikk
- Søk og filtrering

---

### 7. Oppgaver
**Formål:** Oppgavestyring og arbeidsfordeling

**Funksjoner:**
- Opprett og tildel oppgaver
- Prioritering (lav, medium, høy)
- Frist og påminnelser
- Status (åpen, pågår, fullført)
- Kobling til anlegg/kunde
- Kommentarer
- Filtrering og søk

---

### 8. Møter
**Formål:** Møteplanlegging og oppfølging

**Funksjoner:**
- Kalender med møteoversikt
- Møtedetaljer (tid, sted, deltakere)
- Agenda og notater
- Oppfølgingsoppgaver
- Synkronisering med oppgaver

---

### 9. Meldinger
**Formål:** Intern kommunikasjon

**Funksjoner:**
- Meldinger mellom brukere
- Varsler og notifikasjoner
- Lesestatus

---

## 📊 Rapporter

### Rapportmoduler

#### Brannalarm
- Kontrollrapport for brannalarmanlegg
- Sjekkliste med alle kontrollpunkter
- Feil og mangler med bilder
- PDF-generering
- E-postutsending

#### Nødlys
- Kontrollrapport for nødlysanlegg
- Import fra Excel/CSV
- Armaturliste med status
- Batteritester
- Kommentarer per armatur
- PDF-generering

#### Slukkeutstyr
- Kontrollrapport for slukkeutstyr
- Apparatliste med status
- Neste kontrolldato
- PDF-generering

#### Røykluker
- Kontrollrapport for røykluker
- Funksjonskontroll
- PDF-generering

#### Førstehjelp
- Kontrollrapport for førstehjelpsutstyr
- Innholdsliste
- Utløpsdatoer
- PDF-generering

### Rapportfunksjoner
- **Rapport Oversikt:** Se alle rapporter på tvers av typer
- **Send Rapporter:** Masseutsending av rapporter via e-post
- **PDF-generering:** Profesjonelle PDF-rapporter med logo

---

## 🔧 Teknisk

### Servicerapporter
**Formål:** Dokumentasjon av serviceoppdrag

**Funksjoner:**
- Opprett servicerapport
- Arbeidsbeskrivelse
- Tidsregistrering
- Materiellbruk
- Kundesignatur
- PDF-generering
- E-postutsending

### Detektorlister
**Formål:** Oversikt over detektorer i anlegg

**Funksjoner:**
- Registrering av detektorer
- Plassering og type
- Adresser i sentralen
- Siste kontroll
- PDF-eksport

### Alarmorganisering
**Formål:** Dokumentasjon av alarmorganisering

**Funksjoner:**
- Alarmplan
- Varslingslister
- Ansvarlige personer
- PDF-generering

### Prosjektering
**Formål:** Prosjekteringsdokumentasjon

**Funksjoner:**
- Prosjekteringsrapporter
- Tekniske spesifikasjoner
- Tegninger og dokumenter
- PDF-generering

### FDV-dokumentasjon
**Formål:** Forvaltning, Drift og Vedlikehold

**Funksjoner:**
- FDV-datablader
- Produktdokumentasjon
- Vedlikeholdsinstrukser
- Kobling til anlegg

### Adressering
**Formål:** Adresseringsoversikt for anlegg

**Funksjoner:**
- Adresseringslister
- Sone/sløyfe-oversikt
- Detektorplassering

---

## 💰 Tilbud & Priser

### Tilbud Serviceavtale
**Formål:** Generering av serviceavtaletilbud

**Funksjoner:**
- Velg kunde og anlegg
- Automatisk prisberegning
- Tilpasning av tjenester
- PDF-generering
- Status-håndtering (sendt, akseptert, avslått)

### Tilbud Alarmoverføring
**Formål:** Tilbud på alarmoverføring

**Funksjoner:**
- Prisberegning for alarmoverføring
- Ulike abonnementstyper
- PDF-generering

### Priser
**Formål:** Prisadministrasjon

**Funksjoner:**
- Prislister for alle tjenester
- Prishistorikk
- Rabatter og kampanjer

### Prisadministrasjon (Admin)
**Formål:** Administrasjon av priser

**Funksjoner:**
- Oppdater priser
- Kategorisering
- Import/eksport

---

## 📁 Dokumenthåndtering

### Last Opp
**Formål:** Opplasting av dokumenter

**Funksjoner:**
- Drag & drop opplasting
- Kobling til anlegg/kunde
- Filtyper: PDF, bilder, Excel
- Automatisk kategorisering

### Nedlastinger
**Formål:** Nedlasting og e-postlogg

**Funksjoner:**
- Oversikt over genererte dokumenter
- E-postlogg
- Re-send dokumenter
- Nedlastingshistorikk

### Dropbox-integrasjon
**Formål:** Synkronisering med Dropbox

**Funksjoner:**
- Kobling til Dropbox-mapper
- Automatisk mappestruktur
- Filbrowser i appen

---

## 📋 KS/HMS

### KS/HMS Dashboard
**Formål:** Oversikt over kvalitet og HMS

**Funksjoner:**
- Statistikk og nøkkeltall
- Statusoversikt
- Varsler og påminnelser

### Risikovurderinger
**Formål:** Dokumentasjon av risikovurderinger

**Funksjoner:**
- Opprett risikovurderinger
- Risikomatrise
- Tiltak og oppfølging
- Historikk

### Hendelser
**Formål:** Registrering av hendelser

**Funksjoner:**
- Rapportering av hendelser
- Kategorisering
- Alvorlighetsgrad
- Oppfølging

### Avvik
**Formål:** Avvikshåndtering

**Funksjoner:**
- Registrering av avvik
- Årsaksanalyse
- Korrigerende tiltak
- Status og oppfølging

### Opplæring
**Formål:** Opplæringsadministrasjon

**Funksjoner:**
- Kurs og sertifiseringer
- Utløpsdatoer
- Påminnelser
- Dokumentasjon

### Tiltak
**Formål:** Tiltakshåndtering

**Funksjoner:**
- Registrering av tiltak
- Ansvarlig og frist
- Status
- Kobling til avvik/hendelser

---

## 🔐 Administrator-funksjoner

### System Logger
- Oversikt over alle systemhendelser
- Feilsøking
- Brukeraktivitet

### AI Embeddings
- Administrasjon av AI-kunnskapsbase
- Opplasting av dokumenter
- Embedding-status

### AI Knowledge
- Administrasjon av AI-kunnskap
- Spørsmål og svar
- Treningsdata

### Dropbox Folders
- Administrasjon av Dropbox-mapper
- Mappestruktur
- Tilganger

### Årsavslutning
- Årsavslutningsrutiner
- Rapporter
- Statistikk

### Modul Oversikt
- Oversikt over alle moduler
- Tilgangsstyring
- Bruksstatistikk

### Salg
- Salgsadministrasjon
- Leads og pipeline
- Statistikk

### PowerOffice
- Integrasjon med PowerOffice
- Fakturering
- Kundesynkronisering

---

## 🤖 AI-assistent

**Formål:** Intelligent hjelp og søk

**Funksjoner:**
- Naturlig språk-søk
- Spørsmål om anlegg, kunder, rapporter
- Hjelp med oppgaver
- Dokumentasjonssøk
- Kontekstbaserte svar

---

## 🌐 Spesialfunksjoner

### Offline-modus
- Fungerer uten internett
- Automatisk synkronisering
- Lokal caching

### Google Maps-integrasjon
- Adressesøk
- Kartvisning
- Veibeskrivelse

### E-postutsending
- Send rapporter direkte
- Maler
- Vedlegg

### PDF-generering
- Profesjonelle dokumenter
- Firmalogo
- Tilpassede maler

### Lys/Mørk modus
- Brukervalgt tema
- Automatisk basert på system

---

## 📱 Responsivt Design

Appen er optimalisert for:
- **Desktop:** Full funksjonalitet med sidebar
- **Nettbrett:** Tilpasset layout
- **Mobil:** Touch-vennlig grensesnitt

---

## 🔒 Sikkerhet

- Supabase Auth for autentisering
- Row Level Security (RLS)
- Kryptert dataoverføring
- Rollebasert tilgangskontroll

---

## 📈 Statistikk

Appen inneholder **50+ unike sider/moduler** med:
- 6 rapporttyper
- 6 tekniske dokumenttyper
- 6 KS/HMS-moduler
- 10+ admin-funksjoner
- AI-assistent
- Offline-støtte
- Integrasjoner (Dropbox, PowerOffice, Google Maps)

---

## 📞 Kontakt

**BSV Fire AS**  
Utviklet med ❤️ for brannvernbransjen

---

*Sist oppdatert: Februar 2026*
