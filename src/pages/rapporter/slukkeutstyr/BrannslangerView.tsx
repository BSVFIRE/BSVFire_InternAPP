import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Plus, Save, Trash2, Shield, Search, Maximize2, Minimize2, Eye, FileDown } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { BrannslangerPreview } from '../BrannslangerPreview'
import { useAuthStore } from '@/store/authStore'

interface Brannslange {
  id?: string
  anlegg_id: string
  slangenummer?: string | null
  plassering?: string | null
  etasje?: string | null
  produsent?: string | null
  modell?: string | null
  brannklasse?: string | null
  produksjonsaar?: string | null
  sistekontroll?: string | null
  trykktest?: string | null
  status?: string[] | null
  type_avvik?: string[] | null
  avvik?: string | null
}

interface BrannslangerViewProps {
  anleggId: string
  kundeNavn: string
  anleggNavn: string
  onBack: () => void
}

const statusAlternativer = [
  'OK',
  'Ikke funnet',
  'Ikke tilkomst',
  'Skade på slange',
  'Feil strålerør',
  'Ikke vann',
  'Rust i skap',
  'Mangler skilt',
  'Slange feil vei',
  'Lekkasje',
  'Må trykktestes',
  'Skade tilførselsslange',
  'Lekkasje nav',
  'Lekkasje slange',
  'Lekkasje Strålerør'
]

const modellAlternativer = [
  '',
  '30M 19mm',
  '30M 25mm',
  '25M 19mm',
  '25M 25mm',
  'Husbrannslange',
  'Bruksslange',
]

const brannklasseAlternativer = [
  'A'
]

const etasjeAlternativer = [
  '',
  ...Array.from({ length: 15 }, (_, i) => `${i - 2} Etg`),
  'Ukjent'
]

