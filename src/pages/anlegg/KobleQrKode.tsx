/**
 * /qr/:kode – landingsside for en skannet etikett.
 * Koblet → videre til anlegget. Ukoblet → velg anlegg og koble.
 * Brukes fra Kontrollportal («Er du tekniker? Koble i FireCtrl») og fra kamera-appen på telefonen.
 */
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { QrCode, ScanLine } from 'lucide-react'
import { db } from '@/lib/supabase'
import { tolkSkannetKode } from '@/lib/qrKoder'
import { Combobox } from '@/components/ui/Combobox'
import { Button } from '@/components/ui/Button'
import { KobleQrModal } from '@/components/KobleQrModal'

export default function KobleQrKode() {
  const { kode: raa } = useParams<{ kode: string }>()
  const navigate = useNavigate()
  const kode = raa ? tolkSkannetKode(raa) : null
  const [status, setStatus] = useState<'laster' | 'ukjent' | 'ledig' | 'koblet'>('laster')
  const [anlegg, setAnlegg] = useState<{ id: string; navn: string | null; kunde: string | null; poststed: string | null }[]>([])
  const [valgt, setValgt] = useState('')
  const [visKoble, setVisKoble] = useState(false)

  useEffect(() => {
    if (!kode) { setStatus('ukjent'); return }
    db.from('anlegg_qr_koder').select('anlegg_id').eq('kode', kode).maybeSingle().then(({ data }) => {
      if (!data) { setStatus('ukjent'); return }
      if (data.anlegg_id) { setStatus('koblet'); navigate(`/anlegg/${data.anlegg_id}`, { replace: true }); return }
      setStatus('ledig')
      db.from('anlegg').select('id, anleggsnavn, poststed, customer:kundenr(navn)').or('skjult.is.null,skjult.eq.false').order('anleggsnavn')
        .then(({ data: a }) => setAnlegg((a ?? []).map(x => ({ id: x.id, navn: x.anleggsnavn, kunde: x.customer?.navn ?? null, poststed: x.poststed }))))
    })
  }, [kode, navigate])

  const valgtAnlegg = anlegg.find(a => a.id === valgt)

  if (status === 'laster' || status === 'koblet') {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="text-center space-y-2">
        <span className="inline-flex w-14 h-14 rounded-2xl bg-primary/10 text-primary items-center justify-center"><QrCode className="w-7 h-7" /></span>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Etikett <span className="font-mono">{kode ?? raa}</span></h1>
        {status === 'ukjent' ? (
          <p className="text-gray-500 dark:text-gray-400">Denne koden finnes ikke i FireCtrl. Er etiketten fra en gammel bunke, eller er koden skrevet feil?</p>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">Etiketten er ikke koblet til noe anlegg ennå. Velg anlegget den henger på.</p>
        )}
      </div>

      {status === 'ledig' && (
        <div className="card space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-900 dark:text-white">Anlegg</label>
            <Combobox
              options={anlegg.map(a => ({ id: a.id, label: a.navn ?? '(uten navn)', sublabel: [a.kunde, a.poststed].filter(Boolean).join(' · ') || undefined }))}
              value={valgt} onChange={setValgt} placeholder="Søk etter anlegg…" searchPlaceholder="Anleggsnavn, kunde eller sted…"
            />
          </div>
          <Button variant="primary" icon={<ScanLine />} disabled={!valgt} onClick={() => setVisKoble(true)} className="w-full">Koble til {valgtAnlegg?.navn ?? 'anlegget'}</Button>
        </div>
      )}

      <div className="text-center text-sm">
        <Link to="/anlegg" className="text-primary hover:underline">Til anleggslisten</Link>
        {status === 'ukjent' && <> · <Link to="/admin/qr-koder" className="text-primary hover:underline">Generer nye etiketter</Link></>}
      </div>

      {visKoble && kode && valgtAnlegg && (
        <KobleQrModal anleggId={valgtAnlegg.id} anleggsnavn={valgtAnlegg.navn ?? ''} forhandsvalgtKode={kode}
          onClose={() => setVisKoble(false)} onKoblet={() => navigate(`/anlegg/${valgtAnlegg.id}`)} />
      )}
    </div>
  )
}
