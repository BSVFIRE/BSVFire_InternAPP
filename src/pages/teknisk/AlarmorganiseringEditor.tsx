import { useState, useEffect } from 'react'
import { ArrowLeft, Save, FileText, Building2, Radio, MessageSquare, Link2, AlertTriangle, Plus, Trash2, Eye, FileDown } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Button, IconButton } from '@/components/ui/Button'
import { supabase } from '../../lib/supabase'
import { AlarmorganiseringPreview } from './AlarmorganiseringPreview'
import { generateAlarmorganiseringPDF } from './AlarmorganiseringPDF'

interface AlarmorganiseringEditorProps {
  existingData?: any
  onClose: (saved: boolean) => void
  initialAnleggId?: string
  initialKundeId?: string
  initialProsjektId?: string
}

interface Styring {
  type: string
  alarmnivaa: string
  beskrivelse: string
}

const DETECTOR_TYPES = ['Røykdetektor', 'Varmedetektor', 'Multidetektor', 'Linjedetektor', 'Aspirasjonsdetektor', 'Flammedetektor', 'Varmedetekterende kabel', 'Manuell Melder', 'Ex Detektor']
const NOTIFICATION_RECIPIENTS = ['Brannvesen', 'Vaktselskap', 'Eier/Driftsansvarlig', 'Teknisk ansvarlig', 'Sikkerhetsleder', 'Vaktmester']
const VERIFICATION_METHODS = ['Visuell kontroll', 'Telefonkontakt', 'Fysisk oppmøte', 'Kameraovervåking', 'Sensordata', 'Automatisk verifikasjon']
const CONTROL_TYPES = ['Brannklokke/Sirene', 'Talevarsling', 'Visuell varsling', 'Røykventilasjon', 'Branndører', 'Sprinkleranlegg', 'Slokkeanlegg', 'Heisblokering', 'Strømkutt', 'Ventilasjonsstopp', 'Annet utstyr']
const ALARM_LEVELS = ['Forvarsel', 'Liten alarm', 'Storalarm']


/** Felt som er tatt ut av skjemaet. Innholdet vises fortsatt hvis en gammel rapport har det. */
const UTGATTE_FELT = [
  { key: 'samspill_teknisk_organisatorisk', navn: 'Samspill teknisk/organisatorisk' },
  { key: 'styringsmatrise', navn: 'Styringsmatrise (fritekst)' },
  { key: 'seksjoneringsoppsett', navn: 'Seksjoneringsoppsett' },
  { key: 'brannklokker_aktivering', navn: 'Brannklokker – aktivering' },
  { key: 'visuell_varsling_aktivering', navn: 'Visuell varsling – aktivering' },
  { key: 'alarm_aktivering', navn: 'Alarm – aktivering' },
  { key: 'kommunikasjonskanaler', navn: 'Kommunikasjonskanaler' },
  { key: 'meldingsrutiner', navn: 'Meldingsrutiner' },
  { key: 'automatiske_funksjoner', navn: 'Automatiske funksjoner' },
  { key: 'organisatoriske_prosesser', navn: 'Organisatoriske prosesser' },
  { key: 'beredskapsplaner', navn: 'Beredskapsplaner' },
  { key: 'annet', navn: 'Annet' },
]

function Tekst({ label, hjelp, verdi, onChange, rader = 2 }: { label: string; hjelp?: string; verdi: string; onChange: (v: string) => void; rader?: number }) {
  return (
    <label className="block space-y-1">
      <span className="block text-sm font-medium text-gray-900 dark:text-white">{label}</span>
      {hjelp && <span className="block text-xs text-gray-500 dark:text-gray-400">{hjelp}</span>}
      <textarea value={verdi ?? ''} onChange={e => onChange(e.target.value)} rows={rader} className="input !h-auto w-full" />
    </label>
  )
}

