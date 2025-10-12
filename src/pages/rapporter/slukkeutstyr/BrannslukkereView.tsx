import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Plus, Save, Trash2, Shield, Search, Maximize2, Minimize2, Eye, FileDown } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { BrannslukkerPreview } from '../BrannslukkerPreview'
import { useAuthStore } from '@/store/authStore'

interface Brannslukker {
  id?: string
  anlegg_id: string
  apparat_nr?: string | null
  plassering?: string | null
  etasje?: string | null
  produsent?: string | null
  modell?: string | null
  brannklasse?: string | null
  produksjonsaar?: string | null
  service?: string | null
  siste_kontroll?: string | null
  status?: string[] | null
  type_avvik?: string[] | null
}

interface BrannslukkereViewProps {
  anleggId: string
  kundeNavn: string
  anleggNavn: string
  onBack: () => void
}

const statusAlternativer = [
  'OK',
  'OK Byttet',
  'Ikke funnet',
  'Ikke tilkomst',
  'Utgått',
  'Skadet',
  'Mangler skilt',
  'Manometerfeil',
  'Ikke trykk',
  'Fjernet'
]

const modellAlternativer = [
  '',
  '2KG Pulver',
  '6KG Pulver',
  '9KG Pulver',
  '12KG Pulver',
  '6L Skum',
  '4L Vann',
  '6L Vann',
  '9L Vann',
  '2KG CO2',
  '5KG CO2',
  '6L Litium',
]

const brannklasseAlternativer = [
  'A', 'AB', 'ABC', 'ABF', 'B', 'AF'
]

const etasjeAlternativer = [
  '',
  ...Array.from({ length: 15 }, (_, i) => `${i - 2} Etg`),
  'Ukjent'
]

