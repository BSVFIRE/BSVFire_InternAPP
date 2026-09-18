/**
 * Samler avvik for et anlegg på tvers av kontrolltypene.
 *
 * Det finnes ingen felles avvik-tabell – hver rapport lagrer avvik på sin måte. Denne modulen
 * leser fra kildene og normaliserer til én liste. Hver rad har en stabil nøkkel (`kilde:id`),
 * slik at en egen avvik-tabell med arbeidsflyt kan legges oppå senere.
 *
 * Regler (avklart 2026-09-18):
 *   Nødlys:        status ≠ OK, men «Utskiftet» = armatur byttet = løst
 *   Brannslukkere: status[] med noe annet enn OK/OK Byttet/Byttet ved kontroll;
 *                  «Ikke funnet», «Ikke tilkomst» og «Fjernet» er ikke avvik
 *   Brannslanger:  status ≠ OK eller type_avvik[] ikke tom
 *   Røykluker:     luke med status «Avvik»
 *   Førstehjelp:   status Utgått/Mangler, eller utløpsdato passert
 *   Brannalarm:    sjekkpunkter med avvik_type fra siste FG-790-kontroll, og
 *                  NS 3960-punkter med avvik = true fra siste NS 3960-kontroll
 *   Ekstern:       ingen kilde – vises ikke
 */
import { db } from './supabase'

export type AvvikKontrolltype = 'Brannalarm' | 'Nødlys' | 'Slukkeutstyr' | 'Røykluker' | 'Førstehjelp'

export interface Avvik {
  /** Stabil nøkkel: `<kilde>:<rad-id>` */
  key: string
  kontrolltype: AvvikKontrolltype
  /** Hva som er galt, f.eks. «Defekt», «Utgått», «4.2 Detektorer» */
  avvik: string
  /** Hvor / hvilken enhet */
  hvor: string | null
  /** Ekstra detalj / kommentar */
  detalj: string | null
  /** Sist oppdatert / kontrolldato */
  dato: string | null
  /** rapportType-verdi for navigering til /rapporter */
  rapportType: 'brannalarm' | 'nodlys' | 'slukkeutstyr' | 'roykluker' | 'forstehjelp'
}

const NODLYS_OK = new Set(['OK', 'Utskiftet'])
const SLUKKER_OK = new Set(['OK', 'OK Byttet', 'Byttet ved kontroll', 'Ikke funnet', 'Ikke tilkomst', 'Fjernet'])
const SLANGE_OK = new Set(['OK'])
const FORSTEHJELP_AVVIK = new Set(['Utgått', 'Mangler'])

function sted(...deler: (string | null | undefined)[]): string | null {
  const s = deler.filter(Boolean).join(', ')
  return s || null
}

