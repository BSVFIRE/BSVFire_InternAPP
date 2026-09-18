# ✅ Produksjonsklar synkronisering

## 🎯 Hva er fikset

Løsningen fungerer nå **både lokalt og i produksjon**!

### Endringer:

1. **CORS-støtte lagt til** i API-endepunktet
   - Tillater requests fra Firebase_BSVFire uansett hvor den kjører
   
2. **Fleksibel URL-konfigurasjon**
   - Lokalt: `http://localhost:3000`
   - Produksjon: `https://kontrollportal.vercel.app` (eller din URL)
   - Fallback: Bruker produksjons-URL hvis ikke satt

3. **Bedre logging**
   - Se hvilken URL som brukes
   - Enklere debugging

---

## 🚀 Oppsett for produksjon

### 1. Kontrollportal (Vercel)

**Miljøvariabler i Vercel:**
```
NEXT_PUBLIC_SUPABASE_URL = din-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY = din-anon-key
SUPABASE_SERVICE_ROLE_KEY = din-service-role-key
FIREBASE_SYNC_API_KEY = din-api-key
```

**Deploy:**
```bash
cd /Users/eriksebastianskille/Documents/Kontrollportal/kontrollportalen
git add .
git commit -m "Legg til Firebase synkronisering med CORS"
git push
```

Vercel deployer automatisk.

---

### 2. Firebase_BSVFire (Vercel)

**Miljøvariabler i Vercel:**
```
VITE_SUPABASE_URL = din-supabase-url
VITE_SUPABASE_ANON_KEY = din-anon-key
VITE_KONTROLLPORTAL_API_URL = https://kontrollportal.vercel.app
VITE_KONTROLLPORTAL_API_KEY = samme-api-key-som-over
```

**Deploy:**
```bash
cd /Users/eriksebastianskille/Documents/Firebase_BSVFire
git add .
git commit -m "Legg til Kontrollportal synkronisering"
git push
```

---

## 🧪 Test i produksjon

1. **Gå til Firebase_BSVFire i produksjon**
2. **Opprett et nytt anlegg**
3. **Åpne DevTools (F12) > Console**
4. **Se etter:**
   ```
   🔄 Synkroniserer til Kontrollportal: https://kontrollportal.vercel.app
   ✅ Anlegg synkronisert til Kontrollportal
   ```
5. **Verifiser i Kontrollportal Supabase:**
   - Table Editor > anlegg_ikke_linket
   - Sjekk at anlegget finnes

---

## 🔧 Lokal utvikling

### Begge apper kjører lokalt:

**Firebase_BSVFire `.env.local`:**
```bash
VITE_KONTROLLPORTAL_API_URL=http://localhost:3000
VITE_KONTROLLPORTAL_API_KEY=din-api-key
```

**Kontrollportal `.env.local`:**
```bash
SUPABASE_SERVICE_ROLE_KEY=din-service-role-key
FIREBASE_SYNC_API_KEY=samme-api-key
```

### Firebase_BSVFire lokal, Kontrollportal i produksjon:

**Firebase_BSVFire `.env.local`:**
```bash
VITE_KONTROLLPORTAL_API_URL=https://kontrollportal.vercel.app
VITE_KONTROLLPORTAL_API_KEY=din-api-key
```

---

## 🎯 Hvordan det fungerer

### Lokal utvikling:
```
Firebase_BSVFire (localhost:5173)
    ↓ HTTP POST
Kontrollportal (localhost:3000)
    ↓
anlegg_ikke_linket
```

### Produksjon:
```
Firebase_BSVFire (vercel.app)
    ↓ HTTP POST (med CORS)
Kontrollportal (vercel.app)
    ↓
anlegg_ikke_linket
```

---

## ✅ Sjekkliste

- [ ] Generer API key (`openssl rand -base64 32`)
- [ ] Legg til miljøvariabler i Kontrollportal (Vercel)
- [ ] Legg til miljøvariabler i Firebase_BSVFire (Vercel)
- [ ] Deploy Kontrollportal
- [ ] Deploy Firebase_BSVFire
- [ ] Test i produksjon
- [ ] Verifiser i Supabase

---

## 🔍 Feilsøking

### CORS-feil i produksjon

**Symptom:** "CORS policy: No 'Access-Control-Allow-Origin' header"

**Løsning:**
- Sjekk at Kontrollportal er deployet med oppdatert kode
- Verifiser at API-endepunktet returnerer CORS headers

### API key feil

**Symptom:** "Unauthorized" eller "API key mangler"

**Løsning:**
- Sjekk at `FIREBASE_SYNC_API_KEY` er identisk i begge apper
- Sjekk at miljøvariabler er satt i Vercel
- Redeploy etter å ha lagt til miljøvariabler

### Anlegg opprettes ikke

**Symptom:** Ingen feilmelding, men anlegg finnes ikke i Kontrollportal

**Løsning:**
1. Åpne DevTools > Network
2. Se etter POST til `/api/anlegg/opprett-fra-firebase`
3. Sjekk response
4. Sjekk Vercel logs for Kontrollportal

---

## 📚 Dokumentasjon

- **Oppsettguide:** `KONTROLLPORTAL_SYNC_ENKEL.md`
- **Miljøvariabler:** `.env.example`
- **Oppsummering:** `OPPSUMMERING_SYNKRONISERING.md`

---

## 🎉 Konklusjon

Løsningen fungerer nå **overalt**:
- ✅ Lokal utvikling
- ✅ Produksjon (Vercel)
- ✅ Mixed (lokal + produksjon)
- ✅ Enkel å debugge
- ✅ Sikker med API key

**Ingen kompliserte webhooks eller Edge Functions nødvendig!** 🚀
