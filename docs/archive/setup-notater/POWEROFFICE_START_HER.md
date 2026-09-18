# 🚀 PowerOffice API - START HER!

## ✅ Alt er klart!

Jeg har bygget en komplett PowerOffice Go API integrasjon for deg. Her er hva du trenger å gjøre for å komme i gang:

## ⚙️ Steg 1: Oppdater .env.local

Åpne eller opprett filen `.env.local` i rot-mappen av prosjektet og legg til:

```env
# PowerOffice Go API (Demo miljø)
VITE_POWEROFFICE_APPLICATION_KEY=a026a508-b5ce-47d4-9a0a-7163adb4c066
VITE_POWEROFFICE_CLIENT_KEY=9abf170a-d7ed-4946-9890-16a90ce40285
VITE_POWEROFFICE_SUBSCRIPTION_KEY=8614510ab41041e992959512b78ed229
```

💡 **Tips:** Du kan også kopiere innholdet fra filen `.env.local.poweroffice` som jeg har laget for deg!

## 🧪 Steg 2: Test at det virker

### Alternativ A: Bruk testsiden (anbefalt)

1. **Start dev-serveren:**
   ```bash
   npm run dev
   ```

2. **Åpne testsiden:**
   ```
   http://localhost:5173/poweroffice-test
   ```

3. **Klikk på "Test Autentisering"**
   - ✅ Grønn = Alt virker!
   - ❌ Rød = Sjekk at du har lagt til riktig Subscription Key

4. **Test andre funksjoner:**
   - Klikk på "Klient Info" for å se dine privilegier
   - Klikk på "Hent Kunder" for å hente kunder fra PowerOffice
   - Prøv de andre knappene!

### Alternativ B: Test med kode

Opprett en testfil og kjør:

```typescript
import { PowerOfficeClient, createConfig } from './src/services/poweroffice';

async function test() {
  const config = createConfig('demo');
  const client = new PowerOfficeClient(config);
  
  // Test autentisering
  await client.refreshToken();
  console.log('✅ Autentisering OK!');
  
  // Hent kunder
  const customers = await client.getCustomers();
  console.log('Kunder:', customers);
}

test();
```

## 📚 Dokumentasjon

Jeg har laget omfattende dokumentasjon for deg:

1. **[POWEROFFICE_SETUP_DINE_NOKLER.md](./POWEROFFICE_SETUP_DINE_NOKLER.md)** ⭐ 
   - Dine spesifikke nøkler og oppsett
   - Feilsøking
   
2. **[POWEROFFICE_QUICKSTART.md](./POWEROFFICE_QUICKSTART.md)**
   - Hurtigstart-guide
   - Kom i gang på 5 minutter

3. **[POWEROFFICE_API_GUIDE.md](./POWEROFFICE_API_GUIDE.md)**
   - Komplett API-dokumentasjon
   - Alle endpoints med eksempler
   - Sikkerhetsveiledning

4. **[POWEROFFICE_OPPSUMMERING.md](./POWEROFFICE_OPPSUMMERING.md)**
   - Teknisk oversikt
   - Hva er bygget

## 🎯 Hva kan du gjøre?

API-integrasjonen støtter:

- ✅ **Kunder** - Hent, opprett, oppdater
- ✅ **Produkter** - Hent alle/enkelt
- ✅ **Fakturaer** - Hent, opprett
- ✅ **Prosjekter** - Hent alle/enkelt
- ✅ **Timeføring** - Hent med filtre
- ✅ **Ansatte** - Hent alle/enkelt
- ✅ **Klient-info** - Sjekk privilegier

## 💻 Kodeeksempler

### Hent kunder
```typescript
import { PowerOfficeClient, createConfig } from './src/services/poweroffice';

const config = createConfig('demo');
const client = new PowerOfficeClient(config);

const customers = await client.getCustomers();
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

## 🔐 Viktig om sikkerhet

- ✅ `.env.local` er i `.gitignore` (blir IKKE committet)
- ❌ **ALDRI** del dine API-nøkler med andre
- ❌ **ALDRI** hardkod nøkler i koden
- ✅ Bruk alltid miljøvariabler

## 🐛 Feilsøking

### "Missing PowerOffice credentials"
→ Sjekk at `.env.local` er i rot-mappen og inneholder alle tre nøklene

### "401 Unauthorized"
→ Sjekk at alle nøklene er kopiert riktig (ingen ekstra mellomrom). Restart dev-serveren etter endringer i `.env.local`

### "403 Forbidden"
→ Sjekk privilegier med `getClientIntegrationInfo()`. Noen endpoints krever spesifikke Go-moduler.

## 🎉 Du er klar!

Når du har lagt til Subscription Key og testet autentisering, er du klar til å bygge din integrasjon!

**Neste steg:**
1. ✅ Legg til nøklene i `.env.local`
2. ✅ Test autentisering på testsiden
3. ✅ Sjekk privilegier med "Klient Info"
4. ✅ Utforsk API-et med testknappene
5. ✅ Les dokumentasjonen
6. ✅ Bygg din integrasjon!

## 📞 Trenger du hjelp?

- **PowerOffice Developer Portal:** https://developer.poweroffice.net/
- **Demo GUI:** https://godemo.poweroffice.net/
- **API Dokumentasjon:** https://developer.poweroffice.net/api-documentation

---

**Lykke til med PowerOffice-integrasjonen! 🚀**

*Alt er satt opp og klart - bare kopier nøklene til .env.local og test!*
