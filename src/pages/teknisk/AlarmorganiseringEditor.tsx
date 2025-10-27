import { useState, useEffect } from 'react'
import { X, Save, FileText, Building2, Radio, MessageSquare, Link2, AlertTriangle, Plus, Trash2, Settings, Eye, FileDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { AlarmorganiseringPreview } from './AlarmorganiseringPreview'
import { generateAlarmorganiseringPDF } from './AlarmorganiseringPDF'

interface AlarmorganiseringEditorProps {
  existingData?: any
  onClose: (saved: boolean) => void
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

export function AlarmorganiseringEditor({ existingData, onClose }: AlarmorganiseringEditorProps) {
  const [saving, setSaving] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [facilities, setFacilities] = useState<any[]>([])
  const [serviceTechnicians, setServiceTechnicians] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    kunde_id: existingData?.kunde_id || '',
    anlegg_id: existingData?.anlegg_id || '',
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
    antall_styringer: existingData?.antall_styringer || '',
    brannklokker_aktivering: existingData?.brannklokker_aktivering || '',
    visuell_varsling_aktivering: existingData?.visuell_varsling_aktivering || '',
    alarm_aktivering: existingData?.alarm_aktivering || '',
    seksjoneringsoppsett: existingData?.seksjoneringsoppsett || '',
    detektorplassering: existingData?.detektorplassering || 'Se detektorliste for utvidet informasjon',
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
  
  const [forvarselAktiverer, setForvarselAktiverer] = useState(!!existingData?.alarmnivaa_forvarsel)
  const [stilleAlarmAktiverer, setStilleAlarmAktiverer] = useState(!!existingData?.alarmnivaa_stille)
  const [storAlarmAktiverer, setStorAlarmAktiverer] = useState(!!existingData?.alarmnivaa_stor)
  const [styringer, setStyringer] = useState<Styring[]>(existingData?.styringer_data || [])
  const [showPreview, setShowPreview] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)
  const [customDetectorType, setCustomDetectorType] = useState('')
  const [customDetectorTypes, setCustomDetectorTypes] = useState<string[]>([])

  useEffect(() => {
    loadCustomers()
    loadServiceTechnicians()
    if (existingData?.kunde_id) loadFacilities(existingData.kunde_id)
  }, [])

  const loadCustomers = async () => {
    const { data } = await supabase.from('customer').select('id, navn').order('navn')
    setCustomers(data || [])
  }

  const loadFacilities = async (customerId: string) => {
    const { data } = await supabase.from('anlegg').select('id, anleggsnavn, adresse').eq('kundenr', customerId).order('anleggsnavn')
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
      alert('Velg minst en kunde eller anlegg')
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
      alert('Feil ved lagring av alarmorganisering')
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

  const addCustomDetectorType = () => {
    if (customDetectorType.trim()) {
      setCustomDetectorTypes([...customDetectorTypes, customDetectorType.trim()])
      setCustomDetectorType('')
    }
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
      alert('Velg et anlegg før du genererer PDF')
      return
    }

    setGenerating(true)
    try {
      const data = await getEnrichedData()
      const result = await generateAlarmorganiseringPDF(data, true)
      if (result.success) {
        alert(`PDF lagret som ${result.fileName}`)
      }
    } catch (error) {
      console.error('Feil ved generering av PDF:', error)
      alert('Feil ved generering av PDF')
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
            <button onClick={() => onClose(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">{existingData ? 'Rediger' : 'Ny'} Alarmorganisering</h1>
              <p className="text-gray-400">Dokumenter alarmorganisering for anlegg</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePreview} className="btn-secondary flex items-center gap-2">
              <Eye className="w-4 h-4" />Forhåndsvis
            </button>
            <button onClick={handleGeneratePDF} disabled={generating || !formData.anlegg_id} className="btn-secondary flex items-center gap-2">
              <FileDown className="w-4 h-4" />{generating ? 'Genererer...' : 'Generer PDF'}
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" />{saving ? 'Lagrer...' : 'Lagre'}
            </button>
          </div>
        </div>

      {/* Grunnleggende info */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6"><FileText className="w-6 h-6 text-primary" /><h2 className="text-xl font-semibold text-white">Grunnleggende informasjon</h2></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label className="label">Revisjon</label><input type="text" value={formData.revisjon} onChange={(e) => setFormData({ ...formData, revisjon: e.target.value })} className="input" required /></div>
          <div><label className="label">Dato</label><input type="date" value={formData.dato} onChange={(e) => setFormData({ ...formData, dato: e.target.value })} className="input" required /></div>
          <div><label className="label">Service Ingeniør</label><select value={formData.service_ingeniør} onChange={(e) => setFormData({ ...formData, service_ingeniør: e.target.value })} className="input" required><option value="">Velg tekniker</option>{serviceTechnicians.map((t) => (<option key={t.id} value={t.navn}>{t.navn}</option>))}</select></div>
        </div>
        <div className="mt-4"><label className="label">Status</label><select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="input max-w-xs"><option value="Utkast">✎ Utkast</option><option value="Ferdig">✓ Ferdig</option></select></div>
      </div>

      {/* Kunde */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6"><Building2 className="w-6 h-6 text-primary" /><h2 className="text-xl font-semibold text-white">Kundeinformasjon</h2></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="label">Kunde</label><select value={formData.kunde_id} onChange={(e) => handleCustomerChange(e.target.value)} className="input"><option value="">Velg kunde</option>{customers.map((c) => (<option key={c.id} value={c.id}>{c.navn}</option>))}</select></div>
          <div><label className="label">Anlegg</label><select value={formData.anlegg_id} onChange={(e) => handleFacilityChange(e.target.value)} className="input" disabled={!formData.kunde_id}><option value="">Velg anlegg</option>{facilities.map((f) => (<option key={f.id} value={f.id}>{f.anleggsnavn}</option>))}</select></div>
        </div>
        <div className="mt-4"><label className="label">Kundeadresse</label><textarea value={formData.kundeadresse} onChange={(e) => setFormData({ ...formData, kundeadresse: e.target.value })} className="input" rows={2} /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div><label className="label">Kontaktperson</label><input type="text" value={formData.kontakt_person} onChange={(e) => setFormData({ ...formData, kontakt_person: e.target.value })} className="input" /></div>
          <div><label className="label">Mobil</label><input type="text" value={formData.mobil} onChange={(e) => setFormData({ ...formData, mobil: e.target.value })} className="input" /></div>
          <div><label className="label">E-post</label><input type="email" value={formData.e_post} onChange={(e) => setFormData({ ...formData, e_post: e.target.value })} className="input" /></div>
          <div><label className="label">Annet</label><input type="text" value={formData.annet} onChange={(e) => setFormData({ ...formData, annet: e.target.value })} className="input" /></div>
        </div>
      </div>

      {/* 1. Deteksjon */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6"><Radio className="w-6 h-6 text-primary" /><h2 className="text-xl font-semibold text-white">1. Deteksjon</h2></div>
        <div className="mb-4">
          <label className="label">Detektortyper</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 border border-gray-700 rounded-lg">
            {DETECTOR_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                <input type="checkbox" checked={detektortyper[type]} onChange={(e) => setDetektortyper({ ...detektortyper, [type]: e.target.checked })} className="rounded" />
                {type}
              </label>
            ))}
          </div>
          
          {/* Custom detector types */}
          <div className="mt-4">
            <label className="label text-sm">Legg til egendefinert detektortype</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customDetectorType}
                onChange={(e) => setCustomDetectorType(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCustomDetectorType()}
                placeholder="F.eks. CO-detektor, Gassdetektor..."
                className="input flex-1"
              />
              <button
                type="button"
                onClick={addCustomDetectorType}
                className="btn-secondary"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {customDetectorTypes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {customDetectorTypes.map((type, index) => (
                  <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
                    {type}
                    <button
                      type="button"
                      onClick={() => removeCustomDetectorType(index)}
                      className="hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="mb-4"><label className="label">Detektorplassering</label><textarea value={formData.detektorplassering} onChange={(e) => setFormData({ ...formData, detektorplassering: e.target.value })} className="input" rows={3} /></div>
        <div className="space-y-4">
          <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg"><div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-orange-400">Alarmnivå - Forvarsel</h3><label className="flex items-center gap-2 cursor-pointer"><span className="text-sm text-gray-400">Aktiverer styringer</span><input type="checkbox" checked={forvarselAktiverer} onChange={(e) => { setForvarselAktiverer(e.target.checked); if (!e.target.checked) setFormData({ ...formData, alarmnivaa_forvarsel: '' }) }} className="rounded" /></label></div>{forvarselAktiverer && <textarea value={formData.alarmnivaa_forvarsel} onChange={(e) => setFormData({ ...formData, alarmnivaa_forvarsel: e.target.value })} className="input" rows={2} placeholder="Beskriv hva som skjer ved forvarsel" />}</div>
          <div className="p-4 bg-gray-500/10 border border-gray-500/20 rounded-lg"><div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-gray-400">Alarmnivå - Stille alarm</h3><label className="flex items-center gap-2 cursor-pointer"><span className="text-sm text-gray-400">Aktiverer styringer</span><input type="checkbox" checked={stilleAlarmAktiverer} onChange={(e) => { setStilleAlarmAktiverer(e.target.checked); if (!e.target.checked) setFormData({ ...formData, alarmnivaa_stille: '' }) }} className="rounded" /></label></div>{stilleAlarmAktiverer && <textarea value={formData.alarmnivaa_stille} onChange={(e) => setFormData({ ...formData, alarmnivaa_stille: e.target.value })} className="input" rows={2} placeholder="Beskriv hva som skjer ved stille alarm" />}</div>
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg"><div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-red-400">Alarmnivå - Stor alarm</h3><label className="flex items-center gap-2 cursor-pointer"><span className="text-sm text-gray-400">Aktiverer styringer</span><input type="checkbox" checked={storAlarmAktiverer} onChange={(e) => { setStorAlarmAktiverer(e.target.checked); if (!e.target.checked) setFormData({ ...formData, alarmnivaa_stor: '' }) }} className="rounded" /></label></div>{storAlarmAktiverer && <textarea value={formData.alarmnivaa_stor} onChange={(e) => setFormData({ ...formData, alarmnivaa_stor: e.target.value })} className="input" rows={2} placeholder="Beskriv hva som skjer ved stor alarm" />}</div>
        </div>
        <div className="mt-4"><label className="label">Tekniske tiltak mot unødige alarmer</label><textarea value={formData.tekniske_tiltak_unodige_alarmer} onChange={(e) => setFormData({ ...formData, tekniske_tiltak_unodige_alarmer: e.target.value })} className="input" rows={3} /></div>
      </div>

      {/* 2. Melding */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6"><MessageSquare className="w-6 h-6 text-primary" /><h2 className="text-xl font-semibold text-white">2. Melding</h2></div>
        <div className="mb-4"><label className="label">Hvem får melding</label><div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 border border-gray-700 rounded-lg">{NOTIFICATION_RECIPIENTS.map((r) => (<label key={r} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white"><input type="checkbox" checked={meldingMottakere[r]} onChange={(e) => setMeldingMottakere({ ...meldingMottakere, [r]: e.target.checked })} className="rounded" />{r}</label>))}</div></div>
        <div className="mb-4"><label className="label">Hvordan melding mottas</label><textarea value={formData.hvordan_melding_mottas} onChange={(e) => setFormData({ ...formData, hvordan_melding_mottas: e.target.value })} className="input" rows={2} /></div>
        <div className="mb-4"><label className="label">Verifikasjonsmetoder</label><div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 border border-gray-700 rounded-lg">{VERIFICATION_METHODS.map((m) => (<label key={m} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white"><input type="checkbox" checked={verifikasjonsmetoder[m]} onChange={(e) => setVerifikasjonsmetoder({ ...verifikasjonsmetoder, [m]: e.target.checked })} className="rounded" />{m}</label>))}</div></div>
        <div className="mb-4"><label className="label">Kommunikasjonskanaler</label><textarea value={formData.kommunikasjonskanaler} onChange={(e) => setFormData({ ...formData, kommunikasjonskanaler: e.target.value })} className="input" rows={2} /></div>
        <div><label className="label">Meldingsrutiner</label><textarea value={formData.meldingsrutiner} onChange={(e) => setFormData({ ...formData, meldingsrutiner: e.target.value })} className="input" rows={3} /></div>
      </div>

      {/* 3. Oppkobling */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6"><Link2 className="w-6 h-6 text-primary" /><h2 className="text-xl font-semibold text-white">3. Oppkobling/Integrasjon</h2></div>
        <div className="space-y-4">
          <div><label className="label">Integrasjon med andre systemer</label><textarea value={formData.integrasjon_andre_systemer} onChange={(e) => setFormData({ ...formData, integrasjon_andre_systemer: e.target.value })} className="input" rows={3} /></div>
          <div><label className="label">Forriglinger</label><textarea value={formData.forriglinger} onChange={(e) => setFormData({ ...formData, forriglinger: e.target.value })} className="input" rows={2} /></div>
          <div><label className="label">Automatiske funksjoner</label><textarea value={formData.automatiske_funksjoner} onChange={(e) => setFormData({ ...formData, automatiske_funksjoner: e.target.value })} className="input" rows={3} /></div>
        </div>
      </div>

      {/* 4. Tiltak */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6"><AlertTriangle className="w-6 h-6 text-primary" /><h2 className="text-xl font-semibold text-white">4. Tiltak</h2></div>
        <div className="space-y-4">
          <div><label className="label">Organisatoriske prosesser</label><textarea value={formData.organisatoriske_prosesser} onChange={(e) => setFormData({ ...formData, organisatoriske_prosesser: e.target.value })} className="input" rows={3} /></div>
          <div><label className="label">Evakueringsprosedyrer</label><textarea value={formData.evakueringsprosedyrer} onChange={(e) => setFormData({ ...formData, evakueringsprosedyrer: e.target.value })} className="input" rows={3} /></div>
          <div><label className="label">Beredskapsplaner</label><textarea value={formData.beredskapsplaner} onChange={(e) => setFormData({ ...formData, beredskapsplaner: e.target.value })} className="input" rows={3} /></div>
          <div><label className="label">Ansvarlige personer</label><textarea value={formData.ansvarlige_personer} onChange={(e) => setFormData({ ...formData, ansvarlige_personer: e.target.value })} className="input" rows={3} /></div>
          <div><label className="label">Opplæringsrutiner</label><textarea value={formData.opplaering_rutiner} onChange={(e) => setFormData({ ...formData, opplaering_rutiner: e.target.value })} className="input" rows={3} /></div>
        </div>
      </div>

      {/* Alarmorganisering */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6"><Settings className="w-6 h-6 text-primary" /><h2 className="text-xl font-semibold text-white">Alarmorganisering</h2></div>
        <div className="space-y-4">
          <div><label className="label">Samspill mellom det tekniske og det organisatoriske</label><textarea value={formData.samspill_teknisk_organisatorisk} onChange={(e) => setFormData({ ...formData, samspill_teknisk_organisatorisk: e.target.value })} className="input" rows={3} /></div>
          <div><label className="label">Styringsmatrise</label><textarea value={formData.styringsmatrise} onChange={(e) => setFormData({ ...formData, styringsmatrise: e.target.value })} className="input" rows={3} /></div>
          <div><label className="label">Type Overføring</label><textarea value={formData.type_overforing} onChange={(e) => setFormData({ ...formData, type_overforing: e.target.value })} className="input" rows={2} /></div>
          <div><label className="label">Overvåkingstid</label><textarea value={formData.overvakingstid} onChange={(e) => setFormData({ ...formData, overvakingstid: e.target.value })} className="input" rows={2} /></div>
          <div><label className="label">Innstallasjon</label><textarea value={formData.innstallasjon} onChange={(e) => setFormData({ ...formData, innstallasjon: e.target.value })} className="input" rows={3} /></div>
          <div><label className="label">Gjeldende teknisk forskrift</label><textarea value={formData.gjeldende_teknisk_forskrift} onChange={(e) => setFormData({ ...formData, gjeldende_teknisk_forskrift: e.target.value })} className="input" rows={3} /></div>
        </div>
        
        {/* Styringer */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Styringer</h3>
            <button onClick={addStyring} className="btn-secondary flex items-center gap-2"><Plus className="w-4 h-4" />Legg til styring</button>
          </div>
          {styringer.length === 0 ? (
            <div className="p-8 border border-gray-700 rounded-lg text-center text-gray-400">Ingen styringer lagt til</div>
          ) : (
            <div className="space-y-4">
              {styringer.map((s, i) => (
                <div key={i} className="p-4 border border-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-300">Styring {i + 1}</h4>
                    <button onClick={() => removeStyring(i)} className="p-1 hover:bg-red-500/10 rounded"><Trash2 className="w-4 h-4 text-red-500" /></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="label">Type</label><select value={s.type} onChange={(e) => updateStyring(i, 'type', e.target.value)} className="input">{CONTROL_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}</select></div>
                    <div><label className="label">Alarmnivå</label><select value={s.alarmnivaa} onChange={(e) => updateStyring(i, 'alarmnivaa', e.target.value)} className="input">{ALARM_LEVELS.map((a) => (<option key={a} value={a}>{a}</option>))}</select></div>
                  </div>
                  <div className="mt-4"><label className="label">Beskrivelse</label><textarea value={s.beskrivelse} onChange={(e) => updateStyring(i, 'beskrivelse', e.target.value)} className="input" rows={2} /></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
