# PowerOffice Go API - Hurtigstart 🚀

En komplett guide for å komme i gang med PowerOffice Go API integrasjon.

## 📦 Hva er inkludert?

Jeg har bygget en komplett TypeScript/JavaScript klient for PowerOffice Go API v2 med:

- ✅ OAuth 2.0 autentisering (Client Credentials flow)
- ✅ Automatisk token-håndtering (caching og fornyelse)
- ✅ Alle vanlige API endpoints (kunder, produkter, fakturaer, etc.)
- ✅ TypeScript type-sikkerhet
- ✅ Feilhåndtering
- ✅ Demo testside
- ✅ Eksempler og dokumentasjon

## 🎯 Steg 1: Få tilgang til PowerOffice Demo

Du har fått et testmiljø fra PowerOffice. De skal gi deg:

1. **Application Key** (Applikasjonsnøkkel)
2. **Client Key** (Klientnøkkel) - for demo-klienten
3. **Subscription Key** (Abonnementsnøkkel)

Disse finner du i PowerOffice Developer Portal eller i e-posten de sendte deg.

## 🔧 Steg 2: Legg til credentials

1. Åpne `.env.local` filen i prosjektet ditt (eller opprett den hvis den ikke finnes)
2. Legg til disse linjene:

```env
# PowerOffice Go API (Demo)
VITE_POWEROFFICE_APPLICATION_KEY=a026a508-b5ce-47d4-9a0a-7163adb4c066
VITE_POWEROFFICE_CLIENT_KEY=9abf170a-d7ed-4946-9890-16a90ce40285
VITE_POWEROFFICE_SUBSCRIPTION_KEY=8614510ab41041e992959512b78ed229
```

**Tips:** Du kan også kopiere disse linjene fra filen `.env.local.poweroffice`!

## 🧪 Steg 3: Test integrasjonen

### Alternativ A: Bruk testsiden (enklest)

1. Start utviklingsserveren:
   ```bash
   npm run dev
   ```

2. Åpne testsiden i nettleseren:
   ```
   http://localhost:5173/poweroffice-test
   ```

3. Klikk på "Test Autentisering" for å sjekke at alt virker

### Alternativ B: Bruk kode

Opprett en testfil eller bruk konsollen:

```typescript
import { PowerOfficeClient, createConfig } from './services/poweroffice';

// Test autentisering
async function testPowerOffice() {
  try {
    // Opprett klient (bruker automatisk .env.local)
    const config = createConfig('demo');
    const client = new PowerOfficeClient(config);

    // Test 1: Autentisering
    console.log('Testing authentication...');
    await client.refreshToken();
    const authInfo = client.getAuthInfo();
    console.log('✅ Authentication OK!', authInfo);

    // Test 2: Hent klient-info
    console.log('Getting client info...');
    const info = await client.getClientIntegrationInfo();
    console.log('✅ Client info:', info);
    console.log('Available privileges:', info.validPrivileges);

    // Test 3: Hent kunder
    console.log('Getting customers...');
    const customers = await client.getCustomers({ page: 1, pageSize: 5 });
    console.log('✅ Customers:', customers);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testPowerOffice();
```

## 📚 Steg 4: Utforsk API-et

### Hent kunder

```typescript
const config = createConfig('demo');
const client = new PowerOfficeClient(config);

// Alle kunder
const customers = await client.getCustomers();

// En spesifikk kunde
const customer = await client.getCustomer(123);
```

### Opprett kunde

```typescript
const newCustomer = await client.createCustomer({
  name: 'Test Bedrift AS',
  email: 'post@testbedrift.no',
  organizationNumber: '123456789',
  address: {
    address1: 'Testveien 1',
    zipCode: '0001',
    city: 'Oslo',
    country: 'NO'
  }
});
```

### Hent fakturaer

```typescript
const invoices = await client.getOutgoingInvoices({
  fromDate: '2024-01-01',
  toDate: '2024-12-31'
});
```

### Hent produkter

```typescript
const products = await client.getProducts();
```

### Hent ansatte

```typescript
const employees = await client.getEmployees();
```

## 🔍 Feilsøking

### Problem: "Missing PowerOffice credentials"

**Løsning:** Sjekk at du har lagt til alle tre nøklene i `.env.local` og at de starter med `VITE_`

### Problem: "401 Unauthorized"

**Løsning:** 
- Sjekk at nøklene er riktige
- Sjekk at du bruker demo-nøkler med demo-miljø
- Prøv å kopiere nøklene på nytt (ingen ekstra mellomrom)

### Problem: "403 Forbidden"

**Løsning:**
- Sjekk hvilke privilegier du har med `getClientIntegrationInfo()`
- Demo-klienten har kanskje ikke alle moduler aktivert
- Kontakt PowerOffice for å aktivere flere moduler

### Problem: Kan ikke se resultater

**Løsning:**
- Åpne nettleserens konsoll (F12) for å se logger
- Sjekk at du har startet dev-serveren (`npm run dev`)
- Sjekk at `.env.local` er i rot-mappen av prosjektet

## 📖 Neste steg

1. **Les full dokumentasjon:** Se `POWEROFFICE_API_GUIDE.md`
2. **Se eksempler:** Sjekk `src/services/poweroffice/examples.ts`
3. **Utforsk API-et:** Test forskjellige endpoints på testsiden
4. **Bygg din integrasjon:** Bruk klienten i din egen kode

## 🔐 Sikkerhet

**VIKTIG - Les dette!**

- ❌ **ALDRI** commit `.env.local` til Git
- ❌ **ALDRI** del Client Key med andre
- ❌ **ALDRI** hardkod credentials i koden
- ✅ Bruk miljøvariabler (`.env.local`)
- ✅ Legg til `.env.local` i `.gitignore`
- ✅ Behandle tokens som passord

## 💡 Tips

1. **Start med demo:** Test alt i demo-miljøet først
2. **Sjekk privilegier:** Bruk `getClientIntegrationInfo()` for å se hva du har tilgang til
3. **Bruk paginering:** Store datasett returneres i sider
4. **Håndter feil:** Bruk try-catch for alle API-kall
5. **Les dokumentasjonen:** PowerOffice har god API-dokumentasjon

## 🆘 Trenger hjelp?

1. **API-dokumentasjon:** https://developer.poweroffice.net/
2. **Developer Portal:** https://developer.poweroffice.net/
3. **Support:** Kontakt PowerOffice support
4. **Lokal dokumentasjon:** Se `POWEROFFICE_API_GUIDE.md`

## 📋 Sjekkliste

- [ ] Fått credentials fra PowerOffice
- [ ] Lagt til credentials i `.env.local`
- [ ] Startet dev-server (`npm run dev`)
- [ ] Testet autentisering
- [ ] Sjekket klient-info og privilegier
- [ ] Testet å hente data (kunder, produkter, etc.)
- [ ] Lest sikkerhetsveiledningen
- [ ] Klar til å bygge integrasjon! 🎉

## 🎉 Du er klar!

Nå har du en fungerende PowerOffice Go API integrasjon. Lykke til med utviklingen!

---

**Spørsmål?** Se `POWEROFFICE_API_GUIDE.md` for detaljert dokumentasjon.