export function BrannslukkereView({ anleggId, kundeNavn, anleggNavn, onBack }: BrannslukkereViewProps) {
  const { user } = useAuthStore()
  const [slukkere, setSlukkere] = useState<Brannslukker[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [antallNye, setAntallNye] = useState(1)
  const [sortBy, setSortBy] = useState<'apparat_nr' | 'plassering' | 'etasje' | 'modell' | 'brannklasse' | 'status'>('apparat_nr')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingChanges, setPendingChanges] = useState(0)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const localStorageKey = `brannslukkere_offline_${anleggId}`
  const [editingStatusIndex, setEditingStatusIndex] = useState<number | null>(null)
  const [previewPdf, setPreviewPdf] = useState<{ blob: Blob; fileName: string } | null>(null)

  useEffect(() => {
    loadSlukkere()
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
  }, [slukkere])

  async function loadSlukkere() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('anleggsdata_brannslukkere')
        .select('*')
        .eq('anlegg_id', anleggId)
        .order('apparat_nr', { ascending: true, nullsFirst: false })

      if (error) throw error
      setSlukkere(data || [])
    } catch (error) {
      console.error('Feil ved lasting av brannslukkere:', error)
      alert('Kunne ikke laste brannslukkere')
    } finally {
      setLoading(false)
    }
  }

  async function autoSave() {
    // Ikke autolagre hvis vi nettopp lastet data eller er i loading-state
    if (loading || slukkere.length === 0) return

    // Hvis offline, lagre til localStorage
    if (!navigator.onLine) {
      saveToLocalStorage()
      return
    }

    try {
      setSaving(true)

      for (const slukker of slukkere) {
        if (slukker.id) {
          // Update eksisterende
          const { error } = await supabase
            .from('anleggsdata_brannslukkere')
            .update(slukker)
            .eq('id', slukker.id)
          
          if (error) throw error
        } else if (slukker.apparat_nr || slukker.plassering) {
          // Insert nye (kun hvis de har data)
          const { error } = await supabase
            .from('anleggsdata_brannslukkere')
            .insert([{ ...slukker, anlegg_id: anleggId }])
          
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
      localStorage.setItem(localStorageKey, JSON.stringify(slukkere))
      setPendingChanges(slukkere.length)
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
      const offlineData: Brannslukker[] = JSON.parse(stored)

      for (const slukker of offlineData) {
        if (slukker.id) {
          await supabase
            .from('anleggsdata_brannslukkere')
            .update(slukker)
            .eq('id', slukker.id)
        } else if (slukker.apparat_nr || slukker.plassering) {
          await supabase
            .from('anleggsdata_brannslukkere')
            .insert([{ ...slukker, anlegg_id: anleggId }])
        }
      }

      localStorage.removeItem(localStorageKey)
      setPendingChanges(0)
      setLastSaved(new Date())
      await loadSlukkere()
    } catch (error) {
      console.error('Feil ved synkronisering:', error)
    } finally {
      setSaving(false)
    }
  }


  async function deleteBrannslukker(id: string) {
    if (!confirm('Er du sikker på at du vil slette denne brannslukkeren?')) return

    try {
      const { error } = await supabase
        .from('anleggsdata_brannslukkere')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadSlukkere()
    } catch (error) {
      console.error('Feil ved sletting:', error)
      alert('Kunne ikke slette brannslukker')
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
      doc.text('RAPPORT - BRANNSLUKKERE', 20, yPos)
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
      const totalt = slukkere.length
      const ok = slukkere.filter(s => s.status?.includes('OK')).length
      const defekt = slukkere.filter(s => s.status?.includes('Defekt')).length
      const utskiftet = slukkere.filter(s => s.status?.includes('Utskiftet')).length

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
      doc.text(`Defekt: ${defekt}`, 20, yPos)
      yPos += 5
      doc.text(`Utskiftet: ${utskiftet}`, 20, yPos)

      // Ny side for tabell
      doc.addPage()
      yPos = 20

      // Sorter etter apparat_nr
      const sortedForPdf = [...slukkere].sort((a, b) => {
        const numA = parseInt(a.apparat_nr || '0') || 0
        const numB = parseInt(b.apparat_nr || '0') || 0
        return numA - numB
      })

      // Tabell
      autoTable(doc, {
        startY: yPos,
        head: [['Nr', 'Plassering', 'Etasje', 'Produsent', 'Modell', 'Klasse', 'År', 'Service', 'Status']],
        body: sortedForPdf.map(s => [
          s.apparat_nr || '-',
          s.plassering || '-',
          s.etasje || '-',
          s.produsent || '-',
          s.modell || '-',
          s.brannklasse || '-',
          s.produksjonsaar || '-',
          s.service || '-',
          s.status?.[0] || 'OK'
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: 10, right: 10, bottom: 25 },
      })

      const pdfBlob = doc.output('blob')
      const fileName = `Rapport_Brannslukkere_${new Date().getFullYear()}_${anleggNavn.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`

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

  function leggTilNye() {
    const nyeSlukkere: Brannslukker[] = Array.from({ length: antallNye }, () => ({
      anlegg_id: anleggId,
      apparat_nr: '',
      plassering: '',
      etasje: '',
      produsent: '',
      modell: '',
      brannklasse: 'A',
      produksjonsaar: '',
      status: []
    }))

    setSlukkere([...slukkere, ...nyeSlukkere])
    setAntallNye(1)
  }

  async function lagreAlle() {
    try {
      setLoading(true)

      for (const slukker of slukkere) {
        if (slukker.id) {
          // Update eksisterende
          await supabase
            .from('anleggsdata_brannslukkere')
            .update(slukker)
            .eq('id', slukker.id)
        } else if (slukker.apparat_nr || slukker.plassering) {
          // Insert nye (kun hvis de har data)
          await supabase
            .from('anleggsdata_brannslukkere')
            .insert([{ ...slukker, anlegg_id: anleggId }])
        }
      }

      alert('Alle brannslukkere lagret!')
      await loadSlukkere()
    } catch (error) {
      console.error('Feil ved lagring:', error)
      alert('Kunne ikke lagre alle brannslukkere')
    } finally {
      setLoading(false)
    }
  }

  function handleStatusChange(index: number, status: string) {
    // Finn den faktiske slukkeren i sortedSlukkere
    const slukker = sortedSlukkere[index]
    if (!slukker) return

    // Finn index i original slukkere array
    const originalIndex = slukkere.findIndex(s => s.id ? s.id === slukker.id : s === slukker)
    if (originalIndex === -1) return

    const nyeSlukkere = [...slukkere]
    const currentStatus = nyeSlukkere[originalIndex].status || []
    
    if (currentStatus.includes(status)) {
      nyeSlukkere[originalIndex].status = currentStatus.filter(s => s !== status)
    } else {
      nyeSlukkere[originalIndex].status = [...currentStatus, status]
    }
    
    setSlukkere(nyeSlukkere)
  }

  const filteredSlukkere = slukkere.filter(s =>
    (s.apparat_nr?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (s.plassering?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (s.produsent?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  )

  // Sortering
  const sortedSlukkere = [...filteredSlukkere].sort((a, b) => {
    switch (sortBy) {
      case 'apparat_nr':
        return (a.apparat_nr || '').localeCompare(b.apparat_nr || '', 'nb-NO', { numeric: true })
      case 'plassering':
        return (a.plassering || '').localeCompare(b.plassering || '', 'nb-NO')
      case 'etasje':
        return (a.etasje || '').localeCompare(b.etasje || '', 'nb-NO', { numeric: true })
      case 'modell':
        return (a.modell || '').localeCompare(b.modell || '', 'nb-NO')
      case 'brannklasse':
        return (a.brannklasse || '').localeCompare(b.brannklasse || '', 'nb-NO')
      case 'status':
        const aStatus = a.status?.[0] || ''
        const bStatus = b.status?.[0] || ''
        return aStatus.localeCompare(bStatus, 'nb-NO')
      default:
        return 0
    }
  })

  // Vis forhåndsvisning hvis PDF er generert
  if (previewPdf) {
    return (
      <BrannslukkerPreview
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

  // Beregn statistikk
  const currentYear = new Date().getFullYear()
  
  const totalt = slukkere.length
  const ok = slukkere.filter(s => s.status?.includes('OK')).length
  const avvik = slukkere.filter(s => 
    s.status?.some(st => !['OK', 'OK Byttet', 'Ikke funnet', 'Ikke tilkomst', 'Fjernet'].includes(st))
  ).length
  
  // Beregn utgått basert på brannklasse og produksjonsår/service
  const utgaatt = slukkere.filter(s => {
    // Bruk service-år hvis det finnes, ellers produksjonsår
    const serviceAar = parseInt(s.service || '0')
    const prodAar = parseInt(s.produksjonsaar || '0')
    const referanseAar = serviceAar > 0 ? serviceAar : prodAar
    
    if (!referanseAar || referanseAar === 0) return false
    
    const alder = currentYear - referanseAar
    const klasse = s.brannklasse || ''
    
    // ABC eller B: Utgått etter 10 år
    if (klasse.includes('ABC') || klasse === 'B') {
      return alder >= 10
    }
    // AB, ABF, A, AF: Utgått etter 5 år
    if (['AB', 'ABF', 'A', 'AF'].includes(klasse)) {
      return alder >= 5
    }
    
    return false
  }).length
  
  // Beregn "Byttes neste kontroll"
  const byttesNesteKontroll = slukkere.filter(s => {
    // Bruk service-år hvis det finnes, ellers produksjonsår
    const serviceAar = parseInt(s.service || '0')
    const prodAar = parseInt(s.produksjonsaar || '0')
    const referanseAar = serviceAar > 0 ? serviceAar : prodAar
    
    if (!referanseAar || referanseAar === 0) return false
    
    const alder = currentYear - referanseAar
    const klasse = s.brannklasse || ''
    
    // ABC eller B: Byttes ved 9 år
    if (klasse.includes('ABC') || klasse === 'B') {
      return alder === 9
    }
    // AB, ABF, A, AF: Byttes ved 4 år
    if (['AB', 'ABF', 'A', 'AF'].includes(klasse)) {
      return alder === 4
    }
    
    return false
  }).length

  // Fullskjerm-visning
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-dark-200 overflow-auto">
        <div className="min-h-screen p-4">
          {/* Header med lukkeknapp */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-800">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-white">
                Brannslukkere - {kundeNavn} - {anleggNavn}
                <span className="ml-3 text-lg text-gray-400 font-normal">
                  ({sortedSlukkere.length} {sortedSlukkere.length === 1 ? 'enhet' : 'enheter'})
                </span>
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {/* Offline indikator */}
              {!isOnline && (
                <span className="text-sm text-yellow-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  Offline
                </span>
              )}
              
              {/* Pending changes */}
              {pendingChanges > 0 && (
                <span className="text-sm text-orange-400 flex items-center gap-2">
                  {pendingChanges} endringer venter på synkronisering
                </span>
              )}
              
              {/* Lagringsstatus */}
              {saving && (
                <span className="text-sm text-gray-400 flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  {isOnline ? 'Lagrer...' : 'Lagrer lokalt...'}
                </span>
              )}
              {!saving && lastSaved && pendingChanges === 0 && (
                <span className="text-sm text-green-400">
                  Lagret {lastSaved.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              
              <button
                onClick={leggTilNye}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Legg til ({antallNye})
              </button>
              <button
                onClick={lagreAlle}
                disabled={saving}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <p className="text-gray-400">Laster brannslukkere...</p>
            </div>
          ) : sortedSlukkere.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Ingen brannslukkere funnet</p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-dark-100 rounded-lg">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium w-24">Nr</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Plassering</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium w-24">Etasje</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium w-28">Produsent</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium w-40">Modell</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium w-20">Klasse</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium w-24">År</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium w-24">Service</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium w-24">Siste kontroll</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium w-32">Status</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium w-20">Handlinger</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSlukkere.map((slukker, index) => (
                    <tr
                      key={slukker.id || `new-${index}`}
                      className="border-b border-gray-800 hover:bg-dark-200 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                            <Shield className="w-5 h-5 text-red-500" />
                          </div>
                          <input
                            type="text"
                            value={slukker.apparat_nr || ''}
                            onChange={(e) => {
                              const nyeSlukkere = [...slukkere]
                              nyeSlukkere[index].apparat_nr = e.target.value
                              setSlukkere(nyeSlukkere)
                            }}
                            className="input text-white font-medium py-1 px-2 text-sm w-full"
                            placeholder="001"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={slukker.plassering || ''}
                          onChange={(e) => {
                            const nyeSlukkere = [...slukkere]
                            nyeSlukkere[index].plassering = e.target.value
                            setSlukkere(nyeSlukkere)
                          }}
                          className="input py-1 px-2 text-sm w-full"
                          placeholder="Gang"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={slukker.etasje || ''}
                          onChange={(e) => {
                            const nyeSlukkere = [...slukkere]
                            nyeSlukkere[index].etasje = e.target.value
                            setSlukkere(nyeSlukkere)
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
                          value={slukker.produsent || ''}
                          onChange={(e) => {
                            const nyeSlukkere = [...slukkere]
                            nyeSlukkere[index].produsent = e.target.value
                            setSlukkere(nyeSlukkere)
                          }}
                          className="input py-1 px-2 text-sm w-full"
                          placeholder="Euro"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={slukker.modell || ''}
                          onChange={(e) => {
                            const nyeSlukkere = [...slukkere]
                            nyeSlukkere[index].modell = e.target.value
                            setSlukkere(nyeSlukkere)
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
                          value={slukker.brannklasse || ''}
                          onChange={(e) => {
                            const nyeSlukkere = [...slukkere]
                            nyeSlukkere[index].brannklasse = e.target.value
                            setSlukkere(nyeSlukkere)
                          }}
                          className="input py-1 px-2 text-sm w-full"
                        >
                          <option value="">-- Velg --</option>
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
                          value={slukker.produksjonsaar || ''}
                          onChange={(e) => {
                            const nyeSlukkere = [...slukkere]
                            nyeSlukkere[index].produksjonsaar = e.target.value
                            setSlukkere(nyeSlukkere)
                          }}
                          className="input py-1 px-2 text-sm w-full"
                          placeholder="2020"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={slukker.service || ''}
                          onChange={(e) => {
                            const nyeSlukkere = [...slukkere]
                            nyeSlukkere[index].service = e.target.value
                            setSlukkere(nyeSlukkere)
                          }}
                          className="input py-1 px-2 text-sm w-full"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={slukker.siste_kontroll || ''}
                          onChange={(e) => {
                            const nyeSlukkere = [...slukkere]
                            nyeSlukkere[index].siste_kontroll = e.target.value
                            setSlukkere(nyeSlukkere)
                          }}
                          className="input py-1 px-2 text-sm w-full"
                          placeholder="2024"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setEditingStatusIndex(index)}
                          className="flex flex-wrap gap-1 hover:bg-dark-200 p-2 rounded transition-colors w-full text-left"
                        >
                          {slukker.status && slukker.status.length > 0 ? (
                            slukker.status.map((st) => (
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
                          {slukker.id && (
                            <button
                              onClick={() => deleteBrannslukker(slukker.id!)}
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
                    const isSelected = sortedSlukkere[editingStatusIndex]?.status?.includes(status)
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
            <h1 className="text-3xl font-bold text-white mb-2">Brannslukkere</h1>
            <p className="text-gray-400">{kundeNavn} - {anleggNavn}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Offline indikator */}
          {!isOnline && (
            <span className="text-sm text-yellow-400 flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              Offline
            </span>
          )}
          
          {/* Pending changes */}
          {pendingChanges > 0 && (
            <span className="text-sm text-orange-400 flex items-center gap-2">
              {pendingChanges} endringer venter på synkronisering
            </span>
          )}
          
          {/* Lagringsstatus */}
          {saving && (
            <span className="text-sm text-gray-400 flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              {isOnline ? 'Lagrer...' : 'Lagrer lokalt...'}
            </span>
          )}
          {!saving && lastSaved && pendingChanges === 0 && (
            <span className="text-sm text-green-400">
              Lagret {lastSaved.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          
          <button
            onClick={() => genererRapport(true)}
            disabled={loading || slukkere.length === 0}
            className="btn-secondary flex items-center gap-2"
          >
            <Eye className="w-5 h-5" />
            Forhåndsvisning
          </button>
          <button
            onClick={() => genererRapport(false)}
            disabled={loading || slukkere.length === 0}
            className="btn-secondary flex items-center gap-2"
          >
            <FileDown className="w-5 h-5" />
            Generer PDF
          </button>
          <button
            onClick={lagreAlle}
            disabled={loading || saving}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            Lagre alle
          </button>
        </div>
      </div>

      {/* Statistikk */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="card bg-blue-500/10 border-blue-500/20">
          <p className="text-sm text-gray-400 mb-1">Totalt</p>
          <p className="text-2xl font-bold text-white">{totalt}</p>
        </div>
        <div className="card bg-green-500/10 border-green-500/20">
          <p className="text-sm text-gray-400 mb-1">OK</p>
          <p className="text-2xl font-bold text-green-400">{ok}</p>
        </div>
        <div className="card bg-red-500/10 border-red-500/20">
          <p className="text-sm text-gray-400 mb-1">Avvik</p>
          <p className="text-2xl font-bold text-red-400">{avvik}</p>
        </div>
        <div className="card bg-yellow-500/10 border-yellow-500/20">
          <p className="text-sm text-gray-400 mb-1">Utgått</p>
          <p className="text-2xl font-bold text-yellow-400">{utgaatt}</p>
        </div>
        <div className="card bg-orange-500/10 border-orange-500/20">
          <p className="text-sm text-gray-400 mb-1">Byttes neste kontroll</p>
          <p className="text-2xl font-bold text-orange-400">{byttesNesteKontroll}</p>
        </div>
      </div>

      {/* Søk, sortering og legg til */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Søk etter brannslukker..."
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
              <option value="apparat_nr">Sorter: Nr</option>
              <option value="plassering">Sorter: Plassering</option>
              <option value="etasje">Sorter: Etasje</option>
              <option value="modell">Sorter: Modell</option>
              <option value="brannklasse">Sorter: Klasse</option>
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
            Brannslukkere
            <span className="ml-2 text-sm text-gray-400 font-normal">
              ({sortedSlukkere.length} {sortedSlukkere.length === 1 ? 'enhet' : 'enheter'})
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
            <p className="text-gray-400">Laster brannslukkere...</p>
          </div>
        ) : sortedSlukkere.length === 0 ? (
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Ingen brannslukkere funnet</p>
          <p className="text-sm text-gray-500 mt-2">Klikk "Legg til" for å registrere nye brannslukkere</p>
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
          {sortedSlukkere.map((slukker, index) => (
            <tr 
              key={slukker.id || `new-${index}`} 
              className="border-b border-gray-800 hover:bg-dark-200 transition-colors cursor-pointer"
              onClick={() => setIsFullscreen(true)}
              title="Klikk for å redigere i fullskjerm"
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-red-500" />
                  <span className="text-white font-medium">{slukker.apparat_nr || '-'}</span>
                </div>
              </td>
              <td className="py-3 px-4 text-gray-300">{slukker.plassering || '-'}</td>
              <td className="py-3 px-4 text-gray-300">{slukker.etasje || '-'}</td>
              <td className="py-3 px-4 text-gray-300">{slukker.produsent || '-'}</td>
              <td className="py-3 px-4 text-gray-300">{slukker.modell || '-'}</td>
              <td className="py-3 px-4 text-gray-300">{slukker.brannklasse || '-'}</td>
              <td className="py-3 px-4 text-gray-300">{slukker.produksjonsaar || '-'}</td>
              <td className="py-3 px-4">
                {slukker.status && slukker.status.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {slukker.status.map((st) => (
                      <span
                        key={st}
                        className={`px-2 py-1 rounded text-xs ${
                          st === 'OK' ? 'bg-green-500/20 text-green-400' :
                          st === 'Defekt' ? 'bg-red-500/20 text-red-400' :
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
