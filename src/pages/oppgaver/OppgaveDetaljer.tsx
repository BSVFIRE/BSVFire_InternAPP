/**
 * Oppgave – detaljside (/oppgaver/:id)
 */
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, Building2, Check, ChevronLeft, ClipboardList, Edit, Mail, MoreHorizontal, Phone, RotateCcw, Share2, Trash2 } from 'lucide-react'
import { db, type Tables } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { cn, formatDate, formatDateTime } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import { OPPGAVE_STATUSER, OPPGAVE_STATUS_COLORS } from '@/lib/constants'
import { initialer } from '@/lib/personer'
import { fullforOppgave } from '@/lib/oppgaver'
import { useCurrentAnsatt } from '@/hooks/useCurrentAnsatt'
import { Button, IconButton, IconButtonGroup } from '@/components/ui/Button'
import { DropdownMenu, MenuItem, MenuSeparator } from '@/components/ui/DropdownMenu'
import { Frist, Prioritet } from './OppgaveListe'

const log = createLogger('OppgaveDetaljer')

type Oppgave = Tables<'oppgaver'> & {
  anlegg: { id: string; anleggsnavn: string | null; adresse: string | null; poststed: string | null } | null
  customer: { id: string; navn: string | null } | null
  tekniker: { id: string; navn: string | null } | null
  ordre: { id: string; ordre_nummer: string; type: string | null; status: string | null } | null
}
type Kontakt = { id: string; navn: string | null; telefon: string | null; epost: string | null; rolle: string | null }