function Avkrysning({ label, valg, verdier, onChange, egne, onNyEgen, onFjernEgen }: {
  label: string
  valg: readonly string[]
  verdier: Record<string, boolean>
  onChange: (v: Record<string, boolean>) => void
  /** Egendefinerte valg teknikeren har lagt til selv */
  egne?: string[]
  onNyEgen?: (navn: string) => void
  onFjernEgen?: (index: number) => void
}) {
  const [nytt, setNytt] = useState('')
  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-gray-900 dark:text-white">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {[...valg, ...(egne ?? [])].map(v => {
          const av = Boolean(verdier[v])
          return (
            <button key={v} type="button" onClick={() => onChange({ ...verdier, [v]: !av })}
              className={`h-8 px-2.5 rounded-lg border text-xs font-medium transition-colors ${av ? 'bg-primary border-primary text-white' : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary'}`}>
              {v}
            </button>
          )
        })}
      </div>
      {onNyEgen && (
        <div className="flex gap-2 pt-1">
          <input value={nytt} onChange={e => setNytt(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (nytt.trim()) { onNyEgen(nytt.trim()); setNytt('') } } }}
            placeholder="Legg til egen type…" className="input !h-8 text-sm max-w-xs" />
          <Button onClick={() => { if (nytt.trim()) { onNyEgen(nytt.trim()); setNytt('') } }} disabled={!nytt.trim()} className="!h-8">Legg til</Button>
          {(egne?.length ?? 0) > 0 && onFjernEgen && (
            <button type="button" onClick={() => onFjernEgen((egne?.length ?? 1) - 1)} className="text-xs text-gray-500 hover:text-red-500">Fjern siste egne</button>
          )}
        </div>
      )}
    </div>
  )
}

function Nivaa({ farge, tittel, verdi, onChange }: { farge: 'orange' | 'yellow' | 'red'; tittel: string; verdi: string; onChange: (v: string) => void }) {
  const kant = farge === 'orange' ? 'border-l-orange-500' : farge === 'yellow' ? 'border-l-yellow-500' : 'border-l-red-500'
  return (
    <label className={`block border-l-[3px] ${kant} pl-3 space-y-1`}>
      <span className="block text-sm font-medium text-gray-900 dark:text-white">{tittel}</span>
      <input value={verdi ?? ''} onChange={e => onChange(e.target.value)} placeholder={`Hva skjer ved ${tittel.toLowerCase()}?`} className="input !h-9 w-full" />
    </label>
  )
}

