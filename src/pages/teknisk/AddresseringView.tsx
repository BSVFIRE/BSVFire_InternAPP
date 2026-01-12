import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, Search, Plus, Trash2, Download, Copy, Check, Save, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

interface AddresseringViewProps {
  onBack: () => void
}

interface Kunde {
  id: string
  navn: string
}

interface Anlegg {
  id: string
  anleggsnavn: string
  adresse?: string
  postnummer?: string
  poststed?: string
}

type Leverandor = 'panasonic'

const detektorTyper = [
  'Base',
  'Røykdetektor',
  'Varmedetektor',
  'Multidetektor',
  'Multisensor',
  'Flammedetektor',
  'Gassdetekt',
  'Manuell melder',
  'Summer',
  'Blitz',
  'Annen'
]

interface BaseEnhet {
  id: string
  baseNr: number
  channel: number // 0-3
  tekniskAdresse: number
  enhetsAdresse: number // 0-15 (enheter per base)
  switch1: number // 0 eller 1
  switch2: number // 0 eller 1
  switch3: number // 0 eller 1
  switch4: number // 0 eller 1
  switch5: number // 0 eller 1
  switch6: number // 0 eller 1
  switch7: number // X = ikke i bruk
  switch8: number // 0 = Normal, 1 = Reg mode
  enhetMerket: string
  type: string
  plassering: string
  etasje: string
  kart: string
}

// Beregn DIP-switch verdier basert på enhetsadresse (0-15)
// Panasonic trådløs protokoll fra tabell:
// - Base (144): SW1=1, SW4=1, resten 0
// - Enheter: SW4=bit0, SW3=bit1, SW2=bit2, SW1=bit3
// Eksempel: Enhet 5 (index 4) = 0100 binær → SW2=1
function calculateDipSwitches(dipIndex: number, isBase: boolean): { sw1: number; sw2: number; sw3: number; sw4: number; sw5: number; sw6: number } {
  if (isBase) {
    // Base har fast konfigurasjon: SW1=1, SW4=1
    return { sw1: 1, sw2: 0, sw3: 0, sw4: 1, sw5: 0, sw6: 0 }
  }
  // Enheter: Binær representasjon
  // Fra tabellen: SW4=bit0, SW3=bit1, SW2=bit2, SW1=bit3
  const sw4 = (dipIndex >> 0) & 1  // bit 0
  const sw3 = (dipIndex >> 1) & 1  // bit 1
  const sw2 = (dipIndex >> 2) & 1  // bit 2
  const sw1 = (dipIndex >> 3) & 1  // bit 3
  const sw5 = 0
  const sw6 = 0
  return { sw1, sw2, sw3, sw4, sw5, sw6 }
}

// Generer teknisk adresse fra base nummer (0-3), channel (0-3) og enhets nummer
// Base 0, CH 0: Base=144, enheter=145-160
// Base 1, CH 0: Base=161, enheter=162-177
// Base 2, CH 0: Base=178, enheter=179-194
// Base 3, CH 0: Base=195, enheter=196-211
// Hver base har 17 adresser (1 base + 16 enheter)
function generateTekniskAdresse(baseIndex: number, enhetsNr: number): number {
  // Base 0 starter på 144, hver base har 17 adresser
  const baseStartAdresse = 144 + baseIndex * 17
  if (enhetsNr === 0) {
    return baseStartAdresse // Base-adressen selv
  }
  return baseStartAdresse + enhetsNr
}

