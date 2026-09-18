/**
 * QR-koder for anlegg (tabell anlegg_qr_koder).
 *
 * En kode er 8 tegn [A-Z0-9], samme format som Kontrollportal alltid har brukt, og QR-en
 * peker til https://www.kontrollportal.no/anlegg?kode=XXXXXXXX. Koder fødes her, blanke
 * etiketter printes fra CSV (NiceLabel-malen), og kobles til anlegg ved skanning i felt.
 */
import { db, supabase } from './supabase'
import { createLogger } from './logger'

const log = createLogger('QrKoder')

export const KONTROLLPORTAL_URL = 'https://www.kontrollportal.no'
const ALFABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

export interface QrKode {
  kode: string
  anlegg_id: string | null
  merkelapp: string | null
  opprettet: string
  koblet: string | null
  koblet_av: string | null
}

export function qrUrl(kode: string): string {
  return `${KONTROLLPORTAL_URL}/anlegg?kode=${kode}`
}

export function nyKode(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => ALFABET[b % ALFABET.length]).join('')
}

/** Trekker ut koden fra det en QR-leser gir: full URL, «kode=…» eller bare 8 tegn. */
export function tolkSkannetKode(tekst: string): string | null {
  const t = tekst.trim()
  const fraUrl = t.match(/[?&]kode=([A-Za-z0-9]{8})/)
  if (fraUrl) return fraUrl[1].toUpperCase()
  const raa = t.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return raa.length === 8 ? raa : null
}

/** Genererer n blanke koder (ligger i bilen til de kobles). Prøver på nytt ved kollisjon. */
export async function opprettBlankeKoder(n: number, opprettetAv: string | null): Promise<QrKode[]> {
  const koder = Array.from({ length: n }, () => ({ kode: nyKode(), opprettet_av: opprettetAv }))
  const { data, error } = await db.from('anlegg_qr_koder').insert(koder).select('kode, anlegg_id, merkelapp, opprettet, koblet, koblet_av')
  if (error) {
    if (error.code === '23505') return opprettBlankeKoder(n, opprettetAv) // kollisjon – ekstremt sjelden
    throw error
  }
  return data ?? []
}

/** Oppretter en kode som er koblet til anlegget fra start (etikett printes før man drar). */
export async function opprettKodeForAnlegg(anleggId: string, merkelapp: string | null, av: string | null): Promise<QrKode> {
  const { data, error } = await db.from('anlegg_qr_koder')
    .insert({ kode: nyKode(), anlegg_id: anleggId, merkelapp, opprettet_av: av, koblet_av: av })
    .select('kode, anlegg_id, merkelapp, opprettet, koblet, koblet_av').single()
  if (error) {
    if (error.code === '23505') return opprettKodeForAnlegg(anleggId, merkelapp, av)
    throw error
  }
  await synkTilPortal(data.kode)
  return data
}

export type KobleResultat =
  | { status: 'ok'; kode: QrKode }
  | { status: 'finnes_ikke' }
  | { status: 'allerede_koblet'; anleggId: string; anleggsnavn: string | null }

/** Kobler en blank kode til et anlegg. Feiler trygt hvis koden allerede er i bruk. */
export async function kobleKode(kode: string, anleggId: string, merkelapp: string | null, av: string | null): Promise<KobleResultat> {
  const { data: eksisterende } = await db.from('anlegg_qr_koder').select('kode, anlegg_id, anlegg:anlegg_id(anleggsnavn)').eq('kode', kode).maybeSingle()
  if (!eksisterende) return { status: 'finnes_ikke' }
  if (eksisterende.anlegg_id && eksisterende.anlegg_id !== anleggId) {
    return { status: 'allerede_koblet', anleggId: eksisterende.anlegg_id, anleggsnavn: eksisterende.anlegg?.anleggsnavn ?? null }
  }
  const { data, error } = await db.from('anlegg_qr_koder')
    .update({ anlegg_id: anleggId, merkelapp, koblet_av: av, koblet: new Date().toISOString() })
    .eq('kode', kode)
    .select('kode, anlegg_id, merkelapp, opprettet, koblet, koblet_av').single()
  if (error) throw error
  await synkTilPortal(kode)
  return { status: 'ok', kode: data }
}

/** Fjerner koblingen (koden blir blank igjen – etiketten kan brukes på nytt). */
export async function frikobleKode(kode: string): Promise<void> {
  const { error } = await db.from('anlegg_qr_koder').update({ anlegg_id: null, merkelapp: null, koblet: null, koblet_av: null }).eq('kode', kode)
  if (error) throw error
  await synkTilPortal(kode)
}

/**
 * Sender koden + anleggsinfo til Kontrollportal (Edge Function holder API-nøkkelen).
 * Feil her stopper ikke koblingen – portalen kan synkes på nytt senere.
 */
export async function synkTilPortal(kode: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('sync-to-kontrollportal', { body: { kode } })
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    return true
  } catch (err) {
    log.warn('Kunne ikke synke kode til Kontrollportal', { kode, err })
    return false
  }
}

/** CSV i samme format som NiceLabel-malen forventer: anlegg_navn, unik_kode, qr_url */
export function tilCsv(koder: { kode: string; anleggsnavn?: string | null }[]): string {
  const esc = (v: string) => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
  return ['anlegg_navn,unik_kode,qr_url', ...koder.map(k => `${esc(k.anleggsnavn ?? '')},${k.kode},${qrUrl(k.kode)}`)].join('\n')
}

export function lastNedCsv(innhold: string, filnavn: string) {
  const blob = new Blob(['﻿' + innhold], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filnavn; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
