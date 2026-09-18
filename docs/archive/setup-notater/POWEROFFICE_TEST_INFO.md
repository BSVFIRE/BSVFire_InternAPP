# PowerOffice Test Side - Viktig informasjon

## 🔐 Du må være logget inn!

Testsiden er beskyttet og krever at du er logget inn i applikasjonen.

## 📍 Slik tester du:

### 1. Start dev-serveren
```bash
npm run dev
```

### 2. Logg inn først
1. Åpne `http://localhost:5173`
2. Logg inn med din bruker
3. Når du er inne i applikasjonen...

### 3. Gå til testsiden
Naviger til: `http://localhost:5173/poweroffice-test`

Eller legg til en lenke i menyen (se nedenfor)

## 🎯 Test PowerOffice API

På testsiden kan du:
- ✅ Test autentisering
- ✅ Hent klient-info og privilegier
- ✅ Hent kunder
- ✅ Hent produkter
- ✅ Hent ansatte
- ✅ Hent prosjekter

## 🔧 Alternativ: Test uten UI

Hvis du vil teste uten å logge inn, kan du bruke Node.js direkte:

### Opprett testfil: `test-poweroffice.js`

```javascript
// test-poweroffice.js
import { PowerOfficeClient } from './src/services/poweroffice/client.js';

const config = {
  applicationKey: 'a026a508-b5ce-47d4-9a0a-7163adb4c066',
  clientKey: '9abf170a-d7ed-4946-9890-16a90ce40285',
  subscriptionKey: '8614510ab41041e992959512b78ed229',
  environment: 'demo'
};

const client = new PowerOfficeClient(config);

async function test() {
  try {
    console.log('Testing authentication...');
    await client.refreshToken();
    console.log('✅ Authentication successful!');
    
    console.log('\nGetting client info...');
    const info = await client.getClientIntegrationInfo();
    console.log('✅ Client info:', info);
    
    console.log('\nGetting customers...');
    const customers = await client.getCustomers({ page: 1, pageSize: 5 });
    console.log('✅ Customers:', customers);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
```

### Kjør testen:
```bash
node test-poweroffice.js
```

## 🎨 Legg til i menyen (valgfritt)

Hvis du vil ha en permanent lenke til testsiden i menyen, kan du legge den til i navigasjonen.

Dette er valgfritt og kun for testing!

## ✅ Sjekkliste

- [ ] Lagt til nøkler i `.env.local`
- [ ] Startet dev-serveren (`npm run dev`)
- [ ] Logget inn i applikasjonen
- [ ] Navigert til `/poweroffice-test`
- [ ] Testet autentisering
- [ ] Sjekket klient-info
- [ ] Testet API-kall

## 🐛 Feilsøking

### Siden er blank
→ Sjekk at du er logget inn først!

### "Missing PowerOffice credentials"
→ Sjekk at `.env.local` inneholder alle tre nøklene

### "401 Unauthorized"
→ Sjekk at nøklene er riktige. Restart dev-serveren etter endringer i `.env.local`

### Kan ikke se konsoll-output
→ Åpne nettleserens utviklerverktøy (F12) og gå til Console-fanen

## 💡 Tips

- Åpne nettleserens konsoll (F12) for å se detaljert output
- Alle API-kall logges til konsollen
- Resultater vises både på siden og i konsollen
- Bruk "Test Autentisering" først for å sjekke at alt virker

---

**Nå er du klar til å teste PowerOffice API! 🚀**
