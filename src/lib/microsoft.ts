/**
 * Microsoft 365 / Outlook via Microsoft Graph.
 *
 * Innlogging skjer i nettleseren med MSAL (PKCE). Tokens lagres av MSAL i localStorage
 * og går aldri innom vår database. App-registreringen «FireCtrl» i Entra (bsvfire.no)
 * har delegerte rettigheter: User.Read, Calendars.Read, Calendars.ReadWrite, Calendars.Read.Shared.
 */
import { PublicClientApplication, InteractionRequiredAuthError, type AccountInfo } from '@azure/msal-browser'
import { createLogger } from './logger'

const log = createLogger('Microsoft')

const CLIENT_ID = import.meta.env.VITE_MS_CLIENT_ID || 'b3dc7c88-d4f7-48f2-a51a-cdb4defac596'
const TENANT_ID = import.meta.env.VITE_MS_TENANT_ID || '1e8356fa-9445-49bd-b6b1-96a835167b91'
const SCOPES = ['User.Read', 'Calendars.Read', 'Calendars.ReadWrite', 'Calendars.Read.Shared']
const GRAPH = 'https://graph.microsoft.com/v1.0'

let msal: PublicClientApplication | null = null
let klar: Promise<PublicClientApplication> | null = null

function klient(): Promise<PublicClientApplication> {
  if (klar) return klar
  klar = (async () => {
    msal = new PublicClientApplication({
      // Redirect-flyt: Microsoft sender brukeren til /ms-callback (rute i appen). Må være registrert som SPA-redirect i Entra.
      auth: { clientId: CLIENT_ID, authority: `https://login.microsoftonline.com/${TENANT_ID}`, redirectUri: `${window.location.origin}/ms-callback`, postLogoutRedirectUri: window.location.origin },
      cache: { cacheLocation: 'localStorage' },
    })
    await msal.initialize()
    // Fullfører redirect-innlogging når vi lander på /ms-callback; ellers no-op.
    // Med navigateToLoginRequestUrl (standard) sendes brukeren videre til siden innloggingen startet fra.
    const res = await msal.handleRedirectPromise().catch(err => { log.warn('Microsoft redirect feilet', { err }); return null })
    if (res?.account) { msal.setActiveAccount(res.account); log.info('Outlook koblet', { bruker: res.account.username }) }
    return msal
  })()
  return klar
}

/** Kalles på landingssiden (/ms-callback): leser svaret og gir det til hovedvinduet. */
export async function fullforMicrosoftRedirect(): Promise<void> {
  await klient()
}

export function outlookKonto(): AccountInfo | null {
  return msal?.getAllAccounts()[0] ?? null
}

export async function erKobletTilOutlook(): Promise<boolean> {
  const m = await klient()
  return m.getAllAccounts().length > 0
}

/**
 * Sender brukeren til Microsoft-innlogging i samme fane. Etter innlogging lander man på
 * /ms-callback, MSAL leser svaret og sender brukeren tilbake hit (redirectStartPage).
 */
export async function kobleTilOutlook(): Promise<void> {
  const m = await klient()
  await m.loginRedirect({ scopes: SCOPES, prompt: 'select_account', redirectStartPage: window.location.href })
}

export async function kobleFraOutlook(): Promise<void> {
  const m = await klient()
  const konto = m.getAllAccounts()[0]
  if (konto) await m.logoutRedirect({ account: konto, postLogoutRedirectUri: window.location.href })
}

async function token(): Promise<string | null> {
  const m = await klient()
  const konto = m.getAllAccounts()[0]
  if (!konto) return null
  try {
    const r = await m.acquireTokenSilent({ scopes: SCOPES, account: konto })
    return r.accessToken
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      // Samtykke/innlogging må fornyes – send brukeren til Microsoft og tilbake hit
      await m.acquireTokenRedirect({ scopes: SCOPES, account: konto, redirectStartPage: window.location.href })
      return null
    }
    throw err
  }
}

async function graph<T>(sti: string, init?: RequestInit): Promise<T> {
  const t = await token()
  if (!t) throw new Error('Ikke koblet til Outlook')
  const res = await fetch(`${GRAPH}${sti}`, {
    ...init,
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json', Prefer: 'outlook.timezone="Europe/Oslo"', ...(init?.headers ?? {}) },
  })
  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message ?? `Graph svarte ${res.status}`)
  return body as T
}

// ---------- Kalender ----------

export interface Avtale {
  id: string
  tittel: string
  start: Date
  slutt: Date
  heleDagen: boolean
  sted: string | null
  lenke: string | null
  /** free | tentative | busy | oof */
  visesSom: string
  arrangor: string | null
}

