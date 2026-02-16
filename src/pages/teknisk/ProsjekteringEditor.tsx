import { useState, useEffect } from 'react'
import { ArrowLeft, Save, FileText, AlertTriangle, Settings, Link2, CheckSquare, HelpCircle, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ProsjekteringEditorProps {
  prosjekteringId?: string
  kundeId?: string
  anleggId?: string
  onBack: () => void
}

interface ProsjekteringData {
  id?: string
  kunde_id: string | null
  anlegg_id: string | null
  prosjekt_navn: string
  prosjekt_nummer: string
  beskrivelse: string
  ny_kunde_navn: string
  ny_kunde_adresse: string
  ny_kunde_postnummer: string
  ny_kunde_poststed: string
  ny_kunde_kontakt: string
  ny_kunde_telefon: string
  ny_kunde_epost: string
  tek17_referanse: string
  ns3960_referanse: string
  ns3961_referanse: string
  andre_standarder: string
  status: string
  prosjektleder: string
  ansvarlig_prosjekterende: string
  planlagt_ferdig: string
}

interface RisikoanalyseData {
  id?: string
  bygningstype: string
  bruksklasse: string
  risikoklasse: string
  antall_etasjer: number | null
  bruttoareal: number | null
  brannbelastning: string
  personbelastning: string
  spesielle_risikoer: string
  deteksjonsbehov: string
  varslingsbehov: string
  slukkebehov: string
  evakueringsbehov: string
  anbefalt_system: string
  kategori: string
  begrunnelse: string
}

interface SystemplanData {
  id?: string
  sentral_type: string
  sentral_produsent: string
  sentral_modell: string
  antall_sloyfekort: number | null
  antall_sloyfer: number | null
  antall_roykdetektorer: number | null
  antall_varmedetektorer: number | null
  antall_flammedetektorer: number | null
  antall_multidetektorer: number | null
  antall_linjedetektorer: number | null
  antall_aspirerende: number | null
  antall_sirener: number | null
  antall_klokker: number | null
  antall_blitzlys: number | null
  antall_talevarslere: number | null
  antall_brannmeldere: number | null
  overforingstype: string
  alarmstasjon: string
  stromforsyning_type: string
  batterireserve_timer: number | null
  talevarsling_aktiv: boolean
  talevarsling_soner: string
  talevarsling_meldinger: string
  notater: string
}

type ActiveSection = 'grunndata' | 'risiko' | 'system' | 'integrasjon' | 'sjekkliste'

const initialProsjektering: ProsjekteringData = {
  kunde_id: null,
  anlegg_id: null,
  prosjekt_navn: '',
  prosjekt_nummer: '',
  beskrivelse: '',
  ny_kunde_navn: '',
  ny_kunde_adresse: '',
  ny_kunde_postnummer: '',
  ny_kunde_poststed: '',
  ny_kunde_kontakt: '',
  ny_kunde_telefon: '',
  ny_kunde_epost: '',
  tek17_referanse: '',
  ns3960_referanse: '',
  ns3961_referanse: '',
  andre_standarder: '',
  status: 'Utkast',
  prosjektleder: '',
  ansvarlig_prosjekterende: '',
  planlagt_ferdig: ''
}

const initialRisikoanalyse: RisikoanalyseData = {
  bygningstype: '',
  bruksklasse: '',
  risikoklasse: '',
  antall_etasjer: null,
  bruttoareal: null,
  brannbelastning: '',
  personbelastning: '',
  spesielle_risikoer: '',
  deteksjonsbehov: '',
  varslingsbehov: '',
  slukkebehov: '',
  evakueringsbehov: '',
  anbefalt_system: '',
  kategori: '',
  begrunnelse: ''
}

const initialSystemplan: SystemplanData = {
  sentral_type: '',
  sentral_produsent: '',
  sentral_modell: '',
  antall_sloyfekort: null,
  antall_sloyfer: null,
  antall_roykdetektorer: null,
  antall_varmedetektorer: null,
  antall_flammedetektorer: null,
  antall_multidetektorer: null,
  antall_linjedetektorer: null,
  antall_aspirerende: null,
  antall_sirener: null,
  antall_klokker: null,
  antall_blitzlys: null,
  antall_talevarslere: null,
  antall_brannmeldere: null,
  overforingstype: '',
  alarmstasjon: '',
  stromforsyning_type: '',
  batterireserve_timer: null,
  talevarsling_aktiv: false,
  talevarsling_soner: '',
  talevarsling_meldinger: '',
  notater: ''
}

export function ProsjekteringEditor({ prosjekteringId, kundeId, anleggId, onBack }: ProsjekteringEditorProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState<ActiveSection>('grunndata')
  
  const [prosjektering, setProsjektering] = useState<ProsjekteringData>({
    ...initialProsjektering,
    kunde_id: kundeId || null,
    anlegg_id: anleggId || null
  })
  const [risikoanalyse, setRisikoanalyse] = useState<RisikoanalyseData>(initialRisikoanalyse)
  const [systemplan, setSystemplan] = useState<SystemplanData>(initialSystemplan)
  
  const [kundeNavn, setKundeNavn] = useState('')
  const [anleggNavn, setAnleggNavn] = useState('')

  useEffect(() => {
    if (prosjekteringId) {
      loadProsjektering(prosjekteringId)
    }
    if (kundeId) {
      loadKundeInfo(kundeId)
    }
    if (anleggId) {
      loadAnleggInfo(anleggId)
    }
  }, [prosjekteringId, kundeId, anleggId])

  async function loadProsjektering(id: string) {
    try {
      setLoading(true)
      
      const { data: projData, error: projError } = await supabase
        .from('prosjekteringer')
        .select('*')
        .eq('id', id)
        .single()

      if (projError) throw projError
      if (projData) {
        setProsjektering({
          ...projData,
          planlagt_ferdig: projData.planlagt_ferdig || ''
        })
        
        if (projData.kunde_id) loadKundeInfo(projData.kunde_id)
        if (projData.anlegg_id) loadAnleggInfo(projData.anlegg_id)
      }

      const { data: risikoData } = await supabase
        .from('prosjektering_risikoanalyse')
        .select('*')
        .eq('prosjektering_id', id)
        .single()

      if (risikoData) setRisikoanalyse(risikoData)

      const { data: systemData } = await supabase
        .from('prosjektering_systemplan')
        .select('*')
        .eq('prosjektering_id', id)
        .single()

      if (systemData) setSystemplan(systemData)

    } catch (error) {
      console.error('Feil ved lasting:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadKundeInfo(id: string) {
    const { data } = await supabase.from('customer').select('navn').eq('id', id).single()
    if (data) setKundeNavn(data.navn)
  }

  async function loadAnleggInfo(id: string) {
    const { data } = await supabase.from('anlegg').select('anleggsnavn').eq('id', id).single()
    if (data) setAnleggNavn(data.anleggsnavn)
  }

  async function handleSave() {
    if (!prosjektering.prosjekt_navn.trim()) {
      alert('Prosjektnavn er påkrevd')
      return
    }

    try {
      setSaving(true)

      const projPayload = {
        ...prosjektering,
        planlagt_ferdig: prosjektering.planlagt_ferdig || null
      }
      delete (projPayload as any).id

      let savedId = prosjekteringId

      if (prosjekteringId) {
        const { error } = await supabase
          .from('prosjekteringer')
          .update(projPayload)
          .eq('id', prosjekteringId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('prosjekteringer')
          .insert(projPayload)
          .select('id')
          .single()
        if (error) throw error
        savedId = data.id
      }

      if (savedId) {
        const risikoPayload = { ...risikoanalyse, prosjektering_id: savedId }
        delete (risikoPayload as any).id

        if (risikoanalyse.id) {
          await supabase.from('prosjektering_risikoanalyse').update(risikoPayload).eq('id', risikoanalyse.id)
        } else {
          const { data } = await supabase.from('prosjektering_risikoanalyse').insert(risikoPayload).select('id').single()
          if (data) setRisikoanalyse(prev => ({ ...prev, id: data.id }))
        }

        const systemPayload = { ...systemplan, prosjektering_id: savedId }
        delete (systemPayload as any).id

        if (systemplan.id) {
          await supabase.from('prosjektering_systemplan').update(systemPayload).eq('id', systemplan.id)
        } else {
          const { data } = await supabase.from('prosjektering_systemplan').insert(systemPayload).select('id').single()
          if (data) setSystemplan(prev => ({ ...prev, id: data.id }))
        }
      }

      alert('Prosjektering lagret!')
      if (!prosjekteringId) onBack()

    } catch (error: any) {
      console.error('Feil ved lagring:', error)
      alert('Kunne ikke lagre: ' + (error?.message || 'Ukjent feil'))
    } finally {
      setSaving(false)
    }
  }

  const sections = [
    { id: 'grunndata' as const, label: 'Grunndata', icon: FileText },
    { id: 'risiko' as const, label: 'Risiko- og behovsanalyse', icon: AlertTriangle },
    { id: 'system' as const, label: 'Systemplanlegging', icon: Settings },
    { id: 'integrasjon' as const, label: 'Integrasjoner', icon: Link2 },
    { id: 'sjekkliste' as const, label: 'Sjekkliste', icon: CheckSquare }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {prosjekteringId ? 'Rediger prosjektering' : 'Ny prosjektering'}
            </h1>
            {(kundeNavn || prosjektering.ny_kunde_navn) && (
              <p className="text-gray-600 dark:text-gray-400">
                {kundeNavn || prosjektering.ny_kunde_navn}
                {anleggNavn && ` - ${anleggNavn}`}
              </p>
            )}
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
          Lagre
        </button>
      </div>

      {/* Section tabs */}
      <div className="flex flex-wrap gap-2">
        {sections.map(section => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeSection === section.id
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-dark-100 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-200'
            }`}
          >
            <section.icon className="w-4 h-4" />
            {section.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="card">
        {activeSection === 'grunndata' && (
          <GrunndataSection
            prosjektering={prosjektering}
            setProsjektering={setProsjektering}
            kundeNavn={kundeNavn}
            anleggNavn={anleggNavn}
            showNyKunde={!prosjektering.kunde_id}
          />
        )}
        {activeSection === 'risiko' && (
          <RisikoanalyseSection
            data={risikoanalyse}
            setData={setRisikoanalyse}
          />
        )}
        {activeSection === 'system' && (
          <SystemplanSection
            data={systemplan}
            setData={setSystemplan}
          />
        )}
        {activeSection === 'integrasjon' && (
          <IntegrasjonSection prosjekteringId={prosjekteringId} />
        )}
        {activeSection === 'sjekkliste' && (
          <SjekklisteSection prosjekteringId={prosjekteringId} />
        )}
      </div>
    </div>
  )
}

// Grunndata Section Component
function GrunndataSection({ prosjektering, setProsjektering, kundeNavn, anleggNavn, showNyKunde }: {
  prosjektering: ProsjekteringData
  setProsjektering: React.Dispatch<React.SetStateAction<ProsjekteringData>>
  kundeNavn: string
  anleggNavn: string
  showNyKunde: boolean
}) {
  const statusOptions = ['Utkast', 'Under arbeid', 'Til godkjenning', 'Godkjent', 'Ferdig', 'Arkivert']

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Prosjektinformasjon</h2>
      
      {kundeNavn && (
        <div className="p-4 bg-blue-500/10 rounded-lg">
          <p className="text-sm text-blue-400">Kunde: <strong>{kundeNavn}</strong></p>
          {anleggNavn && <p className="text-sm text-blue-400">Anlegg: <strong>{anleggNavn}</strong></p>}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prosjektnavn *</label>
          <input
            type="text"
            value={prosjektering.prosjekt_navn}
            onChange={e => setProsjektering(p => ({ ...p, prosjekt_navn: e.target.value }))}
            className="input w-full"
            placeholder="F.eks. Brannalarmanlegg Kontorbygg A"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prosjektnummer</label>
          <input
            type="text"
            value={prosjektering.prosjekt_nummer}
            onChange={e => setProsjektering(p => ({ ...p, prosjekt_nummer: e.target.value }))}
            className="input w-full"
            placeholder="F.eks. P-2024-001"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
          <select
            value={prosjektering.status}
            onChange={e => setProsjektering(p => ({ ...p, status: e.target.value }))}
            className="input w-full"
          >
            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Planlagt ferdig</label>
          <input
            type="date"
            value={prosjektering.planlagt_ferdig}
            onChange={e => setProsjektering(p => ({ ...p, planlagt_ferdig: e.target.value }))}
            className="input w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prosjektleder</label>
          <input
            type="text"
            value={prosjektering.prosjektleder}
            onChange={e => setProsjektering(p => ({ ...p, prosjektleder: e.target.value }))}
            className="input w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ansvarlig prosjekterende</label>
          <input
            type="text"
            value={prosjektering.ansvarlig_prosjekterende}
            onChange={e => setProsjektering(p => ({ ...p, ansvarlig_prosjekterende: e.target.value }))}
            className="input w-full"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Beskrivelse</label>
        <textarea
          value={prosjektering.beskrivelse}
          onChange={e => setProsjektering(p => ({ ...p, beskrivelse: e.target.value }))}
          className="input w-full h-24"
          placeholder="Kort beskrivelse av prosjektet..."
        />
      </div>

      {showNyKunde && (
        <>
          <h3 className="text-md font-semibold text-gray-900 dark:text-white mt-6">Kundeinformasjon (ny kunde)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kundenavn</label>
              <input type="text" value={prosjektering.ny_kunde_navn} onChange={e => setProsjektering(p => ({ ...p, ny_kunde_navn: e.target.value }))} className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kontaktperson</label>
              <input type="text" value={prosjektering.ny_kunde_kontakt} onChange={e => setProsjektering(p => ({ ...p, ny_kunde_kontakt: e.target.value }))} className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Adresse</label>
              <input type="text" value={prosjektering.ny_kunde_adresse} onChange={e => setProsjektering(p => ({ ...p, ny_kunde_adresse: e.target.value }))} className="input w-full" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Postnr</label>
                <input type="text" value={prosjektering.ny_kunde_postnummer} onChange={e => setProsjektering(p => ({ ...p, ny_kunde_postnummer: e.target.value }))} className="input w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Poststed</label>
                <input type="text" value={prosjektering.ny_kunde_poststed} onChange={e => setProsjektering(p => ({ ...p, ny_kunde_poststed: e.target.value }))} className="input w-full" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefon</label>
              <input type="text" value={prosjektering.ny_kunde_telefon} onChange={e => setProsjektering(p => ({ ...p, ny_kunde_telefon: e.target.value }))} className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-post</label>
              <input type="email" value={prosjektering.ny_kunde_epost} onChange={e => setProsjektering(p => ({ ...p, ny_kunde_epost: e.target.value }))} className="input w-full" />
            </div>
          </div>
        </>
      )}

      <h3 className="text-md font-semibold text-gray-900 dark:text-white mt-6">Standarder og forskrifter</h3>
      <div className="space-y-4">
        {/* TEK 17 */}
        <div className="p-4 bg-gray-50 dark:bg-dark-100 rounded-lg">
          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={!!prosjektering.tek17_referanse}
              onChange={e => setProsjektering(p => ({ ...p, tek17_referanse: e.target.checked ? '§ 11-12' : '' }))}
              className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="flex items-center text-sm font-medium text-gray-900 dark:text-white">
              TEK 17 - Byggteknisk forskrift
              <HelpTooltip title="TEK17 - Byggteknisk forskrift" content={helpContent.tek17} />
            </span>
          </label>
          {prosjektering.tek17_referanse && (
            <div className="mt-3 ml-8">
              <input 
                type="text" 
                value={prosjektering.tek17_referanse} 
                onChange={e => setProsjektering(p => ({ ...p, tek17_referanse: e.target.value }))} 
                className="input w-full" 
                placeholder="Spesifiser paragrafer, f.eks. § 11-12, § 11-2" 
              />
            </div>
          )}
        </div>

        {/* NS 3960 */}
        <div className="p-4 bg-gray-50 dark:bg-dark-100 rounded-lg">
          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={!!prosjektering.ns3960_referanse}
              onChange={e => setProsjektering(p => ({ ...p, ns3960_referanse: e.target.checked ? 'Kapittel 5-11' : '' }))}
              className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="flex items-center text-sm font-medium text-gray-900 dark:text-white">
              NS 3960 - Brannalarmanlegg
              <HelpTooltip title="NS 3960 - Brannalarmanlegg" content={helpContent.ns3960} />
            </span>
          </label>
          {prosjektering.ns3960_referanse && (
            <div className="mt-3 ml-8">
              <input 
                type="text" 
                value={prosjektering.ns3960_referanse} 
                onChange={e => setProsjektering(p => ({ ...p, ns3960_referanse: e.target.value }))} 
                className="input w-full" 
                placeholder="Spesifiser kapitler, f.eks. Kapittel 6, 7, 8" 
              />
            </div>
          )}
        </div>

        {/* NS 3961 */}
        <div className="p-4 bg-gray-50 dark:bg-dark-100 rounded-lg">
          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={!!prosjektering.ns3961_referanse}
              onChange={e => setProsjektering(p => ({ ...p, ns3961_referanse: e.target.checked ? 'Talevarsling' : '' }))}
              className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="flex items-center text-sm font-medium text-gray-900 dark:text-white">
              NS 3961 - Talevarsling
              <HelpTooltip title="NS 3961 - Talevarsling" content={helpContent.ns3961} />
            </span>
          </label>
          {prosjektering.ns3961_referanse && (
            <div className="mt-3 ml-8">
              <input 
                type="text" 
                value={prosjektering.ns3961_referanse} 
                onChange={e => setProsjektering(p => ({ ...p, ns3961_referanse: e.target.value }))} 
                className="input w-full" 
                placeholder="Spesifiser kapitler, f.eks. Kap. 5, 6" 
              />
            </div>
          )}
        </div>

        {/* Andre standarder */}
        <div className="p-4 bg-gray-50 dark:bg-dark-100 rounded-lg">
          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={!!prosjektering.andre_standarder}
              onChange={e => setProsjektering(p => ({ ...p, andre_standarder: e.target.checked ? 'EN 54' : '' }))}
              className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Andre standarder (EN 54, FG-regler, etc.)
            </span>
          </label>
          {prosjektering.andre_standarder && (
            <div className="mt-3 ml-8">
              <input 
                type="text" 
                value={prosjektering.andre_standarder} 
                onChange={e => setProsjektering(p => ({ ...p, andre_standarder: e.target.value }))} 
                className="input w-full" 
                placeholder="Spesifiser standarder, f.eks. EN 54-1, FG-regler" 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Help Tooltip Component
function HelpTooltip({ title, content }: { title: string; content: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="ml-1 text-gray-400 hover:text-primary transition-colors"
        title={`Hjelp: ${title}`}
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsOpen(false)}>
          <div 
            className="bg-white dark:bg-dark-100 rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-200">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsOpen(false)
                }} 
                className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 text-gray-700 dark:text-gray-300 text-sm space-y-3">
              {content}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Help content definitions
const helpContent = {
  bruksklasse: (
    <>
      <p><strong>Bruksklasse iht. TEK17 § 11-2:</strong></p>
      <ul className="list-disc pl-5 space-y-2">
        <li><strong>Klasse 1:</strong> Bygninger beregnet for aktiviteter der personer som oppholder seg i bygningen i liten grad er kjent med rømningsveiene, og hvor� de forutsettes å kunne bringe seg selv i sikkerhet. (Kontor, industri)</li>
        <li><strong>Klasse 2:</strong> Bygninger beregnet for aktiviteter der det forutsettes at personer som oppholder seg i bygningen er kjent med rømningsveiene. (Bolig, fritidsbolig)</li>
        <li><strong>Klasse 3:</strong> Bygninger beregnet for aktiviteter der det forutsettes at et mindre antall personer oppholder seg midlertidig. (Mindre forsamlingslokaler)</li>
        <li><strong>Klasse 4:</strong> Bygninger beregnet for overnatting der det forutsettes at personer kjenner rømningsveiene. (Hotell, pensjonat)</li>
        <li><strong>Klasse 5:</strong> Bygninger beregnet for opphold for personer med funksjonsnedsettelse. (Sykehjem, omsorgsboliger)</li>
        <li><strong>Klasse 6:</strong> Bygninger beregnet for opphold der� �rømning kan være problematisk. (Fengsel, psykiatrisk institusjon)</li>
      </ul>
    </>
  ),
  risikoklasse: (
    <>
      <p><strong>Risikoklasse iht. TEK17 § 11-2:</strong></p>
      <ul className="list-disc pl-5 space-y-2">
        <li><strong>Klasse 1:</strong> Liten risiko for tap av menneskeliv. (Garasje, lager uten fast arbeidssted)</li>
        <li><strong>Klasse 2:</strong> Mindre risiko for tap av menneskeliv. (Kontor, industri, lager med fast arbeidssted)</li>
        <li><strong>Klasse 3:</strong> Noe risiko for tap av menneskeliv. (Skole, barnehage, forsamlingslokale)</li>
        <li><strong>Klasse 4:</strong> Stor risiko for tap av menneskeliv. (Bolig, hotell, pleieinstitusjoner)</li>
        <li><strong>Klasse 5:</strong> Særlig stor risiko for tap av menneskeliv. (Sykehus, fengsel)</li>
        <li><strong>Klasse 6:</strong> Meget stor risiko for tap av menneskeliv. (Spesielle byggverk med særlig risiko)</li>
      </ul>
    </>
  ),
  kategori: (
    <>
      <p><strong>Kategori brannalarmanlegg iht. NS 3960:</strong></p>
      <ul className="list-disc pl-5 space-y-2">
        <li><strong>Kategori 1:</strong> Heldekkende automatisk brannalarmanlegg med overføring til alarmstasjon. Kreves i byggverk med høy risiko.</li>
        <li><strong>Kategori 2:</strong> Delvis dekkende automatisk brannalarmanlegg med overføring til alarmstasjon. Deteksjon i utvalgte områder.</li>
        <li><strong>Kategori 3:</strong> Manuelt brannalarmanlegg med overføring til alarmstasjon. Kun manuelle meldere.</li>
        <li><strong>Kategori 4:</strong> Lokalt brannalarmanlegg uten overføring. Kun lokal varsling.</li>
      </ul>
      <p className="mt-3"><strong>Valg av kategori baseres på:</strong></p>
      <ul className="list-disc pl-5">
        <li>Bruksklasse og risikoklasse</li>
        <li>Bygningens størrelse og kompleksitet</li>
        <li>Krav fra myndigheter og forsikring</li>
      </ul>
    </>
  ),
  brannbelastning: (
    <>
      <p><strong>Brannbelastning:</strong></p>
      <p>Mengden brennbart materiale i bygningen, målt i MJ/m². Påvirker brannens intensitet og varighet.</p>
      <ul className="list-disc pl-5 space-y-1 mt-2">
        <li><strong>Lav:</strong> &lt; 400 MJ/m² (kontor, skole)</li>
        <li><strong>Middels:</strong> 400-800 MJ/m² (butikk, lager)</li>
        <li><strong>Høy:</strong> &gt; 800 MJ/m² (industri, lager med brennbare varer)</li>
      </ul>
    </>
  ),
  personbelastning: (
    <>
      <p><strong>Personbelastning:</strong></p>
      <p>Antall personer som kan oppholde seg i bygningen samtidig. Viktig for dimensjonering av rømningsveier og varslingssystem.</p>
      <p className="mt-2">Beregnes basert på:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Areal per person (varierer med brukstype)</li>
        <li>Maksimal kapasitet</li>
        <li>Normal bruk vs. spesielle arrangementer</li>
      </ul>
    </>
  ),
  tek17: (
    <>
      <p><strong>TEK17 - Byggteknisk forskrift:</strong></p>
      <p>Forskrift om tekniske krav til byggverk. Relevante kapitler for brannalarmanlegg:</p>
      <ul className="list-disc pl-5 space-y-2 mt-2">
        <li><strong>§ 11-12:</strong> Krav til varsling og evakuering. Definerer når brannalarmanlegg kreves.</li>
        <li><strong>§ 11-2:</strong> Risikoklasser og bruksklasser for byggverk.</li>
        <li><strong>§ 11-3:</strong> Brannklasser for byggverk.</li>
        <li><strong>§ 11-4:</strong> Bæreevne og stabilitet ved brann.</li>
        <li><strong>§ 11-8:</strong> Brannceller og brannseksjonering.</li>
        <li><strong>§ 11-11:</strong> Rømningsveier og tilrettelegging for slokking.</li>
      </ul>
      <p className="mt-3 text-xs text-gray-500">Referanse: Direktoratet for byggkvalitet (DiBK)</p>
    </>
  ),
  ns3960: (
    <>
      <p><strong>NS 3960 - Brannalarmanlegg:</strong></p>
      <p>Norsk standard for planlegging, prosjektering, installasjon, drift og vedlikehold av brannalarmanlegg.</p>
      <ul className="list-disc pl-5 space-y-2 mt-2">
        <li><strong>Kapittel 5:</strong> Planlegging og prosjektering</li>
        <li><strong>Kapittel 6:</strong> Deteksjon - valg av detektortyper</li>
        <li><strong>Kapittel 7:</strong> Varsling - alarmgivere og soner</li>
        <li><strong>Kapittel 8:</strong> Overføring til alarmstasjon</li>
        <li><strong>Kapittel 9:</strong> Strømforsyning og batterireserve</li>
        <li><strong>Kapittel 10:</strong> Installasjon og kabling</li>
        <li><strong>Kapittel 11:</strong> Dokumentasjon og merking</li>
      </ul>
      <p className="mt-3"><strong>Kategorier:</strong> 1 (heldekkende), 2 (delvis), 3 (manuelt), 4 (lokalt)</p>
    </>
  ),
  ns3961: (
    <>
      <p><strong>NS 3961 - Talevarsling:</strong></p>
      <p>Norsk standard for talevarslingsanlegg i bygninger. Supplement til NS 3960.</p>
      <ul className="list-disc pl-5 space-y-2 mt-2">
        <li><strong>Når kreves talevarsling:</strong>
          <ul className="list-disc pl-5 mt-1">
            <li>Bygninger med mange personer</li>
            <li>Komplekse bygninger</li>
            <li>Overnattingssteder</li>
            <li>Forsamlingslokaler over 150 personer</li>
          </ul>
        </li>
        <li><strong>Krav til lydnivå:</strong> Min. 65 dB(A) eller 10 dB over bakgrunnsstøy</li>
        <li><strong>Taletydelighet:</strong> STI-verdi minimum 0,50</li>
        <li><strong>Meldinger:</strong> Forhåndsinnspilte og live-meldinger</li>
        <li><strong>Soner:</strong> Mulighet for sonevis varsling</li>
      </ul>
    </>
  )
}

// Risikoanalyse Section
function RisikoanalyseSection({ data, setData }: { data: RisikoanalyseData, setData: React.Dispatch<React.SetStateAction<RisikoanalyseData>> }) {
  const bruksklasser = ['1', '2', '3', '4', '5', '6']
  const risikoklasser = ['1', '2', '3', '4', '5', '6']
  const kategorier = ['Kategori 1', 'Kategori 2', 'Kategori 3', 'Kategori 4']

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Risiko- og behovsanalyse</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bygningstype</label>
          <input type="text" value={data.bygningstype} onChange={e => setData(d => ({ ...d, bygningstype: e.target.value }))} className="input w-full" placeholder="F.eks. Kontorbygg" />
        </div>
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Bruksklasse
            <HelpTooltip title="Bruksklasse" content={helpContent.bruksklasse} />
          </label>
          <select value={data.bruksklasse} onChange={e => setData(d => ({ ...d, bruksklasse: e.target.value }))} className="input w-full">
            <option value="">Velg...</option>
            {bruksklasser.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Risikoklasse
            <HelpTooltip title="Risikoklasse" content={helpContent.risikoklasse} />
          </label>
          <select value={data.risikoklasse} onChange={e => setData(d => ({ ...d, risikoklasse: e.target.value }))} className="input w-full">
            <option value="">Velg...</option>
            {risikoklasser.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Antall etasjer</label>
          <input type="number" value={data.antall_etasjer || ''} onChange={e => setData(d => ({ ...d, antall_etasjer: e.target.value ? parseInt(e.target.value) : null }))} className="input w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bruttoareal (m²)</label>
          <input type="number" value={data.bruttoareal || ''} onChange={e => setData(d => ({ ...d, bruttoareal: e.target.value ? parseFloat(e.target.value) : null }))} className="input w-full" />
        </div>
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Kategori
            <HelpTooltip title="Kategori brannalarmanlegg" content={helpContent.kategori} />
          </label>
          <select value={data.kategori} onChange={e => setData(d => ({ ...d, kategori: e.target.value }))} className="input w-full">
            <option value="">Velg...</option>
            {kategorier.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Brannbelastning
            <HelpTooltip title="Brannbelastning" content={helpContent.brannbelastning} />
          </label>
          <textarea value={data.brannbelastning} onChange={e => setData(d => ({ ...d, brannbelastning: e.target.value }))} className="input w-full h-20" placeholder="Beskriv brannbelastning..." />
        </div>
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Personbelastning
            <HelpTooltip title="Personbelastning" content={helpContent.personbelastning} />
          </label>
          <textarea value={data.personbelastning} onChange={e => setData(d => ({ ...d, personbelastning: e.target.value }))} className="input w-full h-20" placeholder="Beskriv personbelastning..." />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Spesielle risikoer</label>
        <textarea value={data.spesielle_risikoer} onChange={e => setData(d => ({ ...d, spesielle_risikoer: e.target.value }))} className="input w-full h-20" />
      </div>

      <h3 className="text-md font-semibold text-gray-900 dark:text-white">Behovsvurdering</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deteksjonsbehov</label>
          <textarea value={data.deteksjonsbehov} onChange={e => setData(d => ({ ...d, deteksjonsbehov: e.target.value }))} className="input w-full h-20" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Varslingsbehov</label>
          <textarea value={data.varslingsbehov} onChange={e => setData(d => ({ ...d, varslingsbehov: e.target.value }))} className="input w-full h-20" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slukkebehov</label>
          <textarea value={data.slukkebehov} onChange={e => setData(d => ({ ...d, slukkebehov: e.target.value }))} className="input w-full h-20" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Evakueringsbehov</label>
          <textarea value={data.evakueringsbehov} onChange={e => setData(d => ({ ...d, evakueringsbehov: e.target.value }))} className="input w-full h-20" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Anbefalt system</label>
          <input type="text" value={data.anbefalt_system} onChange={e => setData(d => ({ ...d, anbefalt_system: e.target.value }))} className="input w-full" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Begrunnelse</label>
        <textarea value={data.begrunnelse} onChange={e => setData(d => ({ ...d, begrunnelse: e.target.value }))} className="input w-full h-24" />
      </div>
    </div>
  )
}

// Systemplan Section
function SystemplanSection({ data, setData }: { data: SystemplanData, setData: React.Dispatch<React.SetStateAction<SystemplanData>> }) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Systemplanlegging</h2>
      
      <h3 className="text-md font-semibold text-gray-900 dark:text-white">Sentralutstyr</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sentraltype</label>
          <input type="text" value={data.sentral_type} onChange={e => setData(d => ({ ...d, sentral_type: e.target.value }))} className="input w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Produsent</label>
          <input type="text" value={data.sentral_produsent} onChange={e => setData(d => ({ ...d, sentral_produsent: e.target.value }))} className="input w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Modell</label>
          <input type="text" value={data.sentral_modell} onChange={e => setData(d => ({ ...d, sentral_modell: e.target.value }))} className="input w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Antall sløyfekort</label>
          <input type="number" value={data.antall_sloyfekort || ''} onChange={e => setData(d => ({ ...d, antall_sloyfekort: e.target.value ? parseInt(e.target.value) : null }))} className="input w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Antall sløyfer</label>
          <input type="number" value={data.antall_sloyfer || ''} onChange={e => setData(d => ({ ...d, antall_sloyfer: e.target.value ? parseInt(e.target.value) : null }))} className="input w-full" />
        </div>
      </div>

      <h3 className="text-md font-semibold text-gray-900 dark:text-white">Detektorer</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Røyk</label>
          <input type="number" value={data.antall_roykdetektorer || ''} onChange={e => setData(d => ({ ...d, antall_roykdetektorer: e.target.value ? parseInt(e.target.value) : null }))} className="input w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Varme</label>
          <input type="number" value={data.antall_varmedetektorer || ''} onChange={e => setData(d => ({ ...d, antall_varmedetektorer: e.target.value ? parseInt(e.target.value) : null }))} className="input w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Flamme</label>
          <input type="number" value={data.antall_flammedetektorer || ''} onChange={e => setData(d => ({ ...d, antall_flammedetektorer: e.target.value ? parseInt(e.target.value) : null }))} className="input w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Multi</label>
          <input type="number" value={data.antall_multidetektorer || ''} onChange={e => setData(d => ({ ...d, antall_multidetektorer: e.target.value ? parseInt(e.target.value) : null }))} className="input w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Linje</label>
          <input type="number" value={data.antall_linjedetektorer || ''} onChange={e => setData(d => ({ ...d, antall_linjedetektorer: e.target.value ? parseInt(e.target.value) : null }))} className="input w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Aspirerende</label>
          <input type="number" value={data.antall_aspirerende || ''} onChange={e => setData(d => ({ ...d, antall_aspirerende: e.target.value ? parseInt(e.target.value) : null }))} className="input w-full" />
        </div>
      </div>

      <h3 className="text-md font-semibold text-gray-900 dark:text-white">Alarmgivere</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sirener</label>
          <input type="number" value={data.antall_sirener || ''} onChange={e => setData(d => ({ ...d, antall_sirener: e.target.value ? parseInt(e.target.value) : null }))} className="input w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Klokker</label>
          <input type="number" value={data.antall_klokker || ''} onChange={e => setData(d => ({ ...d, antall_klokker: e.target.value ? parseInt(e.target.value) : null }))} className="input w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Blitzlys</label>
          <input type="number" value={data.antall_blitzlys || ''} onChange={e => setData(d => ({ ...d, antall_blitzlys: e.target.value ? parseInt(e.target.value) : null }))} className="input w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Talevarslere</label>
          <input type="number" value={data.antall_talevarslere || ''} onChange={e => setData(d => ({ ...d, antall_talevarslere: e.target.value ? parseInt(e.target.value) : null }))} className="input w-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Brannmeldere</label>
          <input type="number" value={data.antall_brannmeldere || ''} onChange={e => setData(d => ({ ...d, antall_brannmeldere: e.target.value ? parseInt(e.target.value) : null }))} className="input w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Overføringstype</label>
          <input type="text" value={data.overforingstype} onChange={e => setData(d => ({ ...d, overforingstype: e.target.value }))} className="input w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alarmstasjon</label>
          <input type="text" value={data.alarmstasjon} onChange={e => setData(d => ({ ...d, alarmstasjon: e.target.value }))} className="input w-full" />
        </div>
      </div>

      <h3 className="text-md font-semibold text-gray-900 dark:text-white">Strømforsyning</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type strømforsyning</label>
          <input type="text" value={data.stromforsyning_type} onChange={e => setData(d => ({ ...d, stromforsyning_type: e.target.value }))} className="input w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Batterireserve (timer)</label>
          <input type="number" value={data.batterireserve_timer || ''} onChange={e => setData(d => ({ ...d, batterireserve_timer: e.target.value ? parseInt(e.target.value) : null }))} className="input w-full" />
        </div>
      </div>

      <h3 className="text-md font-semibold text-gray-900 dark:text-white">Talevarsling (NS 3961)</h3>
      <div className="space-y-4">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={data.talevarsling_aktiv} onChange={e => setData(d => ({ ...d, talevarsling_aktiv: e.target.checked }))} className="w-4 h-4" />
          <span className="text-gray-700 dark:text-gray-300">Talevarsling aktivert</span>
        </label>
        {data.talevarsling_aktiv && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Soner</label>
              <textarea value={data.talevarsling_soner} onChange={e => setData(d => ({ ...d, talevarsling_soner: e.target.value }))} className="input w-full h-20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meldinger</label>
              <textarea value={data.talevarsling_meldinger} onChange={e => setData(d => ({ ...d, talevarsling_meldinger: e.target.value }))} className="input w-full h-20" />
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notater</label>
        <textarea value={data.notater} onChange={e => setData(d => ({ ...d, notater: e.target.value }))} className="input w-full h-24" />
      </div>
    </div>
  )
}

// Integrasjon Section (placeholder)
function IntegrasjonSection({ prosjekteringId: _prosjekteringId }: { prosjekteringId?: string }) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Integrasjoner med andre systemer</h2>
      <p className="text-gray-600 dark:text-gray-400">
        Her kan du definere integrasjoner med sprinkler, røykventilasjon, adgangskontroll, heis, HVAC, BMS osv.
      </p>
      <div className="p-8 border-2 border-dashed border-gray-300 dark:border-dark-200 rounded-lg text-center">
        <Link2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Integrasjonsmodul kommer snart</p>
      </div>
    </div>
  )
}

// Sjekkliste Section (placeholder)
function SjekklisteSection({ prosjekteringId: _prosjekteringId }: { prosjekteringId?: string }) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Prosjekteringssjekkliste</h2>
      <p className="text-gray-600 dark:text-gray-400">
        Sjekkliste for å sikre at alle krav i TEK 17, NS 3960 og NS 3961 er ivaretatt.
      </p>
      <div className="p-8 border-2 border-dashed border-gray-300 dark:border-dark-200 rounded-lg text-center">
        <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Sjekklistemodul kommer snart</p>
      </div>
    </div>
  )
}
