/**
 * Anlegg og kunder fra den lokale PowerSync-databasen, i samme form som sidene får dem fra Supabase.
 * Brukes som reserve når enheten er uten dekning – og som rask førstevisning når den er på nett.
 */
import { hentPowerSync } from './db'

export interface LokaltAnlegg {
  id: string
  anleggsnavn: string | null
  adresse: string | null
  postnummer: string | null
  poststed: string | null
  kontroll_maaned: string | null
  kontroll_status: string | null
  kontroll_type: string[] | null
  ansvarlig_tekniker_id: string | null
  kundenr: string | null
  unik_kode: string | null
  status: string
  skjult: boolean
  brannalarm_fullfort: boolean
  nodlys_fullfort: boolean
  slukkeutstyr_fullfort: boolean
  roykluker_fullfort: boolean
  forstehjelp_fullfort: boolean
  ekstern_fullfort: boolean
  customer: { navn: string | null; kunde_nummer: string | null; status: string | null } | null
  ansvarlig_tekniker: { navn: string | null } | null
}

interface Rad {
  id: string
  anleggsnavn: string | null
  adresse: string | null
  postnummer: string | null
  poststed: string | null
  kontroll_maaned: string | null
  kontroll_status: string | null
  kontroll_type: string | null
  ansvarlig_tekniker_id: string | null
  kundenr: string | null
  unik_kode: string | null
  status: string | null
  skjult: number | null
  brannalarm_fullfort: number | null
  nodlys_fullfort: number | null
  slukkeutstyr_fullfort: number | null
  roykluker_fullfort: number | null
  forstehjelp_fullfort: number | null
  ekstern_fullfort: number | null
  kunde_navn: string | null
  kunde_nummer: string | null
  kunde_status: string | null
  tekniker_navn: string | null
}

const bool = (v: number | null) => v === 1

function typer(v: string | null): string[] | null {
  if (!v) return null
  try { const p = JSON.parse(v); return Array.isArray(p) ? p : null } catch { return v ? [v] : null }
}

/** Alle aktive anlegg med kundenavn og ansvarlig tekniker, sortert på navn. */
export async function hentAnleggLokalt(): Promise<LokaltAnlegg[]> {
  const rader = await hentPowerSync().getAll<Rad>(`
    select a.*, k.navn as kunde_navn, k.kunde_nummer as kunde_nummer, k.status as kunde_status, t.navn as tekniker_navn
    from anlegg a
    left join customer k on k.id = a.kundenr
    left join ansatte t on t.id = a.ansvarlig_tekniker_id
    order by a.anleggsnavn collate nocase
  `)
  return rader.map(r => ({
    id: r.id,
    anleggsnavn: r.anleggsnavn,
    adresse: r.adresse,
    postnummer: r.postnummer,
    poststed: r.poststed,
    kontroll_maaned: r.kontroll_maaned,
    kontroll_status: r.kontroll_status,
    kontroll_type: typer(r.kontroll_type),
    ansvarlig_tekniker_id: r.ansvarlig_tekniker_id,
    kundenr: r.kundenr,
    unik_kode: r.unik_kode,
    status: r.status ?? 'aktiv',
    skjult: bool(r.skjult),
    brannalarm_fullfort: bool(r.brannalarm_fullfort),
    nodlys_fullfort: bool(r.nodlys_fullfort),
    slukkeutstyr_fullfort: bool(r.slukkeutstyr_fullfort),
    roykluker_fullfort: bool(r.roykluker_fullfort),
    forstehjelp_fullfort: bool(r.forstehjelp_fullfort),
    ekstern_fullfort: bool(r.ekstern_fullfort),
    customer: r.kundenr ? { navn: r.kunde_navn, kunde_nummer: r.kunde_nummer, status: r.kunde_status } : null,
    ansvarlig_tekniker: r.ansvarlig_tekniker_id ? { navn: r.tekniker_navn } : null,
  }))
}
