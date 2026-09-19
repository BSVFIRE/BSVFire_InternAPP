/**
 * Kontaktperson – detaljside (/kontaktpersoner/:id)
 * Header med handlinger, anlegg og kunder til venstre, kontaktinfo og detaljer til høyre.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, Building2, ChevronLeft, Edit, Mail, MoreHorizontal, Phone, Plus, Share2, Star, Trash2, X } from 'lucide-react'
import { db, type Tables } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { cn, formatDate } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import { Button, IconButton, IconButtonGroup } from '@/components/ui/Button'
import { DropdownMenu, MenuItem } from '@/components/ui/DropdownMenu'
import { KnyttAnleggDialog } from './KnyttAnleggDialog'
import { initialer } from './kontaktSkjema'
import { slettKontaktperson } from './slettKontakt'

const log = createLogger('KontaktDetaljer')

type Kontakt = Tables<'kontaktpersoner'>
interface AnleggKobling { anleggId: string; navn: string; adresse: string; kunde: string | null; primar: boolean; skjult: boolean }
interface Kunde { id: string; navn: string | null; kunde_nummer: string | null }

export default function KontaktDetaljer() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [kontakt, setKontakt] = useState<Kontakt | null>(null)
  const [anlegg, setAnlegg] = useState<AnleggKobling[]>([])
  const [kunder, setKunder] = useState<Kunde[]>([])
  const [loading, setLoading] = useState(true)
  const [feil, setFeil] = useState<string | null>(null)
  const [visKnytt, setVisKnytt] = useState(false)

  const loadAll = useCallback(async () => {
    if (!id) return
    try {
      setFeil(null)
      const [k, a, ku] = await Promise.all([
        db.from('kontaktpersoner').select('*').eq('id', id).single(),
        db.from('anlegg_kontaktpersoner').select('primar, anlegg:anlegg_id(id, anleggsnavn, adresse, poststed, skjult, customer:kundenr(navn))').eq('kontaktperson_id', id),
        db.from('customer').select('id, navn, kunde_nummer').eq('kontaktperson_id', id).order('navn'),
      ])
      if (k.error) throw k.error
      setKontakt(k.data)
      setAnlegg((a.data ?? []).flatMap(x => {
        const an = x.anlegg as { id: string; anleggsnavn: string | null; adresse: string | null; poststed: string | null; skjult: boolean | null; customer: { navn: string | null } | null } | null
        return an ? [{ anleggId: an.id, navn: an.anleggsnavn ?? 'Anlegg', adresse: [an.adresse, an.poststed].filter(Boolean).join(', '), kunde: an.customer?.navn ?? null, primar: Boolean(x.primar), skjult: Boolean(an.skjult) }] : []
      }).sort((x, y) => Number(y.primar) - Number(x.primar) || x.navn.localeCompare(y.navn, 'nb-NO')))
      setKunder(ku.data ?? [])
    } catch (err) {
      log.error('Kunne ikke laste kontaktperson', { error: err, kontaktId: id })
      setFeil(err instanceof Error ? err.message : 'Kunne ikke laste kontaktperson')
    } finally { setLoading(false) }
  }, [id])
  useEffect(() => { loadAll() }, [loadAll])

  useEffect(() => {
    function tast(e: KeyboardEvent) {
      if (e.key !== 'e' || e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).closest('input, textarea, select')) return
      if (id) navigate(`/kontaktpersoner/${id}/rediger`)
    }
    document.addEventListener('keydown', tast); return () => document.removeEventListener('keydown', tast)
  }, [id, navigate])

  async function kopierLenke() { try { await navigator.clipboard.writeText(window.location.href); toast.success('Lenke kopiert') } catch { toast.error('Kunne ikke kopiere') } }
  async function slett() {
    if (!kontakt) return
    if (await slettKontaktperson(kontakt.id, kontakt.navn ?? '', { anlegg: anlegg.length, kunder: kunder.length })) navigate('/kontaktpersoner', { replace: true })
  }
  async function settPrimaer(a: AnleggKobling) {
    if (!kontakt || a.primar) return
    const { error: e1 } = await db.from('anlegg_kontaktpersoner').update({ primar: false }).eq('anlegg_id', a.anleggId)
    const { error: e2 } = await db.from('anlegg_kontaktpersoner').update({ primar: true }).eq('anlegg_id', a.anleggId).eq('kontaktperson_id', kontakt.id)
    if (e1 || e2) { toast.error('Kunne ikke sette primærkontakt', e1 ?? e2); return }
    toast.success(`${kontakt.navn} er primærkontakt på ${a.navn}`); loadAll()
  }
  async function fjern(a: AnleggKobling) {
    if (!kontakt || !confirm(`Fjerne ${kontakt.navn} fra ${a.navn}?`)) return
    const { error } = await db.from('anlegg_kontaktpersoner').delete().eq('anlegg_id', a.anleggId).eq('kontaktperson_id', kontakt.id)
    if (error) { toast.error('Kunne ikke fjerne fra anlegget', error); return }
    toast.success(`Fjernet fra ${a.navn}`); loadAll()
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>
  if (feil || !kontakt) {
    return (
      <div className="card bg-red-900/20 border-red-800 flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
        <div><h2 className="text-lg font-semibold text-red-400 mb-1">Kunne ikke laste kontaktperson</h2><p className="text-sm text-red-300 mb-3">{feil ?? 'Kontaktpersonen finnes ikke'}</p><div className="flex gap-2"><Button variant="primary" onClick={loadAll}>Prøv igjen</Button><Link to="/kontaktpersoner" className="btn-secondary text-sm">Til kontaktpersoner</Link></div></div>
      </div>
    )
  }

  const navn = kontakt.navn ?? '(uten navn)'
  const manglerNoe = !kontakt.telefon || !kontakt.epost

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link to="/kontaktpersoner" className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white min-h-[44px] sm:min-h-0"><ChevronLeft className="w-4 h-4 sm:hidden" />Kontaktpersoner</Link>
        <span className="hidden sm:inline">/</span><span className="hidden sm:inline text-gray-900 dark:text-white truncate">{navn}</span>
      </div>

      <header className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <span className="w-14 h-14 rounded-full bg-primary/10 text-primary text-lg font-bold flex items-center justify-center flex-shrink-0">{initialer(kontakt.navn)}</span>
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white truncate">{navn}</h1>
            <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-sm text-gray-500 dark:text-gray-400">
              {kontakt.rolle && <span>{kontakt.rolle}</span>}
              {kontakt.rolle && (kontakt.telefon || kontakt.epost) && <span className="text-gray-300 dark:text-gray-700">·</span>}
              {kontakt.telefon && <a href={`tel:${kontakt.telefon}`} className="inline-flex items-center gap-1 hover:text-primary tabular-nums"><Phone className="w-3.5 h-3.5" />{kontakt.telefon}</a>}
              {kontakt.epost && <a href={`mailto:${kontakt.epost}`} className="inline-flex items-center gap-1 hover:text-primary truncate"><Mail className="w-3.5 h-3.5" />{kontakt.epost}</a>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <IconButtonGroup>
            <IconButton variant="ghost" label="Kopier lenke" icon={<Share2 />} onClick={kopierLenke} />
            <DropdownMenu trigger={open => <IconButton variant="ghost" label="Flere valg" icon={<MoreHorizontal />} aria-expanded={open} />}>
              <MenuItem icon={<Trash2 />} danger onSelect={slett}>Slett kontaktperson…</MenuItem>
            </DropdownMenu>
          </IconButtonGroup>
          <Button variant="outline" icon={<Edit />} kbd="E" onClick={() => navigate(`/kontaktpersoner/${kontakt.id}/rediger`)}><span className="hidden sm:inline">Rediger</span></Button>
          <Button variant="primary" icon={<Plus />} onClick={() => setVisKnytt(true)}><span className="hidden sm:inline">Knytt til anlegg</span></Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_330px] gap-6 items-start">
        <div className="space-y-6">
          <section className="space-y-3" aria-label="Anlegg">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Anlegg <span className="text-gray-400 font-normal">({anlegg.length})</span></h2>
            {anlegg.length === 0 ? (
              <div className="card text-center py-10 space-y-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">{navn} er ikke kontaktperson på noen anlegg.</p>
                <Button variant="primary" icon={<Plus />} onClick={() => setVisKnytt(true)}>Knytt til anlegg</Button>
              </div>
            ) : (
              <div className="space-y-2">
                {anlegg.map(a => (
                  <div key={a.anleggId} className={cn('card !p-3.5 flex items-center gap-3 group', a.skjult && 'opacity-50')}>
                    <button type="button" onClick={() => settPrimaer(a)} title={a.primar ? 'Primærkontakt på anlegget' : 'Sett som primærkontakt'} aria-label={a.primar ? 'Primærkontakt' : 'Sett som primærkontakt'} className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors', a.primar ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 cursor-default' : 'bg-primary/10 text-primary hover:bg-yellow-100 hover:text-yellow-600 dark:hover:bg-yellow-900/30')}>
                      {a.primar ? <Star className="w-4 h-4 fill-current" /> : <Building2 className="w-4 h-4" />}
                    </button>
                    <Link to={`/anlegg/${a.anleggId}`} className="flex-1 min-w-0">
                      <span className="block font-semibold text-gray-900 dark:text-white truncate hover:text-primary">{a.navn}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{[a.kunde, a.adresse].filter(Boolean).join(' · ')}</span>
                    </Link>
                    {a.primar && <span className="hidden sm:inline text-xs font-medium text-yellow-700 dark:text-yellow-400">Primær</span>}
                    <button type="button" onClick={() => fjern(a)} aria-label={`Fjern fra ${a.navn}`} className="w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 flex items-center justify-center lg:opacity-0 group-hover:opacity-100 focus:opacity-100"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3" aria-label="Kunder">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Primærkontakt for kunder <span className="text-gray-400 font-normal">({kunder.length})</span></h2>
            {kunder.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">Ingen kunder har {navn} som primærkontakt. Det settes under «Rediger» på kunden.</p> : (
              <div className="space-y-2">
                {kunder.map(k => (
                  <Link key={k.id} to={`/kunder/${k.id}`} className="card !p-3.5 flex items-center gap-3 hover:border-primary/60 transition-colors">
                    <span className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-dark-100 text-gray-500 dark:text-gray-400 flex items-center justify-center flex-shrink-0"><Building2 className="w-4 h-4" /></span>
                    <span className="flex-1 min-w-0"><span className="block font-semibold text-gray-900 dark:text-white truncate">{k.navn}</span>{k.kunde_nummer && <span className="block text-xs text-gray-500 dark:text-gray-400">Kundenr. {k.kunde_nummer}</span>}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="card !p-4 space-y-3">
            <h2 className="flex items-center justify-between text-sm font-semibold text-gray-900 dark:text-white">Kontakt
              <Link to={`/kontaktpersoner/${kontakt.id}/rediger`} className="text-xs font-medium text-primary hover:underline">Endre</Link>
            </h2>
            <KontaktRad ikon={<Phone className="w-4 h-4" />} label="Telefon" verdi={kontakt.telefon} href={kontakt.telefon ? `tel:${kontakt.telefon}` : null} />
            <KontaktRad ikon={<Mail className="w-4 h-4" />} label="E-post" verdi={kontakt.epost} href={kontakt.epost ? `mailto:${kontakt.epost}` : null} />
            {manglerNoe && <p className="text-xs text-yellow-700 dark:text-yellow-400">Mangler {[!kontakt.telefon && 'telefon', !kontakt.epost && 'e-post'].filter(Boolean).join(' og ')}.</p>}
          </section>

          <section className="card !p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Detaljer</h2>
            <dl className="grid grid-cols-[108px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
              <dt className="text-gray-500 dark:text-gray-400">Rolle</dt><dd className="text-gray-900 dark:text-white">{kontakt.rolle ?? <span className="text-gray-400">Ikke satt</span>}</dd>
              <dt className="text-gray-500 dark:text-gray-400">Opprettet</dt><dd className="text-gray-900 dark:text-white">{formatDate(kontakt.created_at)}</dd>
              {kontakt.sist_oppdatert && <><dt className="text-gray-500 dark:text-gray-400">Oppdatert</dt><dd className="text-gray-900 dark:text-white">{formatDate(kontakt.sist_oppdatert)}</dd></>}
            </dl>
          </section>
        </aside>
      </div>

      {visKnytt && <KnyttAnleggDialog kontaktId={kontakt.id} kontaktNavn={navn} alleredeKoblet={anlegg.map(a => a.anleggId)} onClose={() => setVisKnytt(false)} onKoblet={loadAll} />}
    </div>
  )
}

function KontaktRad({ ikon, label, verdi, href }: { ikon: React.ReactNode; label: string; verdi: string | null; href: string | null }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-dark-100 text-gray-500 dark:text-gray-400 flex items-center justify-center flex-shrink-0">{ikon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
        {verdi && href ? <a href={href} className="block text-sm font-medium text-gray-900 dark:text-white hover:text-primary truncate tabular-nums">{verdi}</a> : <div className="text-sm text-gray-400">–</div>}
      </div>
    </div>
  )
}
