import { useState, useEffect } from 'react'
import { X, Save, FileText, Building2, Radio, MessageSquare, Link2, AlertTriangle, Plus, Trash2, Settings } from 'lucide-react'
import { supabase } from '../../lib/supabase'

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

  // Render will be added in next part
  return <div>Editor under construction</div>
}