export function AddresseringView({ onBack }: AddresseringViewProps) {
  const { user } = useAuthStore()
  const [kunder, setKunder] = useState<Kunde[]>([])
  const [anlegg, setAnlegg] = useState<Anlegg[]>([])
  const [selectedKunde, setSelectedKunde] = useState<string>('')
  const [selectedAnlegg, setSelectedAnlegg] = useState<string>('')
  const [searchKunde, setSearchKunde] = useState('')
  const [searchAnlegg, setSearchAnlegg] = useState('')
  const [loading, setLoading] = useState(false)
  const [leverandor, setLeverandor] = useState<Leverandor>('panasonic')
  const [enheter, setEnheter] = useState<BaseEnhet[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    loadKunder()
  }, [])

  useEffect(() => {
    if (selectedKunde) {
      loadAnlegg(selectedKunde)
    } else {
      setAnlegg([])
      setSelectedAnlegg('')
    }
  }, [selectedKunde])

  useEffect(() => {
    if (selectedAnlegg) {
      // Last eksisterende data eller generer nytt oppsett
      loadAddressering(selectedAnlegg)
    } else {
      setEnheter([])
      setHasChanges(false)
    }
  }, [selectedAnlegg])

  async function loadAddressering(anleggId: string) {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('addressering')
        .select('*')
        .eq('anlegg_id', anleggId)
        .order('base_nr')
        .order('teknisk_adresse')

      if (error) throw error

      if (data && data.length > 0) {
        // Konverter fra database-format til lokalt format
        const loadedEnheter: BaseEnhet[] = data.map(row => ({
          id: row.id,
          baseNr: row.base_nr,
          channel: row.base_nr,
          tekniskAdresse: row.teknisk_adresse,
          enhetsAdresse: row.enhets_adresse,
          switch1: row.switch1,
          switch2: row.switch2,
          switch3: row.switch3,
          switch4: row.switch4,
          switch5: row.switch5,
          switch6: row.switch6,
          switch7: row.switch7,
          switch8: row.switch8,
          enhetMerket: row.enhet_merket || '',
          type: row.type || '',
          plassering: row.plassering || '',
          etasje: row.etasje || '',
          kart: row.kart || ''
        }))
        setEnheter(loadedEnheter)
      } else {
        // Ingen eksisterende data, generer standard oppsett
        generateInitialSetup()
      }
      setHasChanges(false)
    } catch (error) {
      console.error('Feil ved lasting av addressering:', error)
      // Hvis tabellen ikke finnes ennå, generer standard oppsett
      generateInitialSetup()
    } finally {
      setLoading(false)
    }
  }

  async function saveAddressering() {
    if (!selectedKunde || !selectedAnlegg) return

    try {
      setSaving(true)

      // Slett eksisterende data for dette anlegget
      await supabase
        .from('addressering')
        .delete()
        .eq('anlegg_id', selectedAnlegg)

      // Sett inn nye data
      const rows = enheter.map(enhet => ({
        kunde_id: selectedKunde,
        anlegg_id: selectedAnlegg,
        leverandor: leverandor,
        base_nr: enhet.baseNr,
        teknisk_adresse: enhet.tekniskAdresse,
        enhets_adresse: enhet.enhetsAdresse,
        switch1: enhet.switch1,
        switch2: enhet.switch2,
        switch3: enhet.switch3,
        switch4: enhet.switch4,
        switch5: enhet.switch5,
        switch6: enhet.switch6,
        switch7: enhet.switch7,
        switch8: enhet.switch8,
        enhet_merket: enhet.enhetMerket || null,
        type: enhet.type || null,
        plassering: enhet.plassering || null,
        etasje: enhet.etasje || null,
        kart: enhet.kart || null
      }))

      const { error } = await supabase
        .from('addressering')
        .insert(rows)

      if (error) throw error

      setHasChanges(false)
      alert('Addressering lagret!')
    } catch (error: any) {
      console.error('Feil ved lagring:', error)
      alert('Kunne ikke lagre: ' + (error?.message || 'Ukjent feil'))
    } finally {
      setSaving(false)
    }
  }

  async function loadKunder() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('customer')
        .select('id, navn')
        .order('navn')

      if (error) throw error
      setKunder(data || [])
    } catch (error) {
      console.error('Feil ved lasting av kunder:', error)
      alert('Kunne ikke laste kunder')
    } finally {
      setLoading(false)
    }
  }

  async function loadAnlegg(kundeId: string) {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('anlegg')
        .select('id, anleggsnavn, adresse, postnummer, poststed')
        .eq('kundenr', kundeId)
        .order('anleggsnavn')

      if (error) throw error
      setAnlegg(data || [])
    } catch (error) {
      console.error('Feil ved lasting av anlegg:', error)
      alert('Kunne ikke laste anlegg')
    } finally {
      setLoading(false)
    }
  }

  function generateInitialSetup() {
    // Start med Base 0 (Channel 0)
    generateBaseWithEnheter(0)
  }

  function generateBaseWithEnheter(baseIndex: number) {
    const newEnheter: BaseEnhet[] = []
    const channel = baseIndex  // Base 0 = CH 0, Base 1 = CH 1, osv.
    
    // Base-enheten selv
    const baseTekniskAdresse = generateTekniskAdresse(baseIndex, 0)
    const baseDip = calculateDipSwitches(0, true)
    newEnheter.push({
      id: `base-${baseIndex}`,
      baseNr: baseIndex,
      channel,
      tekniskAdresse: baseTekniskAdresse,
      enhetsAdresse: 0,
      switch1: baseDip.sw1,
      switch2: baseDip.sw2,
      switch3: baseDip.sw3,
      switch4: baseDip.sw4,
      switch5: baseDip.sw5,
      switch6: baseDip.sw6,
      switch7: 0,
      switch8: 0,
      enhetMerket: `Base ${baseTekniskAdresse}`,
      type: 'Base',
      plassering: '',
      etasje: '',
      kart: ''
    })

    // 16 enheter for basen
    for (let i = 1; i <= 16; i++) {
      const tekniskAdresse = generateTekniskAdresse(baseIndex, i)
      const enhetsAdresse = i
      const dipIndex = i - 1
      const dip = calculateDipSwitches(dipIndex, false)
      newEnheter.push({
        id: `enhet-${baseIndex}-${i}`,
        baseNr: baseIndex,
        channel,
        tekniskAdresse,
        enhetsAdresse,
        switch1: dip.sw1,
        switch2: dip.sw2,
        switch3: dip.sw3,
        switch4: dip.sw4,
        switch5: dip.sw5,
        switch6: dip.sw6,
        switch7: 0,
        switch8: 0,
        enhetMerket: '',
        type: '',
        plassering: '',
        etasje: '',
        kart: ''
      })
    }

    setEnheter(prev => [...prev.filter(e => e.baseNr !== baseIndex), ...newEnheter])
  }

  function addBase() {
    const existingBases = [...new Set(enheter.map(e => e.baseNr))]
    // Finn neste ledige base (0-3)
    let newBaseIndex = 0
    for (let i = 0; i <= 3; i++) {
      if (!existingBases.includes(i)) {
        newBaseIndex = i
        break
      }
    }
    if (existingBases.length >= 4) {
      alert('Maksimalt 4 baser (Base 0-3) er støttet')
      return
    }
    const channel = 0

    const newEnheter: BaseEnhet[] = []

    // Base-enheten selv
    const baseTekniskAdresse = generateTekniskAdresse(newBaseIndex, 0)
    const baseDip = calculateDipSwitches(0, true)
    newEnheter.push({
      id: `base-${newBaseIndex}`,
      baseNr: newBaseIndex,
      channel,
      tekniskAdresse: baseTekniskAdresse,
      enhetsAdresse: 0,
      switch1: baseDip.sw1,
      switch2: baseDip.sw2,
      switch3: baseDip.sw3,
      switch4: baseDip.sw4,
      switch5: baseDip.sw5,
      switch6: baseDip.sw6,
      switch7: 0,
      switch8: 0,
      enhetMerket: `Base ${baseTekniskAdresse}`,
      type: 'Base',
      plassering: '',
      etasje: '',
      kart: ''
    })

    // 16 enheter for basen
    for (let i = 1; i <= 16; i++) {
      const tekniskAdresse = generateTekniskAdresse(newBaseIndex, i)
      const enhetsAdresse = i
      const dipIndex = i - 1
      const dip = calculateDipSwitches(dipIndex, false)
      newEnheter.push({
        id: `enhet-${newBaseIndex}-${i}`,
        baseNr: newBaseIndex,
        channel,
        tekniskAdresse,
        enhetsAdresse,
        switch1: dip.sw1,
        switch2: dip.sw2,
        switch3: dip.sw3,
        switch4: dip.sw4,
        switch5: dip.sw5,
        switch6: dip.sw6,
        switch7: 0,
        switch8: 0,
        enhetMerket: '',
        type: '',
        plassering: '',
        etasje: '',
        kart: ''
      })
    }

    setEnheter([...enheter, ...newEnheter])
  }

  function removeBase(baseNr: number) {
    if (!confirm(`Er du sikker på at du vil fjerne Base ${baseNr.toString().padStart(2, '0')} og alle dens enheter?`)) {
      return
    }
    setEnheter(enheter.filter(e => e.baseNr !== baseNr))
  }

  function updateEnhet(id: string, field: keyof BaseEnhet, value: string | number) {
    setEnheter(enheter.map(e => {
      if (e.id === id) {
        const updated = { ...e, [field]: value }
        return updated
      }
      return e
    }))
    setHasChanges(true)
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function exportToCSV() {
    const headers = ['Base', 'Teknisk Adr.', 'Enhets Adr.', 'SW1', 'SW2', 'SW3', 'SW4', 'SW5', 'SW6', 'SW7', 'SW8', 'Enhet merket', 'Type', 'Plassering', 'Etg', 'Kart']
    const rows = enheter.map(e => [
      `Base ${e.baseNr.toString().padStart(2, '0')}`,
      e.tekniskAdresse,
      e.enhetsAdresse,
      e.switch1,
      e.switch2,
      e.switch3,
      e.switch4,
      e.switch5,
      e.switch6,
      'X',
      e.switch8,
      e.enhetMerket,
      e.type,
      e.plassering,
      e.etasje,
      e.kart
    ])

    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `addressering_${selectedAnlegg}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  async function transferToDetektorliste() {
    if (!selectedKunde || !selectedAnlegg) return

    // Filtrer ut enheter som har data (ikke tomme)
    const enheterMedData = enheter.filter(e => 
      e.enhetMerket && e.enhetMerket.trim() !== '' && 
      !e.enhetMerket.startsWith('Base ')  // Ekskluder base-enheter
    )

    if (enheterMedData.length === 0) {
      alert('Ingen enheter med data å overføre. Fyll inn "Enhet merket" for enhetene du vil overføre.')
      return
    }

    try {
      setSaving(true)

      // Sjekk om det finnes eksisterende detektorlister for dette anlegget
      const { data: eksisterendeLister, error: listeQueryError } = await supabase
        .from('detektorlister')
        .select('*')
        .eq('anlegg_id', selectedAnlegg)
        .order('opprettet_dato', { ascending: false }) as { data: Array<{ id: string; revisjon: string; dato: string; service_ingeniør: string }> | null; error: any }

      if (listeQueryError) throw listeQueryError

      const servicetekniker = user?.email?.split('@')[0] || 'Ukjent'
      let targetListeId: string

      if (eksisterendeLister && eksisterendeLister.length > 0) {
        // Det finnes eksisterende lister - spør brukeren
        const nyesteListe = eksisterendeLister[0]
        const valg = prompt(
          `Det finnes ${eksisterendeLister.length} eksisterende detektorliste(r) for dette anlegget.\n\n` +
          `Nyeste: Revisjon ${nyesteListe.revisjon} (${new Date(nyesteListe.dato).toLocaleDateString('nb-NO')})\n\n` +
          `Hva vil du gjøre?\n\n` +
          `1 = Oppdater nyeste liste (beholder eksisterende data)\n` +
          `2 = Oppdater nyeste liste + lag backup først\n` +
          `3 = Opprett helt ny liste\n` +
          `0 = Avbryt\n\n` +
          `Skriv 1, 2, 3 eller 0:`
        )

        if (!valg || valg === '0') {
          setSaving(false)
          return
        }

        if (valg === '2') {
          // Lag backup av eksisterende liste
          const backupRevisjon = `${nyesteListe.revisjon}-backup-${new Date().toISOString().split('T')[0]}`
          
          // Kopier listen
          const { data: backupListe, error: backupError } = await supabase
            .from('detektorlister')
            .insert({
              kunde_id: selectedKunde,
              anlegg_id: selectedAnlegg,
              revisjon: backupRevisjon,
              dato: nyesteListe.dato,
              service_ingeniør: nyesteListe.service_ingeniør,
              status: 'Backup',
              opprettet_av: user?.id,
              opprettet_dato: new Date().toISOString()
            })
            .select()
            .single()

          if (backupError) throw backupError

          // Kopier alle items til backup
          const { data: eksisterendeItems } = await supabase
            .from('detektor_items')
            .select('*')
            .eq('detektorliste_id', nyesteListe.id)

          if (eksisterendeItems && eksisterendeItems.length > 0) {
            const backupItems = eksisterendeItems.map(item => ({
              detektorliste_id: backupListe.id,
              adresse: item.adresse,
              type: item.type,
              plassering: item.plassering,
              kart: item.kart,
              akse: item.akse,
              etasje: item.etasje,
              kommentar: item.kommentar
            }))
            await supabase.from('detektor_items').insert(backupItems)
          }

          console.log('Backup opprettet:', backupListe.id)
          targetListeId = nyesteListe.id
        } else if (valg === '1') {
          targetListeId = nyesteListe.id
        } else if (valg === '3') {
          // Opprett ny liste
          const { data: nyListe, error: nyListeError } = await supabase
            .from('detektorlister')
            .insert({
              kunde_id: selectedKunde,
              anlegg_id: selectedAnlegg,
              revisjon: '1.0',
              dato: new Date().toISOString().split('T')[0],
              service_ingeniør: servicetekniker,
              status: 'Utkast',
              opprettet_av: user?.id,
              opprettet_dato: new Date().toISOString()
            })
            .select()
            .single()

          if (nyListeError) throw nyListeError
          targetListeId = nyListe.id
        } else {
          setSaving(false)
          return
        }
      } else {
        // Ingen eksisterende lister - opprett ny
        const { data: nyListe, error: listeError } = await supabase
          .from('detektorlister')
          .insert({
            kunde_id: selectedKunde,
            anlegg_id: selectedAnlegg,
            revisjon: '1.0',
            dato: new Date().toISOString().split('T')[0],
            service_ingeniør: servicetekniker,
            status: 'Utkast',
            opprettet_av: user?.id,
            opprettet_dato: new Date().toISOString()
          })
          .select()
          .single()

        if (listeError) throw listeError
        targetListeId = nyListe.id
      }

      // Hent eksisterende items for å kunne oppdatere/merge
      const { data: eksisterendeItems } = await supabase
        .from('detektor_items')
        .select('*')
        .eq('detektorliste_id', targetListeId)

      const eksisterendeMap = new Map(
        (eksisterendeItems || []).map(item => [item.adresse, item])
      )

      // Oppdater eller legg til items
      let oppdatert = 0
      let lagtTil = 0

      for (const enhet of enheterMedData) {
        const eksisterende = eksisterendeMap.get(enhet.enhetMerket)
        
        if (eksisterende) {
          // Oppdater kun feltene fra addressering, behold andre felter
          const { error } = await supabase
            .from('detektor_items')
            .update({
              type: enhet.type || eksisterende.type,
              plassering: enhet.plassering || eksisterende.plassering,
              kart: enhet.kart || eksisterende.kart,
              etasje: enhet.etasje || eksisterende.etasje
              // Beholder: akse, kommentar, rekkefølge osv.
            })
            .eq('id', eksisterende.id)
          
          if (!error) oppdatert++
        } else {
          // Legg til ny item
          const { error } = await supabase
            .from('detektor_items')
            .insert({
              detektorliste_id: targetListeId,
              adresse: enhet.enhetMerket,
              type: enhet.type || '',
              plassering: enhet.plassering || '',
              kart: enhet.kart || '',
              akse: '',
              etasje: enhet.etasje || '',
              kommentar: ''
            })
          
          if (!error) lagtTil++
        }
      }

      console.log(`Oppdatert: ${oppdatert}, Lagt til: ${lagtTil}`)

      alert(
        `Detektorliste oppdatert!\n\n` +
        `• ${oppdatert} enheter oppdatert\n` +
        `• ${lagtTil} nye enheter lagt til\n\n` +
        `Gå til Teknisk → Detektorliste for å redigere.`
      )
    } catch (error: any) {
      console.error('Feil ved overføring:', error)
      alert('Kunne ikke opprette/oppdatere detektorliste: ' + (error?.message || 'Ukjent feil'))
    } finally {
      setSaving(false)
    }
  }

  const filteredKunder = kunder.filter(k =>
    k.navn.toLowerCase().includes(searchKunde.toLowerCase())
  )

  const filteredAnlegg = anlegg.filter(a =>
    a.anleggsnavn.toLowerCase().includes(searchAnlegg.toLowerCase())
  )

  // Grupper enheter etter base
  const groupedByBase = useMemo(() => {
    const groups: { [key: number]: BaseEnhet[] } = {}
    enheter.forEach(e => {
      if (!groups[e.baseNr]) {
        groups[e.baseNr] = []
      }
      groups[e.baseNr].push(e)
    })
    return groups
  }, [enheter])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Addressering</h1>
            <p className="text-gray-600 dark:text-gray-400">DIP-switch konfigurasjon for trådløse baser og enheter</p>
          </div>
        </div>
        {selectedAnlegg && enheter.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={saveAddressering}
              disabled={saving}
              className={`btn-primary flex items-center gap-2 ${hasChanges ? 'bg-green-600 hover:bg-green-700' : ''}`}
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {saving ? 'Lagrer...' : 'Lagre'}
            </button>
            <button
              onClick={transferToDetektorliste}
              disabled={saving}
              className="btn-secondary flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
            >
              <FileText className="w-5 h-5" />
              Overfør til Detektorliste
            </button>
            <button
              onClick={exportToCSV}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Eksporter CSV
            </button>
          </div>
        )}
      </div>

      {/* Kunde og Anlegg valg */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Kunde */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Velg kunde</h2>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
            <input
              type="text"
              placeholder="Søk etter kunde..."
              value={searchKunde}
              onChange={(e) => setSearchKunde(e.target.value)}
              className="input w-full pl-10"
            />
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {loading && !selectedKunde ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : filteredKunder.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Ingen kunder funnet</p>
            ) : (
              filteredKunder.map((kunde) => (
                <button
                  key={kunde.id}
                  onClick={() => setSelectedKunde(kunde.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    selectedKunde === kunde.id
                      ? 'bg-primary text-white dark:text-white'
                      : 'bg-gray-50 dark:bg-dark-100 text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-200'
                  }`}
                >
                  {kunde.navn}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Anlegg */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Velg anlegg</h2>
          {!selectedKunde ? (
            <p className="text-gray-500 text-center py-8">Velg en kunde først</p>
          ) : (
            <>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
                <input
                  type="text"
                  placeholder="Søk etter anlegg..."
                  value={searchAnlegg}
                  onChange={(e) => setSearchAnlegg(e.target.value)}
                  className="input w-full pl-10"
                />
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : filteredAnlegg.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Ingen anlegg funnet</p>
                ) : (
                  filteredAnlegg.map((anlegg) => (
                    <button
                      key={anlegg.id}
                      onClick={() => setSelectedAnlegg(anlegg.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                        selectedAnlegg === anlegg.id
                          ? 'bg-primary text-white dark:text-white'
                          : 'bg-gray-50 dark:bg-dark-100 text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-200'
                      }`}
                    >
                      <div className="font-medium">{anlegg.anleggsnavn}</div>
                      {anlegg.adresse && (
                        <div className="text-sm opacity-75 mt-1">
                          {anlegg.adresse}, {anlegg.postnummer} {anlegg.poststed}
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Leverandør valg */}
      {selectedAnlegg && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Leverandør</h2>
          <div className="flex gap-4">
            <button
              onClick={() => setLeverandor('panasonic')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                leverandor === 'panasonic'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-dark-100 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-200'
              }`}
            >
              Panasonic
            </button>
            {/* Flere leverandører kan legges til her */}
          </div>
        </div>
      )}

      {/* DIP-switch tabell */}
      {selectedAnlegg && leverandor === 'panasonic' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Panasonic DIP-switch Konfigurasjon</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                0 = Off, 1 = On | Channel 0-3 velges i Base | Switch 7: X = ikke i bruk | Switch 8: 0 = Normal, 1 = Reg mode
              </p>
            </div>
            <button
              onClick={addBase}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Legg til Base
            </button>
          </div>

          {/* Info om merking */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-400">
              <strong>Merking:</strong> Enheter merkes som f.eks. <strong>001.01</strong> hvor 001 = Sone og 01 = Enhet i sone
            </p>
          </div>

          {Object.entries(groupedByBase).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([baseNrStr, baseEnheter]) => {
            const baseIndex = parseInt(baseNrStr)
            
            return (
              <div key={baseIndex} className="mb-8 last:mb-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-md font-semibold text-gray-900 dark:text-white">Base</span>
                      <select
                        value={baseIndex}
                        onChange={async (e) => {
                          const newIndex = parseInt(e.target.value)
                          if (newIndex !== baseIndex) {
                            // Sjekk om ny base allerede er i bruk (av en annen base)
                            const otherBases = enheter.filter(en => en.baseNr !== baseIndex)
                            const existingBases = [...new Set(otherBases.map(en => en.baseNr))]
                            if (existingBases.includes(newIndex)) {
                              alert(`Base ${newIndex.toString().padStart(2, '0')} er allerede i bruk`)
                              return
                            }
                            
                            // Fjern gamle enheter for denne basen
                            const otherEnheter = enheter.filter(en => en.baseNr !== baseIndex)
                            
                            // Prøv å laste lagret data for den nye basen fra database
                            try {
                              const { data } = await supabase
                                .from('addressering')
                                .select('*')
                                .eq('anlegg_id', selectedAnlegg)
                                .eq('base_nr', newIndex)
                                .order('teknisk_adresse')
                              
                              if (data && data.length > 0) {
                                // Last lagret data
                                const loadedEnheter: BaseEnhet[] = data.map(row => ({
                                  id: row.id,
                                  baseNr: row.base_nr,
                                  channel: row.base_nr,
                                  tekniskAdresse: row.teknisk_adresse,
                                  enhetsAdresse: row.enhets_adresse,
                                  switch1: row.switch1,
                                  switch2: row.switch2,
                                  switch3: row.switch3,
                                  switch4: row.switch4,
                                  switch5: row.switch5,
                                  switch6: row.switch6,
                                  switch7: row.switch7,
                                  switch8: row.switch8,
                                  enhetMerket: row.enhet_merket || '',
                                  type: row.type || '',
                                  plassering: row.plassering || '',
                                  etasje: row.etasje || '',
                                  kart: row.kart || ''
                                }))
                                setEnheter([...otherEnheter, ...loadedEnheter])
                              } else {
                                // Ingen lagret data, generer ny base
                                generateBaseWithEnheter(newIndex)
                                // Fjern den gamle basen fra state
                                setEnheter(prev => prev.filter(en => en.baseNr !== baseIndex))
                              }
                            } catch (error) {
                              // Ved feil, generer ny base
                              generateBaseWithEnheter(newIndex)
                              setEnheter(prev => prev.filter(en => en.baseNr !== baseIndex))
                            }
                            setHasChanges(true)
                          }
                        }}
                        className="input py-1 px-2 w-20"
                      >
                        <option value={0}>00</option>
                        <option value={1}>01</option>
                        <option value={2}>02</option>
                        <option value={3}>03</option>
                      </select>
                    </div>
                    <span className="text-sm text-gray-500">
                      Channel: <span className="text-gray-300 font-medium">CH {baseIndex.toString().padStart(2, '0')}</span>
                    </span>
                  </div>
                  <button
                    onClick={() => removeBase(baseIndex)}
                    className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Fjern base"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-dark-100">
                        <th className="text-left py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">Teknisk</th>
                        <th className="text-left py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">Enhets</th>
                        <th className="text-center py-2 px-1 text-gray-500 dark:text-gray-400 font-medium w-10">SW1</th>
                        <th className="text-center py-2 px-1 text-gray-500 dark:text-gray-400 font-medium w-10">SW2</th>
                        <th className="text-center py-2 px-1 text-gray-500 dark:text-gray-400 font-medium w-10">SW3</th>
                        <th className="text-center py-2 px-1 text-gray-500 dark:text-gray-400 font-medium w-10">SW4</th>
                        <th className="text-center py-2 px-1 text-gray-500 dark:text-gray-400 font-medium w-10">SW5</th>
                        <th className="text-center py-2 px-1 text-gray-500 dark:text-gray-400 font-medium w-10">SW6</th>
                        <th className="text-center py-2 px-1 text-gray-500 dark:text-gray-400 font-medium w-10">SW7</th>
                        <th className="text-center py-2 px-1 text-gray-500 dark:text-gray-400 font-medium w-10">SW8</th>
                        <th className="text-left py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">Enhet merket</th>
                        <th className="text-left py-2 px-2 text-gray-500 dark:text-gray-400 font-medium w-16">Type</th>
                        <th className="text-left py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">Plassering</th>
                        <th className="text-left py-2 px-2 text-gray-500 dark:text-gray-400 font-medium w-16">Etg</th>
                        <th className="text-left py-2 px-2 text-gray-500 dark:text-gray-400 font-medium w-16">Kart</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {baseEnheter.map((enhet) => (
                        <tr 
                          key={enhet.id} 
                          className={`border-b border-gray-100 dark:border-dark-100 ${
                            enhet.enhetsAdresse === 0 ? 'bg-orange-500/10' : ''
                          }`}
                        >
                          <td className="py-2 px-2 text-gray-900 dark:text-white font-mono">
                            {enhet.tekniskAdresse}
                          </td>
                          <td className="py-2 px-2 text-gray-900 dark:text-white font-mono">
                            {enhet.enhetsAdresse}
                          </td>
                          <td className="py-1 px-1 text-center">
                            <span className={`inline-block w-6 h-6 rounded text-xs font-bold leading-6 ${
                              enhet.switch1 === 1 ? 'bg-green-500 text-white' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {enhet.switch1}
                            </span>
                          </td>
                          <td className="py-1 px-1 text-center">
                            <span className={`inline-block w-6 h-6 rounded text-xs font-bold leading-6 ${
                              enhet.switch2 === 1 ? 'bg-green-500 text-white' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {enhet.switch2}
                            </span>
                          </td>
                          <td className="py-1 px-1 text-center">
                            <span className={`inline-block w-6 h-6 rounded text-xs font-bold leading-6 ${
                              enhet.switch3 === 1 ? 'bg-green-500 text-white' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {enhet.switch3}
                            </span>
                          </td>
                          <td className="py-1 px-1 text-center">
                            <span className={`inline-block w-6 h-6 rounded text-xs font-bold leading-6 ${
                              enhet.switch4 === 1 ? 'bg-green-500 text-white' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {enhet.switch4}
                            </span>
                          </td>
                          <td className="py-1 px-1 text-center">
                            <span className={`inline-block w-6 h-6 rounded text-xs font-bold leading-6 ${
                              enhet.switch5 === 1 ? 'bg-green-500 text-white' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {enhet.switch5}
                            </span>
                          </td>
                          <td className="py-1 px-1 text-center">
                            <span className={`inline-block w-6 h-6 rounded text-xs font-bold leading-6 ${
                              enhet.switch6 === 1 ? 'bg-green-500 text-white' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {enhet.switch6}
                            </span>
                          </td>
                          <td className="py-1 px-1 text-center">
                            <span className="inline-block w-6 h-6 rounded text-xs font-bold leading-6 bg-gray-500/20 text-gray-400">
                              X
                            </span>
                          </td>
                          <td className="py-1 px-1 text-center">
                            <span className={`inline-block w-6 h-6 rounded text-xs font-bold leading-6 ${
                              enhet.switch8 === 1 ? 'bg-green-500 text-white' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {enhet.switch8}
                            </span>
                          </td>
                          <td className="py-1 px-2">
                            <input
                              type="text"
                              value={enhet.enhetMerket}
                              onChange={(e) => updateEnhet(enhet.id, 'enhetMerket', e.target.value)}
                              placeholder={enhet.enhetsAdresse === 0 ? `Base ${enhet.tekniskAdresse}` : '001.01'}
                              className="input py-1 px-2 w-full text-sm"
                            />
                          </td>
                          <td className="py-1 px-2">
                            {enhet.enhetsAdresse === 0 ? (
                              <span className="text-gray-400 text-sm">Base</span>
                            ) : (
                              <select
                                value={enhet.type}
                                onChange={(e) => updateEnhet(enhet.id, 'type', e.target.value)}
                                className="input py-1 px-1 w-full text-sm"
                              >
                                <option value="">Velg</option>
                                {detektorTyper.map(type => (
                                  <option key={type} value={type}>{type}</option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="py-1 px-2">
                            <input
                              type="text"
                              value={enhet.plassering}
                              onChange={(e) => updateEnhet(enhet.id, 'plassering', e.target.value)}
                              className="input py-1 px-2 w-full text-sm"
                            />
                          </td>
                          <td className="py-1 px-2">
                            <input
                              type="text"
                              value={enhet.etasje}
                              onChange={(e) => updateEnhet(enhet.id, 'etasje', e.target.value)}
                              className="input py-1 px-2 w-full text-sm"
                            />
                          </td>
                          <td className="py-1 px-2">
                            <input
                              type="text"
                              value={enhet.kart}
                              onChange={(e) => updateEnhet(enhet.id, 'kart', e.target.value)}
                              className="input py-1 px-2 w-full text-sm"
                            />
                          </td>
                          <td className="py-1 px-1">
                            <button
                              onClick={() => copyToClipboard(
                                `${enhet.switch1}${enhet.switch2}${enhet.switch3}${enhet.switch4}${enhet.switch5}${enhet.switch6}`,
                                enhet.id
                              )}
                              className="p-1 text-gray-400 hover:text-primary transition-colors"
                              title="Kopier DIP-konfigurasjon"
                            >
                              {copiedId === enhet.id ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}

          {enheter.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">Ingen enheter konfigurert ennå</p>
              <button
                onClick={addBase}
                className="btn-primary mt-4"
              >
                Legg til første base
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
