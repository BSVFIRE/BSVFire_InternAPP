# 🚀 Enkel Kontrollportal Synkronisering

## 📋 Hvordan det fungerer

Når du oppretter et nytt anlegg i Firebase_BSVFire, sendes det automatisk til Kontrollportal via et API-kall.

```
Bruker oppretter anlegg i Firebase_BSVFire
    ↓
Anlegg lagres i Firebase_BSVFire database
    ↓
API-kall til Kontrollportal
    ↓
Anlegg lagres i anlegg_ikke_linket
    ↓
✅ Klart for å få unik kode senere!
```

---

## 🛠️ Oppsett

### Steg 1: Legg til miljøvariabler i Firebase_BSVFire

Opprett eller rediger `.env.local` i Firebase_BSVFire:

```bash
# Eksisterende variabler...
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...

# Legg til disse:
# For lokal utvikling:
VITE_KONTROLLPORTAL_API_URL=http://localhost:3000

# For produksjon (sett i Vercel/hosting):
# VITE_KONTROLLPORTAL_API_URL=https://kontrollportal.vercel.app

VITE_KONTROLLPORTAL_API_KEY=din-hemmelige-api-key-her
```

**Viktig:** 
- Lokalt: Bruk `http://localhost:3000` (eller porten Kontrollportal kjører på)
- Produksjon: Bruk din faktiske Kontrollportal URL (f.eks. `https://kontrollportal.vercel.app`)
- Hvis `VITE_KONTROLLPORTAL_API_URL` ikke er satt, brukes `https://kontrollportal.vercel.app` som standard

**Generer API key:**
```bash
# Bruk en tilfeldig streng, f.eks:
openssl rand -base64 32
```

Eller bruk en online generator: https://generate-random.org/api-key-generator

---

### Steg 2: Legg til miljøvariabler i Kontrollportal

Opprett eller rediger `.env.local` i Kontrollportal:

```bash
# Eksisterende variabler...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Legg til disse:
SUPABASE_SERVICE_ROLE_KEY=din-service-role-key-fra-supabase
FIREBASE_SYNC_API_KEY=samme-api-key-som-i-firebase-bsvfire
```

**Hvor finner du Service Role Key?**
1. Gå til Kontrollportal Supabase Dashboard
2. Settings > API
3. Kopier **service_role** key (IKKE anon key!)

---

### Steg 3: Start begge applikasjonene

**Firebase_BSVFire:**
```bash
cd /Users/eriksebastianskille/Documents/Firebase_BSVFire
npm run dev
```

**Kontrollportal:**
```bash
cd /Users/eriksebastianskille/Documents/Kontrollportal/kontrollportalen
npm run dev
```

---

## 🌐 Produksjonsoppsett

### For Firebase_BSVFire (Vercel/hosting)

Legg til miljøvariabler i hosting-plattformen:

**Vercel:**
1. Gå til prosjektet på Vercel
2. Settings > Environment Variables
3. Legg til:
   - `VITE_KONTROLLPORTAL_API_URL` = `https://kontrollportal.vercel.app` (eller din URL)
   - `VITE_KONTROLLPORTAL_API_KEY` = din API key

**Netlify/andre:**
Følg tilsvarende prosess for din hosting-plattform.

### For Kontrollportal (Vercel/hosting)

Legg til miljøvariabler:
- `SUPABASE_SERVICE_ROLE_KEY` = din service role key
- `FIREBASE_SYNC_API_KEY` = samme API key som over

**Viktig:** Redeploy begge applikasjonene etter å ha lagt til miljøvariabler!

---

## ✅ Test oppsettet

1. **Gå til Firebase_BSVFire**
2. **Opprett et nytt anlegg:**
   - Navn: "Test Synkronisering"
   - Adresse: "Testveien 1, 0123 Oslo"
   - Lagre

3. **Sjekk konsollen** - du skal se:
   ```
   ✅ Anlegg synkronisert til Kontrollportal
   ```

4. **Gå til Kontrollportal Supabase Dashboard**
   - Table Editor > anlegg_ikke_linket
   - Sjekk at "Test Synkronisering" finnes

---

## 🔍 Feilsøking

### Problem: "API key mangler"

**Løsning:**
- Sjekk at `VITE_KONTROLLPORTAL_API_KEY` er satt i Firebase_BSVFire `.env.local`
- Restart dev-serveren etter å ha lagt til miljøvariabler

### Problem: "Unauthorized"

**Løsning:**
- Sjekk at API key er identisk i begge `.env.local` filer
- Sjekk at `FIREBASE_SYNC_API_KEY` er satt i Kontrollportal `.env.local`

### Problem: "Intern serverfeil"

**Løsning:**
- Sjekk Kontrollportal konsoll for feilmeldinger
- Verifiser at `SUPABASE_SERVICE_ROLE_KEY` er korrekt
- Sjekk at `anlegg_ikke_linket` tabellen eksisterer

### Problem: Anlegg opprettes ikke

**Løsning:**
1. Åpne nettleserens DevTools (F12)
2. Gå til Network-fanen
3. Opprett et anlegg
4. Se etter API-kall til `/api/anlegg/opprett-fra-firebase`
5. Sjekk response for feilmeldinger

---

## 🎯 Fordeler med denne løsningen

✅ **Enkel** - Ingen Edge Functions eller Webhooks
✅ **Pålitelig** - Direkte HTTP API-kall
✅ **Rask** - Synkronisering skjer umiddelbart
✅ **Debuggbar** - Se nøyaktig hva som skjer i konsollen
✅ **Sikker** - API key-basert autentisering
✅ **Gratis** - Ingen ekstra kostnader

---

## 📝 Hva skjer ved feil?

Hvis synkroniseringen til Kontrollportal feiler:
- ✅ Anlegget lagres fortsatt i Firebase_BSVFire
- ⚠️ En advarsel logges i konsollen
- 🔄 Du kan synkronisere manuelt senere

**Anlegget vil ALLTID lagres i Firebase_BSVFire**, selv om Kontrollportal er nede.

---

## 🔒 Sikkerhet

- API key må holdes hemmelig
- Ikke commit `.env.local` til Git
- Service role key gir full tilgang - beskytt den godt
- API-endepunktet validerer API key på hver request

---

## 📚 Neste steg

1. ✅ Sett opp miljøvariabler
2. ✅ Test med et anlegg
3. ✅ Verifiser i Kontrollportal
4. ✅ Bruk normalt!

**Trenger du hjelp?**
- Sjekk konsollen for feilmeldinger
- Verifiser at begge servere kjører
- Sjekk at miljøvariabler er korrekt satt
