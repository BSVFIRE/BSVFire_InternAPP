import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Plus, Save, Trash2, ArrowUpDown, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DetektorlistePreview } from './DetektorlistePreview'

interface DetektorlisteEditorProps {
  detektorlisteId?: string
  kundeId: string
  anleggId: string
  kundeNavn: string
  anleggNavn: string
  onBack: () => void
}

interface DetektorItem {
  id?: string
  adresse: string
  type: string
  plassering: string
  kart: string
  akse: string
  etasje: string
  kommentar: string
}

const detektorTyper = [
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

export function DetektorlisteEditor({
  detektorlisteId,
  kundeId,
  anleggId,
  kundeNavn,
  anleggNavn,
  onBack
}: DetektorlisteEditorProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  
  // Header fields
  const [revisjon, setRevisjon] = useState('1.0')
  const [dato, setDato] = useState(new Date().toISOString().split('T')[0])
  const [servicetekniker, setServicetekniker] = useState('')
  const [kundeadresse, setKundeadresse] = useState('')
  const [kontaktperson, setKontaktperson] = useState('')
  const [mobil, setMobil] = useState('')
  const [epost, setEpost] = useState('')
  const [annet, setAnnet] = useState('')
  
  // Detektorer
  const [detektorer, setDetektorer] = useState<DetektorItem[]>([])

  useEffect(() => {
    if (detektorlisteId) {
      loadDetektorliste()
    } else {
      // Ny liste - legg til noen tomme rader
      addDetektorRader(3)
    }
  }, [detektorlisteId])

  // Autolagring med debounce
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Ikke autolagre hvis vi nettopp lastet data
    if (loading) return

    saveTimeoutRef.current = setTimeout(() => {
      if (servicetekniker) {
        autoSave()
      }
    }, 3000) // 3 sekunder debounce

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [revisjon, dato, servicetekniker, kundeadresse, kontaktperson, mobil, epost, annet, detektorer])

  async function loadDetektorliste() {
    try {
      setLoading(true)
      
      // Hent detektorliste header
      const { data: liste, error: listeError } = await supabase
        .from('detektorlister')
        .select('*')
        .eq('id', detektorlisteId)
        .single()

      if (listeError) throw listeError

      // Sett header-felter
      setRevisjon(liste.revisjon || '1.0')
      setDato(liste.dato?.split('T')[0] || new Date().toISOString().split('T')[0])
      setServicetekniker(liste.service_ingeniør || '')
      setKundeadresse(liste.kundeadresse || '')
      setKontaktperson(liste.kontakt_person || '')
      setMobil(liste.mobil || '')
      setEpost(liste.epost || '')
      setAnnet(liste.annet || '')

      // Hent detektorer
      const { data: items, error: itemsError } = await supabase
        .from('detektor_items')
        .select('*')
        .eq('detektorliste_id', detektorlisteId)
        .order('id')

      if (itemsError) throw itemsError

      setDetektorer(items || [])
      
      // Legg til noen tomme rader hvis det er få detektorer
      if ((items?.length || 0) < 3) {
        addDetektorRader(3 - (items?.length || 0))
      }
    } catch (error) {
      console.error('Feil ved lasting av detektorliste:', error)
      alert('Kunne ikke laste detektorliste')
    } finally {
      setLoading(false)
    }
  }

  function addDetektorRader(antall: number = 1) {
    const nyeRader: DetektorItem[] = Array.from({ length: antall }, () => ({
      adresse: '',
      type: '',
      plassering: '',
      kart: '',
      akse: '',
      etasje: '',
      kommentar: ''
    }))
    setDetektorer([...detektorer, ...nyeRader])
  }

  function deleteDetektorRad(index: number) {
    const nyeDetektorer = detektorer.filter((_, i) => i !== index)
    setDetektorer(nyeDetektorer)
  }

  async function autoSave() {
    if (!servicetekniker || saving) return

    try {
      setSaving(true)

      const detektorlisteData = {
        kunde_id: kundeId,
        anlegg_id: anleggId,
        revisjon,
        dato,
        service_ingeniør: servicetekniker,
        kundeadresse,
        kontakt_person: kontaktperson,
        mobil,
        epost,
        annet,
        status: 'Utkast'
      }

      let listeId = detektorlisteId

      if (detektorlisteId) {
        // Oppdater eksisterende
        const { error } = await supabase
          .from('detektorlister')
          .update(detektorlisteData)
          .eq('id', detektorlisteId)
        
        if (error) throw error
      } else {
        // Opprett ny (kun første gang)
        const { data, error } = await supabase
          .from('detektorlister')
          .insert([{
            ...detektorlisteData,
            opprettet_dato: new Date().toISOString()
          }])
          .select()
          .single()

        if (error) throw error
        listeId = data.id
        // Oppdater detektorlisteId for fremtidige autolagringer
        window.history.replaceState({}, '', `?id=${listeId}`)
      }

      // Slett og re-insert detektorer
      if (listeId) {
        const { error: deleteError } = await supabase
          .from('detektor_items')
          .delete()
          .eq('detektorliste_id', listeId)
        
        if (deleteError) throw deleteError

        const detektorerMedData = detektorer
          .filter(d => d.adresse.trim() !== '')
          .map(d => ({
            detektorliste_id: listeId,
            adresse: d.adresse,
            type: d.type,
            plassering: d.plassering,
            kart: d.kart,
            akse: d.akse,
            etasje: d.etasje,
            kommentar: d.kommentar
          }))

        if (detektorerMedData.length > 0) {
          const { error: insertError } = await supabase
            .from('detektor_items')
            .insert(detektorerMedData)
          
          if (insertError) throw insertError
        }
      }

      setLastSaved(new Date())
    } catch (error: any) {
      console.error('Feil ved autolagring:', error)
      
      // Check for RLS policy error
      if (error?.code === '42501') {
        console.error('Tilgangsfeil: Row Level Security policy mangler. Kontakt administrator.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function lagreDetektorliste() {
    if (!servicetekniker) {
      alert('Servicetekniker er påkrevd')
      return
    }

    try {
      setSaving(true)

      const detektorlisteData = {
        kunde_id: kundeId,
        anlegg_id: anleggId,
        revisjon,
        dato,
        service_ingeniør: servicetekniker,
        kundeadresse,
        kontakt_person: kontaktperson,
        mobil,
        epost,
        annet,
        status: 'Utkast'
      }

      let listeId = detektorlisteId

      if (detektorlisteId) {
        // Oppdater eksisterende
        const { error } = await supabase
          .from('detektorlister')
          .update(detektorlisteData)
          .eq('id', detektorlisteId)
        
        if (error) throw error
      } else {
        // Opprett ny
        const { data, error } = await supabase
          .from('detektorlister')
          .insert([{
            ...detektorlisteData,
            opprettet_dato: new Date().toISOString()
          }])
          .select()
          .single()

        if (error) throw error
        listeId = data.id
      }

      // Slett eksisterende detektorer hvis vi oppdaterer
      if (detektorlisteId) {
        const { error: deleteError } = await supabase
          .from('detektor_items')
          .delete()
          .eq('detektorliste_id', detektorlisteId)
        
        if (deleteError) throw deleteError
      }

      // Lagre detektorer (kun de med adresse)
      const detektorerMedData = detektorer
        .filter(d => d.adresse.trim() !== '')
        .map(d => ({
          detektorliste_id: listeId,
          adresse: d.adresse,
          type: d.type,
          plassering: d.plassering,
          kart: d.kart,
          akse: d.akse,
          etasje: d.etasje,
          kommentar: d.kommentar
        }))

      if (detektorerMedData.length > 0) {
        const { error: insertError } = await supabase
          .from('detektor_items')
          .insert(detektorerMedData)
        
        if (insertError) throw insertError
      }

      alert('Detektorliste lagret!')
      onBack()
    } catch (error: any) {
      console.error('Feil ved lagring:', error)
      
      // Check for RLS policy error
      if (error?.code === '42501') {
        alert('Tilgangsfeil: Du har ikke tillatelse til å lagre. Kontakt administrator for å fikse Row Level Security policies.')
      } else {
        alert('Kunne ikke lagre detektorliste: ' + (error?.message || 'Ukjent feil'))
      }
    } finally {
      setSaving(false)
    }
  }

  // Funksjon for å sortere detektorer
  function sorterDetektorer(sortType: 'adresse' | 'type' | 'plassering' | 'etasje') {
    const sorterte = [...detektorer].sort((a, b) => {
      switch (sortType) {
        case 'adresse':
          return (a.adresse || '').localeCompare(b.adresse || '', 'nb-NO', { numeric: true })
        case 'type':
          return (a.type || '').localeCompare(b.type || '', 'nb-NO')
        case 'plassering':
          return (a.plassering || '').localeCompare(b.plassering || '', 'nb-NO')
        case 'etasje':
          return (a.etasje || '').localeCompare(b.etasje || '', 'nb-NO', { numeric: true })
        default:
          return 0
      }
    })
    setDetektorer(sorterte)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Hvis vi viser forhåndsvisning
  if (showPreview) {
    const detektorerMedData = detektorer.filter(d => d.adresse.trim() !== '')
    
    return (
      <DetektorlistePreview
        kundeNavn={kundeNavn}
        anleggNavn={anleggNavn}
        anleggAdresse={kundeadresse}
        revisjon={revisjon}
        dato={dato}
        servicetekniker={servicetekniker}
        kontaktperson={kontaktperson}
        mobil={mobil}
        epost={epost}
        annet={annet}
        detektorer={detektorerMedData}
        onBack={() => setShowPreview(false)}
      />
    )
  }

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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {detektorlisteId ? 'Rediger' : 'Ny'} Detektorliste
            </h1>
            <p className="text-gray-600 dark:text-gray-400">{kundeNavn} - {anleggNavn}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Status indikatorer */}
          {saving && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-blue-500">Lagrer...</span>
            </div>
          )}
          {lastSaved && !saving && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
              <span className="text-sm text-green-500">
                Lagret {lastSaved.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
          <button
            onClick={() => setShowPreview(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <FileText className="w-5 h-5" />
            Forhåndsvisning
          </button>
          <button
            onClick={lagreDetektorliste}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Lagrer...' : 'Lagre'}
          </button>
        </div>
      </div>

      {/* Header informasjon */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Informasjon</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Revisjon *
            </label>
            <input
              type="text"
              value={revisjon}
              onChange={(e) => setRevisjon(e.target.value)}
              className="input"
              placeholder="1.0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Dato *
            </label>
            <input
              type="date"
              value={dato}
              onChange={(e) => setDato(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Servicetekniker *
            </label>
            <input
              type="text"
              value={servicetekniker}
              onChange={(e) => setServicetekniker(e.target.value)}
              className="input"
              placeholder="Navn på servicetekniker"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Kundeadresse
            </label>
            <input
              type="text"
              value={kundeadresse}
              onChange={(e) => setKundeadresse(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Kontaktperson
            </label>
            <input
              type="text"
              value={kontaktperson}
              onChange={(e) => setKontaktperson(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mobil
            </label>
            <input
              type="text"
              value={mobil}
              onChange={(e) => setMobil(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              E-post
            </label>
            <input
              type="email"
              value={epost}
              onChange={(e) => setEpost(e.target.value)}
              className="input"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Annet
          </label>
          <textarea
            value={annet}
            onChange={(e) => setAnnet(e.target.value)}
            className="input"
            rows={2}
          />
        </div>
      </div>

      {/* Detektorer */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Detektorer ({detektorer.length})
          </h2>
          <div className="flex items-center gap-3">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  sorterDetektorer(e.target.value as any)
                }
                e.target.value = '' // Reset til "Velg sortering"
              }}
              className="input py-2"
              defaultValue=""
            >
              <option value="">Velg sortering...</option>
              <option value="adresse">Sorter: Adresse</option>
              <option value="type">Sorter: Type</option>
              <option value="plassering">Sorter: Plassering</option>
              <option value="etasje">Sorter: Etasje</option>
            </select>
            <button
              onClick={() => addDetektorRader(5)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Legg til 5 rader
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left py-3 px-2 text-gray-600 dark:text-gray-400 font-medium w-32">
                  <button
                    onClick={() => sorterDetektorer('adresse')}
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    Adresse
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="text-left py-3 px-2 text-gray-600 dark:text-gray-400 font-medium w-40">
                  <button
                    onClick={() => sorterDetektorer('type')}
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    Type
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="text-left py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">
                  <button
                    onClick={() => sorterDetektorer('plassering')}
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    Plassering
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="text-left py-3 px-2 text-gray-600 dark:text-gray-400 font-medium w-24">Kart</th>
                <th className="text-left py-3 px-2 text-gray-600 dark:text-gray-400 font-medium w-24">Akse</th>
                <th className="text-left py-3 px-2 text-gray-600 dark:text-gray-400 font-medium w-24">
                  <button
                    onClick={() => sorterDetektorer('etasje')}
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    Etasje
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="text-left py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Kommentar</th>
                <th className="text-right py-3 px-2 text-gray-600 dark:text-gray-400 font-medium w-16"></th>
              </tr>
            </thead>
            <tbody>
              {detektorer.map((detektor, index) => (
                <tr key={index} className="border-b border-gray-800 hover:bg-dark-200">
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={detektor.adresse}
                      onChange={(e) => {
                        const nyeDetektorer = [...detektorer]
                        nyeDetektorer[index].adresse = e.target.value
                        setDetektorer(nyeDetektorer)
                      }}
                      className="input py-1 px-2 text-sm w-full"
                      placeholder="001"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <select
                      value={detektor.type}
                      onChange={(e) => {
                        const nyeDetektorer = [...detektorer]
                        nyeDetektorer[index].type = e.target.value
                        setDetektorer(nyeDetektorer)
                      }}
                      className="input py-1 px-2 text-sm w-full"
                    >
                      <option value="">Velg type</option>
                      {detektorTyper.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={detektor.plassering}
                      onChange={(e) => {
                        const nyeDetektorer = [...detektorer]
                        nyeDetektorer[index].plassering = e.target.value
                        setDetektorer(nyeDetektorer)
                      }}
                      className="input py-1 px-2 text-sm w-full"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={detektor.kart}
                      onChange={(e) => {
                        const nyeDetektorer = [...detektorer]
                        nyeDetektorer[index].kart = e.target.value
                        setDetektorer(nyeDetektorer)
                      }}
                      className="input py-1 px-2 text-sm w-full"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={detektor.akse}
                      onChange={(e) => {
                        const nyeDetektorer = [...detektorer]
                        nyeDetektorer[index].akse = e.target.value
                        setDetektorer(nyeDetektorer)
                      }}
                      className="input py-1 px-2 text-sm w-full"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={detektor.etasje}
                      onChange={(e) => {
                        const nyeDetektorer = [...detektorer]
                        nyeDetektorer[index].etasje = e.target.value
                        setDetektorer(nyeDetektorer)
                      }}
                      className="input py-1 px-2 text-sm w-full"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={detektor.kommentar}
                      onChange={(e) => {
                        const nyeDetektorer = [...detektorer]
                        nyeDetektorer[index].kommentar = e.target.value
                        setDetektorer(nyeDetektorer)
                      }}
                      className="input py-1 px-2 text-sm w-full"
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <button
                      onClick={() => deleteDetektorRad(index)}
                      className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      title="Slett rad"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