export default function OppgaveDetaljer() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { ansatt: meg } = useCurrentAnsatt()
  const [oppgave, setOppgave] = useState<Oppgave | null>(null)
  const [kontakt, setKontakt] = useState<Kontakt | null>(null)
  const [ansatte, setAnsatte] = useState<{ id: string; navn: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [feil, setFeil] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    if (!id) return
    try {
      setFeil(null)
      const [o, an] = await Promise.all([
        db.from('oppgaver').select('*, anlegg:anlegg_id(id, anleggsnavn, adresse, poststed), customer:kunde_id(id, navn), tekniker:ansatte!oppgaver_tekniker_id_fkey(id, navn), ordre:ordre_id(id, ordre_nummer, type, status)').eq('id', id).single(),
        db.from('ansatte').select('id, navn').order('navn'),
      ])
      if (o.error) throw o.error
      const data = o.data as unknown as Oppgave
      setOppgave(data)
      setAnsatte(an.data ?? [])
      if (data.kontaktperson) { const { data: k } = await db.from('kontaktpersoner').select('id, navn, telefon, epost, rolle').eq('id', data.kontaktperson).maybeSingle(); setKontakt(k) } else setKontakt(null)
    } catch (err) {
      log.error('Kunne ikke laste oppgave', { error: err, oppgaveId: id })
      setFeil(err instanceof Error ? err.message : 'Kunne ikke laste oppgave')
    } finally { setLoading(false) }
  }, [id])
  useEffect(() => { loadAll() }, [loadAll])

  useEffect(() => {
    if (!oppgave || !meg || oppgave.sett_av_tekniker || (oppgave.tekniker_id && oppgave.tekniker_id !== meg.id)) return
    db.from('oppgaver').update({ sett_av_tekniker: true, sett_dato: new Date().toISOString() }).eq('id', oppgave.id).then(() => setOppgave(o => o ? { ...o, sett_av_tekniker: true } : o))
  }, [oppgave, meg])

  useEffect(() => {
    function tast(e: KeyboardEvent) {
      if (e.key !== 'e' || e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).closest('input, textarea, select')) return
      if (id) navigate(`/oppgaver/${id}/rediger`)
    }
    document.addEventListener('keydown', tast); return () => document.removeEventListener('keydown', tast)
  }, [id, navigate])

  async function kopierLenke() { try { await navigator.clipboard.writeText(window.location.href); toast.success('Lenke kopiert') } catch { toast.error('Kunne ikke kopiere') } }
  async function oppdater(patch: Partial<Tables<'oppgaver'>>) {
    if (!oppgave) return
    const { error } = await db.from('oppgaver').update({ ...patch, sist_oppdatert: new Date().toISOString() }).eq('id', oppgave.id)
    if (error) { toast.error('Kunne ikke oppdatere', error); return }
    loadAll()
  }
  async function fullfor() {
    if (!oppgave) return
    const res = await fullforOppgave(oppgave)
    if (res.error) { toast.error('Kunne ikke fullføre oppgave', res.error); return }
    toast.success(res.ordreFakturert ? 'Oppgave fullført – ordren er satt til Fakturert' : 'Oppgave fullført')
    loadAll()
  }
  async function slett() {
    if (!oppgave || !confirm(`Slette oppgaven «${oppgave.tittel ?? oppgave.type}»?`)) return
    const { error } = await db.from('oppgaver').delete().eq('id', oppgave.id)
    if (error) { toast.error('Kunne ikke slette oppgave', error); return }
    toast.success('Oppgave slettet'); navigate('/oppgaver', { replace: true })
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>
  if (feil || !oppgave) {
    return (
      <div className="card bg-red-900/20 border-red-800 flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
        <div><h2 className="text-lg font-semibold text-red-400 mb-1">Kunne ikke laste oppgave</h2><p className="text-sm text-red-300 mb-3">{feil ?? 'Oppgaven finnes ikke'}</p><div className="flex gap-2"><Button variant="primary" onClick={loadAll}>Prøv igjen</Button><Link to="/oppgaver" className="btn-secondary text-sm">Til oppgavelisten</Link></div></div>
      </div>
    )
  }

  const apen = oppgave.status !== OPPGAVE_STATUSER.FULLFORT
  const tittel = oppgave.tittel ?? oppgave.type ?? 'Oppgave'

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link to="/oppgaver" className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white min-h-[44px] sm:min-h-0"><ChevronLeft className="w-4 h-4 sm:hidden" />Oppgaver</Link>
        <span className="hidden sm:inline">/</span><span className="hidden sm:inline text-gray-900 dark:text-white truncate">{tittel}</span>
      </div>

      <header className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className={cn('text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white', !apen && 'line-through decoration-2 text-gray-500 dark:text-gray-400')}>{tittel}</h1>
            <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold border', OPPGAVE_STATUS_COLORS[oppgave.status ?? ''] ?? '')}>{oppgave.status}</span>
            <Prioritet p={oppgave.prioritet} />
          </div>
          <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-sm text-gray-500 dark:text-gray-400">
            <span className="px-1.5 py-px rounded bg-gray-100 dark:bg-dark-100 text-xs">{oppgave.type}</span>
            {oppgave.anlegg && <Link to={`/anlegg/${oppgave.anlegg.id}`} className="inline-flex items-center gap-1 hover:text-primary"><Building2 className="w-3.5 h-3.5" />{oppgave.anlegg.anleggsnavn}</Link>}
            {oppgave.customer && <Link to={`/kunder/${oppgave.customer.id}`} className="hover:text-primary">{oppgave.customer.navn}</Link>}
            <span className="inline-flex items-center gap-1">Frist: <Frist dato={oppgave.forfallsdato} apen={apen} /></span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <IconButtonGroup>
            <IconButton variant="ghost" label="Kopier lenke" icon={<Share2 />} onClick={kopierLenke} />
            <DropdownMenu trigger={open => <IconButton variant="ghost" label="Flere valg" icon={<MoreHorizontal />} aria-expanded={open} />}>
              {!apen && <MenuItem icon={<RotateCcw />} onSelect={() => oppdater({ status: OPPGAVE_STATUSER.PAGAENDE })}>Gjenåpne oppgaven</MenuItem>}
              {apen && oppgave.status !== OPPGAVE_STATUSER.PAGAENDE && <MenuItem icon={<ClipboardList />} onSelect={() => oppdater({ status: OPPGAVE_STATUSER.PAGAENDE })}>Merk som pågående</MenuItem>}
              <MenuSeparator />
              <MenuItem icon={<Trash2 />} danger onSelect={slett}>Slett oppgave…</MenuItem>
            </DropdownMenu>
          </IconButtonGroup>
          <Button variant="outline" icon={<Edit />} kbd="E" onClick={() => navigate(`/oppgaver/${oppgave.id}/rediger`)}><span className="hidden sm:inline">Rediger</span></Button>
          {apen && <Button variant="primary" icon={<Check />} onClick={fullfor} className="!bg-green-600 hover:!bg-green-700"><span className="hidden sm:inline">Fullfør</span></Button>}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_330px] gap-6 items-start">
        <div className="space-y-6">
          <section className="card space-y-2">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Beskrivelse</h2>
            {oppgave.beskrivelse ? <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{oppgave.beskrivelse}</p> : <p className="text-sm text-gray-500 dark:text-gray-400">Ingen beskrivelse. <Link to={`/oppgaver/${oppgave.id}/rediger`} className="text-primary hover:underline">Legg til</Link></p>}
          </section>

          {oppgave.ordre && (
            <section className="space-y-3" aria-label="Ordre">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Tilhører ordre</h2>
              <Link to={`/ordre/${oppgave.ordre.id}`} className="card !p-3.5 flex items-center gap-3 hover:border-primary/60 transition-colors">
                <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"><ClipboardList className="w-4 h-4" /></span>
                <span className="flex-1 min-w-0"><span className="block font-semibold text-gray-900 dark:text-white truncate">{oppgave.ordre.type} <span className="font-mono text-xs font-normal text-gray-500 dark:text-gray-400">{oppgave.ordre.ordre_nummer}</span></span><span className="block text-xs text-gray-500 dark:text-gray-400">Status: {oppgave.ordre.status}{oppgave.type === 'Faktura' && apen ? ' · settes til Fakturert når oppgaven fullføres' : ''}</span></span>
              </Link>
            </section>
          )}

          {kontakt && (
            <section className="space-y-3" aria-label="Kontaktperson">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Kontaktperson</h2>
              <div className="card !p-3.5 flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-gray-100 dark:bg-dark-100 text-gray-900 dark:text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">{initialer(kontakt.navn)}</span>
                <Link to={`/kontaktpersoner/${kontakt.id}`} className="flex-1 min-w-0"><span className="block font-semibold text-gray-900 dark:text-white truncate hover:text-primary">{kontakt.navn}</span><span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{kontakt.rolle ?? ''}</span></Link>
                {kontakt.telefon && <a href={`tel:${kontakt.telefon}`} aria-label="Ring" title={kontakt.telefon} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-dark-100 text-gray-500 dark:text-gray-400 hover:text-primary flex items-center justify-center"><Phone className="w-4 h-4" /></a>}
                {kontakt.epost && <a href={`mailto:${kontakt.epost}`} aria-label="E-post" title={kontakt.epost} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-dark-100 text-gray-500 dark:text-gray-400 hover:text-primary flex items-center justify-center"><Mail className="w-4 h-4" /></a>}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <section className="card !p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Ansvarlig</h2>
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-full bg-gray-100 dark:bg-dark-100 text-gray-900 dark:text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">{oppgave.tekniker ? initialer(oppgave.tekniker.navn) : '–'}</span>
              <select aria-label="Ansvarlig" value={oppgave.tekniker_id ?? ''} onChange={e => oppdater({ tekniker_id: e.target.value || null })} className="input !min-h-[36px] !h-[36px] !py-0 text-sm flex-1">
                <option value="">Ikke tildelt</option>
                {ansatte.map(a => <option key={a.id} value={a.id}>{a.navn}</option>)}
              </select>
            </div>
            {oppgave.sett_av_tekniker === false && oppgave.tekniker_id && <p className="text-xs text-emerald-700 dark:text-emerald-400">Ikke åpnet av ansvarlig ennå.</p>}
          </section>

          <section className="card !p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Detaljer</h2>
            <dl className="grid grid-cols-[108px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
              <dt className="text-gray-500 dark:text-gray-400">Nummer</dt><dd className="text-gray-900 dark:text-white font-mono text-xs">{oppgave.oppgave_nummer}</dd>
              <dt className="text-gray-500 dark:text-gray-400">Frist</dt><dd className="text-gray-900 dark:text-white">{oppgave.forfallsdato ? formatDate(oppgave.forfallsdato) : '–'}</dd>
              <dt className="text-gray-500 dark:text-gray-400">Opprettet</dt><dd className="text-gray-900 dark:text-white">{formatDate(oppgave.opprettet_dato)}</dd>
              {oppgave.sist_oppdatert && <><dt className="text-gray-500 dark:text-gray-400">Oppdatert</dt><dd className="text-gray-900 dark:text-white">{formatDate(oppgave.sist_oppdatert)}</dd></>}
              {oppgave.sett_dato && <><dt className="text-gray-500 dark:text-gray-400">Sett</dt><dd className="text-gray-900 dark:text-white">{formatDateTime(oppgave.sett_dato)}</dd></>}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  )
}