export async function hentAvvikForAnlegg(anleggId: string): Promise<Avvik[]> {
  const [nodlys, slukkere, slanger, luker, forstehjelp, kontroller] = await Promise.all([
    db.from('anleggsdata_nodlys').select('id, status, etasje, plassering, internnummer, amatur_id, type, sist_oppdatert').eq('anlegg_id', anleggId),
    db.from('anleggsdata_brannslukkere').select('id, status, etasje, plassering, apparat_nr, modell, sist_oppdatert, siste_kontroll').eq('anlegg_id', anleggId),
    db.from('anleggsdata_brannslanger').select('id, status, type_avvik, etasje, plassering, slangenummer, sist_oppdatert, sistekontroll').eq('anlegg_id', anleggId),
    db.from('roykluke_luker').select('id, status, plassering, luke_type, skader, created_at, roykluke_sentraler!inner(anlegg_id, sentral_nr, plassering)').eq('roykluke_sentraler.anlegg_id', anleggId).eq('status', 'Avvik'),
    db.from('anleggsdata_forstehjelp').select('id, status, etasje, plassering, internnummer, type, utlopsdato, kommentar, created_at').eq('anlegg_id', anleggId),
    db.from('anleggsdata_kontroll').select('id, rapport_type, dato, created_at').eq('anlegg_id', anleggId).order('dato', { ascending: false, nullsFirst: false }),
  ])

  const liste: Avvik[] = []

  // Nødlys
  for (const a of nodlys.data ?? []) {
    if (!a.status || NODLYS_OK.has(a.status)) continue
    liste.push({
      key: `nodlys:${a.id}`, kontrolltype: 'Nødlys', rapportType: 'nodlys',
      avvik: a.status,
      hvor: sted(a.etasje, a.plassering),
      detalj: [a.internnummer ?? a.amatur_id ? `Armatur ${a.internnummer ?? a.amatur_id}` : null, a.type].filter(Boolean).join(' · ') || null,
      dato: a.sist_oppdatert,
    })
  }

  // Brannslukkere (status er en liste)
  for (const b of slukkere.data ?? []) {
    const avvik = (b.status ?? []).filter(s => s && !SLUKKER_OK.has(s))
    if (avvik.length === 0) continue
    liste.push({
      key: `brannslukker:${b.id}`, kontrolltype: 'Slukkeutstyr', rapportType: 'slukkeutstyr',
      avvik: avvik.join(', '),
      hvor: sted(b.etasje, b.plassering),
      detalj: [b.apparat_nr ? `Apparat ${b.apparat_nr}` : null, b.modell].filter(Boolean).join(' · ') || null,
      dato: b.sist_oppdatert ?? b.siste_kontroll,
    })
  }

  // Brannslanger
  for (const s of slanger.data ?? []) {
    const typer = (s.type_avvik ?? []).filter(Boolean)
    const statusAvvik = s.status && !SLANGE_OK.has(s.status) ? s.status : null
    if (typer.length === 0 && !statusAvvik) continue
    liste.push({
      key: `brannslange:${s.id}`, kontrolltype: 'Slukkeutstyr', rapportType: 'slukkeutstyr',
      avvik: [...typer, ...(statusAvvik && !typer.includes(statusAvvik) ? [statusAvvik] : [])].join(', '),
      hvor: sted(s.etasje, s.plassering),
      detalj: s.slangenummer != null ? `Slange ${s.slangenummer}` : null,
      dato: s.sist_oppdatert ?? s.sistekontroll,
    })
  }

  // Røykluker
  for (const l of luker.data ?? []) {
    const sentral = l.roykluke_sentraler
    liste.push({
      key: `roykluke:${l.id}`, kontrolltype: 'Røykluker', rapportType: 'roykluker',
      avvik: l.skader?.trim() ? l.skader.trim() : 'Avvik',
      hvor: sted(l.plassering),
      detalj: [l.luke_type, sentral?.sentral_nr != null ? `Sentral ${sentral.sentral_nr}` : null].filter(Boolean).join(' · ') || null,
      dato: l.created_at,
    })
  }

  // Førstehjelp
  const iDag = new Date().toISOString().slice(0, 10)
  for (const f of forstehjelp.data ?? []) {
    const utlopt = f.utlopsdato && f.utlopsdato.slice(0, 10) < iDag
    const statusAvvik = f.status && FORSTEHJELP_AVVIK.has(f.status)
    if (!utlopt && !statusAvvik) continue
    liste.push({
      key: `forstehjelp:${f.id}`, kontrolltype: 'Førstehjelp', rapportType: 'forstehjelp',
      avvik: statusAvvik ? f.status! : `Utløpt ${f.utlopsdato!.slice(0, 10)}`,
      hvor: sted(f.etasje, f.plassering),
      detalj: [f.type, f.internnummer ? `Nr. ${f.internnummer}` : null, f.kommentar].filter(Boolean).join(' · ') || null,
      dato: f.created_at,
    })
  }

  // Brannalarm – kun siste kontroll av hver standard
  const alle = kontroller.data ?? []
  const sisteFG790 = alle.find(k => k.rapport_type === 'FG790')
  const sisteNS3960 = alle.find(k => k.rapport_type === 'NS3960')
  const [fg, ns] = await Promise.all([
    sisteFG790
      ? db.from('kontrollsjekkpunkter_brannalarm').select('id, kategori, tittel, kode, avvik_type, feilkode, kommentar, antall_avvik, posisjon').eq('kontroll_id', sisteFG790.id).not('avvik_type', 'is', null)
      : Promise.resolve({ data: [] as never[] }),
    sisteNS3960
      ? db.from('ns3960_kontrollpunkter').select('id, kontrollpunkt_navn, avvik_liste, kommentar').eq('kontroll_id', sisteNS3960.id).eq('avvik', true)
      : Promise.resolve({ data: [] as never[] }),
  ])
  for (const p of fg.data ?? []) {
    liste.push({
      key: `fg790:${p.id}`, kontrolltype: 'Brannalarm', rapportType: 'brannalarm',
      avvik: [p.kode, p.tittel].filter(Boolean).join(' '),
      hvor: p.posisjon ?? null,
      detalj: [p.avvik_type, p.feilkode ? `Feilkode ${p.feilkode}` : null, p.antall_avvik && p.antall_avvik > 1 ? `${p.antall_avvik} stk` : null, p.kommentar].filter(Boolean).join(' · ') || `FG-790 · ${p.kategori}`,
      dato: sisteFG790?.dato ?? sisteFG790?.created_at ?? null,
    })
  }
  for (const p of ns.data ?? []) {
    liste.push({
      key: `ns3960:${p.id}`, kontrolltype: 'Brannalarm', rapportType: 'brannalarm',
      avvik: p.kontrollpunkt_navn,
      hvor: null,
      detalj: [p.avvik_liste, p.kommentar].filter(Boolean).join(' · ') || 'NS 3960',
      dato: sisteNS3960?.dato ?? sisteNS3960?.created_at ?? null,
    })
  }

  return liste
}

export const AVVIK_REKKEFOLGE: AvvikKontrolltype[] = ['Brannalarm', 'Nødlys', 'Slukkeutstyr', 'Røykluker', 'Førstehjelp']
