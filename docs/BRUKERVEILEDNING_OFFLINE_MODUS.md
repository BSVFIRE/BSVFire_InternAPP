# Brukerveiledning: Offline-modus for Brannalarm NS3960 og FG790

## Oversikt
Brannalarm-kontrollene (NS3960 og FG790) støtter nå offline-modus. Dette betyr at du kan jobbe uten internettilkobling, og alle endringer vil automatisk synkroniseres når du får tilgang til nettet igjen.

## 💡 Slik finner du hjelp
**Info-knappen** (ℹ️) finner du i sidebaren ved siden av logg ut-knappen:
- Klikk på den blå info-ikonet
- Får opp en fullstendig guide om offline-modus
- Alltid tilgjengelig, uansett hvor du er i appen
- Viser statusindikatorer, eksempler og feilsøking

## Hvordan det fungerer

### 🟢 Online-modus (Normal drift)
- Du har internettilkobling
- Alle endringer lagres direkte i databasen
- Grønn "Lagret" melding med tidspunkt vises
- Alt fungerer som normalt

### 🟠 Offline-modus (Uten internett)
- Du mister internettilkoblingen
- Oransje "Offline" merke vises øverst i høyre hjørne
- Du kan fortsette å jobbe helt normalt
- Alle endringer lagres lokalt på enheten din
- Melding bekrefter: "✓ Lagret lokalt (offline). Synkroniseres når nettilgang er tilgjengelig."

### 🔵 Synkronisering (Når nettet kommer tilbake)
- Internettilkoblingen gjenopprettes
- Blått "Synkroniserer..." merke vises
- Alle endringer lastes automatisk opp til databasen
- Grønn bekreftelse når synkroniseringen er ferdig
- Du kan fortsette å jobbe normalt

## Praktisk bruk

### Scenario 1: Kontroll i kjeller uten dekning
1. Start kontrollen mens du har internett (f.eks. i bilen)
2. Systemet laster ned nødvendig data
3. Gå ned i kjelleren uten mobildekning
4. Oransje "Offline" merke vises
5. Utfør kontrollen som normalt
6. Alle endringer lagres lokalt
7. Når du kommer opp igjen og får dekning, synkroniseres alt automatisk

### Scenario 2: Ustabil mobildekning
1. Du jobber i et område med dårlig dekning
2. Tilkoblingen går opp og ned
3. Systemet håndterer dette automatisk
4. Endringer lagres lokalt når offline
5. Synkroniseres automatisk når online
6. Du trenger ikke gjøre noe spesielt

### Scenario 3: Planlagt offline-arbeid
1. Åpne kontrollen mens du har internett
2. La siden laste ferdig
3. Slå av mobildata/WiFi (for å spare batteri)
4. Jobb offline så lenge du vil
5. Slå på internett når du er ferdig
6. Alt synkroniseres automatisk

## Viktige merknader

### ✅ Hva fungerer offline:
- Åpne eksisterende kontroller
- Fylle ut kontrollpunkter
- Legge til kommentarer
- Registrere avvik
- Lagre endringer lokalt
- Auto-lagring

### ❌ Hva krever internett:
- Opprette ny kontroll (første gang)
- Laste ned kontrolldata første gang
- Generere PDF-rapport
- Se andre brukeres endringer
- Laste opp bilder/vedlegg

### 💾 Datalagring
- Data lagres i nettleserens lokale lagring
- Tåler at du lukker nettleseren
- Tåler at enheten slås av
- Slettes IKKE automatisk
- Synkroniseres når du får nett igjen

### ⚠️ Viktig å vite
- **Ikke tøm nettleserens data** mens du har usynkroniserte endringer
- **Ikke bruk flere enheter samtidig** for samme kontroll (kan gi konflikter)
- **Vent på synkronisering** før du bytter enhet
- **Sjekk at synkroniseringen er ferdig** før du lukker appen

## Statusindikatorer

| Indikator | Betydning |
|-----------|-----------|
| 🟠 **Offline** | Ingen internettilkobling. Endringer lagres lokalt. |
| 🔵 **Synkroniserer...** | Laster opp endringer til databasen. |
| 🟢 **Lagret HH:MM** | Sist lagret tidspunkt. Alt er synkronisert. |
| ⚡ **Lagrer...** | Auto-lagring pågår. |

## Feilsøking

### Problem: "Offline" merke vises selv om jeg har internett
**Løsning:**
1. Sjekk at enheten faktisk har internettilkobling
2. Prøv å laste inn en annen nettside
3. Last inn siden på nytt (F5 eller oppdater-knappen)
4. Sjekk mobildata/WiFi-innstillinger

### Problem: Endringer synkroniseres ikke
**Løsning:**
1. Vent litt - synkronisering kan ta noen sekunder
2. Sjekk at du har stabil internettilkobling
3. Se etter feilmeldinger på skjermen
4. Last inn siden på nytt
5. Kontakt support hvis problemet vedvarer

### Problem: Data forsvant etter at jeg tømte nettleseren
**Løsning:**
- Dessverre kan ikke data gjenopprettes hvis du tømmer nettleserens data
- **Viktig:** Ikke tøm nettleserdata mens du har usynkroniserte endringer
- Vent alltid til du ser grønn "Lagret" melding før du tømmer data

### Problem: Jobbet på to enheter samtidig
**Løsning:**
- Dette kan føre til datakonflikter
- Bruk kun én enhet om gangen for samme kontroll
- Hvis du må bytte enhet:
  1. Lagre og vent på synkronisering på første enhet
  2. Lukk kontrollen
  3. Åpne kontrollen på ny enhet

## Tips for best mulig opplevelse

1. **Start kontrollen med internett** - Dette sikrer at du har siste data
2. **La siden laste ferdig** før du går offline
3. **Sjekk offline-merket** - Vit alltid om du er online eller offline
4. **Vent på synkronisering** før du lukker appen
5. **Bruk én enhet** per kontroll for å unngå konflikter
6. **Ikke tøm nettleserdata** uten å sjekke synkroniseringsstatus

## Spørsmål eller problemer?

Kontakt teknisk support hvis du opplever problemer med offline-funksjonen.

---

**Sist oppdatert:** 2025-10-14
