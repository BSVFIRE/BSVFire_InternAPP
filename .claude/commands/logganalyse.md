---
description: Gå gjennom feil i systemloggen (Supabase system_logs), finn årsak i koden og foreslå rettelser
---

Du skal gå gjennom feil og advarsler som appen har logget fra brukernes nettlesere, og finne ut hva som bør rettes.

1. Kjør `node scripts/logganalyse.mjs --dager ${1:-7}` for å hente en gruppert rapport. Hvis den feiler på manglende `SUPABASE_SERVICE_ROLE_KEY`, be brukeren legge nøkkelen i `.env.local` (aldri skriv ut verdien) og stopp.
2. For hver av de viktigste gruppene (start med `error`, hopp over åpenbar støy som ResizeObserver, nettleserutvidelser og avbrutte fetch ved navigasjon):
   - Finn hvor i `src/` (eller `supabase/functions/`) meldingen kommer fra – søk etter meldingsteksten, funksjonsnavn, tabellnavn eller URL-en i `page_url`.
   - Les koden rundt og avgjør sannsynlig årsak. Vanlige årsaker i denne appen: RLS-policy som mangler (`42501`/`PGRST301`), typed `db`-klient som feiler på kolonner med `ø`, `null` i data som antas å finnes, offline-kø, MSAL/innloggingsflyt, Dropbox-token.
   - Vurder alvorlighet: mister brukeren data / kan ikke jobbe (kritisk), funksjon virker ikke (høy), ustabilt (middels), støy (lav).
3. Skriv en kort rapport til brukeren, sortert etter alvorlighet: gruppe, antall og brukere berørt, årsak (med fil:linje), og konkret forslag. Hvis en gruppe er støy, foreslå et filter i `src/lib/errorTracking.ts` i stedet.
4. Ikke endre kode uten at brukeren sier ja. Når brukeren velger hva som skal rettes: gjør rettelsen, kjør `npx tsc --noEmit`, og commit med beskrivende melding (ikke push).