export function AlarmorganiseringEditor({ existingData, onClose, initialAnleggId, initialKundeId, initialProsjektId }: AlarmorganiseringEditorProps) {
  const [saving, setSaving] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [facilities, setFacilities] = useState<any[]>([])
  const [serviceTechnicians, setServiceTechnicians] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    kunde_id: existingData?.kunde_id || initialKundeId || '',
    anlegg_id: existingData?.anlegg_id || initialAnleggId || '',
    prosjekt_id: existingData?.prosjekt_id || initialProsjektId || null,
    dato: existingData?.dato || new Date().toISOString().split('T')[0],
    revisjon: existingData?.revisjon || '1.0',
    service_ingeniør: existingData?.service_ingeniør || '',
    status: existingData?.status || 'Utkast',
    kundeadresse: existingData?.kundeadresse || '',
    kontakt_person: existingData?.kontakt_person || '',
    mobil: existingData?.mobil || '',
    e_post: existingData?.e_post || '',
    annet: existingData?.annet || '',
    samspill_teknisk_organisatorisk: existingData?.samspill_teknisk_organisatorisk || '',
    styringsmatrise: existingData?.styringsmatrise || '',
    type_overforing: existingData?.type_overforing || '',
    overvakingstid: existingData?.overvakingstid || '',
    innstallasjon: existingData?.innstallasjon || '',
    gjeldende_teknisk_forskrift: existingData?.gjeldende_teknisk_forskrift || '',
    brannklokker_aktivering: existingData?.brannklokker_aktivering || '',
    visuell_varsling_aktivering: existingData?.visuell_varsling_aktivering || '',
    alarm_aktivering: existingData?.alarm_aktivering || '',
    seksjoneringsoppsett: existingData?.seksjoneringsoppsett || '',
    detektorplassering: existingData?.detektorplassering || 'Se adresseliste for utvidet informasjon',
    alarmnivaa_forvarsel: existingData?.alarmnivaa_forvarsel || '',
    alarmnivaa_stille: existingData?.alarmnivaa_stille || '',
    alarmnivaa_stor: existingData?.alarmnivaa_stor || '',
    tekniske_tiltak_unodige_alarmer: existingData?.tekniske_tiltak_unodige_alarmer || '',
    hvordan_melding_mottas: existingData?.hvordan_melding_mottas || '',
    kommunikasjonskanaler: existingData?.kommunikasjonskanaler || '',
    meldingsrutiner: existingData?.meldingsrutiner || '',
    integrasjon_andre_systemer: existingData?.integrasjon_andre_systemer || '',
    forriglinger: existingData?.forriglinger || '',
    automatiske_funksjoner: existingData?.automatiske_funksjoner || '',
    organisatoriske_prosesser: existingData?.organisatoriske_prosesser || '',
    evakueringsprosedyrer: existingData?.evakueringsprosedyrer || '',
    beredskapsplaner: existingData?.beredskapsplaner || '',
    ansvarlige_personer: existingData?.ansvarlige_personer || '',
    opplaering_rutiner: existingData?.opplaering_rutiner || '',
  })
  
  const [detektortyper, setDetektortyper] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    DETECTOR_TYPES.forEach(type => { initial[type] = existingData?.detektortyper?.includes(type) || false })
    return initial
  })
  
  const [meldingMottakere, setMeldingMottakere] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    NOTIFICATION_RECIPIENTS.forEach(recipient => { initial[recipient] = existingData?.hvem_faar_melding?.includes(recipient) || false })
    return initial
  })
  
  const [verifikasjonsmetoder, setVerifikasjonsmetoder] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    VERIFICATION_METHODS.forEach(method => { initial[method] = existingData?.verifikasjonsmetoder?.includes(method) || false })
    return initial
  })
  
  const [styringer, setStyringer] = useState<Styring[]>(existingData?.styringer_data || [])
  const [showPreview, setShowPreview] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)
  const [customDetectorTypes, setCustomDetectorTypes] = useState<string[]>([])

  useEffect(() => {
    loadCustomers()
    loadServiceTechnicians()
    if (existingData?.kunde_id) loadFacilities(existingData.kunde_id)
  }, [])

  const loadCustomers = async () => {
    const { data } = await supabase.from('customer').select('id, navn').or('skjult.is.null,skjult.eq.false').order('navn')
    setCustomers(data || [])
  }

  const loadFacilities = async (customerId: string) => {
    const { data } = await supabase.from('anlegg').select('id, anleggsnavn, adresse').or('skjult.is.null,skjult.eq.false').eq('kundenr', customerId).order('anleggsnavn')
    setFacilities(data || [])
  }

  const loadServiceTechnicians = async () => {
    const { data } = await supabase.from('ansatte').select('id, navn').order('navn')
    setServiceTechnicians(data || [])
  }

  const handleCustomerChange = async (customerId: string) => {
    setFormData(prev => ({ ...prev, kunde_id: customerId, anlegg_id: '' }))
    setFacilities([])
    if (customerId) await loadFacilities(customerId)
  }

  const handleFacilityChange = async (facilityId: string) => {
    setFormData(prev => ({ ...prev, anlegg_id: facilityId }))
    if (facilityId) {
      const { data: facility } = await supabase.from('anlegg').select('adresse').eq('id', facilityId).single()
      if (facility) setFormData(prev => ({ ...prev, kundeadresse: facility.adresse || '' }))
      
      const { data: contact } = await supabase.from('kontaktpersoner')
        .select('navn, epost, telefon, anlegg_kontaktpersoner!inner(anlegg_id, primar)')
        .eq('anlegg_kontaktpersoner.anlegg_id', facilityId)
        .eq('anlegg_kontaktpersoner.primar', true).maybeSingle()
      
      if (contact) {
        setFormData(prev => ({
          ...prev,
          kontakt_person: contact.navn || '',
          e_post: contact.epost || '',
          mobil: contact.telefon || '',
        }))
      }
    }
  }

  const handleSave = async () => {
    if (!formData.kunde_id && !formData.anlegg_id) {
      toast.warning('Velg minst kunde eller anlegg')
      return
    }

    setSaving(true)
    try {
      const data = {
        ...formData,
        detektortyper: Object.entries(detektortyper).filter(([_, v]) => v).map(([k]) => k).join(', '),
        hvem_faar_melding: Object.entries(meldingMottakere).filter(([_, v]) => v).map(([k]) => k).join(', '),
        verifikasjonsmetoder: Object.entries(verifikasjonsmetoder).filter(([_, v]) => v).map(([k]) => k).join(', '),
        styringer_data: styringer,
        antall_styringer: String(styringer.length),
        opprettet_av: (await supabase.auth.getUser()).data.user?.id,
      }

      if (existingData?.id) {
        const { error } = await supabase.from('alarmorganisering').update(data).eq('id', existingData.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('alarmorganisering').insert(data)
        if (error) throw error
      }

      onClose(true)
    } catch (error) {
      console.error('Error saving alarmorganisering:', error)
      toast.error('Kunne ikke lagre alarmorganiseringen', error)
    } finally {
      setSaving(false)
    }
  }

  const addStyring = () => setStyringer([...styringer, { type: CONTROL_TYPES[0], alarmnivaa: ALARM_LEVELS[0], beskrivelse: '' }])
  const removeStyring = (index: number) => setStyringer(styringer.filter((_, i) => i !== index))
  const updateStyring = (index: number, field: keyof Styring, value: string) => {
    const updated = [...styringer]
    updated[index] = { ...updated[index], [field]: value }
    setStyringer(updated)
  }


  const removeCustomDetectorType = (index: number) => {
    setCustomDetectorTypes(customDetectorTypes.filter((_, i) => i !== index))
  }

  const getEnrichedData = async () => {
    // Get kunde navn
    let kunde_navn = ''
    if (formData.kunde_id) {
      const customer = customers.find(c => c.id === formData.kunde_id)
      kunde_navn = customer?.navn || ''
    }
    
    // Get anlegg navn
    let anlegg_navn = ''
    if (formData.anlegg_id) {
      const facility = facilities.find(f => f.id === formData.anlegg_id)
      anlegg_navn = facility?.anleggsnavn || ''
    }
    
    // Combine standard and custom detector types
    const selectedStandardTypes = Object.entries(detektortyper).filter(([_, v]) => v).map(([k]) => k)
    const allDetectorTypes = [...selectedStandardTypes, ...customDetectorTypes].join(', ')
    
    return {
      id: existingData?.id || '',
      ...formData,
      kunde_navn,
      anlegg_navn,
      detektortyper: allDetectorTypes,
      hvem_faar_melding: Object.entries(meldingMottakere).filter(([_, v]) => v).map(([k]) => k).join(', '),
      verifikasjonsmetoder: Object.entries(verifikasjonsmetoder).filter(([_, v]) => v).map(([k]) => k).join(', '),
      styringer_data: styringer,
    }
  }

  const handlePreview = async () => {
    const data = await getEnrichedData()
    setPreviewData(data)
    setShowPreview(true)
  }

  const handleGeneratePDF = async () => {
    if (!formData.anlegg_id) {
      toast.warning('Velg et anlegg før du lager PDF')
      return
    }

    setGenerating(true)
    try {
      const data = await getEnrichedData()
      const result = await generateAlarmorganiseringPDF(data, true)
      if (result.success) {
        toast.success(`PDF lagret som ${result.fileName}`)
      }
    } catch (error) {
      console.error('Feil ved generering av PDF:', error)
      toast.error('Kunne ikke lage PDF-en', error)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <>
      {showPreview && previewData && (
        <AlarmorganiseringPreview
          data={previewData}
          onClose={() => {
            setShowPreview(false)
            setPreviewData(null)
          }}
        />
      )}
      
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => onClose(false)} className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
              <ArrowLeft className="w-4 h-4" />Alle
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{existingData ? 'Rediger' : 'Ny'} alarmorganisering</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Deteksjon, melding, integrasjon og tiltak for anlegget</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button icon={<Eye />} onClick={handlePreview}>Forhåndsvis</Button>
            <Button icon={<FileDown />} onClick={handleGeneratePDF} loading={generating} disabled={!formData.anlegg_id}>PDF</Button>
            <Button variant="primary" icon={<Save />} onClick={handleSave} loading={saving}>Lagre</Button>
          </div>
        </div>

      {/* Grunnleggende info */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white inline-flex items-center gap-2 mb-4"><FileText className="w-4 h-4 text-primary" />Grunnleggende informasjon</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label className="block text-sm font-medium text-gray-900 dark:text-white mb-1.5">Revisjon</label><input type="text" value={formData.revisjon} onChange={(e) => setFormData({ ...formData, revisjon: e.target.value })} className="input" required /></div>
          <div><label className="block text-sm font-medium text-gray-900 dark:text-white mb-1.5">Dato</label><input type="date" value={formData.dato} onChange={(e) => setFormData({ ...formData, dato: e.target.value })} className="input" required /></div>
          <div><label className="block text-sm font-medium text-gray-900 dark:text-white mb-1.5">Service Ingeniør</label><select value={formData.service_ingeniør} onChange={(e) => setFormData({ ...formData, service_ingeniør: e.target.value })} className="input" required><option value="">Velg tekniker</option>{serviceTechnicians.map((t) => (<option key={t.id} value={t.navn}>{t.navn}</option>))}</select></div>
        </div>
        <div className="mt-4"><label className="block text-sm font-medium text-gray-900 dark:text-white mb-1.5">Status</label><select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="input max-w-xs"><option value="Utkast">✎ Utkast</option><option value="Ferdig">✓ Ferdig</option></select></div>
      </div>

      {/* Kunde */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white inline-flex items-center gap-2 mb-4"><Building2 className="w-4 h-4 text-primary" />Kundeinformasjon</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-gray-900 dark:text-white mb-1.5">Kunde</label><select value={formData.kunde_id} onChange={(e) => handleCustomerChange(e.target.value)} className="input"><option value="">Velg kunde</option>{customers.map((c) => (<option key={c.id} value={c.id}>{c.navn}</option>))}</select></div>
          <div><label className="block text-sm font-medium text-gray-900 dark:text-white mb-1.5">Anlegg</label><select value={formData.anlegg_id} onChange={(e) => handleFacilityChange(e.target.value)} className="input" disabled={!formData.kunde_id}><option value="">Velg anlegg</option>{facilities.map((f) => (<option key={f.id} value={f.id}>{f.anleggsnavn}</option>))}</select></div>
        </div>
        <div className="mt-4"><label className="block text-sm font-medium text-gray-900 dark:text-white mb-1.5">Kundeadresse</label><textarea value={formData.kundeadresse} onChange={(e) => setFormData({ ...formData, kundeadresse: e.target.value })} className="input" rows={2} /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div><label className="block text-sm font-medium text-gray-900 dark:text-white mb-1.5">Kontaktperson</label><input type="text" value={formData.kontakt_person} onChange={(e) => setFormData({ ...formData, kontakt_person: e.target.value })} className="input" /></div>
          <div><label className="block text-sm font-medium text-gray-900 dark:text-white mb-1.5">Mobil</label><input type="text" value={formData.mobil} onChange={(e) => setFormData({ ...formData, mobil: e.target.value })} className="input" /></div>
          <div><label className="block text-sm font-medium text-gray-900 dark:text-white mb-1.5">E-post</label><input type="email" value={formData.e_post} onChange={(e) => setFormData({ ...formData, e_post: e.target.value })} className="input" /></div>
          <div><label className="block text-sm font-medium text-gray-900 dark:text-white mb-1.5">Annet</label><input type="text" value={formData.annet} onChange={(e) => setFormData({ ...formData, annet: e.target.value })} className="input" /></div>
        </div>
      </div>

      {/* 1. Deteksjon */}
      <div className="card space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white inline-flex items-center gap-2"><Radio className="w-4 h-4 text-primary" />1. Deteksjon</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Når, hvor og hvorfor detektorer aktiveres – og hva som er gjort for å unngå unødige alarmer.</p>
        </div>
        <Avkrysning label="Detektortyper i anlegget" valg={DETECTOR_TYPES} verdier={detektortyper} onChange={setDetektortyper}
          egne={customDetectorTypes} onNyEgen={n => setCustomDetectorTypes([...customDetectorTypes, n])} onFjernEgen={removeCustomDetectorType} />
        <Tekst label="Plassering og dekning" hjelp="Hvor detektorene står, og hvilke områder som er dekket." verdi={formData.detektorplassering} onChange={v => setFormData({ ...formData, detektorplassering: v })} rader={2} />
        <div className="space-y-2">
          <span className="block text-sm font-medium text-gray-900 dark:text-white">Alarmnivåer</span>
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">Hva skjer på hvert nivå? La feltet stå tomt hvis nivået ikke er i bruk.</p>
          <Nivaa farge="orange" tittel="Forvarsel" verdi={formData.alarmnivaa_forvarsel} onChange={v => setFormData({ ...formData, alarmnivaa_forvarsel: v })} />
          <Nivaa farge="yellow" tittel="Liten alarm" verdi={formData.alarmnivaa_stille} onChange={v => setFormData({ ...formData, alarmnivaa_stille: v })} />
          <Nivaa farge="red" tittel="Stor alarm" verdi={formData.alarmnivaa_stor} onChange={v => setFormData({ ...formData, alarmnivaa_stor: v })} />
        </div>
        <Tekst label="Tekniske tiltak mot unødige alarmer" hjelp="F.eks. to-detektoravhengighet, forsinket videresending, skjerming mot damp og støv." verdi={formData.tekniske_tiltak_unodige_alarmer} onChange={v => setFormData({ ...formData, tekniske_tiltak_unodige_alarmer: v })} rader={2} />
      </div>

      {/* 2. Melding */}
      <div className="card space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white inline-flex items-center gap-2"><MessageSquare className="w-4 h-4 text-primary" />2. Melding</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Hvem får melding, hvordan den mottas, og hvordan den verifiseres før man varsler videre.</p>
        </div>
        <Avkrysning label="Hvem får melding" valg={NOTIFICATION_RECIPIENTS} verdier={meldingMottakere} onChange={setMeldingMottakere} />
        <Tekst label="Hvordan meldingen mottas" hjelp="Sentral, app, SMS, vaktselskap – og i hvilken rekkefølge." verdi={formData.hvordan_melding_mottas} onChange={v => setFormData({ ...formData, hvordan_melding_mottas: v })} rader={2} />
        <Avkrysning label="Hvordan alarmen verifiseres" valg={VERIFICATION_METHODS} verdier={verifikasjonsmetoder} onChange={setVerifikasjonsmetoder} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Tekst label="Type alarmoverføring" hjelp="F.eks. direkte til 110-sentral via vaktselskap." verdi={formData.type_overforing} onChange={v => setFormData({ ...formData, type_overforing: v })} rader={2} />
          <Tekst label="Overvåkingstid" hjelp="Når er overføringen aktiv – døgnet rundt eller bestemte tider?" verdi={formData.overvakingstid} onChange={v => setFormData({ ...formData, overvakingstid: v })} rader={2} />
        </div>
      </div>

      {/* 3. Oppkobling – styringsmatrisen */}
      <div className="card space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white inline-flex items-center gap-2"><Link2 className="w-4 h-4 text-primary" />3. Oppkobling</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Hva er koblet til brannalarmen, og på hvilket alarmnivå det utløses. Dette er styringsmatrisen for anlegget.</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white">Styringer <span className="text-gray-400 font-normal">({styringer.length})</span></span>
            <Button icon={<Plus />} onClick={addStyring}>Legg til styring</Button>
          </div>
          {styringer.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-3">Ingen styringer lagt til. Legg inn klokker, ventilasjon, dører, heis og annet som utløses av alarmen.</p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-800 rounded-lg border border-gray-200 dark:border-gray-800">
              {styringer.map((s, i) => (
                <li key={i} className="p-2 flex flex-wrap items-center gap-2">
                  <select value={s.type} onChange={e => updateStyring(i, 'type', e.target.value)} aria-label="Type styring" className="input !h-9 w-44">
                    {CONTROL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select value={s.alarmnivaa} onChange={e => updateStyring(i, 'alarmnivaa', e.target.value)} aria-label="Alarmnivå" className="input !h-9 w-36">
                    {ALARM_LEVELS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <input value={s.beskrivelse} onChange={e => updateStyring(i, 'beskrivelse', e.target.value)} placeholder="Hva skjer? F.eks. «Alle dører i 2. etg frigis»" className="input !h-9 flex-1 min-w-[12rem]" />
                  <IconButton variant="ghost" label="Fjern styring" icon={<Trash2 />} onClick={() => removeStyring(i)} className="w-9 h-9 hover:!text-red-500" />
                </li>
              ))}
            </ul>
          )}
        </div>

        <Tekst label="Forriglinger" hjelp="Hva må være i en bestemt tilstand før noe annet kan skje – f.eks. at ventilasjon stopper før røykluker åpnes." verdi={formData.forriglinger} onChange={v => setFormData({ ...formData, forriglinger: v })} rader={2} />
        <Tekst label="Integrasjon med andre systemer" hjelp="Adgangskontroll, SD-anlegg, heis, nødlys og lignende." verdi={formData.integrasjon_andre_systemer} onChange={v => setFormData({ ...formData, integrasjon_andre_systemer: v })} rader={2} />
      </div>

      {/* 4. Tiltak */}
      <div className="card space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white inline-flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-primary" />4. Tiltak</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Hva menneskene på stedet skal gjøre når alarmen går.</p>
        </div>
        <Tekst label="Evakuering" hjelp="Hvem evakuerer hvor, møteplass, og hvem som teller opp." verdi={formData.evakueringsprosedyrer} onChange={v => setFormData({ ...formData, evakueringsprosedyrer: v })} rader={3} />
        <Tekst label="Ansvarlige personer" hjelp="Hvem har hvilken rolle ved alarm – brannvernleder, etasjeansvarlige, vakt." verdi={formData.ansvarlige_personer} onChange={v => setFormData({ ...formData, ansvarlige_personer: v })} rader={2} />
        <Tekst label="Opplæring og øvelser" hjelp="Hvor ofte øves det, og hvem får opplæring i sentralen." verdi={formData.opplaering_rutiner} onChange={v => setFormData({ ...formData, opplaering_rutiner: v })} rader={2} />
      </div>

      {/* Felt fra tidligere versjoner av skjemaet – vises bare når de har innhold */}
      {UTGATTE_FELT.some(f => (formData as Record<string, string>)[f.key]?.trim()) && (
        <div className="card space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Tidligere utfylt</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Disse feltene er tatt ut av skjemaet. Innholdet er beholdt – flytt det gjerne inn i punktene over.</p>
          </div>
          {UTGATTE_FELT.filter(f => (formData as Record<string, string>)[f.key]?.trim()).map(f => (
            <Tekst key={f.key} label={f.navn} verdi={(formData as Record<string, string>)[f.key]} onChange={v => setFormData({ ...formData, [f.key]: v })} rader={2} />
          ))}
        </div>
      )}

    </div>
    </>
  )
}