interface GraphEvent {
  id: string; subject: string | null; isAllDay: boolean; webLink: string | null; showAs: string
  start: { dateTime: string; timeZone: string }; end: { dateTime: string; timeZone: string }
  location?: { displayName?: string }; organizer?: { emailAddress?: { name?: string } }
}

export interface Kalender { id: string; navn: string; standard: boolean; farge: string | null; eier: string | null }

/** Kalenderne på kontoen (egne og delte). */
export async function hentKalendere(): Promise<Kalender[]> {
  const data = await graph<{ value: { id: string; name: string; isDefaultCalendar?: boolean; hexColor?: string; owner?: { name?: string } }[] }>('/me/calendars?$select=id,name,isDefaultCalendar,hexColor,owner&$top=50')
  return data.value.map(k => ({ id: k.id, navn: k.name, standard: Boolean(k.isDefaultCalendar), farge: k.hexColor || null, eier: k.owner?.name ?? null }))
}

const VALG_KEY = 'outlook_kalendere'
/** Hvilke kalendere som vises på dashboardet (kalender-ID-er). Tom = kun standardkalenderen. */
export function valgteKalendere(): string[] {
  try { return JSON.parse(localStorage.getItem(VALG_KEY) ?? '[]') } catch { return [] }
}
export function lagreValgteKalendere(ider: string[]) {
  try { localStorage.setItem(VALG_KEY, JSON.stringify(ider)) } catch { /* ignorer */ }
}

/** Avtaler mellom to tidspunkt fra valgte kalendere (calendarView ekspanderer gjentakende avtaler). */
export async function hentAvtaler(fra: Date, til: Date, kalenderIder: string[] = valgteKalendere()): Promise<Avtale[]> {
  const p = new URLSearchParams({
    startDateTime: fra.toISOString(), endDateTime: til.toISOString(),
    $select: 'id,subject,start,end,isAllDay,location,webLink,showAs,organizer', $orderby: 'start/dateTime', $top: '100',
  })
  const stier = kalenderIder.length ? kalenderIder.map(id => `/me/calendars/${encodeURIComponent(id)}/calendarView?${p}`) : [`/me/calendarView?${p}`]
  const svar = await Promise.all(stier.map(sti => graph<{ value: GraphEvent[] }>(sti).catch(() => ({ value: [] as GraphEvent[] }))))
  const sett = new Set<string>()
  return svar.flatMap(d => d.value).filter(e => !sett.has(e.id) && sett.add(e.id)).sort((a, b) => a.start.dateTime.localeCompare(b.start.dateTime)).map(e => ({
    id: e.id,
    tittel: e.subject ?? '(uten tittel)',
    start: new Date(e.start.dateTime),
    slutt: new Date(e.end.dateTime),
    heleDagen: e.isAllDay,
    sted: penStedsnavn(e.location?.displayName),
    lenke: e.webLink,
    visesSom: e.showAs,
    arrangor: e.organizer?.emailAddress?.name ?? null,
  }))
}

/** Oppretter en avtale i egen kalender. Returnerer Graph-ID (lagres på ordren). */
export async function opprettAvtale(a: { tittel: string; start: Date; slutt: Date; sted?: string | null; beskrivelse?: string; heleDagen?: boolean }): Promise<string> {
  const tz = 'Europe/Oslo'
  const fmt = (d: Date) => a.heleDagen ? d.toISOString().slice(0, 10) + 'T00:00:00' : lokal(d)
  const e = await graph<{ id: string }>('/me/events', {
    method: 'POST',
    body: JSON.stringify({
      subject: a.tittel,
      start: { dateTime: fmt(a.start), timeZone: tz },
      end: { dateTime: fmt(a.slutt), timeZone: tz },
      isAllDay: a.heleDagen ?? false,
      location: a.sted ? { displayName: a.sted } : undefined,
      body: a.beskrivelse ? { contentType: 'text', content: a.beskrivelse } : undefined,
      showAs: 'busy',
    }),
  })
  return e.id
}

export async function slettAvtale(id: string): Promise<void> {
  await graph(`/me/events/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/** «https://meet.google.com/…» → «Google Meet», «Microsoft Teams-møte» → «Teams», ellers uendret */
function penStedsnavn(sted: string | null | undefined): string | null {
  if (!sted) return null
  const s = sted.trim()
  if (/meet\.google\.com/i.test(s)) return 'Google Meet'
  if (/teams\.microsoft\.com|teams-møte|teams meeting/i.test(s)) return 'Teams'
  if (/zoom\.us/i.test(s)) return 'Zoom'
  if (/^https?:\/\//i.test(s)) return 'Nettmøte'
  return s
}

/** Lokal tid uten sone-suffiks (Graph tolker sammen med timeZone-feltet) */
function lokal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`
}
