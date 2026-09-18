/**
 * «Legg i kalender» for en ordre: velg dato/tid → avtale i Outlook med anlegg og adresse.
 * Avtale-ID lagres på ordren (outlook_event_id) så den kan fjernes igjen.
 */
import { useEffect, useState } from 'react'
import { CalendarPlus, CalendarX, X } from 'lucide-react'
import { db } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { erKobletTilOutlook, opprettAvtale, slettAvtale } from '@/lib/microsoft'
import { Button, IconButton } from '@/components/ui/Button'

interface Props {
  ordreId: string
  ordreNummer: string
  type: string
  anleggId: string | null
  anleggsnavn: string
  kundeNavn?: string | null
  kommentar?: string | null
  outlookEventId: string | null
  planlagtStart: string | null
  onEndret: () => void
}

export function LeggIKalenderKnapp(p: Props) {
  const [koblet, setKoblet] = useState<boolean | null>(null)
  const [vis, setVis] = useState(false)
  const [jobber, setJobber] = useState(false)
  useEffect(() => { erKobletTilOutlook().then(setKoblet) }, [])

  if (koblet === false) return null

  async function fjern() {
    if (!p.outlookEventId) return
    if (!confirm('Fjerne avtalen fra Outlook-kalenderen?')) return
    setJobber(true)
    try {
      await slettAvtale(p.outlookEventId).catch(() => { /* allerede slettet i Outlook – rydd likevel */ })
      const { error } = await db.from('ordre').update({ outlook_event_id: null, planlagt_start: null }).eq('id', p.ordreId)
      if (error) throw error
      toast.success('Avtale fjernet'); p.onEndret()
    } catch (err) { toast.error('Kunne ikke fjerne avtalen', err) } finally { setJobber(false) }
  }

  if (p.outlookEventId) {
    return (
      <Button variant="outline" icon={<CalendarX />} loading={jobber} onClick={fjern} title={p.planlagtStart ? `I kalenderen ${new Date(p.planlagtStart).toLocaleString('nb-NO', { dateStyle: 'short', timeStyle: 'short' })}` : 'I kalenderen'}>
        <span className="hidden sm:inline">{p.planlagtStart ? new Date(p.planlagtStart).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }) + ' · fjern' : 'Fjern fra kalender'}</span>
      </Button>
    )
  }

  return (
    <>
      <Button variant="outline" icon={<CalendarPlus />} disabled={koblet === null} onClick={() => setVis(true)}><span className="hidden sm:inline">Legg i kalender</span></Button>
      {vis && <KalenderDialog {...p} onClose={() => setVis(false)} />}
    </>
  )
}

function KalenderDialog(p: Props & { onClose: () => void }) {
  const [dato, setDato] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10) })
  const [kl, setKl] = useState('08:00')
  const [timer, setTimer] = useState('4')
  const [heleDagen, setHeleDagen] = useState(false)
  const [lagrer, setLagrer] = useState(false)
  const [adresse, setAdresse] = useState<string | null>(null)

  useEffect(() => {
    if (!p.anleggId) return
    db.from('anlegg').select('adresse, postnummer, poststed').eq('id', p.anleggId).maybeSingle().then(({ data }) => {
      if (data) setAdresse([data.adresse, [data.postnummer, data.poststed].filter(Boolean).join(' ')].filter(Boolean).join(', ') || null)
    })
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') p.onClose() }
    document.addEventListener('keydown', esc); return () => document.removeEventListener('keydown', esc)
  }, [p])

  async function lagre(e: React.FormEvent) {
    e.preventDefault()
    setLagrer(true)
    try {
      const start = new Date(`${dato}T${heleDagen ? '00:00' : kl}:00`)
      const slutt = new Date(start); if (heleDagen) slutt.setDate(slutt.getDate() + 1); else slutt.setMinutes(slutt.getMinutes() + Math.round(Number(timer || '1') * 60))
      const id = await opprettAvtale({
        tittel: `${p.type} · ${p.anleggsnavn}`,
        start, slutt, heleDagen,
        sted: adresse,
        beskrivelse: [`Ordre ${p.ordreNummer}`, p.kundeNavn ? `Kunde: ${p.kundeNavn}` : null, p.kommentar, `${window.location.origin}/anlegg/${p.anleggId ?? ''}`].filter(Boolean).join('\n'),
      })
      const { error } = await db.from('ordre').update({ outlook_event_id: id, planlagt_start: start.toISOString() }).eq('id', p.ordreId)
      if (error) throw error
      toast.success('Lagt i Outlook-kalenderen')
      p.onClose(); p.onEndret()
    } catch (err) {
      toast.error('Kunne ikke opprette avtale', err)
    } finally { setLagrer(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={p.onClose}>
      <form onSubmit={lagre} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="kal-tittel" className="card w-full sm:max-w-md rounded-b-none sm:rounded-lg !p-0">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div><h2 id="kal-tittel" className="text-lg font-bold text-gray-900 dark:text-white">Legg i kalender</h2><p className="text-sm text-gray-500 dark:text-gray-400">{p.type} · {p.anleggsnavn}</p></div>
          <IconButton variant="ghost" label="Lukk" icon={<X />} onClick={p.onClose} />
        </div>
        <div className="px-5 pb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><label htmlFor="kal-dato" className="block text-sm font-medium text-gray-900 dark:text-white">Dato</label><input id="kal-dato" type="date" value={dato} onChange={e => setDato(e.target.value)} className="input" required /></div>
            {!heleDagen && <div className="space-y-1.5"><label htmlFor="kal-kl" className="block text-sm font-medium text-gray-900 dark:text-white">Start</label><input id="kal-kl" type="time" value={kl} onChange={e => setKl(e.target.value)} className="input" required /></div>}
          </div>
          {!heleDagen && (
            <div className="space-y-1.5"><label htmlFor="kal-timer" className="block text-sm font-medium text-gray-900 dark:text-white">Varighet</label>
              <select id="kal-timer" value={timer} onChange={e => setTimer(e.target.value)} className="input">
                {['1', '2', '3', '4', '6', '8'].map(t => <option key={t} value={t}>{t} {t === '1' ? 'time' : 'timer'}</option>)}
              </select>
            </div>
          )}
          <label className="flex items-center gap-2.5 text-sm text-gray-900 dark:text-white cursor-pointer"><input type="checkbox" checked={heleDagen} onChange={e => setHeleDagen(e.target.checked)} className="w-4 h-4 rounded text-primary focus:ring-primary" />Hele dagen</label>
          <p className="text-xs text-gray-500 dark:text-gray-400">Avtalen får anleggets adresse som sted{adresse ? ` (${adresse})` : ''}, og lenke til anlegget i beskrivelsen.</p>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-800">
          <Button variant="ghost" onClick={p.onClose}>Avbryt</Button>
          <Button variant="primary" type="submit" icon={<CalendarPlus />} loading={lagrer}>Opprett avtale</Button>
        </div>
      </form>
    </div>
  )
}
