/**
 * Etterfyll Dropbox (/admin/dropbox-etterfyll).
 *
 * Rapporter som er lagret i Supabase Storage, men som aldri kom til Dropbox – f.eks. fordi
 * opplastingen feilet stille – lastes opp hit i riktig kunde- og anleggsmappe.
 *
 * Filer som allerede ligger i Dropbox røres ikke: mappen listes først, og opplastingen skjer
 * med modus «add» slik at Dropbox selv avviser en fil som finnes fra før.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Check, ChevronLeft, UploadCloud, Loader2, RefreshCw, Search, SkipForward, X } from 'lucide-react'
import { db, supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import { Button } from '@/components/ui/Button'
import {
  buildDetektorlisteDropboxPath, buildDropboxPath, buildTilbudDropboxPath,
  checkDropboxStatus, listDropboxFolder, uploadToDropbox,
} from '@/services/dropboxServiceV2'

const log = createLogger('DropboxEtterfyll')

/** Hvilken undermappe en dokumenttype hører hjemme i */
function mappeFor(type: string | null): 'kontroll' | 'service' | 'adresseliste' | 'tilbud' | null {
  const t = (type ?? '').toLowerCase()
  if (!t) return null
  // Gamle dokumenter er merket «Detektorliste», nye «Adresseliste»
  if (t.includes('adresseliste') || t.includes('detektorliste')) return 'adresseliste'
  if (t.includes('tilbud')) return 'tilbud'
  if (t.includes('servicerapport') || t.includes('serviceoppdrag')) return 'service'
  if (t.includes('rapport') || t.includes('kontroll')) return 'kontroll'
  return null
}

const MAPPENAVN: Record<string, string> = {
  kontroll: '07_Rapporter/02_Kontrollrapport',
  service: '07_Rapporter/01_Servicerapport',
  adresseliste: '02_Brannalarm/02_Detektorliste',
  tilbud: '08_Tilbud',
}

interface Dok {
  id: string
  filnavn: string
  storage_path: string
  type: string | null
  dato: string | null
  anleggId: string
  anleggNavn: string
  kundeNavn: string
  kundeNummer: string
  mappe: 'kontroll' | 'service' | 'adresseliste' | 'tilbud'
  dropboxSti: string
}

type Tilstand = 'ukjent' | 'finnes' | 'mangler' | 'lastet_opp' | 'hoppet_over' | 'feilet'

