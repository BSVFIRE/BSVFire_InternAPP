/**
 * Ordre – detaljside (/ordre/:id)
 * Header med handlinger (avslutt, kalender, rediger), beskrivelse + tilknyttede oppgaver og servicerapporter til venstre, fakta til høyre.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, Building2, Check, CheckSquare, ChevronLeft, Edit, FileText, MoreHorizontal, Share2, Trash2 } from 'lucide-react'
import { db, type Tables } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { cn, formatDate, formatDateTime } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import { ORDRE_STATUSER, OPPGAVE_STATUS_COLORS } from '@/lib/constants'
import { initialer } from '@/lib/personer'
import { useCurrentAnsatt } from '@/hooks/useCurrentAnsatt'
import { Button, IconButton, IconButtonGroup } from '@/components/ui/Button'
import { DropdownMenu, MenuItem, MenuSeparator } from '@/components/ui/DropdownMenu'
import { LeggIKalenderKnapp } from '@/components/LeggIKalenderKnapp'
import { AvsluttOrdreDialog } from './AvsluttOrdreDialog'
import { StatusPille } from './OrdreListe'

const log = createLogger('OrdreDetaljer')

type Ordre = Tables<'ordre'> & {
  anlegg: { id: string; anleggsnavn: string | null; adresse: string | null; poststed: string | null } | null
  customer: { id: string; navn: string | null } | null
  tekniker: { id: string; navn: string | null } | null
}
type Oppgave = Pick<Tables<'oppgaver'>, 'id' | 'tittel' | 'type' | 'status' | 'forfallsdato'> & { tekniker: { navn: string | null } | null }
type Rapport = Pick<Tables<'servicerapporter'>, 'id' | 'header' | 'rapport_dato' | 'tekniker_navn'>

export default function OrdreDetaljer() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { ansatt: meg } = useCurrentAnsatt()
  const [ordre, setOrdre] = useState<Ordre | null>(null)
  const [oppgaver, setOppgaver] = useState<Oppgave[]>([])
  const [rapporter, setRapporter] = useState<Rapport[]>([])
  const [ansatte, setAnsatte] = useState<{ id: string; navn: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [feil, setFeil] = useState<string | null>(null)
  const [visAvslutt, setVisAvslutt] = useState(false)

  const loadAll = useCallback(async () => {
    if (!id) return
    try {
      setFeil(null)
      const [o, op, r, an] = await Promise.all([
        db.from('ordre').select('*, anlegg:anlegg_id(id, anleggsnavn, adresse, poststed), customer:kundenr(id, navn), tekniker:ansatte!ordre_tekniker_id_fkey(id, navn)').eq('id', id).single(),
        db.from('oppgaver').select('id, tittel, type, status, forfallsdato, tekniker:ansatte!oppgaver_tekniker_id_fkey(navn)').eq('ordre_id', id).order('opprettet_dato'),
        db.from('servicerapporter').select('id, header, rapport_dato, tekniker_navn').eq('ordre_id', id).order('rapport_dato', { ascending: false }),
        db.from('ansatte').select('id, navn').order('navn'),
      ])
      if (o.error) throw o.error
      setOrdre(o.data as unknown as Ordre)
      setOppgaver((op.data ?? []) as unknown as Oppgave[])
      setRapporter(r.data ?? [])
      setAnsatte(an.data ?? [])
    } catch (err) {
      log.error('Kunne ikke laste ordre', { error: err, ordreId: id })
      setFeil(err instanceof Error ? err.message : 'Kunne ikke laste ordre')
    } finally { setLoading(false) }
  }, [id])
  useEffect(() => { loadAll() }, [loadAll])

  // Marker som sett når tildelt tekniker åpner ordren
  useEffect(() => {
    if (!ordre || !meg || ordre.sett_av_tekniker || (ordre.tekniker_id && ordre.tekniker_id !== meg.id)) return
    db.from('ordre').update({ sett_av_tekniker: true, sett_dato: new Date().toISOString() }).eq('id', ordre.id).then(() => setOrdre(o => o ? { ...o, sett_av_tekniker: true } : o))
  }, [ordre, meg])

  useEffect(() => {
    function tast(e: KeyboardEvent) {
      if (e.key !== 'e' || e.metaKey || e.ctrlKey || e.altKey || visAvslutt || (e.target as HTMLElement).closest('input, textarea, select')) return
      if (id) navigate(`/ordre/${id}/rediger`)
    }
    document.addEventListener('keydown', tast); return () => document.removeEventListener('keydown', tast)
  }, [id, navigate, visAvslutt])

  async function kopierLenke() { try { await navigator.clipboard.writeText(window.location.href); toast.success('Lenke kopiert') } catch { toast.error('Kunne ikke kopiere') } }
  async function oppdater(patch: Partial<Tables<'ordre'>>) {
    if (!ordre) return
    const { error } = await db.from('ordre').update({ ...patch, sist_oppdatert: new Date().toISOString() }).eq('id', ordre.id)
    if (error) { toast.error('Kunne ikke oppdatere', error); return }
    loadAll()
  }
  async function slett() {
    if (!ordre || !confirm(`Slette ordre ${ordre.ordre_nummer}? Dette kan ikke angres.`)) return
    const { error } = await db.from('ordre').delete().eq('id', ordre.id)
    if (error) { toast.error('Kunne ikke slette ordre', error); return }
    toast.success('Ordre slettet'); navigate('/ordre', { replace: true })
  }
  function servicerapport() {
    if (!ordre) return
    navigate('/teknisk', { state: { openServicerapport: true, anleggId: ordre.anlegg_id, anleggNavn: ordre.anlegg?.anleggsnavn ?? '', ordreId: ordre.id } })
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>
  if (feil || !ordre) {
    return (
      <div className="card bg-red-900/20 border-red-800 flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
        <div><h2 className="text-lg font-semibold text-red-400 mb-1">Kunne ikke laste ordre</h2><p className="text-sm text-red-300 mb-3">{feil ?? 'Ordren finnes ikke'}</p><div className="flex gap-2"><Button variant="primary" onClick={loadAll}>Prøv igjen</Button><Link to="/ordre" className="btn-secondary text-sm">Til ordrelisten</Link></div></div>
      </div>
    )
  }

  const aktiv = ordre.status !== ORDRE_STATUSER.FULLFORT && ordre.status !== ORDRE_STATUSER.FAKTURERT
  const adresse = [ordre.anlegg?.adresse, ordre.anlegg?.poststed].filter(Boolean).join(', ')

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link to="/ordre" className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white min-h-[44px] sm:min-h-0"><ChevronLeft className="w-4 h-4 sm:hidden" />Ordre</Link>
        <span className="hidden sm:inline">/</span><span className="hidden sm:inline text-gray-900 dark:text-white font-mono">{ordre.ordre_nummer}</span>
      </div>

      <header className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{ordre.type}</h1>
            <span className="font-mono text-sm text-gray-500 dark:text-gray-400">{ordre.ordre_nummer}</span>
            <StatusPille status={ordre.status} />
          </div>
          <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-sm text-gray-500 dark:text-gray-400">
            {ordre.anlegg && <Link to={`/anlegg/${ordre.anlegg.id}`} className="inline-flex items-center gap-1 hover:text-primary"><Building2 className="w-3.5 h-3.5" />{ordre.anlegg.anleggsnavn}</Link>}
            {ordre.customer && <><span className="text-gray-300 dark:text-gray-700">·</span><Link to={`/kunder/${ordre.customer.id}`} className="hover:text-primary">{ordre.customer.navn}</Link></>}
            {adresse && <><span className="text-gray-300 dark:text-gray-700">·</span><span>{adresse}</span></>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <IconButtonGroup>
            <IconButton variant="ghost" label="Kopier lenke" icon={<Share2 />} onClick={kopierLenke} />
            <DropdownMenu trigger={open => <IconButton variant="ghost" label="Flere valg" icon={<MoreHorizontal />} aria-expanded={open} />}>
              {ordre.anlegg_id && <MenuItem icon={<FileText />} onSelect={servicerapport}>Opprett servicerapport</MenuItem>}
              <MenuItem icon={<CheckSquare />} onSelect={() => navigate('/oppgaver', { state: { opprettNy: true, kundeId: ordre.kundenr ?? undefined, anleggId: ordre.anlegg_id ?? undefined, ordreId: ordre.id } })}>Ny oppgave på ordren</MenuItem>
              {!aktiv && <MenuItem icon={<Check />} onSelect={() => oppdater({ status: ORDRE_STATUSER.PAGAENDE })}>Gjenåpne ordren</MenuItem>}
              <MenuSeparator />
              <MenuItem icon={<Trash2 />} danger onSelect={slett}>Slett ordre…</MenuItem>
            </DropdownMenu>
          </IconButtonGroup>
          <LeggIKalenderKnapp ordreId={ordre.id} ordreNummer={ordre.ordre_nummer} type={ordre.type ?? 'Ordre'} anleggId={ordre.anlegg_id} anleggsnavn={ordre.anlegg?.anleggsnavn ?? 'Anlegg'} kundeNavn={ordre.customer?.navn} kommentar={ordre.kommentar} outlookEventId={ordre.outlook_event_id} planlagtStart={ordre.planlagt_start} onEndret={loadAll} />
          <Button variant="outline" icon={<Edit />} kbd="E" onClick={() => navigate(`/ordre/${ordre.id}/rediger`)}><span className="hidden sm:inline">Rediger</span></Button>
          {aktiv && <Button variant="primary" icon={<Check />} onClick={() => setVisAvslutt(true)} className="!bg-green-600 hover:!bg-green-700"><span className="hidden sm:inline">Avslutt ordre</span></Button>}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_330px] gap-6 items-start">
        <div className="space-y-6">
          <section className="card space-y-2">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Beskrivelse</h2>
            {ordre.kommentar ? <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{ordre.kommentar}</p> : <p className="text-sm text-gray-500 dark:text-gray-400">Ingen kommentar. <Link to={`/ordre/${ordre.id}/rediger`} className="text-primary hover:underline">Legg til</Link></p>}
          </section>

          <section className="space-y-3" aria-label="Oppgaver">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Oppgaver på ordren <span className="text-gray-400 font-normal">({oppgaver.length})</span></h2>
            {oppgaver.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">Ingen oppgaver er knyttet til ordren. Fakturaoppgave opprettes automatisk når ordren avsluttes uten å være fakturert.</p> : (
              <div className="space-y-2">
                {oppgaver.map(o => (
                  <Link key={o.id} to={`/oppgaver/${o.id}`} className="card !p-3.5 flex items-center gap-3 hover:border-primary/60 transition-colors">
                    <span className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', o.status === 'Fullført' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-primary/10 text-primary')}>{o.status === 'Fullført' ? <Check className="w-4 h-4" strokeWidth={3} /> : <CheckSquare className="w-4 h-4" />}</span>
                    <span className="flex-1 min-w-0"><span className="block font-semibold text-gray-900 dark:text-white truncate">{o.tittel ?? o.type}</span><span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{[o.type, o.tekniker?.navn, o.forfallsdato ? `Forfall ${formatDate(o.forfallsdato)}` : null].filter(Boolean).join(' · ')}</span></span>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap', OPPGAVE_STATUS_COLORS[o.status ?? ''] ?? '')}>{o.status}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3" aria-label="Servicerapporter">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Servicerapporter <span className="text-gray-400 font-normal">({rapporter.length})</span></h2>
              {ordre.anlegg_id && <button type="button" onClick={servicerapport} className="text-sm text-primary hover:underline">Ny servicerapport</button>}
            </div>
            {rapporter.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">Ingen servicerapport ennå.</p> : rapporter.map(r => (
              <div key={r.id} className="card !p-3.5 flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-dark-100 text-gray-500 dark:text-gray-400 flex items-center justify-center flex-shrink-0"><FileText className="w-4 h-4" /></span>
                <span className="flex-1 min-w-0"><span className="block font-semibold text-gray-900 dark:text-white truncate">{r.header}</span><span className="block text-xs text-gray-500 dark:text-gray-400">{formatDate(r.rapport_dato)} · {r.tekniker_navn}</span></span>
              </div>
            ))}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="card !p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Tekniker</h2>
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-full bg-gray-100 dark:bg-dark-100 text-gray-900 dark:text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">{ordre.tekniker ? initialer(ordre.tekniker.navn) : '–'}</span>
              <select aria-label="Tekniker" value={ordre.tekniker_id ?? ''} onChange={e => oppdater({ tekniker_id: e.target.value || null })} className="input !min-h-[36px] !h-[36px] !py-0 text-sm flex-1">
                <option value="">Ikke tildelt</option>
                {ansatte.map(a => <option key={a.id} value={a.id}>{a.navn}</option>)}
              </select>
            </div>
            {ordre.sett_av_tekniker === false && ordre.tekniker_id && <p className="text-xs text-emerald-700 dark:text-emerald-400">Ikke åpnet av tekniker ennå.</p>}
          </section>

          <section className="card !p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Detaljer</h2>
            <dl className="grid grid-cols-[108px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
              <dt className="text-gray-500 dark:text-gray-400">Status</dt><dd><StatusPille status={ordre.status} /></dd>
              <dt className="text-gray-500 dark:text-gray-400">Kontrolltyper</dt><dd className="text-gray-900 dark:text-white">{ordre.kontrolltype?.length ? ordre.kontrolltype.join(', ') : '–'}</dd>
              <dt className="text-gray-500 dark:text-gray-400">Planlagt</dt><dd className="text-gray-900 dark:text-white">{ordre.planlagt_start ? formatDateTime(ordre.planlagt_start) : <span className="text-gray-400">Ikke i kalender</span>}</dd>
              <dt className="text-gray-500 dark:text-gray-400">Opprettet</dt><dd className="text-gray-900 dark:text-white">{formatDate(ordre.opprettet_dato)}{ordre.opprettet_av ? <span className="text-gray-500 dark:text-gray-400"> av {ordre.opprettet_av}</span> : null}</dd>
              {ordre.sist_oppdatert && <><dt className="text-gray-500 dark:text-gray-400">Oppdatert</dt><dd className="text-gray-900 dark:text-white">{formatDate(ordre.sist_oppdatert)}</dd></>}
              {ordre.sett_dato && <><dt className="text-gray-500 dark:text-gray-400">Sett</dt><dd className="text-gray-900 dark:text-white">{formatDateTime(ordre.sett_dato)}</dd></>}
            </dl>
          </section>
        </aside>
      </div>

      {visAvslutt && <AvsluttOrdreDialog ordre={ordre} onClose={() => setVisAvslutt(false)} onAvsluttet={loadAll} />}
    </div>
  )
}
