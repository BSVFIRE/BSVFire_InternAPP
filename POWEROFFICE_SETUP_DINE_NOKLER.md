# PowerOffice API - Dine nøkler og oppsett

## 🔑 Dine API-nøkler (Demo miljø)

Du har fått følgende nøkler fra PowerOffice:

```
Application Key: a026a508-b5ce-47d4-9a0a-7163adb4c066
Client Key: 9abf170a-d7ed-4946-9890-16a90ce40285
Subscription Key: 8614510ab41041e992959512b78ed229
```

## ⚙️ Steg 1: Legg til nøklene i .env.local

Åpne eller opprett filen `.env.local` i rot-mappen av prosjektet og legg til:

```env
# PowerOffice Go API (Demo miljø)
VITE_POWEROFFICE_APPLICATION_KEY=a026a508-b5ce-47d4-9a0a-7163adb4c066
VITE_POWEROFFICE_CLIENT_KEY=9abf170a-d7ed-4946-9890-16a90ce40285
VITE_POWEROFFICE_SUBSCRIPTION_KEY=8614510ab41041e992959512b78ed229
```

**Tips:** Du kan også kopiere innholdet fra filen `.env.local.poweroffice`!

## 🌐 URLs (Demo miljø)

Disse er allerede konfigurert i koden:

- **GUI:** https://godemo.poweroffice.net/
- **Auth:** https://goapi.poweroffice.net/Demo/OAuth/Token
- **API Base:** https://goapi.poweroffice.net/demo/v2

## 🧪 Steg 3: Test integrasjonen

### Alternativ A: Bruk testsiden (anbefalt)

1. Start dev-serveren:
   ```bash
   npm run dev
   ```

2. Åpne testsiden i nettleseren:
   ```
   http://localhost:5173/poweroffice-test
   ```

3. Klikk på "Test Autentisering" for å verifisere at alt virker

### Alternativ B: Test med kode

Opprett en testfil eller bruk konsollen:

```typescript
import { PowerOfficeClient, createConfig } from './src/services/poweroffice';

async function testPowerOffice() {
  try {
    // Opprett klient
    const config = createConfig('demo');
    const client = new PowerOfficeClient(config);

    // Test autentisering
    console.log('Testing authentication...');
    await client.refreshToken();
    const authInfo = client.getAuthInfo();
    console.log('✅ Authentication successful!', authInfo);

    // Hent klient-info
    console.log('Getting client info...');
    const info = await client.getClientIntegrationInfo();
    console.log('✅ Client info:', info);
    console.log('Available privileges:', info.validPrivileges);
    console.log('Subscriptions:', info.clientSubscriptions);

    // Hent kunder
    console.log('Getting customers...');
    const customers = await client.getCustomers({ page: 1, pageSize: 5 });
    console.log('✅ Customers:', customers);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testPowerOffice();
```

## ✅ Sjekkliste

- [ ] Funnet Subscription Key i utviklerportalen
- [ ] Lagt til alle tre nøklene i `.env.local`
- [ ] Startet dev-serveren (`npm run dev`)
- [ ] Testet autentisering (grønn ✅ = suksess)
- [ ] Sjekket klient-info og privilegier
- [ ] Testet å hente data (kunder, produkter, etc.)

## 🔐 Sikkerhet

**KRITISK VIKTIG:**

- ✅ `.env.local` er allerede i `.gitignore` (blir IKKE committet til Git)
- ❌ **ALDRI** del disse nøklene med andre
- ❌ **ALDRI** hardkod nøklene i koden
- ❌ **ALDRI** commit `.env.local` til Git

## 🐛 Feilsøking

### Problem: "Missing PowerOffice credentials"

**Løsning:** 
- Sjekk at `.env.local` er i rot-mappen (samme nivå som `package.json`)
- Sjekk at alle tre nøklene er lagt til
- Sjekk at nøklene starter med `VITE_`
- Restart dev-serveren etter å ha endret `.env.local`

### Problem: "401 Unauthorized"

**Løsning:**
- Sjekk at nøklene er kopiert riktig (ingen ekstra mellomrom)
- Sjekk at du har lagt til Subscription Key
- Prøv å kopiere nøklene på nytt

### Problem: "403 Forbidden"

**Løsning:**
- Sjekk privilegier med `getClientIntegrationInfo()`
- Noen endpoints krever spesifikke Go-moduler
- Kontakt PowerOffice support hvis du trenger flere privilegier

## 🎯 Neste steg

Når autentiseringen virker:

1. **Utforsk API-et:** Test forskjellige endpoints på testsiden
2. **Sjekk privilegier:** Se hvilke operasjoner du har tilgang til
3. **Les dokumentasjonen:** Se `POWEROFFICE_API_GUIDE.md` for detaljer
4. **Bygg din integrasjon:** Bruk `PowerOfficeService` klassen i `integration-example.ts`

## 📚 Dokumentasjon

- **[POWEROFFICE_QUICKSTART.md](./POWEROFFICE_QUICKSTART.md)** - Hurtigstart-guide
- **[POWEROFFICE_API_GUIDE.md](./POWEROFFICE_API_GUIDE.md)** - Komplett API-dokumentasjon
- **[POWEROFFICE_OPPSUMMERING.md](./POWEROFFICE_OPPSUMMERING.md)** - Teknisk oversikt

## 🌐 PowerOffice Ressurser

- **Developer Portal:** https://developer.poweroffice.net/
- **Demo GUI:** https://godemo.poweroffice.net/
- **API Dokumentasjon:** https://developer.poweroffice.net/api-documentation

## 💡 Tips

- Start med å teste autentisering først
- Bruk `getClientIntegrationInfo()` for å se hva du har tilgang til
- Demo-miljøet er trygt å teste i - ingen reelle data påvirkes
- Alle API-kall logges til konsollen for debugging

## 🎉 Klar til å teste!

Når du har lagt til Subscription Key i `.env.local`, er du klar til å teste!

**Lykke til!** 🚀