export function AdminDropboxEtterfyll() {
  const [dokumenter, setDokumenter] = useState<Dok[]>([])
  const [tilstand, setTilstand] = useState<Record<string, { status: Tilstand; melding?: string }>>({})
  const [laster, setLaster] = useState(true)
  const [sjekker, setSjekker] = useState(false)
  const [laster_opp, setLasterOpp] = useState(false)
  const [tilkoblet, setTilkoblet] = useState<boolean | null>(null)
  const [sok, setSok] = useState('')
  const [framdrift, setFramdrift] = useState<{ gjort: number; av: number } | null>(null)

  useEffect(() => {
    checkDropboxStatus().then(s => setTilkoblet(s.connected))
    last()
  }, [])

  async function last() {
    setLaster(true)
    try {
      // Hele dokumentlisten, i bolker fordi PostgREST gir maks 1000 rader om gangen
      const alle: Record<string, unknown>[] = []
      for (let fra = 0; ; fra += 1000) {
        const { data, error } = await db.from('dokumenter')
          .select('id, filnavn, storage_path, type, opplastet_dato, created_at, anlegg_id, anlegg:anlegg_id(anleggsnavn, customer:kundenr(navn, kunde_nummer))')
          .not('anlegg_id', 'is', null).not('storage_path', 'is', null)
          .order('opplastet_dato', { ascending: false, nullsFirst: false })
          .range(fra, fra + 999)
        if (error) throw error
        alle.push(...(data ?? []) as unknown as Record<string, unknown>[])
        if (!data || data.length < 1000) break
      }

      const liste: Dok[] = []
      for (const d of alle) {
        const anlegg = d.anlegg as { anleggsnavn: string | null; customer: { navn: string | null; kunde_nummer: string | null } | null } | null
        const kundeNummer = anlegg?.customer?.kunde_nummer
        const kundeNavn = anlegg?.customer?.navn
        const anleggNavn = anlegg?.anleggsnavn
        const mappe = mappeFor(d.type as string | null)
        const filnavn = d.filnavn as string | null
        // Uten kundenummer, navn eller kjent type vet vi ikke hvor filen skal – de vises som mangler nedenfor
        if (!mappe || !kundeNummer || !kundeNavn || !anleggNavn || !filnavn) continue
        if (!filnavn.toLowerCase().endsWith('.pdf')) continue
        const sti = mappe === 'adresseliste' ? buildDetektorlisteDropboxPath(kundeNummer, kundeNavn, anleggNavn, filnavn)
          : mappe === 'tilbud' ? buildTilbudDropboxPath(kundeNummer, kundeNavn, anleggNavn, filnavn)
          : buildDropboxPath(kundeNummer, kundeNavn, anleggNavn, filnavn, mappe === 'service' ? '01_Servicerapport' : '02_Kontrollrapport')
        liste.push({
          id: d.id as string,
          filnavn,
          storage_path: d.storage_path as string,
          type: d.type as string | null,
          dato: (d.opplastet_dato ?? d.created_at) as string | null,
          anleggId: d.anlegg_id as string,
          anleggNavn,
          kundeNavn,
          kundeNummer,
          mappe,
          dropboxSti: sti,
        })
      }
      setDokumenter(liste)
    } catch (e) {
      log.error('Kunne ikke laste dokumenter', { error: e })
      toast.error('Kunne ikke laste dokumenter', e)
    } finally {
      setLaster(false)
    }
  }

  /** Lister hver berørte Dropbox-mappe én gang og merker hvilke filer som allerede finnes */
  async function sjekkMotDropbox() {
    setSjekker(true)
    setFramdrift(null)
    try {
      const mapper = Array.from(new Set(dokumenter.map(d => d.dropboxSti.slice(0, d.dropboxSti.lastIndexOf('/')))))
      const funnet = new Set<string>()
      let i = 0
      for (const mappe of mapper) {
        i++
        setFramdrift({ gjort: i, av: mapper.length })
        try {
          const res = await listDropboxFolder(mappe)
          for (const e of (res.entries ?? []) as { name?: string }[]) {
            if (e.name) funnet.add(`${mappe}/${e.name}`.toLowerCase())
          }
        } catch (e) {
          log.warn('Kunne ikke liste mappe', { mappe, error: e })
        }
      }
      const ny: Record<string, { status: Tilstand }> = {}
      for (const d of dokumenter) ny[d.id] = { status: funnet.has(d.dropboxSti.toLowerCase()) ? 'finnes' : 'mangler' }
      setTilstand(ny)
      const mangler = Object.values(ny).filter(x => x.status === 'mangler').length
      toast.success(`${mangler} av ${dokumenter.length} mangler i Dropbox`)
    } finally {
      setSjekker(false)
      setFramdrift(null)
    }
  }

  async function lastOppManglende() {
    const kø = dokumenter.filter(d => tilstand[d.id]?.status === 'mangler')
    if (kø.length === 0) return
    if (!confirm(`Laste opp ${kø.length} ${kø.length === 1 ? 'fil' : 'filer'} til Dropbox? Filer som allerede finnes røres ikke.`)) return
    setLasterOpp(true)
    let ok = 0, hoppet = 0, feil = 0
    try {
      for (let i = 0; i < kø.length; i++) {
        const d = kø[i]
        setFramdrift({ gjort: i + 1, av: kø.length })
        try {
          const { data: fil, error } = await supabase.storage.from('anlegg.dokumenter').download(d.storage_path)
          if (error || !fil) throw new Error(error?.message ?? 'Fant ikke filen i Storage')
          // 'add': Dropbox avviser filen hvis den finnes, så ingenting overskrives
          const res = await uploadToDropbox(d.dropboxSti, fil, 'add')
          if (res.success) { ok++; setTilstand(p => ({ ...p, [d.id]: { status: 'lastet_opp' } })) }
          else if (/conflict/i.test(res.error ?? '')) { hoppet++; setTilstand(p => ({ ...p, [d.id]: { status: 'hoppet_over', melding: 'Fantes allerede' } })) }
          else { feil++; setTilstand(p => ({ ...p, [d.id]: { status: 'feilet', melding: res.error } })) }
        } catch (e) {
          feil++
          setTilstand(p => ({ ...p, [d.id]: { status: 'feilet', melding: e instanceof Error ? e.message : 'Ukjent feil' } }))
        }
      }
      log.info('Etterfylling ferdig', { ok, hoppet, feil })
      toast.success(`${ok} lastet opp`, [hoppet ? `${hoppet} fantes fra før` : null, feil ? `${feil} feilet` : null].filter(Boolean).join(' · ') || undefined)
    } finally {
      setLasterOpp(false)
      setFramdrift(null)
    }
  }

  const synlige = useMemo(() => {
    const q = sok.trim().toLowerCase()
    return dokumenter.filter(d => !q || [d.filnavn, d.anleggNavn, d.kundeNavn, d.type].some(v => v?.toLowerCase().includes(q)))
  }, [dokumenter, sok])

  const teller = useMemo(() => {
    const t = { mangler: 0, finnes: 0, lastet_opp: 0, feilet: 0, hoppet_over: 0, ukjent: 0 }
    for (const d of dokumenter) t[tilstand[d.id]?.status ?? 'ukjent']++
    return t
  }, [dokumenter, tilstand])

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link to="/admin/dropbox-folders" className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white min-h-[44px] sm:min-h-0"><ChevronLeft className="w-4 h-4" />Dropbox</Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Etterfyll Dropbox</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Laster opp rapporter som ligger i systemet, men mangler i Dropbox. Filer som allerede finnes der blir ikke rørt.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button icon={<RefreshCw className={cn(laster && 'animate-spin')} />} onClick={last} disabled={laster || sjekker || laster_opp}>Oppdater</Button>
          <Button icon={<Search />} onClick={sjekkMotDropbox} loading={sjekker} disabled={laster || laster_opp || dokumenter.length === 0}>Sjekk mot Dropbox</Button>
          <Button variant="primary" icon={<UploadCloud />} onClick={lastOppManglende} loading={laster_opp} disabled={teller.mangler === 0}>
            Last opp {teller.mangler > 0 ? teller.mangler : ''} manglende
          </Button>
        </div>
      </header>

      {tilkoblet === false && (
        <div className="card flex items-start gap-2.5 bg-yellow-100 dark:bg-yellow-900/30">
          <AlertTriangle className="w-4 h-4 text-yellow-700 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <span className="text-sm">Dropbox er ikke tilkoblet. Koble til under Dropbox-innstillinger først.</span>
        </div>
      )}

      {framdrift && (
        <div className="card !py-3 space-y-2">
          <p className="text-sm text-gray-700 dark:text-gray-300 inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />{sjekker ? 'Sjekker mapper' : 'Laster opp'} {framdrift.gjort} av {framdrift.av}
          </p>
          <div className="h-2 rounded-full bg-gray-200 dark:bg-dark-100 overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.round((framdrift.gjort / framdrift.av) * 100)}%` }} />
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input type="search" value={sok} onChange={e => setSok(e.target.value)} placeholder="Søk filnavn, anlegg, kunde…" className="input pl-9 w-full" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 self-center whitespace-nowrap">
          {laster ? 'Laster…' : <>{dokumenter.length} PDF-er · {teller.mangler} mangler · {teller.finnes} finnes · {teller.lastet_opp} lastet opp{teller.feilet ? ` · ${teller.feilet} feilet` : ''}</>}
        </p>
      </div>

      <div className="card p-0 overflow-hidden">
        <ul className="divide-y divide-gray-200 dark:divide-gray-800 max-h-[60vh] overflow-y-auto">
          {synlige.slice(0, 400).map(d => {
            const t = tilstand[d.id]
            return (
              <li key={d.id} className="px-3 py-2 flex items-center gap-3">
                <Merke status={t?.status ?? 'ukjent'} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900 dark:text-white truncate">{d.filnavn}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {d.kundeNummer}_{d.kundeNavn} · {d.anleggNavn} · {MAPPENAVN[d.mappe]}
                    {t?.melding && <span className="text-red-600 dark:text-red-400"> · {t.melding}</span>}
                  </p>
                </div>
                <span className="text-xs text-gray-400 tabular-nums whitespace-nowrap hidden sm:block">{d.dato?.slice(0, 10)}</span>
              </li>
            )
          })}
        </ul>
        {synlige.length > 400 && <p className="px-3 py-2 text-xs text-gray-500 border-t border-gray-200 dark:border-gray-800">Viser 400 av {synlige.length}. Opplastingen gjelder alle.</p>}
        {!laster && dokumenter.length === 0 && <p className="px-3 py-8 text-center text-sm text-gray-500">Fant ingen PDF-er med kjent kunde, anlegg og type.</p>}
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-600">
        Dokumenter uten kundenummer, anlegg eller gjenkjennelig type tas ikke med – de har ingen entydig plass i mappestrukturen.
      </p>
    </div>
  )
}

function Merke({ status }: { status: Tilstand }) {
  const kart: Record<Tilstand, { ikon: React.ReactNode; tittel: string; farge: string }> = {
    ukjent: { ikon: <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-700" />, tittel: 'Ikke sjekket', farge: 'text-gray-400' },
    finnes: { ikon: <Check className="w-4 h-4" strokeWidth={3} />, tittel: 'Finnes i Dropbox', farge: 'text-green-500' },
    mangler: { ikon: <UploadCloud className="w-4 h-4" />, tittel: 'Mangler i Dropbox', farge: 'text-yellow-600 dark:text-yellow-400' },
    lastet_opp: { ikon: <Check className="w-4 h-4" strokeWidth={3} />, tittel: 'Lastet opp nå', farge: 'text-green-600' },
    hoppet_over: { ikon: <SkipForward className="w-4 h-4" />, tittel: 'Fantes allerede – ikke rørt', farge: 'text-gray-400' },
    feilet: { ikon: <X className="w-4 h-4" strokeWidth={3} />, tittel: 'Feilet', farge: 'text-red-500' },
  }
  const v = kart[status]
  return <span title={v.tittel} className={cn('w-6 flex items-center justify-center flex-shrink-0', v.farge)}>{v.ikon}</span>
}
