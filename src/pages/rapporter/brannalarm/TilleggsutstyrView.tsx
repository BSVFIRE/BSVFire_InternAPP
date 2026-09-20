/**
 * Brannalarm – tilleggsutstyr: talevarsling, alarmsender og nøkkelsafe.
 * Tre seksjoner med «finnes på anlegget»-bryter; feltene vises når utstyret finnes.
 * Hver endring lagres når feltet forlates (offline: kø). Samme rad i anleggsdata_brannalarm som Enheter.
 */
import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowLeft, Check, KeyRound, Minus, Plus, Radio, Volume2, type LucideIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { useOfflineQueue } from '@/hooks/useOffline'
import { batteriAdvarsel } from '@/lib/batteri'

interface Kontakt { id: string; navn: string | null; epost: string | null; telefon: string | null }
interface Data {
  talevarsling: boolean; talevarsling_leverandor: string; talevarsling_batteri_type: string; talevarsling_batteri_alder: string; talevarsling_plassering: string; talevarsling_kommentar: string
  alarmsender_i_anlegg: boolean; mottaker: string[]; gsm_nummer: string; plassering: string; batterialder: string; batteritype: string; forsynet_fra_brannsentral: boolean; sender_2G_4G: string; mottaker_kommentar: string; ekstern_mottaker: string[]
  nokkelsafe: boolean; nokkelsafe_type: string; nokkelsafe_plassering: string; nokkelsafe_innhold: string; nokkelsafe_kommentar: string
}
const TOM: Data = {
  talevarsling: false, talevarsling_leverandor: '', talevarsling_batteri_type: '', talevarsling_batteri_alder: '', talevarsling_plassering: '', talevarsling_kommentar: '',
  alarmsender_i_anlegg: false, mottaker: [], gsm_nummer: '', plassering: '', batterialder: '', batteritype: '', forsynet_fra_brannsentral: false, sender_2G_4G: '', mottaker_kommentar: '', ekstern_mottaker: [],
  nokkelsafe: false, nokkelsafe_type: '', nokkelsafe_plassering: '', nokkelsafe_innhold: '', nokkelsafe_kommentar: '',
}
const MOTTAKERE = ['110 Brannvesen', 'Alarmsentral', 'Intern', 'Ekstern']
const SENDER = ['2G', '4G', 'Begge']
const LUKKET_KEY = 'brannalarm_tillegg_lukkede'

