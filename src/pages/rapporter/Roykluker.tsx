/**
 * Røykluker (/rapporter → Røykluker).
 *
 * Én side per anlegg: oversikt over sentralene med lukene sine, fremdrift og kommentarer.
 * Klikk «Kontroll» på en sentral for å åpne kontrollskjemaet (DataView) med alle målinger,
 * sjekkpunkter og PDF-rapport.
 */
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Wind } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { Combobox } from '@/components/ui/Combobox'
import { SentralListe } from './roykluker/SentralListe'
import { DataView } from './roykluker/DataView'

interface Kunde { id: string; navn: string }
interface Anlegg { id: string; anleggsnavn: string; kundenr: string; adresse?: string | null; postnummer?: string | null; poststed?: string | null }

interface RoyklukerProps {
  onBack: () => void
  fromAnlegg?: boolean
}

export function Roykluker({ onBack, fromAnlegg }: RoyklukerProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as { kundeId?: string; anleggId?: string } | null

  const [kunder, setKunder] = useState<Kunde[]>([])
  const [anlegg, setAnlegg] = useState<Anlegg[]>([])
  const [selectedKunde, setSelectedKunde] = useState(state?.kundeId || '')
  const [selectedAnlegg, setSelectedAnlegg] = useState(state?.anleggId || '')
  /** Satt når en enkelt sentral er åpnet i kontrollskjemaet */
  const [sentralId, setSentralId] = useState<string | null>(null)

  useEffect(() => { loadKunder() }, [])

  useEffect(() => {
    if (selectedKunde) loadAnlegg(selectedKunde)
    else { setAnlegg([]); setSelectedAnlegg('') }
  }, [selectedKunde])

  async function loadKunder() {
    const { data, error } = await supabase.from('customer').select('id, navn').or('skjult.is.null,skjult.eq.false').order('navn')
    if (error) { toast.error('Kunne ikke laste kunder', error); return }
    setKunder((data ?? []) as Kunde[])
  }

  async function loadAnlegg(kundeId: string) {
    const { data, error } = await supabase.from('anlegg')
      .select('id, anleggsnavn, kundenr, adresse, postnummer, poststed')
      .eq('kundenr', kundeId).or('skjult.is.null,skjult.eq.false').order('anleggsnavn')
    if (error) { toast.error('Kunne ikke laste anlegg', error); return }
    setAnlegg((data ?? []) as Anlegg[])
  }

  const kundeNavn = kunder.find(k => k.id === selectedKunde)?.navn ?? ''
  const anleggNavn = anlegg.find(a => a.id === selectedAnlegg)?.anleggsnavn ?? ''

  function tilbake() {
    if (fromAnlegg && state?.anleggId) navigate('/anlegg', { state: { viewAnleggId: state.anleggId } })
    else onBack()
  }

  // Kontrollskjema for én sentral
  if (selectedAnlegg && sentralId) {
    return (
      <DataView
        anleggId={selectedAnlegg}
        kundeNavn={kundeNavn}
        anleggNavn={anleggNavn}
        valgtSentralId={sentralId}
        onTilbake={() => setSentralId(null)}
      />
    )
  }

  return (
    <div className="space-y-5">
      {/* Brødsmule */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <button type="button" onClick={tilbake} className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white min-h-[44px] sm:min-h-0">
          <ArrowLeft className="w-4 h-4" />{fromAnlegg ? 'Anlegget' : 'Rapporter'}
        </button>
      </div>

      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white inline-flex items-center gap-2.5">
          <Wind className="w-6 h-6 text-primary" />Røykluker
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {selectedAnlegg
            ? <>{kundeNavn} · <b className="font-semibold text-gray-700 dark:text-gray-300">{anleggNavn}</b> · <button type="button" onClick={() => { setSelectedAnlegg(''); setSentralId(null) }} className="hover:text-primary underline-offset-2 hover:underline">bytt anlegg</button></>
            : 'Sentraler, luker og branngardiner – velg anlegg for å starte'}
        </p>
      </header>

      {/* Velger */}
      {!selectedAnlegg && (
        <div className="card space-y-4 max-w-2xl">
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-gray-900 dark:text-white">Kunde</span>
            <Combobox
              options={kunder.map(k => ({ id: k.id, label: k.navn }))}
              value={selectedKunde}
              onChange={v => { setSelectedKunde(v); setSelectedAnlegg('') }}
              placeholder="Velg kunde…"
              searchPlaceholder="Søk kunde…"
              emptyMessage="Ingen kunder funnet"
            />
          </div>
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-gray-900 dark:text-white">Anlegg</span>
            {!selectedKunde ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Velg kunde først.</p>
            ) : anlegg.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Ingen anlegg på denne kunden.</p>
            ) : (
              <Combobox
                options={anlegg.map(a => ({ id: a.id, label: a.anleggsnavn, sublabel: [a.adresse, a.poststed].filter(Boolean).join(', ') || undefined }))}
                value={selectedAnlegg}
                onChange={setSelectedAnlegg}
                placeholder="Velg anlegg…"
                searchPlaceholder="Søk anlegg…"
                emptyMessage="Ingen anlegg funnet"
              />
            )}
          </div>
        </div>
      )}

      {selectedAnlegg && (
        <SentralListe
          anleggId={selectedAnlegg}
          kundeNavn={kundeNavn}
          anleggNavn={anleggNavn}
          onApneSentral={setSentralId}
        />
      )}
    </div>
  )
}
