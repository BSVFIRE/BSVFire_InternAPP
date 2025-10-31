import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Plus, Save, Trash2, Shield, Search, Maximize2, Minimize2, Eye, Download, Wifi, WifiOff, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { BrannslangerPreview } from '../BrannslangerPreview'
import { useAuthStore } from '@/store/authStore'
import { KommentarViewBrannslanger } from './KommentarViewBrannslanger'
import { TjenesteFullfortDialog } from '@/components/TjenesteFullfortDialog'
import { SendRapportDialog } from '@/components/SendRapportDialog'

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
  status?: string | null
  type_avvik?: string[] | null
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
  const navigate = useNavigate()
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const localStorageKey = `brannslanger_offline_${anleggId}`
  const [editingStatusIndex, setEditingStatusIndex] = useState<number | null>(null)
  const [previewPdf, setPreviewPdf] = useState<{ blob: Blob; fileName: string } | null>(null)
  const [showFullfortDialog, setShowFullfortDialog] = useState(false)
  const [showSendRapportDialog, setShowSendRapportDialog] = useState(false)
  const [pendingPdfSave, setPendingPdfSave] = useState<{ mode: 'save' | 'download'; doc: any; fileName: string } | null>(null)
  const [kundeId, setKundeId] = useState<string | null>(null)
  const [evakueringsplanStatus, setEvakueringsplanStatus] = useState('')
  
  // Autocomplete for produsent
  const [produsentOptions, setProdusentOptions] = useState<string[]>([])
  const [showProdusentSuggestions, setShowProdusentSuggestions] = useState<number | null>(null)

  useEffect(() => {
    loadSlanger()
    loadEvakueringsplan(anleggId)
    loadProdusentOptions()
  }, [anleggId])

  // Wrapper for setSlanger som også setter hasUnsavedChanges
  const updateSlanger = (newSlanger: Brannslange[] | ((prev: Brannslange[]) => Brannslange[])) => {
    setSlanger(newSlanger)
    setHasUnsavedChanges(true)
  }

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

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // AUTOLAGRING DEAKTIVERT - forårsaker duplikater
    // Set new timeout
    // saveTimeoutRef.current = setTimeout(() => {
    //   autoSave()
    // }, 3000) // 3 sekunder debounce

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [slanger])

  async function loadSlanger() {
    try {
      setLoading(true)
      
      // Hent kundeId fra anlegg
      const { data: anleggData } = await supabase
        .from('anlegg')
        .select('kundenr')
        .eq('id', anleggId)
        .single()
      
      if (anleggData) {
        setKundeId(anleggData.kundenr)
      }
      
      const { data, error } = await supabase
        .from('anleggsdata_brannslanger')
        .select('*')
        .eq('anlegg_id', anleggId)
        .order('slangenummer', { ascending: true, nullsFirst: false })

      if (error) throw error
      
      console.log('Lastet inn fra database:', data?.length, 'brannslanger')
      
      // Konverter status og type_avvik fra database format
      const processedData = (data || []).map(slange => ({
        ...slange,
        status: Array.isArray(slange.status) && slange.status.length > 0
          ? slange.status[0]  // Ta første element hvis array
          : slange.status || 'OK',  //Eller bruk string direkte
        type_avvik: Array.isArray(slange.type_avvik)
          ? slange.type_avvik
          : []
      }))
      
      // Sjekk for duplikater
      const ids = processedData.map(s => s.id)
      const uniqueIds = new Set(ids)
      if (ids.length !== uniqueIds.size) {
        console.error('ADVARSEL: Duplikate IDer funnet i database!')
      }
      
      setSlanger(processedData)
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Feil ved lasting av brannslanger:', error)
      alert('Kunne ikke laste brannslanger')
    } finally {
      setLoading(false)
    }
  }

  async function loadEvakueringsplan(anleggId: string) {
    try {
      const { data, error } = await supabase
        .from('evakueringsplan_status')
        .select('status')
        .eq('anlegg_id', anleggId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error
      setEvakueringsplanStatus(data?.status || '')
    } catch (error) {
      console.error('Feil ved lasting av evakueringsplan:', error)
    }
  }

  async function loadProdusentOptions() {
    try {
      const { data, error } = await supabase
        .from('anleggsdata_brannslanger')
        .select('produsent')
        .eq('anlegg_id', anleggId)
        .not('produsent', 'is', null)
        .neq('produsent', '')
      
      if (!error && data) {
        const uniqueProdusenter = Array.from(new Set(data.map(s => s.produsent).filter((v): v is string => v !== null && v !== ''))).sort()
        setProdusentOptions(uniqueProdusenter)
      }
    } catch (error) {
      console.error('Feil ved lasting av produsenter:', error)
    }
  }

  async function saveEvakueringsplan() {
    try {
      const { data: existing } = await supabase
        .from('evakueringsplan_status')
        .select('id')
        .eq('anlegg_id', anleggId)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('evakueringsplan_status')
          .update({ status: evakueringsplanStatus })
          .eq('anlegg_id', anleggId)
      } else {
        await supabase
          .from('evakueringsplan_status')
          .insert({ anlegg_id: anleggId, status: evakueringsplanStatus })
      }
      alert('Evakueringsplan-status lagret!')
    } catch (error) {
      console.error('Feil ved lagring:', error)
      alert('Kunne ikke lagre evakueringsplan-status')
    }
  }

  function leggTilNye() {
    // Finn høyeste nummer
    let hoyesteNummer = 0
    slanger.forEach(s => {
      const num = parseInt(s.slangenummer || '0')
      if (!isNaN(num) && num > hoyesteNummer) {
        hoyesteNummer = num
      }
    })

    const nyeSlanger: Brannslange[] = Array.from({ length: antallNye }, (_, index) => ({
      anlegg_id: anleggId,
      slangenummer: String(hoyesteNummer + index + 1),
      plassering: '',
      etasje: '',
      produsent: '',
      modell: '',
      brannklasse: 'A',
      produksjonsaar: '',
      sistekontroll: '',
      trykktest: '',
      status: 'OK',
      type_avvik: []
    }))

    updateSlanger([...slanger, ...nyeSlanger])
    setAntallNye(1)
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
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Feil ved synkronisering:', error)
    } finally {
      setSaving(false)
    }
  }

  async function lagreAlle() {
    try {
      setLoading(true)
      
      // Deaktiver autolagring midlertidig
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      for (const slange of slanger) {
        // Skip tomme rader uten data
        if (!slange.id && !slange.slangenummer && !slange.plassering) {
          continue
        }
        
        // Fjern status fra dataToSave - vi bruker kun type_avvik
        const { status, ...dataUtenStatus } = slange
        
        const dataToSave = {
          ...dataUtenStatus,
          type_avvik: Array.isArray(slange.type_avvik) && slange.type_avvik.length > 0
            ? slange.type_avvik
            : null  // NULL hvis ingen avvik (= OK)
        }
        
        if (slange.id) {
          // Update eksisterende
          console.log('Oppdaterer slange med ID:', slange.id, 'Nr:', slange.slangenummer)
          const { error } = await supabase
            .from('anleggsdata_brannslanger')
            .update(dataToSave)
            .eq('id', slange.id)
          
          if (error) {
            console.error('Feil ved oppdatering:', error, 'Data:', dataToSave)
            throw error
          }
        } else if (slange.slangenummer || slange.plassering) {
          // Insert nye (kun hvis de har data)
          console.log('Setter inn ny slange, Nr:', slange.slangenummer)
          const { data: insertedData, error } = await supabase
            .from('anleggsdata_brannslanger')
            .insert([{ ...dataToSave, anlegg_id: anleggId }])
            .select()
          
          if (error) {
            console.error('Feil ved innsetting:', error, 'Data:', dataToSave)
            throw error
          }
          console.log('Ny slange satt inn med ID:', insertedData?.[0]?.id)
        }
      }

      alert('Alle brannslanger lagret!')
      // Last inn på nytt fra databasen for å få riktig state
      await loadSlanger()
      setHasUnsavedChanges(false)
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
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Feil ved sletting:', error)
      alert('Kunne ikke slette brannslange')
    }
  }

  async function genererRapport(mode: 'preview' | 'save' | 'download' = 'preview') {
    try {
      setLoading(true)

      // Hent kontaktperson via junction table (samme metode som røykluker)
      const { data: kontaktResult } = await supabase
        .from('anlegg_kontaktpersoner')
        .select(`
          kontaktpersoner!inner(
            navn,
            telefon,
            epost
          )
        `)
        .eq('anlegg_id', anleggId)
        .eq('primar', true)
        .maybeSingle()
      
      const kontaktData = Array.isArray(kontaktResult?.kontaktpersoner) 
        ? kontaktResult.kontaktpersoner[0] 
        : kontaktResult?.kontaktpersoner

      // Hent innlogget bruker (tekniker) data
      const { data: tekniker, error: teknikerError } = await supabase
        .from('ansatte')
        .select('navn, telefon, epost, gronn_sertifikat_nummer')
        .eq('epost', user?.email)
        .maybeSingle()

      if (teknikerError) {
        console.error('Feil ved henting av tekniker:', teknikerError)
      }

      // Hent kommentarer for anlegget
      const { data: kommentarer } = await supabase
        .from('kommentar_brannslanger')
        .select('*')
        .eq('anlegg_id', anleggId)
        .order('created_at', { ascending: false })

      const doc = new jsPDF()
      let yPos = 20

      // Logo - bruk fetch for å laste bildet
      try {
        const response = await fetch('/bsv-logo.png')
        const blob = await response.blob()
        const reader = new FileReader()
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
        doc.addImage(base64, 'PNG', 20, yPos, 40, 15)
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

      // Anleggsinformasjon - Profesjonell layout
      doc.setDrawColor(220, 220, 220)
      doc.setLineWidth(0.3)
      doc.setFillColor(250, 250, 250)
      doc.rect(17, yPos, 85, 28, 'FD')
      
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 100, 100)
      doc.text('KUNDE', 20, yPos + 5)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text(kundeNavn, 20, yPos + 10)
      
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 100, 100)
      doc.text('ANLEGG', 20, yPos + 16)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(anleggNavn, 20, yPos + 21)
      
      const idag = new Date()
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text(`Kontrollert: ${idag.toLocaleDateString('nb-NO')}`, 20, yPos + 26)
      
      // Neste kontroll boks
      doc.setFillColor(254, 249, 195)
      doc.rect(104, yPos, 91, 28, 'FD')
      
      const nesteKontroll = new Date(idag)
      nesteKontroll.setMonth(nesteKontroll.getMonth() + 12)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 100, 100)
      doc.text('NESTE KONTROLL', 107, yPos + 5)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(202, 138, 4)
      doc.text(nesteKontroll.toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' }).toUpperCase(), 107, yPos + 14)
      
      yPos += 32

      // Kontaktpersoner - To kolonner
      const colWidth = 85
      let leftCol = 17
      let rightCol = 104
      
      if (kontaktData?.navn) {
        doc.setDrawColor(220, 220, 220)
        doc.setFillColor(250, 250, 250)
        doc.rect(leftCol, yPos, colWidth, 24, 'FD')
        
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(100, 100, 100)
        doc.text('KONTAKTPERSON', leftCol + 3, yPos + 5)
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text(kontaktData.navn, leftCol + 3, yPos + 11)
        
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        let infoY = yPos + 15
        if (kontaktData.telefon) {
          doc.text(`Tlf: ${kontaktData.telefon}`, leftCol + 3, infoY)
          infoY += 4
        }
        if (kontaktData.epost) {
          doc.text(`E-post: ${kontaktData.epost}`, leftCol + 3, infoY)
        }
      }

      if (tekniker?.navn) {
        doc.setFillColor(240, 253, 244)
        doc.rect(rightCol, yPos, colWidth + 6, 24, 'FD')
        
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(100, 100, 100)
        doc.text('UTFØRT AV', rightCol + 3, yPos + 5)
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(22, 163, 74)
        doc.text(tekniker.navn, rightCol + 3, yPos + 11)
        
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(0, 0, 0)
        let infoY = yPos + 15
        if (tekniker.telefon) {
          doc.text(`Tlf: ${tekniker.telefon}`, rightCol + 3, infoY)
          infoY += 4
        }
        if (tekniker.gronn_sertifikat_nummer) {
          doc.text(`Sertifikat: ${tekniker.gronn_sertifikat_nummer}`, rightCol + 3, infoY)
        }
      }
      
      doc.setTextColor(0, 0, 0)
      yPos += 28

      // Beregn trykktest-statistikk
      const currentYear = new Date().getFullYear()
      const trykktestVedKontroll = slanger.filter(s => {
        const year = parseInt(s.trykktest || '0')
        return year === currentYear
      }).length
      const trykktestVedNeste = slanger.filter(s => {
        const year = parseInt(s.trykktest || '0')
        return year === currentYear - 4
      }).length
      const maaTrykktestes = slanger.filter(s => {
        const year = parseInt(s.trykktest || '0')
        return year > 0 && year <= currentYear - 5
      }).length

      // Statistikk - Profesjonell layout
      doc.setFillColor(41, 128, 185)
      doc.rect(15, yPos, 180, 8, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('STATISTIKK', 20, yPos + 5.5)
      doc.setTextColor(0, 0, 0)
      yPos += 12
      
      // Status-seksjon
      const boxWidth = 43
      const boxHeight = 22
      let xPos = 17
      
      // Totalt
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.5)
      doc.setFillColor(248, 250, 252)
      doc.rect(xPos, yPos, boxWidth, boxHeight, 'FD')
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(41, 128, 185)
      doc.text(totalt.toString(), xPos + boxWidth/2, yPos + 12, { align: 'center' })
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text('TOTALT', xPos + boxWidth/2, yPos + 18, { align: 'center' })
      
      // OK
      xPos += boxWidth + 2
      doc.setFillColor(240, 253, 244)
      doc.rect(xPos, yPos, boxWidth, boxHeight, 'FD')
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(22, 163, 74)
      doc.text(ok.toString(), xPos + boxWidth/2, yPos + 12, { align: 'center' })
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text('OK', xPos + boxWidth/2, yPos + 18, { align: 'center' })
      
      // Ikke kontrollert
      xPos += boxWidth + 2
      doc.setFillColor(249, 250, 251)
      doc.rect(xPos, yPos, boxWidth, boxHeight, 'FD')
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(107, 114, 128)
      doc.text(ikkeKontrollert.toString(), xPos + boxWidth/2, yPos + 12, { align: 'center' })
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text('IKKE KONTR.', xPos + boxWidth/2, yPos + 18, { align: 'center' })
      
      // Avvik
      xPos += boxWidth + 2
      doc.setFillColor(254, 242, 242)
      doc.rect(xPos, yPos, boxWidth, boxHeight, 'FD')
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(220, 38, 38)
      doc.text(avvik.toString(), xPos + boxWidth/2, yPos + 12, { align: 'center' })
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text('AVVIK', xPos + boxWidth/2, yPos + 18, { align: 'center' })
      
      // Trykktest-seksjon
      yPos += boxHeight + 6
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(60, 60, 60)
      doc.text('Trykktest', 17, yPos)
      yPos += 5
      
      xPos = 17
      const wideBoxWidth = 58
      
      // Trykktest ved kontroll
      doc.setFillColor(240, 253, 244)
      doc.rect(xPos, yPos, wideBoxWidth, boxHeight, 'FD')
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(22, 163, 74)
      doc.text(trykktestVedKontroll.toString(), xPos + wideBoxWidth/2, yPos + 12, { align: 'center' })
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text('VED KONTROLL', xPos + wideBoxWidth/2, yPos + 18, { align: 'center' })
      
      // Ved neste kontroll
      xPos += wideBoxWidth + 2
      doc.setFillColor(254, 249, 195)
      doc.rect(xPos, yPos, wideBoxWidth, boxHeight, 'FD')
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(202, 138, 4)
      doc.text(trykktestVedNeste.toString(), xPos + wideBoxWidth/2, yPos + 12, { align: 'center' })
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text('VED NESTE', xPos + wideBoxWidth/2, yPos + 18, { align: 'center' })
      
      // Må trykktestes
      xPos += wideBoxWidth + 2
      doc.setFillColor(254, 242, 242)
      doc.rect(xPos, yPos, wideBoxWidth, boxHeight, 'FD')
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(220, 38, 38)
      doc.text(maaTrykktestes.toString(), xPos + wideBoxWidth/2, yPos + 12, { align: 'center' })
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text('MÅ TRYKKTESTES', xPos + wideBoxWidth/2, yPos + 18, { align: 'center' })
      
      doc.setTextColor(0, 0, 0)
      yPos += boxHeight + 8

      // Hent evakueringsplan-status for tilleggsinformasjon
      const { data: evakPlan } = await supabase
        .from('evakueringsplan_status')
        .select('status')
        .eq('anlegg_id', anleggId)
        .maybeSingle()

      // Tilleggsinformasjon (Evakueringsplan) - på side 1 etter trykktest
      if (evakPlan?.status) {
        yPos += 8
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text('Tilleggsinformasjon', 17, yPos)
        yPos += 7

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Evakueringsplaner: ${evakPlan.status}`, 17, yPos)
      }

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
          // Bestem status basert på type_avvik
          (() => {
            if (!Array.isArray(s.type_avvik) || s.type_avvik.length === 0 || s.type_avvik.includes('OK')) {
              return 'OK'
            }
            const ikkeKontrollert = s.type_avvik.filter(a => a === 'Ikke tilkomst' || a === 'Ikke funnet')
            if (ikkeKontrollert.length > 0 && ikkeKontrollert.length === s.type_avvik.length) {
              return ikkeKontrollert.join(', ')
            }
            return s.type_avvik.join(', ')
          })()
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: 10, right: 10, bottom: 30 },
      })

      // Kommentarer seksjon - på ny side hvis det finnes kommentarer
      if (kommentarer && kommentarer.length > 0) {
        doc.addPage()
        yPos = 20

        // Kommentarer header med bakgrunn
        doc.setFillColor(13, 110, 253) // Blue color for brannslanger
        doc.rect(15, yPos - 5, 180, 12, 'F')
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(255, 255, 255)
        doc.text('KOMMENTARER', 20, yPos + 3)
        doc.setTextColor(0, 0, 0)
        yPos += 15

        // Gå gjennom hver kommentar
        kommentarer.forEach((kommentar) => {
          // Sjekk om vi trenger ny side
          if (yPos > 250) {
            doc.addPage()
            yPos = 20
          }

          // Kommentar boks
          doc.setDrawColor(200, 200, 200)
          doc.setLineWidth(0.3)
          doc.setFillColor(250, 250, 250)
          
          // Beregn høyde basert på tekst
          const kommentarTekst = kommentar.kommentar || ''
          const textLines = doc.splitTextToSize(kommentarTekst, 170)
          const boxHeight = 12 + (textLines.length * 4)
          
          doc.rect(15, yPos, 180, boxHeight, 'FD')
          
          // Kommentar header (navn og dato)
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.text(kommentar.opprettet_av || 'Ukjent', 20, yPos + 5)
          
          // Dato
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          doc.setTextColor(100, 100, 100)
          const kommentarDato = kommentar.opprettet_dato || kommentar.created_at
          let datoTekst = 'Ukjent dato'
          if (kommentarDato) {
            try {
              const d = new Date(kommentarDato)
              datoTekst = d.toLocaleDateString('nb-NO', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
            } catch {
              datoTekst = kommentarDato
            }
          }
          doc.text(datoTekst, 190, yPos + 5, { align: 'right' })
          doc.setTextColor(0, 0, 0)
          
          // Kommentar tekst
          yPos += 9
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.text(textLines, 20, yPos)
          
          yPos += boxHeight - 9 + 5 // Mellomrom til neste kommentar
        })
      }

      // Legg til footer på alle sider
      const pageCount = (doc as any).internal.getNumberOfPages()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        const footerY = pageHeight - 20
        
        // Linje over footer
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.5)
        doc.line(20, footerY - 5, pageWidth - 20, footerY - 5)
        
        // Firmanavn (blå og bold)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 102, 204)
        doc.text('Brannteknisk Service og Vedlikehold AS', 20, footerY)
        
        // Org.nr, e-post og telefon
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        doc.text('Org.nr: 921044879 | E-post: mail@bsvfire.no | Telefon: 900 46 600', 20, footerY + 4)
        
        // Adresse
        doc.text('Adresse: Sælenveien 44, 5151 Straumsgrend', 20, footerY + 8)
        
        // Generert dato (lys grå)
        doc.setFontSize(7)
        doc.setTextColor(150, 150, 150)
        const genererDato = new Date().toLocaleDateString('nb-NO') + ' ' + new Date().toLocaleTimeString('nb-NO')
        doc.text(`Generert: ${genererDato}`, 20, footerY + 13)
        
        // Sidetall (høyre side)
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.text(`Side ${i} av ${pageCount}`, pageWidth - 20, footerY, { align: 'right' })
      }

      const pdfBlob = doc.output('blob')
      const fileName = `Rapport_Brannslanger_${new Date().getFullYear()}_${anleggNavn.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`

      if (mode === 'preview') {
        setPreviewPdf({ blob: pdfBlob, fileName })
      } else {
        // Lagre til Supabase Storage
        const storagePath = `anlegg/${anleggId}/dokumenter/${fileName}`
        const { error: uploadError } = await supabase.storage
          .from('anlegg.dokumenter')
          .upload(storagePath, pdfBlob, {
            contentType: 'application/pdf',
            upsert: true
          })

        if (uploadError) throw uploadError

        // Generate signed URL
        const { data: urlData } = await supabase.storage
          .from('anlegg.dokumenter')
          .createSignedUrl(storagePath, 60 * 60 * 24 * 365)

        // Insert record into dokumenter table
        await supabase
          .from('dokumenter')
          .insert({
            anlegg_id: anleggId,
            filnavn: fileName,
            url: urlData?.signedUrl || null,
            type: 'Brannslanger Rapport',
            opplastet_dato: new Date().toISOString(),
            storage_path: storagePath
          })

        // Vis dialog for å sette tjeneste til fullført
        setPendingPdfSave({ mode, doc, fileName })
        setShowFullfortDialog(true)
      }
    } catch (error) {
      console.error('Feil ved generering av rapport:', error)
      alert('Kunne ikke generere rapport')
    } finally {
      setLoading(false)
    }
  }

  async function handleTjenesteFullfort() {
    try {
      // Oppdater anlegg-tabellen med slukkeutstyr_fullfort = true
      const { error } = await supabase
        .from('anlegg')
        .update({ slukkeutstyr_fullfort: true })
        .eq('id', anleggId)

      if (error) throw error

      // Fullfør PDF-lagring
      if (pendingPdfSave) {
        const { mode, doc, fileName } = pendingPdfSave
        if (mode === 'download') {
          doc.save(fileName)
        }
      }

      // Lukk fullført-dialogen og vis send rapport-dialogen
      setShowFullfortDialog(false)
      setShowSendRapportDialog(true)
    } catch (error) {
      console.error('Feil ved oppdatering av tjenestestatus:', error)
      alert('Rapport lagret, men kunne ikke oppdatere status')
      setShowFullfortDialog(false)
      setPendingPdfSave(null)
      setLoading(false)
    }
  }

  function handleSendRapportConfirm() {
    // Naviger til Send Rapporter med kunde og anlegg pre-valgt
    setShowSendRapportDialog(false)
    setPendingPdfSave(null)
    setLoading(false)
    
    if (kundeId) {
      navigate('/send-rapporter', { 
        state: { 
          kundeId: kundeId, 
          anleggId: anleggId 
        } 
      })
    }
  }

  function handleSendRapportCancel() {
    // Lukk dialogen uten å navigere
    setShowSendRapportDialog(false)
    setPendingPdfSave(null)
    setLoading(false)
  }

  function handleTjenesteAvbryt() {
    // Fullfør PDF-lagring uten å oppdatere status
    if (pendingPdfSave) {
      const { mode, doc, fileName } = pendingPdfSave
      if (mode === 'download') {
        doc.save(fileName)
        alert('Rapport lagret og lastet ned!')
      } else {
        alert('Rapport lagret!')
      }
    }
    setShowFullfortDialog(false)
    setPendingPdfSave(null)
    setLoading(false)
  }

  function handleStatusChange(index: number, avvik: string) {
    // Finn den faktiske slangen i sortedSlanger
    const slange = sortedSlanger[index]
    if (!slange) return

    // Finn index i original slanger array
    const originalIndex = slanger.findIndex(s => s.id ? s.id === slange.id : s === slange)
    if (originalIndex === -1) return

    const nyeSlanger = [...slanger]
    const currentAvvik = nyeSlanger[originalIndex].type_avvik || []
    
    if (currentAvvik.includes(avvik)) {
      // Fjern avviket
      nyeSlanger[originalIndex].type_avvik = currentAvvik.filter((a: string) => a !== avvik)
    } else {
      // Legg til avviket
      nyeSlanger[originalIndex].type_avvik = [...currentAvvik, avvik]
    }
    
    updateSlanger(nyeSlanger)
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

  // Beregn statistikk basert på type_avvik
  const totalt = slanger.length
  const ok = slanger.filter(s => 
    !Array.isArray(s.type_avvik) || s.type_avvik.length === 0 || s.type_avvik.includes('OK')
  ).length
  const ikkeKontrollert = slanger.filter(s => {
    if (!Array.isArray(s.type_avvik) || s.type_avvik.length === 0) return false
    // Kun "Ikke kontrollert" hvis ALLE avvik er "Ikke funnet" eller "Ikke tilkomst"
    const ikkeKontrollertAvvik = s.type_avvik.filter(a => a === 'Ikke funnet' || a === 'Ikke tilkomst')
    return ikkeKontrollertAvvik.length > 0 && ikkeKontrollertAvvik.length === s.type_avvik.length
  }).length
  const avvik = slanger.filter(s => {
    if (!Array.isArray(s.type_avvik) || s.type_avvik.length === 0 || s.type_avvik.includes('OK')) return false
    // Avvik hvis det finnes andre avvik enn "Ikke kontrollert"
    const ikkeKontrollertAvvik = s.type_avvik.filter(a => a === 'Ikke funnet' || a === 'Ikke tilkomst')
    return ikkeKontrollertAvvik.length !== s.type_avvik.length
  }).length

  // Vis forhåndsvisning hvis PDF er generert
  if (previewPdf) {
    return (
      <BrannslangerPreview
        pdfBlob={previewPdf.blob}
        fileName={previewPdf.fileName}
        onBack={() => setPreviewPdf(null)}
        onSave={async () => {
          const storagePath = `anlegg/${anleggId}/dokumenter/${previewPdf.fileName}`
          const { error: uploadError } = await supabase.storage
            .from('anlegg.dokumenter')
            .upload(storagePath, previewPdf.blob, {
              contentType: 'application/pdf',
              upsert: true
            })

          if (uploadError) throw uploadError

          // Generate signed URL
          const { data: urlData } = await supabase.storage
            .from('anlegg.dokumenter')
            .createSignedUrl(storagePath, 60 * 60 * 24 * 365)

          // Insert record into dokumenter table
          await supabase
            .from('dokumenter')
            .insert({
              anlegg_id: anleggId,
              filnavn: previewPdf.fileName,
              url: urlData?.signedUrl || null,
              type: 'Brannslanger Rapport',
              opplastet_dato: new Date().toISOString(),
              storage_path: storagePath
            })
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
              <table className="w-full min-w-[1400px]">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium w-24">Nr</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Plassering</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium w-24">Etasje</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium w-32">Produsent</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium w-40">Modell</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium w-20">Klasse</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium w-24">År</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium w-36">Siste kontroll</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium w-28">Trykktest</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium w-32">Status</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium w-20">Handlinger</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSlanger.map((slange, index) => {
                    // Finn den faktiske indexen i original slanger array
                    const originalIndex = slanger.findIndex(s => s.id ? s.id === slange.id : s === slange)
                    
                    return (
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
                              nyeSlanger[originalIndex].slangenummer = e.target.value
                              updateSlanger(nyeSlanger)
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
                            nyeSlanger[originalIndex].plassering = e.target.value
                            updateSlanger(nyeSlanger)
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
                            nyeSlanger[originalIndex].etasje = e.target.value
                            updateSlanger(nyeSlanger)
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
                        <div className="relative">
                          <input
                            type="text"
                            value={slange.produsent || ''}
                            onChange={(e) => {
                              const nyeSlanger = [...slanger]
                              nyeSlanger[originalIndex].produsent = e.target.value
                              updateSlanger(nyeSlanger)
                              setShowProdusentSuggestions(e.target.value.length > 0 ? index : null)
                            }}
                            onFocus={() => {
                              if (slange.produsent && slange.produsent.length > 0) {
                                setShowProdusentSuggestions(index)
                              }
                            }}
                            onBlur={() => setTimeout(() => setShowProdusentSuggestions(null), 200)}
                            className="input py-1 px-2 text-sm w-full"
                            placeholder="Skriv eller velg produsent..."
                          />
                          {showProdusentSuggestions === index && produsentOptions.filter(opt => 
                            opt.toLowerCase().startsWith((slange.produsent || '').toLowerCase())
                          ).length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-dark-100 border border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {produsentOptions
                                .filter(opt => opt.toLowerCase().startsWith((slange.produsent || '').toLowerCase()))
                                .map((option, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault()
                                      const nyeSlanger = [...slanger]
                                      nyeSlanger[originalIndex].produsent = option
                                      updateSlanger(nyeSlanger)
                                      setShowProdusentSuggestions(null)
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-primary/20 text-gray-300 text-sm transition-colors"
                                  >
                                    {option}
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={slange.modell || ''}
                          onChange={(e) => {
                            const nyeSlanger = [...slanger]
                            nyeSlanger[originalIndex].modell = e.target.value
                            updateSlanger(nyeSlanger)
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
                            nyeSlanger[originalIndex].brannklasse = e.target.value
                            updateSlanger(nyeSlanger)
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
                            nyeSlanger[originalIndex].produksjonsaar = e.target.value
                            updateSlanger(nyeSlanger)
                          }}
                          className="input py-1 px-2 text-sm w-full"
                          placeholder="2024"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={slange.sistekontroll || ''}
                            onChange={(e) => {
                              const nyeSlanger = [...slanger]
                              nyeSlanger[originalIndex].sistekontroll = e.target.value
                              updateSlanger(nyeSlanger)
                            }}
                            className="input py-1 px-2 text-sm w-full"
                            placeholder="2025"
                          />
                          <button
                            onClick={() => {
                              const nyeSlanger = [...slanger]
                              nyeSlanger[originalIndex].sistekontroll = new Date().getFullYear().toString()
                              updateSlanger(nyeSlanger)
                            }}
                            className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                              slange.sistekontroll === new Date().getFullYear().toString()
                                ? 'text-green-400 hover:text-green-300 hover:bg-green-500/10'
                                : 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                            }`}
                            title="Fyll inn nåværende år"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={slange.trykktest || ''}
                          onChange={(e) => {
                            const nyeSlanger = [...slanger]
                            nyeSlanger[originalIndex].trykktest = e.target.value
                            updateSlanger(nyeSlanger)
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
                          {slange.type_avvik && slange.type_avvik.length > 0 ? (
                            slange.type_avvik.map((avvik: string) => (
                              <span
                                key={avvik}
                                className={`px-2 py-1 rounded text-xs ${
                                  avvik === 'OK' 
                                    ? 'bg-green-500/20 text-green-400' 
                                    : 'bg-red-500/20 text-red-400'
                                }`}
                              >
                                {avvik}
                              </span>
                            ))
                          ) : (
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">OK</span>
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
                  )
                  })}
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
                  {statusAlternativer.map((avvik) => {
                    const isSelected = sortedSlanger[editingStatusIndex]?.type_avvik?.includes(avvik)
                    const isOK = avvik === 'OK'
                    return (
                      <button
                        key={avvik}
                        onClick={() => handleStatusChange(editingStatusIndex, avvik)}
                        className={`px-4 py-3 rounded-lg text-sm transition-colors text-left ${
                          isSelected
                            ? isOK 
                              ? 'bg-green-500 text-white' 
                              : 'bg-primary text-white'
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
                          <span>{avvik}</span>
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
          {/* Online/Offline status */}
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-yellow-400">Offline</span>
              </>
            )}
          </div>
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
            onClick={() => genererRapport('preview')}
            disabled={loading || slanger.length === 0}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Eye className="w-5 h-5" />
            Forhåndsvisning
          </button>
          <button
            onClick={() => genererRapport('save')}
            disabled={loading || slanger.length === 0}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            Lagre rapport
          </button>
          <button
            onClick={() => genererRapport('download')}
            disabled={loading || slanger.length === 0}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            Lagre og last ned
          </button>
          <button
            onClick={lagreAlle}
            disabled={loading}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed relative"
          >
            <Save className="w-5 h-5" />
            Lagre endringer
            {hasUnsavedChanges && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-pulse"></span>
            )}
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
        <div className="card bg-gray-500/10 border-gray-500/20">
          <p className="text-sm text-gray-400 mb-1">Ikke kontrollert</p>
          <p className="text-2xl font-bold text-gray-400">{ikkeKontrollert}</p>
        </div>
        <div className="card bg-red-500/10 border-red-500/20">
          <p className="text-sm text-gray-400 mb-1">Avvik</p>
          <p className="text-2xl font-bold text-red-400">{avvik}</p>
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
            <table className="w-full min-w-[900px]">
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
                {slange.type_avvik && slange.type_avvik.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {slange.type_avvik.map((avvik: string) => (
                      <span
                        key={avvik}
                        className={`px-2 py-1 rounded text-xs ${
                          avvik === 'OK' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {avvik}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">OK</span>
                )}
              </td>
            </tr>
          ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tilleggsinformasjon */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Tilleggsinformasjon</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Evakueringsplaner
            </label>
            <select
              value={evakueringsplanStatus}
              onChange={(e) => setEvakueringsplanStatus(e.target.value)}
              className="input"
            >
              <option value="">Velg status</option>
              <option value="Ja">Ja</option>
              <option value="Nei">Nei</option>
              <option value="Må oppdateres">Må oppdateres</option>
            </select>
          </div>
          <button
            onClick={saveEvakueringsplan}
            className="btn-primary"
          >
            <Save className="w-4 h-4" />
            Lagre tilleggsinformasjon
          </button>
        </div>
      </div>

      {/* Kommentarer seksjon */}
      <KommentarViewBrannslanger
        anleggId={anleggId}
        kundeNavn={kundeNavn}
        anleggNavn={anleggNavn}
        onBack={() => {}}
      />

      {/* Dialog for å sette tjeneste til fullført */}
      <TjenesteFullfortDialog
        tjeneste="Slukkeutstyr"
        isOpen={showFullfortDialog}
        onConfirm={handleTjenesteFullfort}
        onCancel={handleTjenesteAvbryt}
      />

      {/* Dialog for å navigere til Send Rapporter */}
      <SendRapportDialog
        isOpen={showSendRapportDialog}
        onConfirm={handleSendRapportConfirm}
        onCancel={handleSendRapportCancel}
      />
    </div>
  )
}