export function BrannslangerView({ anleggId, kundeNavn, anleggNavn, onBack }: BrannslangerViewProps) {
  const { user } = useAuthStore()
  const [slanger, setSlanger] = useState<Brannslange[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [antallNye, setAntallNye] = useState(1)
  const [sortBy, setSortBy] = useState<'slangenummer' | 'plassering' | 'etasje' | 'modell' | 'status'>('slangenummer')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingChanges, setPendingChanges] = useState(0)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const localStorageKey = `brannslanger_offline_${anleggId}`
  const [editingStatusIndex, setEditingStatusIndex] = useState<number | null>(null)
  const [previewPdf, setPreviewPdf] = useState<{ blob: Blob; fileName: string } | null>(null)

  useEffect(() => {
    loadSlanger()
  }, [anleggId])

  // Online/offline event listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      syncOfflineData()
    }
    
    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Sjekk om det er pending data ved mount
    const stored = localStorage.getItem(localStorageKey)
    if (stored && navigator.onLine) {
      syncOfflineData()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [anleggId])

  // Autolagring med debounce
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      autoSave()
    }, 3000) // 3 sekunder debounce

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [slanger])

  async function loadSlanger() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('anleggsdata_brannslanger')
        .select('*')
        .eq('anlegg_id', anleggId)
        .order('slangenummer', { ascending: true, nullsFirst: false })

      if (error) throw error
      
      // Konverter status fra string til array hvis nødvendig
      const processedData = (data || []).map(slange => ({
        ...slange,
        status: Array.isArray(slange.status) 
          ? slange.status 
          : slange.status 
            ? [slange.status] 
            : []
      }))
      
      setSlanger(processedData)
    } catch (error) {
      console.error('Feil ved lasting av brannslanger:', error)
      alert('Kunne ikke laste brannslanger')
    } finally {
      setLoading(false)
    }
  }

  function leggTilNye() {
    const nyeSlanger: Brannslange[] = Array.from({ length: antallNye }, () => ({
      anlegg_id: anleggId,
      slangenummer: '',
      plassering: '',
      etasje: '',
      produsent: '',
      modell: '',
      brannklasse: 'A',
      produksjonsaar: '',
      sistekontroll: '',
      trykktest: '',
      status: [],
      type_avvik: [],
      avvik: ''
    }))

    setSlanger([...slanger, ...nyeSlanger])
    setAntallNye(1)
  }

  async function autoSave() {
    // Ikke autolagre hvis vi nettopp lastet data eller er i loading-state
    if (loading || slanger.length === 0) return

    // Hvis offline, lagre til localStorage
    if (!navigator.onLine) {
      saveToLocalStorage()
      return
    }

    try {
      setSaving(true)

      for (const slange of slanger) {
        // Konverter status array til string (første element) for databasen
        const dataToSave = {
          ...slange,
          status: Array.isArray(slange.status) && slange.status.length > 0
            ? slange.status[0]
            : slange.status && slange.status.length > 0
              ? slange.status[0]
              : 'OK'
        }

        if (slange.id) {
          // Update eksisterende
          const { error } = await supabase
            .from('anleggsdata_brannslanger')
            .update(dataToSave)
            .eq('id', slange.id)
          
          if (error) throw error
        } else if (slange.slangenummer || slange.plassering) {
          // Insert nye (kun hvis de har data)
          const { error } = await supabase
            .from('anleggsdata_brannslanger')
            .insert([{ ...dataToSave, anlegg_id: anleggId }])
          
          if (error) throw error
        }
      }

      setLastSaved(new Date())
      // Fjern offline data hvis lagring var vellykket
      localStorage.removeItem(localStorageKey)
      setPendingChanges(0)
    } catch (error) {
      console.error('Feil ved autolagring:', error)
      // Ved feil, lagre til localStorage som backup
      saveToLocalStorage()
    } finally {
      setSaving(false)
    }
  }

  function saveToLocalStorage() {
    try {
      localStorage.setItem(localStorageKey, JSON.stringify(slanger))
      setPendingChanges(slanger.length)
      setLastSaved(new Date())
    } catch (error) {
      console.error('Feil ved lagring til localStorage:', error)
    }
  }

  async function syncOfflineData() {
    const stored = localStorage.getItem(localStorageKey)
    if (!stored) return

    try {
      setSaving(true)
      const offlineData: Brannslange[] = JSON.parse(stored)

      for (const slange of offlineData) {
        // Konverter status array til string for databasen
        const dataToSave = {
          ...slange,
          status: Array.isArray(slange.status) && slange.status.length > 0
            ? slange.status[0]
            : 'OK'
        }

        if (slange.id) {
          await supabase
            .from('anleggsdata_brannslanger')
            .update(dataToSave)
            .eq('id', slange.id)
        } else if (slange.slangenummer || slange.plassering) {
          await supabase
            .from('anleggsdata_brannslanger')
            .insert([{ ...dataToSave, anlegg_id: anleggId }])
        }
      }

      localStorage.removeItem(localStorageKey)
      setPendingChanges(0)
      setLastSaved(new Date())
      await loadSlanger()
    } catch (error) {
      console.error('Feil ved synkronisering:', error)
    } finally {
      setSaving(false)
    }
  }

  async function lagreAlle() {
    try {
      setLoading(true)

      for (const slange of slanger) {
        // Konverter status array til string (første element) for databasen
        const dataToSave = {
          ...slange,
          status: Array.isArray(slange.status) && slange.status.length > 0
            ? slange.status[0]
            : slange.status && slange.status.length > 0
              ? slange.status[0]
              : 'OK'
        }
        
        if (slange.id) {
          // Update eksisterende
          await supabase
            .from('anleggsdata_brannslanger')
            .update(dataToSave)
            .eq('id', slange.id)
        } else if (slange.slangenummer || slange.plassering) {
          // Insert nye (kun hvis de har data)
          await supabase
            .from('anleggsdata_brannslanger')
            .insert([{ ...dataToSave, anlegg_id: anleggId }])
        }
      }

      alert('Alle brannslanger lagret!')
      await loadSlanger()
    } catch (error) {
      console.error('Feil ved lagring:', error)
      alert('Kunne ikke lagre alle brannslanger')
    } finally {
      setLoading(false)
    }
  }

  async function deleteSlange(id: string) {
    if (!confirm('Er du sikker på at du vil slette denne brannslangen?')) return

    try {
      const { error } = await supabase
        .from('anleggsdata_brannslanger')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadSlanger()
    } catch (error) {
      console.error('Feil ved sletting:', error)
      alert('Kunne ikke slette brannslange')
    }
  }

  async function genererRapport(forhandsvisning: boolean = false) {
    try {
      setLoading(true)

      // Hent primær kontaktperson for anlegget
      const { data: kontaktData, error: kontaktError } = await supabase
        .from('kontaktperson')
        .select('*')
        .eq('anleggsnr', anleggId)
        .eq('primaer', true)
        .maybeSingle()

      if (kontaktError) {
        console.error('Feil ved henting av kontaktperson:', kontaktError)
      }

      // Hent innlogget bruker (tekniker) data
      const { data: tekniker, error: teknikerError } = await supabase
        .from('ansatte')
        .select('navn, telefon, epost')
        .eq('bruker_id', user?.id)
        .maybeSingle()

      if (teknikerError) {
        console.error('Feil ved henting av tekniker:', teknikerError)
      }

      const doc = new jsPDF()
      let yPos = 20

      // Logo
      try {
        const logoImg = new Image()
        logoImg.src = '/bsv-logo.png'
        await new Promise((resolve, reject) => {
          logoImg.onload = resolve
          logoImg.onerror = reject
        })
        doc.addImage(logoImg, 'PNG', 20, yPos, 40, 15)
        yPos += 25
      } catch (error) {
        console.error('Kunne ikke laste logo:', error)
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(41, 128, 185)
        doc.text('BSV FIRE', 20, yPos)
        doc.setTextColor(0)
        yPos += 15
      }

      // Tittel
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('RAPPORT - BRANNSLANGER', 20, yPos)
      yPos += 12

      // Anleggsinformasjon
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(`Kunde: ${kundeNavn}`, 20, yPos)
      yPos += 6
      doc.text(`Anlegg: ${anleggNavn}`, 20, yPos)
      yPos += 6
      
      const idag = new Date()
      doc.text(`Dato: ${idag.toLocaleDateString('nb-NO')}`, 20, yPos)
      yPos += 6
      
      // Neste kontroll (12 måneder fram)
      const nesteKontroll = new Date(idag)
      nesteKontroll.setMonth(nesteKontroll.getMonth() + 12)
      doc.text(`Neste kontroll: ${nesteKontroll.toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' })}`, 20, yPos)
      yPos += 10

      // Kontaktperson og tekniker
      if (kontaktData?.navn) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text('Kontaktperson:', 20, yPos)
        doc.setFont('helvetica', 'normal')
        yPos += 5
        doc.text(kontaktData.navn, 20, yPos)
        if (kontaktData.telefon) {
          yPos += 4
          doc.text(`Tlf: ${kontaktData.telefon}`, 20, yPos)
        }
        if (kontaktData.epost) {
          yPos += 4
          doc.text(`E-post: ${kontaktData.epost}`, 20, yPos)
        }
        yPos += 8
      }

      if (tekniker?.navn) {
        doc.setFont('helvetica', 'bold')
        doc.text('Tekniker:', 20, yPos)
        doc.setFont('helvetica', 'normal')
        yPos += 5
        doc.text(tekniker.navn, 20, yPos)
        if (tekniker.telefon) {
          yPos += 4
          doc.text(`Tlf: ${tekniker.telefon}`, 20, yPos)
        }
        if (tekniker.epost) {
          yPos += 4
          doc.text(`E-post: ${tekniker.epost}`, 20, yPos)
        }
        yPos += 8
      }

      // Statistikk
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('STATISTIKK', 20, yPos)
      yPos += 6
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Totalt antall: ${totalt}`, 20, yPos)
      yPos += 5
      doc.text(`OK: ${ok}`, 20, yPos)
      yPos += 5
      doc.text(`Må trykktestes: ${trykktestNaa}`, 20, yPos)
      yPos += 5
      doc.text(`Lekkasje: ${lekkasje}`, 20, yPos)

      // Ny side for tabell
      doc.addPage()
      yPos = 20

      // Sorter etter slangenummer
      const sortedForPdf = [...slanger].sort((a, b) => {
        const numA = parseInt(a.slangenummer || '0') || 0
        const numB = parseInt(b.slangenummer || '0') || 0
        return numA - numB
      })

      // Tabell
      autoTable(doc, {
        startY: yPos,
        head: [['Nr', 'Plassering', 'Etasje', 'Produsent', 'Modell', 'Klasse', 'År', 'Siste', 'Trykktest', 'Status']],
        body: sortedForPdf.map(s => [
          s.slangenummer || '-',
          s.plassering || '-',
          s.etasje || '-',
          s.produsent || '-',
          s.modell || '-',
          s.brannklasse || '-',
          s.produksjonsaar || '-',
          s.sistekontroll || '-',
          s.trykktest || '-',
          s.status?.[0] || 'OK'
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: 10, right: 10, bottom: 25 },
      })

      const pdfBlob = doc.output('blob')
      const fileName = `Rapport_Brannslanger_${new Date().getFullYear()}_${anleggNavn.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`

      if (forhandsvisning) {
        setPreviewPdf({ blob: pdfBlob, fileName })
      } else {
        // Lagre til Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('rapporter')
          .upload(`${anleggId}/${fileName}`, pdfBlob, {
            contentType: 'application/pdf',
            upsert: true
          })

        if (uploadError) throw uploadError

        // Last ned PDF
        doc.save(fileName)
        alert('Rapport generert og lagret!')
      }
    } catch (error) {
      console.error('Feil ved generering av rapport:', error)
      alert('Kunne ikke generere rapport')
    } finally {
      setLoading(false)
    }
  }

  function handleStatusChange(index: number, status: string) {
    // Finn den faktiske slangen i sortedSlanger
    const slange = sortedSlanger[index]
    if (!slange) return

    // Finn index i original slanger array
    const originalIndex = slanger.findIndex(s => s.id ? s.id === slange.id : s === slange)
    if (originalIndex === -1) return

    const nyeSlanger = [...slanger]
    const currentStatus = nyeSlanger[originalIndex].status || []
    
    if (currentStatus.includes(status)) {
      nyeSlanger[originalIndex].status = currentStatus.filter((s: string) => s !== status)
    } else {
      nyeSlanger[originalIndex].status = [...currentStatus, status]
    }
    
    setSlanger(nyeSlanger)
  }

  const filteredSlanger = slanger.filter(s =>
    (s.slangenummer?.toString().toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (s.plassering?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (s.produsent?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  )

  // Sortering
  const sortedSlanger = [...filteredSlanger].sort((a, b) => {
    switch (sortBy) {
      case 'slangenummer':
        return (a.slangenummer?.toString() || '').localeCompare(b.slangenummer?.toString() || '', 'nb-NO', { numeric: true })
      case 'plassering':
        return (a.plassering || '').localeCompare(b.plassering || '', 'nb-NO')
      case 'etasje':
        return (a.etasje || '').localeCompare(b.etasje || '', 'nb-NO', { numeric: true })
      case 'modell':
        return (a.modell || '').localeCompare(b.modell || '', 'nb-NO')
      case 'status':
        const aStatus = a.status?.[0] || ''
        const bStatus = b.status?.[0] || ''
        return aStatus.localeCompare(bStatus, 'nb-NO')
      default:
        return 0
    }
  })

  // Beregn statistikk
  const totalt = slanger.length
  const ok = slanger.filter(s => s.status?.includes('OK')).length
  const trykktestNaa = slanger.filter(s => s.status?.includes('Må trykktestes')).length
  const lekkasje = slanger.filter(s => 
    s.status?.some((st: string) => st.includes('Lekkasje'))
  ).length

  // Vis forhåndsvisning hvis PDF er generert
  if (previewPdf) {
    return (
      <BrannslangerPreview
        pdfBlob={previewPdf.blob}
        fileName={previewPdf.fileName}
        onBack={() => setPreviewPdf(null)}
        onSave={async () => {
          const { error: uploadError } = await supabase.storage
            .from('rapporter')
            .upload(`${anleggId}/${previewPdf.fileName}`, previewPdf.blob, {
              contentType: 'application/pdf',
              upsert: true
            })

          if (uploadError) throw uploadError
        }}
      />
    )
  }

  // Fullskjerm-visning
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-dark-200 overflow-auto">
        <div className="min-h-screen p-4">
          {/* Header med lukkeknapp */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-800">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-white">
                Brannslanger - {kundeNavn} - {anleggNavn}
                <span className="ml-3 text-lg text-gray-400 font-normal">
                  ({sortedSlanger.length} {sortedSlanger.length === 1 ? 'enhet' : 'enheter'})
                </span>
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={leggTilNye}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Legg til ({antallNye})
              </button>
              <button
                onClick={lagreAlle}
                className="btn-primary flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                Lagre alle
              </button>
              <button
                onClick={() => setIsFullscreen(false)}
                className="p-3 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                title="Lukk fullskjerm"
              >
                <Minimize2 className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Tabell i fullskjerm */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-400">Laster brannslanger...</p>
            </div>
          ) : sortedSlanger.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Ingen brannslanger funnet</p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-dark-100 rounded-lg">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium w-24">Nr</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Plassering</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium w-24">Etasje</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium w-32">Produsent</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium w-40">Modell</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium w-20">Klasse</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium w-24">År</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium w-28">Siste kontroll</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium w-28">Trykktest</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium w-32">Status</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium w-20">Handlinger</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSlanger.map((slange, index) => (
                    <tr
                      key={slange.id || `new-${index}`}
                      className="border-b border-gray-800 hover:bg-dark-200 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                            <Shield className="w-5 h-5 text-blue-500" />
                          </div>
                          <input
                            type="text"
                            value={slange.slangenummer || ''}
                            onChange={(e) => {
                              const nyeSlanger = [...slanger]
                              nyeSlanger[index].slangenummer = e.target.value
                              setSlanger(nyeSlanger)
                            }}
                            className="input py-1 px-2 text-sm w-full"
                            placeholder="001"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={slange.plassering || ''}
                          onChange={(e) => {
                            const nyeSlanger = [...slanger]
                            nyeSlanger[index].plassering = e.target.value
                            setSlanger(nyeSlanger)
                          }}
                          className="input py-1 px-2 text-sm w-full"
                          placeholder="Gang"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={slange.etasje || ''}
                          onChange={(e) => {
                            const nyeSlanger = [...slanger]
                            nyeSlanger[index].etasje = e.target.value
                            setSlanger(nyeSlanger)
                          }}
                          className="input py-1 px-2 text-sm w-full"
                        >
                          {etasjeAlternativer.map((etasje) => (
                            <option key={etasje} value={etasje}>
                              {etasje || '-- Velg --'}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={slange.produsent || ''}
                          onChange={(e) => {
                            const nyeSlanger = [...slanger]
                            nyeSlanger[index].produsent = e.target.value
                            setSlanger(nyeSlanger)
                          }}
                          className="input py-1 px-2 text-sm w-full"
                          placeholder="NOHA"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={slange.modell || ''}
                          onChange={(e) => {
                            const nyeSlanger = [...slanger]
                            nyeSlanger[index].modell = e.target.value
                            setSlanger(nyeSlanger)
                          }}
                          className="input py-1 px-2 text-sm w-full"
                        >
                          {modellAlternativer.map((modell) => (
                            <option key={modell} value={modell}>
                              {modell || '-- Velg --'}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={slange.brannklasse || ''}
                          onChange={(e) => {
                            const nyeSlanger = [...slanger]
                            nyeSlanger[index].brannklasse = e.target.value
                            setSlanger(nyeSlanger)
                          }}
                          className="input py-1 px-2 text-sm w-full"
                        >
                          {brannklasseAlternativer.map((klasse) => (
                            <option key={klasse} value={klasse}>
                              {klasse}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={slange.produksjonsaar || ''}
                          onChange={(e) => {
                            const nyeSlanger = [...slanger]
                            nyeSlanger[index].produksjonsaar = e.target.value
                            setSlanger(nyeSlanger)
                          }}
                          className="input py-1 px-2 text-sm w-full"
                          placeholder="2024"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={slange.sistekontroll || ''}
                          onChange={(e) => {
                            const nyeSlanger = [...slanger]
                            nyeSlanger[index].sistekontroll = e.target.value
                            setSlanger(nyeSlanger)
                          }}
                          className="input py-1 px-2 text-sm w-full"
                          placeholder="2025"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={slange.trykktest || ''}
                          onChange={(e) => {
                            const nyeSlanger = [...slanger]
                            nyeSlanger[index].trykktest = e.target.value
                            setSlanger(nyeSlanger)
                          }}
                          className="input py-1 px-2 text-sm w-full"
                          placeholder="2025"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setEditingStatusIndex(index)}
                          className="flex flex-wrap gap-1 hover:bg-dark-200 p-2 rounded transition-colors w-full text-left"
                        >
                          {slange.status && slange.status.length > 0 ? (
                            slange.status.map((st) => (
                              <span
                                key={st}
                                className="px-2 py-1 bg-primary/20 text-primary rounded text-xs"
                              >
                                {st}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-500 text-xs">Klikk for å velge status</span>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {slange.id && (
                            <button
                              onClick={() => deleteSlange(slange.id!)}
                              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Slett"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Status redigerings-modal */}
          {editingStatusIndex !== null && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingStatusIndex(null)}>
              <div className="bg-dark-100 rounded-lg p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-white mb-4">Velg status</h3>
                <div className="grid grid-cols-2 gap-2 mb-6">
                  {statusAlternativer.map((status) => {
                    const isSelected = sortedSlanger[editingStatusIndex]?.status?.includes(status)
                    return (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(editingStatusIndex, status)}
                        className={`px-4 py-3 rounded-lg text-sm transition-colors text-left ${
                          isSelected
                            ? 'bg-primary text-white'
                            : 'bg-dark-200 text-gray-400 hover:bg-dark-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected ? 'border-white bg-white' : 'border-gray-600'
                          }`}>
                            {isSelected && (
                              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span>{status}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setEditingStatusIndex(null)}
                    className="px-4 py-2 bg-dark-200 text-gray-400 rounded-lg hover:bg-dark-300 transition-colors"
                  >
                    Lukk
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-400 hover:text-white hover:bg-dark-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Brannslanger</h1>
            <p className="text-gray-400">{kundeNavn} - {anleggNavn}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Status indikatorer */}
          {!isOnline && (
            <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-yellow-500">Offline-modus</span>
            </div>
          )}
          {pendingChanges > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <span className="text-sm text-orange-500">{pendingChanges} endringer venter</span>
            </div>
          )}
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
            onClick={() => genererRapport(true)}
            disabled={loading || slanger.length === 0}
            className="btn-secondary flex items-center gap-2"
          >
            <Eye className="w-5 h-5" />
            Forhåndsvisning
          </button>
          <button
            onClick={() => genererRapport(false)}
            disabled={loading || slanger.length === 0}
            className="btn-secondary flex items-center gap-2"
          >
            <FileDown className="w-5 h-5" />
            Generer PDF
          </button>
          <button
            onClick={lagreAlle}
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            Lagre alle
          </button>
        </div>
      </div>

      {/* Statistikk */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card bg-blue-500/10 border-blue-500/20">
          <p className="text-sm text-gray-400 mb-1">Totalt</p>
          <p className="text-2xl font-bold text-white">{totalt}</p>
        </div>
        <div className="card bg-green-500/10 border-green-500/20">
          <p className="text-sm text-gray-400 mb-1">OK</p>
          <p className="text-2xl font-bold text-green-400">{ok}</p>
        </div>
        <div className="card bg-yellow-500/10 border-yellow-500/20">
          <p className="text-sm text-gray-400 mb-1">Trykktest</p>
          <p className="text-2xl font-bold text-yellow-400">{trykktestNaa}</p>
        </div>
        <div className="card bg-red-500/10 border-red-500/20">
          <p className="text-sm text-gray-400 mb-1">Lekkasje</p>
          <p className="text-2xl font-bold text-red-400">{lekkasje}</p>
        </div>
      </div>

      {/* Søk, sortering og legg til */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Søk etter brannslange..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input w-full pl-10"
            />
          </div>
          <div className="md:w-64">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="input"
            >
              <option value="slangenummer">Sorter: Nr</option>
              <option value="plassering">Sorter: Plassering</option>
              <option value="etasje">Sorter: Etasje</option>
              <option value="modell">Sorter: Modell</option>
              <option value="status">Sorter: Status</option>
            </select>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              max="50"
              value={antallNye}
              onChange={(e) => setAntallNye(parseInt(e.target.value) || 1)}
              className="input w-20"
            />
            <button
              onClick={leggTilNye}
              className="btn-primary flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Legg til
            </button>
          </div>
        </div>
      </div>

      {/* Kompakt tabell-visning */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">
            Brannslanger
            <span className="ml-2 text-sm text-gray-400 font-normal">
              ({sortedSlanger.length} {sortedSlanger.length === 1 ? 'enhet' : 'enheter'})
            </span>
          </h2>
          <button
            onClick={() => setIsFullscreen(true)}
            className="btn-secondary flex items-center gap-2"
            title="Åpne i fullskjerm for detaljert redigering"
          >
            <Maximize2 className="w-5 h-5" />
            Rediger i fullskjerm
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-400">Laster brannslanger...</p>
          </div>
        ) : sortedSlanger.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Ingen brannslanger funnet</p>
            <p className="text-sm text-gray-500 mt-2">Klikk "Legg til" for å registrere nye brannslanger</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Nr</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Plassering</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Etasje</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Produsent</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Modell</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Klasse</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">År</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
          {sortedSlanger.map((slange, index) => (
            <tr 
              key={slange.id || `new-${index}`} 
              className="border-b border-gray-800 hover:bg-dark-200 transition-colors cursor-pointer"
              onClick={() => setIsFullscreen(true)}
              title="Klikk for å redigere i fullskjerm"
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <span className="text-white font-medium">{slange.slangenummer || '-'}</span>
                </div>
              </td>
              <td className="py-3 px-4 text-gray-300">{slange.plassering || '-'}</td>
              <td className="py-3 px-4 text-gray-300">{slange.etasje || '-'}</td>
              <td className="py-3 px-4 text-gray-300">{slange.produsent || '-'}</td>
              <td className="py-3 px-4 text-gray-300">{slange.modell || '-'}</td>
              <td className="py-3 px-4 text-gray-300">{slange.brannklasse || '-'}</td>
              <td className="py-3 px-4 text-gray-300">{slange.produksjonsaar || '-'}</td>
              <td className="py-3 px-4">
                {slange.status && slange.status.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {slange.status.map((st) => (
                      <span
                        key={st}
                        className={`px-2 py-1 rounded text-xs ${
                          st === 'OK' ? 'bg-green-500/20 text-green-400' :
                          st.includes('Lekkasje') ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {st}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-500">-</span>
                )}
              </td>
            </tr>
          ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