export function TilleggsutstyrView({ anleggId, anleggsNavn, onBack }: { anleggId: string; anleggsNavn: string; onBack: () => void }) {
  const { isOnline, queueUpdate } = useOfflineQueue()
  const [data, setData] = useState<Data>(TOM)
  const [radId, setRadId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lagrer, setLagrer] = useState(false)
  const [kontakter, setKontakter] = useState<Kontakt[]>([])
  const [lukkede, setLukkede] = useState<Set<string>>(() => { try { return new Set(JSON.parse(localStorage.getItem(LUKKET_KEY) ?? '[]')) } catch { return new Set() } })

  useEffect(() => {
    Promise.all([
      supabase.from('anleggsdata_brannalarm').select('*').eq('anlegg_id', anleggId).maybeSingle(),
      supabase.from('kontaktpersoner').select('id, navn, epost, telefon, anlegg_kontaktpersoner!inner(anlegg_id)').eq('anlegg_kontaktpersoner.anlegg_id', anleggId),
    ]).then(([r, k]) => {
      const b = (r.data ?? {}) as Record<string, unknown>
      if (r.data) {
        setRadId(String(b.id))
        const ny: Record<string, unknown> = { ...TOM }
        for (const key of Object.keys(TOM) as (keyof Data)[]) {
          const v = b[key]
          if (typeof TOM[key] === 'boolean') ny[key] = Boolean(v)
          else if (Array.isArray(TOM[key])) ny[key] = Array.isArray(v) ? v : []
          else ny[key] = v == null ? '' : String(v)
        }
        setData(ny as unknown as Data)
      }
      setKontakter((k.data ?? []) as unknown as Kontakt[])
      setLoading(false)
    })
  }, [anleggId])

  function toggleSeksjon(k: string) { setLukkede(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); try { localStorage.setItem(LUKKET_KEY, JSON.stringify(Array.from(n))) } catch { /* ignorer */ } return n }) }

  /** Lagrer et utsnitt av feltene med en gang. */
  async function lagre(patch: Partial<Data>) {
    const forrige = data
    const ny = { ...data, ...patch }
    setData(ny)
    const kolonner: Record<string, unknown> = { ...patch }
    // Avledede felt for alarmsender-mottakere (brukes i rapportene)
    if ('mottaker' in patch || 'ekstern_mottaker' in patch) {
      kolonner.ekstern_mottaker_aktiv = ny.mottaker.includes('Ekstern')
      kolonner.ekstern_mottaker_info = ny.ekstern_mottaker.map(navn => { const p = kontakter.find(x => x.navn === navn); return p ? [p.navn, p.epost ? `E-post: ${p.epost}` : null, p.telefon ? `Tlf: ${p.telefon}` : null].filter(Boolean).join(', ') : navn }).join(' | ')
    }
    if (!isOnline) { if (radId) queueUpdate('anleggsdata_brannalarm', { id: radId, ...kolonner }); else toast.warning('Offline – kunne ikke opprette anleggsdata. Prøv igjen på nett.'); return }
    setLagrer(true)
    const res = radId
      ? await supabase.from('anleggsdata_brannalarm').update(kolonner).eq('id', radId)
      : await supabase.from('anleggsdata_brannalarm').insert({ anlegg_id: anleggId, ...kolonner }).select('id').single()
    setLagrer(false)
    if (res.error) { setData(forrige); toast.error('Kunne ikke lagre', res.error); return }
    if (!radId && 'data' in res && res.data) setRadId((res.data as { id: string }).id)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>

  const antall = [data.talevarsling, data.alarmsender_i_anlegg, data.nokkelsafe].filter(Boolean).length

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white min-h-[44px] sm:min-h-0"><ArrowLeft className="w-4 h-4" />Brannalarm</button>
        <span className="hidden sm:inline">/</span><span className="hidden sm:inline text-gray-900 dark:text-white truncate">{anleggsNavn}</span>
      </div>
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Tilleggsutstyr</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{antall === 0 ? 'Ingen tilleggsutstyr registrert' : `${antall} av 3 registrert`}{lagrer ? ' · lagrer…' : ''}{!isOnline ? ' · offline' : ''}</p>
      </header>

      <Seksjon id="tale" ikon={Volume2} tittel="Talevarsling" paa={data.talevarsling} oppsummering={[data.talevarsling_leverandor, data.talevarsling_plassering].filter(Boolean).join(' · ')} apen={!lukkede.has('tale')} onToggle={() => toggleSeksjon('tale')} onPaa={v => lagre({ talevarsling: v })}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Felt label="Leverandør" verdi={data.talevarsling_leverandor} placeholder="F.eks. Bosch, Siemens" onLagre={v => lagre({ talevarsling_leverandor: v })} />
          <Felt label="Plassering" verdi={data.talevarsling_plassering} placeholder="F.eks. Teknisk rom" onLagre={v => lagre({ talevarsling_plassering: v })} />
          <Felt label="Batteritype" verdi={data.talevarsling_batteri_type} placeholder="F.eks. 12V 7Ah" onLagre={v => lagre({ talevarsling_batteri_type: v })} />
          <Felt label="Batteri montert (år)" verdi={data.talevarsling_batteri_alder} placeholder={String(new Date().getFullYear())} numerisk advarsel={batteriAdvarsel(data.talevarsling_batteri_alder)} onLagre={v => lagre({ talevarsling_batteri_alder: v })} />
        </div>
        <Felt label="Kommentar" verdi={data.talevarsling_kommentar} placeholder="Spesielle forhold …" flerlinje onLagre={v => lagre({ talevarsling_kommentar: v })} />
      </Seksjon>

      <Seksjon id="sender" ikon={Radio} tittel="Alarmsender" paa={data.alarmsender_i_anlegg} oppsummering={[data.mottaker.join(', '), data.sender_2G_4G, data.gsm_nummer].filter(Boolean).join(' · ')} apen={!lukkede.has('sender')} onToggle={() => toggleSeksjon('sender')} onPaa={v => lagre({ alarmsender_i_anlegg: v })}>
        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-gray-900 dark:text-white">Mottaker</span>
          <div className="flex flex-wrap gap-2">
            {MOTTAKERE.map(m => { const paa = data.mottaker.includes(m); return <button key={m} type="button" aria-pressed={paa} onClick={() => lagre({ mottaker: paa ? data.mottaker.filter(x => x !== m) : [...data.mottaker, m] })} className={cn('h-9 px-3 rounded-full border text-sm inline-flex items-center gap-1.5', paa ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400')}>{paa && <Check className="w-3.5 h-3.5" strokeWidth={3} />}{m}</button> })}
          </div>
        </div>
        {data.mottaker.includes('Ekstern') && (
          <div className="space-y-1.5 p-3 rounded-lg bg-gray-50 dark:bg-dark-100">
            <span className="block text-sm font-medium text-gray-900 dark:text-white">Eksterne mottakere <span className="text-gray-400 font-normal">– kontaktpersoner på anlegget</span></span>
            {kontakter.length === 0 ? <p className="text-xs text-gray-500 dark:text-gray-400">Ingen kontaktpersoner er knyttet til anlegget. Legg dem til på anleggssiden først.</p> : (
              <div className="flex flex-wrap gap-2">
                {kontakter.map(k => { const navn = k.navn ?? ''; const paa = data.ekstern_mottaker.includes(navn); return <button key={k.id} type="button" aria-pressed={paa} onClick={() => lagre({ ekstern_mottaker: paa ? data.ekstern_mottaker.filter(x => x !== navn) : [...data.ekstern_mottaker, navn] })} className={cn('h-9 px-3 rounded-full border text-sm inline-flex items-center gap-1.5', paa ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400')}>{paa && <Check className="w-3.5 h-3.5" strokeWidth={3} />}{navn}{k.telefon && <span className="text-xs text-gray-400 font-normal">{k.telefon}</span>}</button> })}
              </div>
            )}
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-gray-900 dark:text-white">Sender</span>
            <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden h-10" role="radiogroup" aria-label="Sender">
              {SENDER.map(o => <button key={o} type="button" role="radio" aria-checked={data.sender_2G_4G === o} onClick={() => lagre({ sender_2G_4G: data.sender_2G_4G === o ? '' : o })} className={cn('px-4 text-sm', data.sender_2G_4G === o ? 'bg-primary text-white font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-100')}>{o}</button>)}
            </div>
          </div>
          <Felt label="GSM-nummer" verdi={data.gsm_nummer} placeholder="+47 …" onLagre={v => lagre({ gsm_nummer: v })} />
          <Felt label="Plassering" verdi={data.plassering} placeholder="F.eks. Teknisk rom" onLagre={v => lagre({ plassering: v })} />
          <label className="flex items-center gap-2.5 text-sm text-gray-900 dark:text-white cursor-pointer self-end h-10"><input type="checkbox" checked={data.forsynet_fra_brannsentral} onChange={e => lagre({ forsynet_fra_brannsentral: e.target.checked })} className="w-4 h-4 rounded text-primary focus:ring-primary" />Forsynt fra brannsentralen</label>
          {!data.forsynet_fra_brannsentral && <>
            <Felt label="Batteritype" verdi={data.batteritype} placeholder="F.eks. 12V 7Ah" onLagre={v => lagre({ batteritype: v })} />
            <Felt label="Batteri montert (år)" verdi={data.batterialder} placeholder={String(new Date().getFullYear())} numerisk advarsel={batteriAdvarsel(data.batterialder)} onLagre={v => lagre({ batterialder: v })} />
          </>}
        </div>
        <Felt label="Kommentar" verdi={data.mottaker_kommentar} placeholder="Spesielle forhold …" flerlinje onLagre={v => lagre({ mottaker_kommentar: v })} />
      </Seksjon>

      <Seksjon id="safe" ikon={KeyRound} tittel="Nøkkelsafe" paa={data.nokkelsafe} oppsummering={[data.nokkelsafe_type, data.nokkelsafe_plassering].filter(Boolean).join(' · ')} apen={!lukkede.has('safe')} onToggle={() => toggleSeksjon('safe')} onPaa={v => lagre({ nokkelsafe: v })}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Felt label="Type" verdi={data.nokkelsafe_type} placeholder="F.eks. KeySafe Pro" onLagre={v => lagre({ nokkelsafe_type: v })} />
          <Felt label="Plassering" verdi={data.nokkelsafe_plassering} placeholder="F.eks. ved hovedinngang" onLagre={v => lagre({ nokkelsafe_plassering: v })} />
        </div>
        <Felt label="Innhold" verdi={data.nokkelsafe_innhold} placeholder="F.eks. hovednøkkel, teknisk rom" onLagre={v => lagre({ nokkelsafe_innhold: v })} />
        <Felt label="Kommentar" verdi={data.nokkelsafe_kommentar} placeholder="Spesielle forhold …" flerlinje onLagre={v => lagre({ nokkelsafe_kommentar: v })} />
      </Seksjon>
    </div>
  )
}

function Seksjon({ id, ikon: Ikon, tittel, paa, oppsummering, apen, onToggle, onPaa, children }: { id: string; ikon: LucideIcon; tittel: string; paa: boolean; oppsummering: string; apen: boolean; onToggle: () => void; onPaa: (v: boolean) => void; children: React.ReactNode }) {
  const visInnhold = paa && apen
  return (
    <section className="card !p-0 overflow-hidden" aria-labelledby={`sek-${id}`}>
      <div className={cn('flex items-center gap-3 px-3 py-2.5', paa ? 'bg-gray-50 dark:bg-dark-100' : '')}>
        <button type="button" onClick={onToggle} disabled={!paa} aria-expanded={visInnhold} className="w-5 h-5 rounded border border-gray-300 dark:border-gray-700 text-gray-500 flex items-center justify-center flex-shrink-0 disabled:opacity-30">{visInnhold ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}</button>
        <span className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', paa ? 'bg-primary/10 text-primary' : 'bg-gray-100 dark:bg-dark-100 text-gray-400')}><Ikon className="w-4 h-4" /></span>
        <button type="button" onClick={paa ? onToggle : () => onPaa(true)} className="flex-1 min-w-0 text-left">
          <span id={`sek-${id}`} className="block font-semibold text-gray-900 dark:text-white">{tittel}</span>
          <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{paa ? (oppsummering || 'Registrert – fyll ut detaljer') : 'Ikke på anlegget'}</span>
        </button>
        <label className="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer select-none">
          <span className="hidden sm:inline">{paa ? 'Finnes' : 'Finnes ikke'}</span>
          <span role="switch" aria-checked={paa} tabIndex={0} onClick={() => onPaa(!paa)} onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onPaa(!paa) } }} className={cn('w-11 h-6 rounded-full relative transition-colors', paa ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700')}><span className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform', paa ? 'translate-x-5' : 'translate-x-0.5')} /></span>
        </label>
      </div>
      {visInnhold && <div className="p-4 space-y-4 border-t border-gray-100 dark:border-gray-800">{children}</div>}
    </section>
  )
}

/** Tekstfelt som lagrer når du forlater det (eller Enter). */
function Felt({ label, verdi, placeholder, numerisk, flerlinje, advarsel, onLagre }: { label: string; verdi: string; placeholder?: string; numerisk?: boolean; flerlinje?: boolean; advarsel?: string; onLagre: (v: string) => void }) {
  const [v, setV] = useState(verdi)
  useEffect(() => setV(verdi), [verdi])
  const id = `tf-${label.replace(/\W/g, '').toLowerCase()}`
  const lagre = () => { if (v.trim() !== verdi) onLagre(v.trim()) }
  return (
    <div className={cn('space-y-1.5', flerlinje && 'sm:col-span-2')}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-900 dark:text-white">{label}</label>
      {flerlinje
        ? <textarea id={id} value={v} onChange={e => setV(e.target.value)} onBlur={lagre} rows={2} placeholder={placeholder} className="input !h-auto" />
        : <input id={id} value={v} onChange={e => setV(numerisk ? e.target.value.replace(/\D/g, '').slice(0, 4) : e.target.value)} onBlur={lagre} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} inputMode={numerisk ? 'numeric' : undefined} placeholder={placeholder} className="input" />}
      {advarsel && <p className="text-xs text-yellow-700 dark:text-yellow-400 inline-flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />{advarsel}</p>}
    </div>
  )
}
