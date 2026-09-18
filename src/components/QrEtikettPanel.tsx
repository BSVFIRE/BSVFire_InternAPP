/**
 * Panel på anleggssiden: etikettene (QR-kodene) som henger på anlegget.
 * Koble en blank etikett fra bilen, eller lag en ny som er koblet fra start.
 */
import { useCallback, useEffect, useState } from 'react'
import { Copy, Download, ExternalLink, Plus, QrCode, ScanLine, Unlink } from 'lucide-react'
import { db } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { formatDate } from '@/lib/utils'
import { frikobleKode, lastNedCsv, opprettKodeForAnlegg, qrUrl, tilCsv, type QrKode } from '@/lib/qrKoder'
import { useCurrentAnsatt } from '@/hooks/useCurrentAnsatt'
import { Button, IconButton } from '@/components/ui/Button'
import { DropdownMenu, MenuItem, MenuSeparator } from '@/components/ui/DropdownMenu'
import { KobleQrModal } from '@/components/KobleQrModal'

export function QrEtikettPanel({ anleggId, anleggsnavn }: { anleggId: string; anleggsnavn: string }) {
  const { ansatt } = useCurrentAnsatt()
  const [koder, setKoder] = useState<QrKode[]>([])
  const [visKoble, setVisKoble] = useState(false)
  const [visNy, setVisNy] = useState(false)
  const [nyMerkelapp, setNyMerkelapp] = useState('')
  const [lagrer, setLagrer] = useState(false)

  const last = useCallback(async () => {
    const { data } = await db.from('anlegg_qr_koder').select('kode, anlegg_id, merkelapp, opprettet, koblet, koblet_av').eq('anlegg_id', anleggId).order('koblet', { ascending: true })
    setKoder(data ?? [])
  }, [anleggId])
  useEffect(() => { last() }, [last])

  async function kopier(tekst: string, hva: string) {
    try { await navigator.clipboard.writeText(tekst); toast.success(`${hva} kopiert`) } catch { toast.error('Kunne ikke kopiere') }
  }

  async function nyEtikett(e: React.FormEvent) {
    e.preventDefault()
    setLagrer(true)
    try {
      const k = await opprettKodeForAnlegg(anleggId, nyMerkelapp.trim() || null, ansatt?.id ?? null)
      toast.success(`Etikett ${k.kode} opprettet – last ned CSV for å printe`)
      setVisNy(false); setNyMerkelapp('')
      await last()
    } catch (err) {
      toast.error('Kunne ikke opprette etikett', err)
    } finally {
      setLagrer(false)
    }
  }

  async function frikoble(k: QrKode) {
    if (!confirm(`Frikoble etikett ${k.kode}? Den kan da brukes på et annet anlegg. Kundens loggbok for dette anlegget påvirkes ikke.`)) return
    try { await frikobleKode(k.kode); toast.success(`Etikett ${k.kode} er frikoblet`); await last() }
    catch (err) { toast.error('Kunne ikke frikoble', err) }
  }

  return (
    <section className="card !p-4 space-y-3">
      <h2 className="flex items-center justify-between text-sm font-semibold text-gray-900 dark:text-white">
        <span className="inline-flex items-center gap-2"><QrCode className="w-4 h-4 text-gray-400" />QR-etiketter</span>
        <DropdownMenu trigger={open => <IconButton variant="ghost" label="Legg til etikett" icon={<Plus />} aria-expanded={open} className="w-7 h-7 border border-gray-200 dark:border-gray-800" />}>
          <MenuItem icon={<ScanLine />} onSelect={() => setVisKoble(true)}>Koble etikett fra bilen (skann)</MenuItem>
          <MenuItem icon={<Plus />} onSelect={() => setVisNy(true)}>Ny etikett for dette anlegget</MenuItem>
          {koder.length > 0 && <>
            <MenuSeparator />
            <MenuItem icon={<Download />} onSelect={() => lastNedCsv(tilCsv(koder.map(k => ({ kode: k.kode, anleggsnavn }))), `etiketter_${anleggsnavn.replace(/\s+/g, '_')}.csv`)}>Last ned CSV for print</MenuItem>
          </>}
        </DropdownMenu>
      </h2>

      {koder.length === 0 && !visNy && (
        <div className="text-sm text-gray-500 dark:text-gray-400 space-y-2">
          <p>Ingen etikett hengt opp ennå.</p>
          <Button variant="outline" icon={<ScanLine />} onClick={() => setVisKoble(true)} className="w-full">Koble etikett</Button>
        </div>
      )}

      {koder.map(k => (
        <div key={k.kode} className="flex items-center gap-2 group">
          <span className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-dark-100 text-gray-500 dark:text-gray-400 flex items-center justify-center flex-shrink-0"><QrCode className="w-4 h-4" /></span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-mono font-semibold text-gray-900 dark:text-white">{k.kode}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{k.merkelapp ?? 'Uten merkelapp'}{k.koblet ? ` · ${formatDate(k.koblet)}` : ''}</div>
          </div>
          <a href={qrUrl(k.kode)} target="_blank" rel="noopener noreferrer" aria-label="Åpne i kundeportalen" title="Åpne i kundeportalen" className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-dark-100 text-gray-500 dark:text-gray-400 hover:text-primary flex items-center justify-center"><ExternalLink className="w-4 h-4" /></a>
          <DropdownMenu trigger={open => <IconButton variant="ghost" label="Valg" icon={<Copy />} aria-expanded={open} className="w-8 h-8 bg-gray-100 dark:bg-dark-100" />}>
            <MenuItem icon={<Copy />} onSelect={() => kopier(k.kode, 'Kode')}>Kopier kode</MenuItem>
            <MenuItem icon={<Copy />} onSelect={() => kopier(qrUrl(k.kode), 'Lenke')}>Kopier portal-lenke</MenuItem>
            <MenuSeparator />
            <MenuItem icon={<Unlink />} danger onSelect={() => frikoble(k)}>Frikoble etikett</MenuItem>
          </DropdownMenu>
        </div>
      ))}

      {visNy && (
        <form onSubmit={nyEtikett} className="space-y-2 pt-1 border-t border-gray-200 dark:border-gray-800">
          <label htmlFor="ny-etikett-merkelapp" className="block text-xs text-gray-500 dark:text-gray-400 pt-2">Merkelapp for den nye etiketten</label>
          <input id="ny-etikett-merkelapp" value={nyMerkelapp} onChange={e => setNyMerkelapp(e.target.value)} placeholder="Sentral 3, 2. etg." className="input" autoFocus />
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setVisNy(false)} className="flex-1">Avbryt</Button>
            <Button variant="primary" type="submit" loading={lagrer} className="flex-1">Opprett</Button>
          </div>
        </form>
      )}

      {visKoble && (
        <KobleQrModal anleggId={anleggId} anleggsnavn={anleggsnavn} onClose={() => setVisKoble(false)} onKoblet={() => { setVisKoble(false); last() }} />
      )}
    </section>
  )
}
