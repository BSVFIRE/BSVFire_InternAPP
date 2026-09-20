/**
 * Rediger anlegg (/anlegg/:id/rediger)
 *
 * Fire seksjoner i to kolonner og en klebrig lagre-linje. Kontaktpersoner, kontrollstatus
 * og «utført per type» redigeres på anleggets side (AnleggDetaljer), ikke her.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { db, type Tables } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import { omdopDropboxAnleggMappe } from '@/lib/anleggDropbox'
import { Button } from '@/components/ui/Button'
import {
  AdresseFelter, EksternFelter, Felt, KontrollFelter, KundeVelger, TOMT_SKJEMA,
  tilAnleggRad, useSkjemaValg, validerAnlegg, type AnleggSkjemaVerdier,
} from './anleggSkjema'

const log = createLogger('AnleggRediger')

function fraRad(a: Tables<'anlegg'>): AnleggSkjemaVerdier {
  return {
    anleggsnavn: a.anleggsnavn ?? '',
    kundenr: a.kundenr ?? '',
    adresse: a.adresse ?? '',
    postnummer: a.postnummer ?? '',
    poststed: a.poststed ?? '',
    kontroll_type: a.kontroll_type ?? [],
    kontroll_maaned: a.kontroll_maaned ?? '',
    ansvarlig_tekniker_id: a.ansvarlig_tekniker_id ?? '',
    er_leilighetsbygg: a.er_leilighetsbygg ?? false,
    antall_etasjer: a.antall_etasjer != null ? String(a.antall_etasjer) : '',
    ekstern_kontaktperson_id: a.ekstern_kontaktperson_id ?? '',
    ekstern_type: a.ekstern_type ?? '',
    unik_kode: a.unik_kode ?? '',
    kontrollportal_url: a.kontrollportal_url ?? '',
    fg_database_registrert: a.fg_database_registrert ?? false,
    skjult: a.skjult ?? false,
  }
}

export default function AnleggRediger() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { kunder, ansatte, eksterne, loading: lasterValg } = useSkjemaValg()

  const [original, setOriginal] = useState<Tables<'anlegg'> | null>(null)
  const [verdier, setVerdier] = useState<AnleggSkjemaVerdier>(TOMT_SKJEMA)
  const [feil, setFeil] = useState<Partial<Record<keyof AnleggSkjemaVerdier, string>>>({})
  const [lasteFeil, setLasteFeil] = useState<string | null>(null)
  const [lagrer, setLagrer] = useState(false)
  const [visAvansert, setVisAvansert] = useState(false)
  const [antallLeiligheter, setAntallLeiligheter] = useState<number | null>(null)

  useEffect(() => {
    if (!id) return
    db.from('anlegg').select('*').eq('id', id).single().then(({ data, error }) => {
      if (error || !data) { setLasteFeil(error?.message ?? 'Anlegget finnes ikke'); return }
      setOriginal(data)
      setVerdier(fraRad(data))
      setVisAvansert(Boolean(data.unik_kode || data.kontrollportal_url || data.fg_database_registrert || data.skjult))
      if (data.er_leilighetsbygg) {
        db.from('anlegg_leiligheter').select('id', { count: 'exact', head: true }).eq('anlegg_id', id).then(({ count }) => setAntallLeiligheter(count ?? 0))
      }
    })
  }, [id])

  const endret = useMemo(() => original ? JSON.stringify(fraRad(original)) !== JSON.stringify(verdier) : false, [original, verdier])

  // Vern mot å lukke fanen med ulagrede endringer
  useEffect(() => {
    if (!endret) return
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [endret])

  // ⌘S / Ctrl+S lagrer
  useEffect(() => {
    function tast(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (endret && !lagrer) lagre() }
    }
    document.addEventListener('keydown', tast)
    return () => document.removeEventListener('keydown', tast)
  })

  const oppdater = useCallback((patch: Partial<AnleggSkjemaVerdier>) => {
    setVerdier(v => ({ ...v, ...patch }))
    setFeil(f => { const n = { ...f }; for (const k of Object.keys(patch) as (keyof AnleggSkjemaVerdier)[]) delete n[k]; return n })
  }, [])

  function avbryt() {
    if (endret && !confirm('Du har ulagrede endringer. Forkaste dem?')) return
    navigate(`/anlegg/${id}`)
  }

  async function lagre() {
    if (!id || !original) return
    const v = validerAnlegg(verdier)
    if (Object.keys(v).length) {
      setFeil(v)
      toast.warning('Sjekk feltene som er merket')
      return
    }
    setLagrer(true)
    try {
      const ekstern = eksterne.find(e => e.id === verdier.ekstern_kontaktperson_id) ?? null
      const rad = { ...tilAnleggRad(verdier, ekstern), sist_oppdatert: new Date().toISOString() }
      const { error } = await db.from('anlegg').update(rad).eq('id', id)
      if (error) throw error

      // Dropbox: døp om mappen hvis navnet er endret (bakgrunnsjobb, men vi forteller resultatet)
      if (original.anleggsnavn && original.anleggsnavn !== rad.anleggsnavn) {
        const kunde = kunder.find(k => k.id === verdier.kundenr)
        omdopDropboxAnleggMappe({ kundeNummer: kunde?.kunde_nummer, kundeNavn: kunde?.navn ?? '', gammeltNavn: original.anleggsnavn, nyttNavn: rad.anleggsnavn })
          .then(r => {
            if (r.status === 'omdopt') toast.info('Dropbox-mappen ble omdøpt')
            else if (r.status === 'feil') toast.warning('Anlegget er lagret, men Dropbox-mappen ble ikke omdøpt', r.melding)
          })
      }

      toast.success('Anlegg lagret')
      navigate(`/anlegg/${id}`, { replace: true })
    } catch (err) {
      log.error('Kunne ikke lagre anlegg', { error: err, anleggId: id })
      toast.error('Kunne ikke lagre anlegg', err)
    } finally {
      setLagrer(false)
    }
  }

  async function slett() {
    if (!id || !original) return
    const navn = original.anleggsnavn ?? 'anlegget'
    if (!confirm(`Slette «${navn}»?\n\nKontrolldata, notater og dokumentkoblinger slettes. Ordre og oppgaver beholdes. Dette kan ikke angres.`)) return
    if (prompt(`Skriv «SLETT» for å bekrefte sletting av ${navn}:`) !== 'SLETT') return
    setLagrer(true)
    const { error } = await db.from('anlegg').delete().eq('id', id)
    setLagrer(false)
    if (error) {
      toast.error(error.code === '23503' ? 'Kan ikke slette: anlegget har tilknyttede data (ordre, kontroller …)' : 'Kunne ikke slette anlegg', error)
      return
    }
    toast.success(`«${navn}» er slettet`)
    navigate('/anlegg', { replace: true })
  }

  if (lasteFeil) {
    return (
      <div className="card bg-red-900/20 border-red-800 flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
        <div><h2 className="text-lg font-semibold text-red-400 mb-1">Kunne ikke laste anlegg</h2><p className="text-sm text-red-300">{lasteFeil}</p><Link to="/anlegg" className="btn-secondary text-sm mt-3 inline-flex">Til anleggslisten</Link></div>
      </div>
    )
  }
  if (!original || lasterValg) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>
  }

  const kunde = kunder.find(k => k.id === verdier.kundenr)
  const harEkstern = verdier.kontroll_type.includes('Ekstern')

  return (
    <form onSubmit={e => { e.preventDefault(); lagre() }} className="pb-28">
      <div className="space-y-5">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Link to="/anlegg" className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white min-h-[44px] sm:min-h-0"><ChevronLeft className="w-4 h-4 sm:hidden" />Anlegg</Link>
          <span className="hidden sm:inline">/</span>
          <Link to={`/anlegg/${id}`} className="hidden sm:inline hover:text-gray-900 dark:hover:text-white truncate">{original.anleggsnavn}</Link>
          <span className="hidden sm:inline">/</span>
          <span className="hidden sm:inline text-gray-900 dark:text-white">Rediger</span>
        </div>

        <header>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Rediger anlegg</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{original.anleggsnavn}{kunde?.navn ? ` · ${kunde.navn}` : ''}</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {/* Venstre kolonne */}
          <div className="space-y-5">
            <section className="card space-y-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Grunninfo</h2>
              <Felt id="anlegg-navn" label="Anleggsnavn" pakrevd feil={feil.anleggsnavn} hint="Endrer du navnet, blir Dropbox-mappen omdøpt automatisk.">
                <input id="anlegg-navn" value={verdier.anleggsnavn} onChange={e => oppdater({ anleggsnavn: e.target.value })} className={cn('input', feil.anleggsnavn && 'border-red-500')} autoFocus />
              </Felt>
              <KundeVelger verdi={verdier.kundenr} kunder={kunder} onChange={kundenr => oppdater({ kundenr })} feil={feil.kundenr} />
              <AdresseFelter verdier={verdier} feil={feil} onChange={oppdater} />
            </section>

            <section className="card space-y-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Bygg</h2>
              <label className="flex items-center gap-3 min-h-[32px] text-sm text-gray-900 dark:text-white cursor-pointer">
                <input type="checkbox" checked={verdier.er_leilighetsbygg} onChange={e => oppdater({ er_leilighetsbygg: e.target.checked })} className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-primary focus:ring-primary" />
                Leilighetsbygg (boenheter kontrolleres enkeltvis)
              </label>
              {verdier.er_leilighetsbygg && (
                <div className="grid grid-cols-[1fr_2fr] gap-3 items-end">
                  <Felt id="anlegg-etasjer" label="Antall etasjer" feil={feil.antall_etasjer}>
                    <input id="anlegg-etasjer" value={verdier.antall_etasjer} onChange={e => oppdater({ antall_etasjer: e.target.value })} inputMode="numeric" className="input" />
                  </Felt>
                  <p className="text-xs text-gray-500 dark:text-gray-400 pb-3">
                    {antallLeiligheter != null ? `${antallLeiligheter} leiligheter registrert. ` : ''}<Link to={`/anlegg/${id}`} className="text-primary hover:underline">Åpne leilighetsoversikt</Link>
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* Høyre kolonne */}
          <div className="space-y-5">
            <section className="card space-y-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Kontroll</h2>
              <KontrollFelter verdier={verdier} ansatte={ansatte} onChange={oppdater} visStatusHint />
            </section>

            {harEkstern && (
              <section className="card space-y-4">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Ekstern tjeneste</h2>
                <EksternFelter verdier={verdier} eksterne={eksterne} onChange={oppdater} />
              </section>
            )}

            <section className="card space-y-4">
              <button type="button" onClick={() => setVisAvansert(v => !v)} aria-expanded={visAvansert} className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                <ChevronRight className={cn('w-4 h-4 transition-transform', visAvansert && 'rotate-90')} />Avansert
              </button>
              {visAvansert && (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Felt id="anlegg-kode" label="Unik kode" hint="Brukes i kundeportalen">
                      <input id="anlegg-kode" value={verdier.unik_kode} onChange={e => oppdater({ unik_kode: e.target.value })} className="input font-mono" />
                    </Felt>
                    <Felt id="anlegg-url" label="Kontrollportal-URL" feil={feil.kontrollportal_url}>
                      <input id="anlegg-url" type="url" value={verdier.kontrollportal_url} onChange={e => oppdater({ kontrollportal_url: e.target.value })} className="input" placeholder="https://…" />
                    </Felt>
                  </div>
                  <label className="flex items-center gap-3 min-h-[32px] text-sm text-gray-900 dark:text-white cursor-pointer">
                    <input type="checkbox" checked={verdier.fg_database_registrert} onChange={e => oppdater({ fg_database_registrert: e.target.checked })} className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-primary focus:ring-primary" />
                    Registrert i FG-databasen
                  </label>
                  <label className="flex items-center gap-3 min-h-[32px] text-sm text-gray-900 dark:text-white cursor-pointer">
                    <input type="checkbox" checked={verdier.skjult} onChange={e => oppdater({ skjult: e.target.checked })} className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-primary focus:ring-primary" />
                    Skjul anlegget fra listen
                  </label>
                </div>
              )}
            </section>

            <section className="card space-y-3 border-red-200 dark:border-red-900/50">
              <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">Faresone</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Sletting fjerner anlegget med kontrolldata, notater og dokumentkoblinger. Ordre og oppgaver beholdes.</p>
              <Button variant="danger" icon={<Trash2 />} onClick={slett} disabled={lagrer} className="border border-red-200 dark:border-red-900/50">Slett anlegg</Button>
            </section>
          </div>
        </div>
      </div>

      {/* Klebrig lagre-linje */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-[var(--sidebar-w)] z-20 bg-white dark:bg-dark-50 border-t border-gray-200 dark:border-gray-800 px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
        <span className={cn('text-sm inline-flex items-center gap-2 mr-auto', endret ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600')}>
          <span className={cn('w-2 h-2 rounded-full', endret ? 'bg-yellow-500' : 'bg-gray-300 dark:bg-gray-700')} />
          <span className="hidden sm:inline">{endret ? 'Ulagrede endringer' : 'Ingen endringer'}</span>
        </span>
        <Button variant="ghost" onClick={avbryt}>Avbryt</Button>
        <Button variant="primary" type="submit" loading={lagrer} disabled={!endret} kbd="⌘S">Lagre</Button>
      </div>
    </form>
  )
}
