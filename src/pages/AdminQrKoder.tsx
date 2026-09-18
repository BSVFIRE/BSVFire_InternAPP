/**
 * Admin → QR-koder: generer blanke etiketter til bilen, last ned CSV til etikettskriveren,
 * og se hvilke koder som er koblet hvor.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Plus, QrCode, Search, Trash2 } from 'lucide-react'
import { db } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { cn, formatDate } from '@/lib/utils'
import { lastNedCsv, opprettBlankeKoder, tilCsv, qrUrl, type QrKode } from '@/lib/qrKoder'
import { useCurrentAnsatt } from '@/hooks/useCurrentAnsatt'
import { Button } from '@/components/ui/Button'

type Rad = QrKode & { anlegg: { anleggsnavn: string | null; customer: { navn: string | null } | null } | null }

export function AdminQrKoder() {
  const { ansatt } = useCurrentAnsatt()
  const [koder, setKoder] = useState<Rad[]>([])
  const [loading, setLoading] = useState(true)
  const [antall, setAntall] = useState(20)
  const [genererer, setGenererer] = useState(false)
  const [sisteBatch, setSisteBatch] = useState<QrKode[]>([])
  const [fane, setFane] = useState<'ledige' | 'koblede'>('ledige')
  const [sok, setSok] = useState('')
  const [valgte, setValgte] = useState<Set<string>>(new Set())

  const last = useCallback(async () => {
    const { data, error } = await db.from('anlegg_qr_koder')
      .select('kode, anlegg_id, merkelapp, opprettet, koblet, koblet_av, anlegg:anlegg_id(anleggsnavn, customer:kundenr(navn))')
      .order('opprettet', { ascending: false })
    if (error) toast.error('Kunne ikke laste koder', error)
    setKoder((data ?? []) as Rad[])
    setLoading(false)
  }, [])
  useEffect(() => { last() }, [last])

  const ledige = useMemo(() => koder.filter(k => !k.anlegg_id), [koder])
  const koblede = useMemo(() => {
    const s = sok.toLowerCase()
    return koder.filter(k => k.anlegg_id && (!s || k.kode.toLowerCase().includes(s) || k.anlegg?.anleggsnavn?.toLowerCase().includes(s) || k.anlegg?.customer?.navn?.toLowerCase().includes(s) || k.merkelapp?.toLowerCase().includes(s)))
  }, [koder, sok])

  async function generer(e: React.FormEvent) {
    e.preventDefault()
    const n = Math.max(1, Math.min(500, antall))
    setGenererer(true)
    try {
      const nye = await opprettBlankeKoder(n, ansatt?.id ?? null)
      setSisteBatch(nye)
      setValgte(new Set(nye.map(k => k.kode)))
      toast.success(`${nye.length} nye koder generert`)
      await last()
    } catch (err) {
      toast.error('Kunne ikke generere koder', err)
    } finally {
      setGenererer(false)
    }
  }

  async function slettLedige(kodeliste: string[]) {
    if (kodeliste.length === 0) return
    if (!confirm(`Slette ${kodeliste.length} ukoblede koder? Etiketter som allerede er printet med disse kodene blir ubrukelige.`)) return
    const { error } = await db.from('anlegg_qr_koder').delete().in('kode', kodeliste).is('anlegg_id', null)
    if (error) { toast.error('Kunne ikke slette', error); return }
    toast.success(`${kodeliste.length} koder slettet`)
    setValgte(new Set())
    await last()
  }

  function toggle(kode: string) {
    setValgte(v => { const n = new Set(v); n.has(kode) ? n.delete(kode) : n.add(kode); return n })
  }

  const valgteLedige = ledige.filter(k => valgte.has(k.kode))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">QR-koder</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Blanke etiketter til bilen. Koden kobles til et anlegg ved skanning på stedet – fra anleggets side i FireCtrl.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tall tittel="Ledige (i bilen)" verdi={ledige.length} />
        <Tall tittel="Koblet til anlegg" verdi={koder.length - ledige.length} />
        <Tall tittel="Anlegg med etikett" verdi={new Set(koder.filter(k => k.anlegg_id).map(k => k.anlegg_id)).size} />
        <Tall tittel="Siste batch" verdi={sisteBatch.length} />
      </div>

      <form onSubmit={generer} className="card flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="space-y-1.5">
          <label htmlFor="antall" className="block text-sm font-medium text-gray-900 dark:text-white">Antall nye koder</label>
          <input id="antall" type="number" min={1} max={500} value={antall} onChange={e => setAntall(Number(e.target.value))} className="input w-32" />
        </div>
        <Button variant="primary" type="submit" icon={<Plus />} loading={genererer}>Generer</Button>
        <p className="text-xs text-gray-500 dark:text-gray-400 sm:ml-auto sm:max-w-sm">CSV-en har kolonnene <span className="font-mono">anlegg_navn, unik_kode, qr_url</span> – samme som NiceLabel-malen bruker i dag. QR-en peker til www.kontrollportal.no.</p>
      </form>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {(['ledige', 'koblede'] as const).map(f => (
          <button key={f} type="button" onClick={() => setFane(f)} aria-current={fane === f ? 'page' : undefined}
            className={cn('px-3.5 py-2.5 text-sm font-medium -mb-px border-b-2', fane === f ? 'text-gray-900 dark:text-white border-primary font-semibold' : 'text-gray-500 dark:text-gray-400 border-transparent')}>
            {f === 'ledige' ? `Ledige (${ledige.length})` : `Koblede (${koder.length - ledige.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
      ) : fane === 'ledige' ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setValgte(new Set(ledige.map(k => k.kode)))} disabled={ledige.length === 0}>Velg alle</Button>
            <Button variant="ghost" onClick={() => setValgte(new Set())} disabled={valgte.size === 0}>Fjern valg</Button>
            <span className="text-sm text-gray-500 dark:text-gray-400">{valgteLedige.length} valgt</span>
            <div className="sm:ml-auto flex gap-2">
              <Button variant="danger" icon={<Trash2 />} disabled={valgteLedige.length === 0} onClick={() => slettLedige(valgteLedige.map(k => k.kode))}>Slett valgte</Button>
              <Button variant="primary" icon={<Download />} disabled={valgteLedige.length === 0}
                onClick={() => lastNedCsv(tilCsv(valgteLedige.map(k => ({ kode: k.kode }))), `qr_koder_${new Date().toISOString().slice(0, 10)}.csv`)}>
                Last ned CSV ({valgteLedige.length})
              </Button>
            </div>
          </div>
          {ledige.length === 0 ? (
            <div className="card text-center py-10 text-sm text-gray-500 dark:text-gray-400">Ingen ledige koder. Generer en ny batch over.</div>
          ) : (
            <div className="card !p-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 divide-gray-200 dark:divide-gray-800">
              {ledige.map(k => (
                <label key={k.kode} className={cn('flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-200 dark:border-gray-800 sm:border-r', valgte.has(k.kode) && 'bg-primary/5')}>
                  <input type="checkbox" checked={valgte.has(k.kode)} onChange={() => toggle(k.kode)} className="w-4 h-4 rounded text-primary focus:ring-primary" />
                  <span className="min-w-0">
                    <span className="block font-mono font-semibold text-gray-900 dark:text-white">{k.kode}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">{formatDate(k.opprettet)}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <label htmlFor="sok-koder" className="sr-only">Søk</label>
            <input id="sok-koder" type="search" value={sok} onChange={e => setSok(e.target.value)} placeholder="Søk på kode, anlegg, kunde eller merkelapp…" className="input pl-9" />
          </div>
          <div className="card !p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-dark-100">
                <tr><th className="px-4 py-2.5">Kode</th><th className="px-4 py-2.5">Anlegg</th><th className="px-4 py-2.5">Kunde</th><th className="px-4 py-2.5">Merkelapp</th><th className="px-4 py-2.5">Koblet</th><th className="px-4 py-2.5"></th></tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {koblede.map(k => (
                  <tr key={k.kode}>
                    <td className="px-4 py-2.5 font-mono font-semibold text-gray-900 dark:text-white">{k.kode}</td>
                    <td className="px-4 py-2.5"><Link to={`/anlegg/${k.anlegg_id}`} className="text-primary hover:underline">{k.anlegg?.anleggsnavn ?? '–'}</Link></td>
                    <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{k.anlegg?.customer?.navn ?? '–'}</td>
                    <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{k.merkelapp ?? ''}</td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 tabular-nums">{k.koblet ? formatDate(k.koblet) : ''}</td>
                    <td className="px-4 py-2.5 text-right"><a href={qrUrl(k.kode)} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Portal ↗</a></td>
                  </tr>
                ))}
                {koblede.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">Ingen treff.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function Tall({ tittel, verdi }: { tittel: string; verdi: number }) {
  return (
    <div className="card !p-4 flex items-center gap-3">
      <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><QrCode className="w-4 h-4" /></span>
      <div><div className="text-xs text-gray-500 dark:text-gray-400">{tittel}</div><div className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">{verdi}</div></div>
    </div>
  )
}
