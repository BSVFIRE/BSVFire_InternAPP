import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Plus, Search, Lightbulb, Edit, Trash2, Building2, Eye, Maximize2, Minimize2, Save, Download, Upload, LayoutGrid, Table, FileSpreadsheet, ClipboardCheck } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useLocation, useNavigate } from 'react-router-dom'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useOfflineQueue } from '@/hooks/useOffline'
import { cacheData } from '@/lib/offline'
import { NodlysPreview } from './NodlysPreview'
import { KommentarViewNodlys } from './KommentarViewNodlys'
import { NodlysImport } from './NodlysImport'
import { TjenesteFullfortDialog } from '@/components/TjenesteFullfortDialog'
import { SendRapportDialog } from '@/components/SendRapportDialog'
import { KontrolldatoVelger } from '@/components/KontrolldatoVelger'
import { checkDropboxStatus, uploadKontrollrapportToDropbox } from '@/services/dropboxServiceV2'
import { Combobox } from '@/components/ui/Combobox'

interface Kunde {
  id: string
  navn: string
}

interface Anlegg {
  id: string
  anleggsnavn: string
  kundenr: string
  adresse?: string | null
  postnummer?: string | null
  poststed?: string | null
}

interface NodlysEnhet {
  id: string
  anlegg_id: string | null
  internnummer: string | null
  amatur_id: string | null
  fordeling: string | null
  kurs: string | null
  etasje: string | null
  type: string | null
  produsent: string | null
  plassering: string | null
  status: string | null
  kundenavn: string | null
  kontrollert: boolean | null
  created_at: string
}

interface NettverkEnhet {
  id: string
  anlegg_id: string | null
  kunde: string | null
  nettverk_id: string | null
  plassering: string | null
  type: string | null
  ah: string | null
  spenning: string | null
  batterialder: number | null
  created_at: string
}

interface NodlysProps {
  onBack: () => void
  fromAnlegg?: boolean
}

const statusTyper = ['OK', 'Defekt', 'Mangler', 'Utskiftet', 'Batterifeil', 'Skadet armatur']
const etasjeOptions = ['-2.Etg', '-1.Etg', '0.Etg', '1.Etg', '2.Etg', '3.Etg', '4.Etg', '5.Etg', '6.Etg', '7.Etg', '8.Etg', '9.Etg', '10.Etg']
const typeOptions = ['ML', 'LL', 'Strobe', 'Fluoriserende']

export function Nodlys({ onBack, fromAnlegg }: NodlysProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as { kundeId?: string; anleggId?: string } | null
  const { isOnline, queueUpdate } = useOfflineQueue()
  
  const [kunder, setKunder] = useState<Kunde[]>([])
  const [anlegg, setAnlegg] = useState<Anlegg[]>([])
  const [nodlysListe, setNodlysListe] = useState<NodlysEnhet[]>([])
  const [nettverkListe, setNettverkListe] = useState<NettverkEnhet[]>([])
  const [harNettverk, setHarNettverk] = useState(false)
  const [evakueringsplanStatus, setEvakueringsplanStatus] = useState('')
  const [selectedKunde, setSelectedKunde] = useState(state?.kundeId || '')
  const [selectedAnlegg, setSelectedAnlegg] = useState(state?.anleggId || '')
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit' | 'bulk' | 'nettverk' | 'import'>('list')
  const [selectedNodlys, setSelectedNodlys] = useState<NodlysEnhet | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'internnummer' | 'amatur_id' | 'fordeling' | 'kurs' | 'plassering' | 'etasje' | 'type' | 'status' | 'kontrollert'>('amatur_id')
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [previewPdf, setPreviewPdf] = useState<{ blob: Blob; fileName: string } | null>(null)
  const [showFullfortDialog, setShowFullfortDialog] = useState(false)
  const [showSendRapportDialog, setShowSendRapportDialog] = useState(false)
  const [pendingPdfSave, setPendingPdfSave] = useState<{ mode: 'save' | 'download'; doc: any; fileName: string } | null>(null)
  const [dropboxAvailable, setDropboxAvailable] = useState(false)
  const [kontrolldato, setKontrolldato] = useState<Date>(new Date())
  const [unsavedChanges, setUnsavedChanges] = useState<Map<string, Partial<NodlysEnhet>>>(new Map())
  const [originalData, setOriginalData] = useState<NodlysEnhet[]>([])
  const [displayMode, setDisplayMode] = useState<'table' | 'cards'>(() => {
    // Auto-switch to cards on mobile
    return typeof window !== 'undefined' && window.innerWidth < 1024 ? 'cards' : 'table'
  })
  const statusSelectRef = useRef<HTMLSelectElement>(null)
  const scrollPositionRef = useRef<number>(0)

  // Focus status select without scrolling
  useEffect(() => {
    if (editingCell?.field === 'status' && statusSelectRef.current) {
      // Lagre scroll-posisjon før fokusering
      const scrollContainer = document.querySelector('.overflow-x-auto') || window
      scrollPositionRef.current = scrollContainer instanceof Window ? window.scrollY : scrollContainer.scrollTop
      
      // Bruk setTimeout for å sikre at DOM er ferdig oppdatert
      setTimeout(() => {
        if (statusSelectRef.current) {
          statusSelectRef.current.focus({ preventScroll: true })
          
          // Gjenopprett scroll-posisjon som backup
          setTimeout(() => {
            if (scrollContainer instanceof Window) {
              window.scrollTo(0, scrollPositionRef.current)
            } else {
              scrollContainer.scrollTop = scrollPositionRef.current
            }
          }, 0)
        }
      }, 0)
    }
  }, [editingCell])

  useEffect(() => {
    loadKunder()
    // Sjekk Dropbox-status
    checkDropboxStatus().then(status => setDropboxAvailable(status.connected))
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
      loadNodlys(selectedAnlegg)
      checkNettverk(selectedAnlegg)
      loadEvakueringsplan(selectedAnlegg)
    } else {
      setNodlysListe([])
      setNettverkListe([])
      setHarNettverk(false)
      setEvakueringsplanStatus('')
    }
  }, [selectedAnlegg])

  async function loadKunder() {
    try {
      const { data, error } = await supabase
        .from('customer')
        .select('id, navn')
        .order('navn')

      if (error) throw error
      setKunder(data || [])
    } catch (error) {
      console.error('Feil ved lasting av kunder:', error)
    }
  }

  async function loadAnlegg(kundeId: string) {
    try {
      const { data, error } = await supabase
        .from('anlegg')
        .select('id, anleggsnavn, kundenr')
        .eq('kundenr', kundeId)
        .order('anleggsnavn')

      if (error) throw error
      setAnlegg(data || [])
    } catch (error) {
      console.error('Feil ved lasting av anlegg:', error)
    }
  }

  async function loadNodlys(anleggId: string) {
    try {
      setLoading(true)
      
      if (isOnline) {
        const { data, error } = await supabase
          .from('anleggsdata_nodlys')
          .select('*')
          .eq('anlegg_id', anleggId)
          .order('plassering', { ascending: true, nullsFirst: false })

        if (error) throw error
        setNodlysListe(data || [])
        setOriginalData(data || [])
        setUnsavedChanges(new Map())
        // Cache data for offline use
        cacheData(`nodlys_${anleggId}`, data || [])
      } else {
        // Offline: bruk cached data
        const { getCachedData } = await import('@/lib/offline')
        const cached = getCachedData<NodlysEnhet[]>(`nodlys_${anleggId}`)
        if (cached) {
          setNodlysListe(cached)
          setOriginalData(cached)
          setUnsavedChanges(new Map())
          console.log('📦 Bruker cached nødlysdata (offline)')
        } else {
          console.log('⚠️ Ingen cached data tilgjengelig')
        }
      }
    } catch (error) {
      console.error('Feil ved lasting av nødlys:', error)
    } finally {
      setLoading(false)
    }
  }

  async function checkNettverk(anleggId: string) {
    try {
      const { data, error } = await supabase
        .from('nettverk_nodlys')
        .select('*')
        .eq('anlegg_id', anleggId)

      if (error) throw error
      setNettverkListe(data || [])
      setHarNettverk((data || []).length > 0)
    } catch (error) {
      console.error('Feil ved sjekk av nettverk:', error)
      setHarNettverk(false)
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

  async function saveEvakueringsplan() {
    try {
      const { data: existing } = await supabase
        .from('evakueringsplan_status')
        .select('id')
        .eq('anlegg_id', selectedAnlegg)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('evakueringsplan_status')
          .update({ status: evakueringsplanStatus })
          .eq('anlegg_id', selectedAnlegg)
      } else {
        await supabase
          .from('evakueringsplan_status')
          .insert({ anlegg_id: selectedAnlegg, status: evakueringsplanStatus })
      }
      alert('Evakueringsplan-status lagret!')
    } catch (error) {
      console.error('Feil ved lagring:', error)
      alert('Kunne ikke lagre evakueringsplan-status')
    }
  }


  async function deleteNodlys(id: string) {
    // Sjekk om det finnes ulagrede endringer
    if (unsavedChanges.size > 0) {
      if (!confirm('⚠️ ADVARSEL: Du har ' + unsavedChanges.size + ' ulagret' + (unsavedChanges.size > 1 ? 'e' : '') + ' endring' + (unsavedChanges.size > 1 ? 'er' : '') + '!\n\nHvis du sletter nå, vil alle ulagrede endringer gå tapt.\n\nVil du fortsette med slettingen?')) {
        return
      }
    }
    
    if (!confirm('Er du sikker på at du vil slette denne nødlysenheten?')) return

    try {
      const { error } = await supabase
        .from('anleggsdata_nodlys')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadNodlys(selectedAnlegg)
    } catch (error) {
      console.error('Feil ved sletting:', error)
      alert('Kunne ikke slette nødlysenhet')
    }
  }

  function startEditing(id: string, field: string, currentValue: string | null) {
    setEditingCell({ id, field })
    setEditValue(currentValue || '')
  }

  function trackChange(id: string, field: string, value: string | boolean | null) {
    const newChanges = new Map(unsavedChanges)
    const existing = newChanges.get(id) || {}
    newChanges.set(id, { ...existing, [field]: value })
    setUnsavedChanges(newChanges)
  }

  async function saveInlineEdit(id: string, field: string) {
    // Oppdater lokal state (ikke lagre til database ennå)
    const updatedList = nodlysListe.map(n => 
      n.id === id ? { ...n, [field]: editValue || null } : n
    )
    setNodlysListe(updatedList)
    
    // Track endringen
    trackChange(id, field, editValue || null)
    
    setEditingCell(null)
    setEditValue('')
  }

  async function saveAllChanges() {
    if (unsavedChanges.size === 0) return
    
    try {
      setIsSaving(true)
      
      // Batch update alle endringer
      const updates = Array.from(unsavedChanges.entries()).map(([id, changes]) => ({
        id,
        ...changes
      }))
      
      if (isOnline) {
        // Online: oppdater alle i databasen
        for (const update of updates) {
          const { id, ...fields } = update
          const { error } = await supabase
            .from('anleggsdata_nodlys')
            .update(fields)
            .eq('id', id)

          if (error) throw error
        }
        
        alert(`✅ ${updates.length} endring${updates.length > 1 ? 'er' : ''} lagret!`)
      } else {
        // Offline: legg alle i kø for senere synkronisering
        updates.forEach(update => {
          queueUpdate('anleggsdata_nodlys', update)
        })
        console.log(`📝 ${updates.length} endring${updates.length > 1 ? 'er' : ''} lagret lokalt - synkroniseres når du er online igjen`)
        alert(`📝 ${updates.length} endring${updates.length > 1 ? 'er' : ''} lagret lokalt`)
      }

      // Cache oppdatert liste
      cacheData(`nodlys_${selectedAnlegg}`, nodlysListe)
      
      // Reset unsaved changes og oppdater original data
      setOriginalData(nodlysListe)
      setUnsavedChanges(new Map())
    } catch (error) {
      console.error('Feil ved lagring av endringer:', error)
      alert('Kunne ikke lagre endringer')
    } finally {
      setIsSaving(false)
    }
  }

  function discardChanges() {
    if (!confirm('⚠️ Er du sikker på at du vil forkaste alle ' + unsavedChanges.size + ' ulagret' + (unsavedChanges.size > 1 ? 'e' : '') + ' endring' + (unsavedChanges.size > 1 ? 'er' : '') + '?\n\nDisse endringene kan ikke gjenopprettes.')) return
    
    setNodlysListe(originalData)
    setUnsavedChanges(new Map())
  }

  function cancelEditing() {
    setEditingCell(null)
    setEditValue('')
  }

  async function handleTjenesteFullfort() {
    try {
      // Oppdater anlegg-tabellen med nødlys_fullfort = true
      const { error } = await supabase
        .from('anlegg')
        .update({ nodlys_fullfort: true })
        .eq('id', selectedAnlegg)

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
    navigate('/send-rapporter', { 
      state: { 
        kundeId: selectedKunde, 
        anleggId: selectedAnlegg 
      } 
    })
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

  async function genererPDF(mode: 'preview' | 'save' | 'download' = 'preview') {
    try {
      setLoading(true)

      // Hent anleggsdata
      const { data: anleggData, error: anleggError } = await supabase
        .from('anlegg')
        .select('*')
        .eq('id', selectedAnlegg)
        .single()

      if (anleggError) {
        console.error('Feil ved henting av anlegg:', anleggError)
        throw anleggError
      }

      // Hent kunde separat
      const { data: kundeData } = await supabase
        .from('customer')
        .select('navn, telefon, epost')
        .eq('id', anleggData.kundenr)
        .single()

      // Hent kontaktperson via junction table
      const { data: kontaktResult } = await supabase
        .from('anlegg_kontaktpersoner')
        .select(`
          kontaktpersoner!inner(
            navn,
            telefon,
            epost
          )
        `)
        .eq('anlegg_id', selectedAnlegg)
        .eq('primar', true)
        .maybeSingle()
      
      const primaerKontakt = Array.isArray(kontaktResult?.kontaktpersoner) 
        ? kontaktResult.kontaktpersoner[0] 
        : kontaktResult?.kontaktpersoner

      // Hent tekniker-info fra ansatte-tabellen
      const { data: { user: authUser } } = await supabase.auth.getUser()
      const { data: tekniker } = await supabase
        .from('ansatte')
        .select('navn, telefon, epost')
        .eq('epost', authUser?.email)
        .maybeSingle()

      // Hent kommentarer for anlegget
      const { data: kommentarer } = await supabase
        .from('kommentar_nodlys')
        .select('*')
        .eq('anlegg_id', selectedAnlegg)
        .order('created_at', { ascending: false })

      // Hent evakueringsplan-status
      const { data: evakPlan } = await supabase
        .from('evakueringsplan_status')
        .select('status')
        .eq('anlegg_id', selectedAnlegg)
        .maybeSingle()

      // Generer PDF
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      
      // Funksjon for å legge til footer på hver side
      const addFooter = (pageNum: number) => {
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
        doc.text(`Side ${pageNum}`, pageWidth - 20, footerY, { align: 'right' })
        
        // Reset farge
        doc.setTextColor(0)
      }

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
        yPos += 20
      } catch (error) {
        console.error('Kunne ikke laste logo:', error)
        // Fallback til tekst hvis logo ikke lastes
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(41, 128, 185)
        doc.text('BSV FIRE', 20, yPos)
        doc.setTextColor(0)
        yPos += 10
      }

      // Tittel
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('RAPPORT - NØDLYS', 20, yPos)
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
      doc.text(kundeData?.navn || selectedKundeNavn || '-', 20, yPos + 10)
      
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 100, 100)
      doc.text('ANLEGG', 20, yPos + 16)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(anleggData?.anleggsnavn || '-', 20, yPos + 21)
      
      const idag = kontrolldato
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
      
      if (primaerKontakt?.navn) {
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
        doc.text(primaerKontakt.navn, leftCol + 3, yPos + 11)
        
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        let infoY = yPos + 15
        if (primaerKontakt.telefon) {
          doc.text(`Tlf: ${primaerKontakt.telefon}`, leftCol + 3, infoY)
          infoY += 4
        }
        if (primaerKontakt.epost) {
          doc.text(`E-post: ${primaerKontakt.epost}`, leftCol + 3, infoY)
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
        if (tekniker.epost) {
          doc.text(`E-post: ${tekniker.epost}`, rightCol + 3, infoY)
        }
      }
      
      doc.setTextColor(0, 0, 0)
      yPos += 28

      // Statistikk
      const totalt = nodlysListe.length
      const ok = nodlysListe.filter(n => n.status === 'OK').length
      const defekt = nodlysListe.filter(n => n.status === 'Defekt').length
      const kontrollert = nodlysListe.filter(n => n.kontrollert).length
      const batterifeil = nodlysListe.filter(n => n.status === 'Batterifeil').length
      const skadetArmatur = nodlysListe.filter(n => n.status === 'Skadet armatur').length

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
      
      // Kontrollert
      xPos += boxWidth + 2
      doc.setFillColor(249, 250, 251)
      doc.rect(xPos, yPos, boxWidth, boxHeight, 'FD')
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(107, 114, 128)
      doc.text(kontrollert.toString(), xPos + boxWidth/2, yPos + 12, { align: 'center' })
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text('KONTROLLERT', xPos + boxWidth/2, yPos + 18, { align: 'center' })
      
      // Defekt
      xPos += boxWidth + 2
      doc.setFillColor(254, 242, 242)
      doc.rect(xPos, yPos, boxWidth, boxHeight, 'FD')
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(220, 38, 38)
      doc.text(defekt.toString(), xPos + boxWidth/2, yPos + 12, { align: 'center' })
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text('DEFEKT', xPos + boxWidth/2, yPos + 18, { align: 'center' })
      
      // Ny rad for Batterifeil og Skadet armatur
      yPos += boxHeight + 4
      xPos = 17
      
      // Batterifeil
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.5)
      doc.setFillColor(254, 243, 199)
      doc.rect(xPos, yPos, boxWidth, boxHeight, 'FD')
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(217, 119, 6)
      doc.text(batterifeil.toString(), xPos + boxWidth/2, yPos + 12, { align: 'center' })
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text('BATTERIFEIL', xPos + boxWidth/2, yPos + 18, { align: 'center' })
      
      // Skadet armatur
      xPos += boxWidth + 2
      doc.setFillColor(254, 226, 226)
      doc.rect(xPos, yPos, boxWidth, boxHeight, 'FD')
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(185, 28, 28)
      doc.text(skadetArmatur.toString(), xPos + boxWidth/2, yPos + 12, { align: 'center' })
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text('SKADET ARMATUR', xPos + boxWidth/2, yPos + 18, { align: 'center' })
      
      doc.setTextColor(0, 0, 0)
      yPos += boxHeight + 8

      // Tilleggsinformasjon (Evakueringsplan)
      if (evakPlan?.status) {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('TILLEGGSINFORMASJON', 20, yPos)
        yPos += 10

        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('Evakueringsplaner:', 20, yPos)
        doc.setFont('helvetica', 'normal')
        doc.text(evakPlan.status, 70, yPos)
        yPos += 10
      }

      // Legg til footer på første side
      addFooter(1)

      // Ny side for nødlysliste
      doc.addPage()
      yPos = 20

      // Logo på side 2
      try {
        const logoImg = new Image()
        logoImg.src = '/bsv-logo.png'
        await new Promise((resolve, reject) => {
          logoImg.onload = resolve
          logoImg.onerror = reject
        })
        doc.addImage(logoImg, 'PNG', 20, yPos, 40, 15)
        yPos += 20
      } catch (error) {
        console.error('Kunne ikke laste logo:', error)
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(41, 128, 185)
        doc.text('BSV FIRE', 20, yPos)
        doc.setTextColor(0)
        yPos += 10
      }

      // Nødlysliste (tabell) - Sortert etter armatur_id
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('NØDLYSLISTE', 20, yPos)
      yPos += 5

      // Sorter etter armatur_id (numerisk)
      const sortedNodlysForPdf = [...nodlysListe].sort((a, b) => {
        const numA = parseInt(a.amatur_id || '0') || 0
        const numB = parseInt(b.amatur_id || '0') || 0
        return numA - numB
      })

      autoTable(doc, {
        startY: yPos,
        head: [['Armatur ID', 'Fordeling', 'Kurs', 'Etasje', 'Plassering', 'Produsent', 'Type', 'Status', 'Kontrollert']],
        body: sortedNodlysForPdf.map(n => [
          n.amatur_id || '-',
          n.fordeling || '-',
          n.kurs || '-',
          n.etasje || '-',
          n.plassering || '-',
          n.produsent || '-',
          n.type || '-',
          n.status || '-',
          n.kontrollert ? 'Ja' : 'Nei'
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: 10, right: 10, bottom: 25 },
        didDrawPage: () => {
          // Legg til footer på hver side
          // const pageCount = (doc as any).internal.getNumberOfPages()
          const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber
          addFooter(currentPage)
        }
      })

      // Kommentarer seksjon - på ny side hvis det finnes kommentarer
      if (kommentarer && kommentarer.length > 0) {
        doc.addPage()
        yPos = 20

        // Tittel
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text('KOMMENTARER', 20, yPos)
        doc.setTextColor(0, 0, 0)
        yPos += 15

        // Gå gjennom hver kommentar
        kommentarer.forEach((kommentar) => {
          // Sjekk om vi trenger ny side
          if (yPos > 250) {
            doc.addPage()
            yPos = 20
            const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber
            addFooter(currentPage)
          }

          // Kommentar boks
          doc.setDrawColor(220, 220, 220)
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
          
          // Kommentar tekst
          doc.setFontSize(9)
          doc.setTextColor(0, 0, 0)
          yPos += 9
          doc.setFont('helvetica', 'normal')
          doc.text(textLines, 20, yPos)
          
          yPos += boxHeight - 9 + 5 // Mellomrom til neste kommentar
        })

        // Legg til footer på kommentar-siden
        const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber
        addFooter(currentPage)
      }

      const pdfBlob = doc.output('blob')
      // Konverter norske bokstaver til vanlige for storage (Supabase støtter ikke æøå i filnavn)
      const anleggsnavnForStorage = (anleggData?.anleggsnavn || 'Anlegg')
        .replace(/æ/g, 'ae').replace(/Æ/g, 'AE')
        .replace(/ø/g, 'o').replace(/Ø/g, 'O')
        .replace(/å/g, 'a').replace(/Å/g, 'A')
        .replace(/\s+/g, '_')  // Erstatt mellomrom med underscore
        .replace(/[^a-zA-Z0-9._-]/g, '_')  // Fjern alle spesialtegn utenom punktum og bindestrek
      const fileName = `Rapport_Nodlys_${new Date().getFullYear()}_${anleggsnavnForStorage}.pdf`

      if (mode === 'preview') {
        // Vis forhåndsvisning
        setPreviewPdf({ blob: pdfBlob, fileName })
      } else {
        // Lagre til Supabase Storage
        const storagePath = `anlegg/${selectedAnlegg}/dokumenter/${fileName}`
        
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
            anlegg_id: selectedAnlegg,
            filnavn: fileName,
            url: urlData?.signedUrl || null,
            type: 'Nødlys Rapport',
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

  // Eksporter nødlysliste til Excel
  function eksporterTilExcel() {
    try {
      const selectedAnleggData = anlegg.find(a => a.id === selectedAnlegg)
      const anleggsnavn = selectedAnleggData?.anleggsnavn || 'Anlegg'
      
      // Sorter etter armatur_id (numerisk)
      const sortedData = [...nodlysListe].sort((a, b) => {
        const numA = parseInt(a.amatur_id || '0') || 0
        const numB = parseInt(b.amatur_id || '0') || 0
        return numA - numB
      })

      // Forbered data for Excel
      const excelData = sortedData.map(n => ({
        'Intern nr.': n.internnummer || '',
        'Armatur ID': n.amatur_id || '',
        'Fordeling': n.fordeling || '',
        'Kurs': n.kurs || '',
        'Etasje': n.etasje || '',
        'Plassering': n.plassering || '',
        'Produsent': n.produsent || '',
        'Type': n.type || '',
        'Status': n.status || '',
        'Kontrollert': n.kontrollert ? 'Ja' : 'Nei'
      }))

      // Opprett arbeidsbok
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(excelData)

      // Sett kolonnebredder
      ws['!cols'] = [
        { wch: 10 }, // Intern nr.
        { wch: 12 }, // Armatur ID
        { wch: 12 }, // Fordeling
        { wch: 10 }, // Kurs
        { wch: 10 }, // Etasje
        { wch: 20 }, // Plassering
        { wch: 15 }, // Produsent
        { wch: 12 }, // Type
        { wch: 15 }, // Status
        { wch: 12 }, // Kontrollert
      ]

      XLSX.utils.book_append_sheet(wb, ws, 'Nødlysliste')

      // Generer filnavn
      const dato = new Date().toISOString().split('T')[0]
      const filnavnSafe = anleggsnavn
        .replace(/æ/g, 'ae').replace(/Æ/g, 'AE')
        .replace(/ø/g, 'o').replace(/Ø/g, 'O')
        .replace(/å/g, 'a').replace(/Å/g, 'A')
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
      const fileName = `Nodlysliste_${filnavnSafe}_${dato}.xlsx`

      // Last ned
      XLSX.writeFile(wb, fileName)
    } catch (error) {
      console.error('Feil ved eksport til Excel:', error)
      alert('Kunne ikke eksportere til Excel')
    }
  }

  // Eksporter nødlysliste til PDF (enkel liste uten rapport-format)
  function eksporterTilPDF() {
    try {
      const selectedAnleggData = anlegg.find(a => a.id === selectedAnlegg)
      const anleggsnavn = selectedAnleggData?.anleggsnavn || 'Anlegg'
      const kundenavn = kunder.find(k => k.id === selectedKunde)?.navn || ''

      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()

      // Tittel
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('NØDLYSLISTE', pageWidth / 2, 20, { align: 'center' })

      // Undertittel med kunde og anlegg
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(`${kundenavn} - ${anleggsnavn}`, pageWidth / 2, 28, { align: 'center' })

      // Dato
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.text(`Eksportert: ${new Date().toLocaleDateString('nb-NO')}`, pageWidth / 2, 34, { align: 'center' })
      doc.setTextColor(0, 0, 0)

      // Sorter etter armatur_id (numerisk)
      const sortedData = [...nodlysListe].sort((a, b) => {
        const numA = parseInt(a.amatur_id || '0') || 0
        const numB = parseInt(b.amatur_id || '0') || 0
        return numA - numB
      })

      // Tabell
      autoTable(doc, {
        startY: 40,
        head: [['Intern nr.', 'Armatur ID', 'Fordeling', 'Kurs', 'Etasje', 'Plassering', 'Produsent', 'Type', 'Status', 'Kontrollert']],
        body: sortedData.map(n => [
          n.internnummer || '-',
          n.amatur_id || '-',
          n.fordeling || '-',
          n.kurs || '-',
          n.etasje || '-',
          n.plassering || '-',
          n.produsent || '-',
          n.type || '-',
          n.status || '-',
          n.kontrollert ? 'Ja' : 'Nei'
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: 10, right: 10 },
      })

      // Generer filnavn
      const dato = new Date().toISOString().split('T')[0]
      const filnavnSafe = anleggsnavn
        .replace(/æ/g, 'ae').replace(/Æ/g, 'AE')
        .replace(/ø/g, 'o').replace(/Ø/g, 'O')
        .replace(/å/g, 'a').replace(/Å/g, 'A')
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
      const fileName = `Nodlysliste_${filnavnSafe}_${dato}.pdf`

      doc.save(fileName)
    } catch (error) {
      console.error('Feil ved eksport til PDF:', error)
      alert('Kunne ikke eksportere til PDF')
    }
  }

  // Hent unike verdier for autocomplete
  function getUniqueValues(field: 'fordeling' | 'kurs' | 'produsent'): string[] {
    const values = nodlysListe
      .map(n => n[field])
      .filter((v): v is string => v !== null && v !== '')
    return Array.from(new Set(values)).sort()
  }

  // Redigerbar celle-komponent
  function EditableCell({ 
    nodlysId, 
    field, 
    value, 
    className = "text-gray-700 dark:text-gray-300" 
  }: { 
    nodlysId: string
    field: string
    value: string | null
    className?: string 
  }) {
    const isEditing = editingCell?.id === nodlysId && editingCell?.field === field
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([])
    const [localValue, setLocalValue] = useState(value || '')
    const inputRef = useRef<HTMLInputElement>(null)
    const selectRef = useRef<HTMLSelectElement>(null)

    // Synkroniser localValue når editing starter
    useEffect(() => {
      if (isEditing) {
        setLocalValue(value || '')
      }
    }, [isEditing, value])

    // Håndter autocomplete for fordeling, kurs, produsent
    const isAutocompleteField = field === 'fordeling' || field === 'kurs' || field === 'produsent'
    const isEtasjeField = field === 'etasje'
    const isTypeField = field === 'type'

    useEffect(() => {
      if (isEditing && isAutocompleteField) {
        const uniqueValues = getUniqueValues(field as 'fordeling' | 'kurs' | 'produsent')
        const filtered = uniqueValues.filter(v => 
          v.toLowerCase().startsWith(localValue.toLowerCase())
        )
        setFilteredSuggestions(filtered)
        setShowSuggestions(filtered.length > 0 && localValue.length > 0)
      }
    }, [localValue, isEditing, isAutocompleteField, field])

    // Focus input/select without scrolling
    useEffect(() => {
      if (isEditing) {
        // Lagre scroll-posisjon før fokusering
        const scrollContainer = document.querySelector('.overflow-x-auto') || window
        const scrollPos = scrollContainer instanceof Window ? window.scrollY : scrollContainer.scrollTop
        
        // Bruk setTimeout for å sikre at DOM er ferdig oppdatert
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus({ preventScroll: true })
          } else if (selectRef.current) {
            selectRef.current.focus({ preventScroll: true })
          }
          
          // Gjenopprett scroll-posisjon som backup
          setTimeout(() => {
            if (scrollContainer instanceof Window) {
              window.scrollTo(0, scrollPos)
            } else {
              scrollContainer.scrollTop = scrollPos
            }
          }, 0)
        }, 0)
      }
    }, [isEditing])

    if (isEditing) {
      // Etasje dropdown
      if (isEtasjeField) {
        return (
          <select
            ref={selectRef}
            value={localValue}
            onChange={(e) => {
              const newValue = e.target.value
              setLocalValue(newValue)
              // Lagre umiddelbart når bruker velger fra dropdown
              setTimeout(() => {
                const updatedList = nodlysListe.map(n => 
                  n.id === nodlysId ? { ...n, [field]: newValue || null } : n
                )
                setNodlysListe(updatedList)
                trackChange(nodlysId, field, newValue || null)
                setEditingCell(null)
              }, 0)
            }}
            onBlur={() => {
              // Backup: lagre hvis ikke allerede lagret
              setTimeout(() => {
                if (editingCell?.id === nodlysId && editingCell?.field === field) {
                  saveInlineEdit(nodlysId, field)
                }
              }, 150)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveInlineEdit(nodlysId, field)
              if (e.key === 'Escape') cancelEditing()
            }}
            className="input py-1 px-2 text-sm w-full"
          >
            <option value="">Velg etasje</option>
            {etasjeOptions.map((etasje) => (
              <option key={etasje} value={etasje}>{etasje}</option>
            ))}
          </select>
        )
      }

      // Type dropdown
      if (isTypeField) {
        return (
          <select
            ref={selectRef}
            value={localValue}
            onChange={(e) => {
              const newValue = e.target.value
              setLocalValue(newValue)
              // Lagre umiddelbart når bruker velger fra dropdown
              setTimeout(() => {
                const updatedList = nodlysListe.map(n => 
                  n.id === nodlysId ? { ...n, [field]: newValue || null } : n
                )
                setNodlysListe(updatedList)
                trackChange(nodlysId, field, newValue || null)
                setEditingCell(null)
              }, 0)
            }}
            onBlur={() => {
              // Backup: lagre hvis ikke allerede lagret
              setTimeout(() => {
                if (editingCell?.id === nodlysId && editingCell?.field === field) {
                  saveInlineEdit(nodlysId, field)
                }
              }, 150)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveInlineEdit(nodlysId, field)
              if (e.key === 'Escape') cancelEditing()
            }}
            className="input py-1 px-2 text-sm w-full"
          >
            <option value="">Velg type</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        )
      }

      // Autocomplete for fordeling, kurs, produsent
      if (isAutocompleteField) {
        return (
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              onBlur={(e) => {
                // Sjekk om klikket var på en suggestion
                const relatedTarget = e.relatedTarget as HTMLElement
                if (relatedTarget?.closest('.suggestion-item')) {
                  return // Ikke lagre hvis vi klikker på en suggestion
                }
                // Delay to allow click events to register first
                setTimeout(() => {
                  // Lagre med localValue
                  const updatedList = nodlysListe.map(n => 
                    n.id === nodlysId ? { ...n, [field]: localValue || null } : n
                  )
                  setNodlysListe(updatedList)
                  trackChange(nodlysId, field, localValue || null)
                  setEditingCell(null)
                  setShowSuggestions(false)
                }, 150)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const updatedList = nodlysListe.map(n => 
                    n.id === nodlysId ? { ...n, [field]: localValue || null } : n
                  )
                  setNodlysListe(updatedList)
                  trackChange(nodlysId, field, localValue || null)
                  setEditingCell(null)
                  setShowSuggestions(false)
                }
                if (e.key === 'Escape') {
                  cancelEditing()
                  setShowSuggestions(false)
                }
              }}
              className="input py-1 px-2 text-sm w-full"
              placeholder={`Skriv eller velg ${field}...`}
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute z-50 w-full bottom-full mb-1 bg-dark-100 border border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredSuggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="suggestion-item w-full text-left px-3 py-2 hover:bg-primary/20 text-gray-300 text-sm transition-colors cursor-pointer"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowSuggestions(false)
                      
                      // Oppdater lokal state
                      const updatedList = nodlysListe.map(n => 
                        n.id === nodlysId ? { ...n, [field]: suggestion } : n
                      )
                      setNodlysListe(updatedList)
                      
                      // Track endringen
                      trackChange(nodlysId, field, suggestion)
                      
                      setEditingCell(null)
                    }}
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      }

      // Standard text input for other fields (inkludert plassering)
      return (
        <input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={() => {
            // Delay to allow click events to register first
            setTimeout(() => {
              // Lagre med localValue
              const updatedList = nodlysListe.map(n => 
                n.id === nodlysId ? { ...n, [field]: localValue || null } : n
              )
              setNodlysListe(updatedList)
              trackChange(nodlysId, field, localValue || null)
              setEditingCell(null)
            }, 150)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const updatedList = nodlysListe.map(n => 
                n.id === nodlysId ? { ...n, [field]: localValue || null } : n
              )
              setNodlysListe(updatedList)
              trackChange(nodlysId, field, localValue || null)
              setEditingCell(null)
            }
            if (e.key === 'Escape') cancelEditing()
          }}
          className="input py-1 px-2 text-sm w-full"
        />
      )
    }

    // Display mode
    const hasUnsavedChange = unsavedChanges.has(nodlysId) && field in (unsavedChanges.get(nodlysId) || {})
    
    return (
      <span
        onClick={() => startEditing(nodlysId, field, value)}
        className={`${className} ${hasUnsavedChange ? 'bg-yellow-500/20 border border-yellow-500/50' : ''} cursor-pointer hover:bg-dark-100 px-2 py-1 rounded transition-colors`}
        title={hasUnsavedChange ? "Ulagret endring - klikk for å redigere" : "Klikk for å redigere"}
      >
        {value || '-'}
      </span>
    )
  }

  const filteredNodlys = nodlysListe.filter(n =>
    (n.plassering?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (n.type?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (n.status?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (n.etasje?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (n.internnummer?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  )

  // Sortering
  const sortedNodlys = [...filteredNodlys].sort((a, b) => {
    switch (sortBy) {
      case 'internnummer':
        return (a.internnummer || '').localeCompare(b.internnummer || '', 'nb-NO', { numeric: true })
      case 'amatur_id':
        return (a.amatur_id || '').localeCompare(b.amatur_id || '', 'nb-NO', { numeric: true })
      case 'fordeling':
        return (a.fordeling || '').localeCompare(b.fordeling || '', 'nb-NO')
      case 'kurs':
        return (a.kurs || '').localeCompare(b.kurs || '', 'nb-NO', { numeric: true })
      case 'plassering':
        return (a.plassering || '').localeCompare(b.plassering || '', 'nb-NO')
      case 'etasje':
        return (a.etasje || '').localeCompare(b.etasje || '', 'nb-NO', { numeric: true })
      case 'type':
        return (a.type || '').localeCompare(b.type || '', 'nb-NO')
      case 'status':
        return (a.status || '').localeCompare(b.status || '', 'nb-NO')
      case 'kontrollert':
        // Ikke kontrollert først, deretter kontrollert
        if (a.kontrollert === b.kontrollert) return 0
        return a.kontrollert ? 1 : -1
      default:
        return 0
    }
  })

  const selectedKundeNavn = kunder.find(k => k.id === selectedKunde)?.navn || ''
  const selectedAnleggNavn = anlegg.find(a => a.id === selectedAnlegg)?.anleggsnavn || ''

  // Vis forhåndsvisning hvis PDF er generert
  if (previewPdf) {
    return (
      <NodlysPreview
        pdfBlob={previewPdf.blob}
        fileName={previewPdf.fileName}
        onBack={() => setPreviewPdf(null)}
        onSave={async () => {
          // Lagre PDF til Supabase Storage
          const storagePath = `anlegg/${selectedAnlegg}/dokumenter/${previewPdf.fileName}`
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
              anlegg_id: selectedAnlegg,
              filnavn: previewPdf.fileName,
              url: urlData?.signedUrl || null,
              type: 'Nødlys Rapport',
              opplastet_dato: new Date().toISOString(),
              storage_path: storagePath
            })

          // Last opp til Dropbox hvis aktivert
          if (dropboxAvailable) {
            try {
              // Hent kundedata for Dropbox-sti
              const { data: anleggData } = await supabase
                .from('anlegg')
                .select(`
                  anleggsnavn,
                  kundenr,
                  customer:kundenr (
                    kunde_nummer,
                    navn
                  )
                `)
                .eq('id', selectedAnlegg)
                .single()

              if (anleggData) {
                const kundeNummer = (anleggData.customer as any)?.kunde_nummer
                const kundeNavnDropbox = (anleggData.customer as any)?.navn

                if (kundeNummer && kundeNavnDropbox) {
                  console.log('📤 Laster opp nødlys-rapport til Dropbox...')
                  const dropboxResult = await uploadKontrollrapportToDropbox(
                    kundeNummer,
                    kundeNavnDropbox,
                    selectedAnleggNavn,
                    previewPdf.fileName,
                    previewPdf.blob
                  )

                  if (dropboxResult.success) {
                    console.log('✅ Nødlys-rapport lastet opp til Dropbox:', dropboxResult.path)
                  } else {
                    console.warn('⚠️ Dropbox-opplasting feilet:', dropboxResult.error)
                  }
                } else {
                  console.warn('⚠️ Kundenummer mangler - kan ikke laste opp til Dropbox')
                }
              }
            } catch (dropboxError) {
              console.error('❌ Feil ved Dropbox-opplasting:', dropboxError)
              // Ikke stopp prosessen hvis Dropbox feiler
            }
          }
        }}
      />
    )
  }

  // Sjekk viewMode først (viktig for å håndtere skjemaer i fullskjerm)
  if (viewMode === 'nettverk') {
    return (
      <NettverkView
        anleggId={selectedAnlegg}
        nettverkListe={nettverkListe}
        onBack={() => setViewMode('list')}
        onUpdate={() => checkNettverk(selectedAnlegg)}
      />
    )
  }

  if (viewMode === 'import') {
    return (
      <NodlysImport
        anleggId={selectedAnlegg}
        onClose={() => setViewMode('list')}
        onImportComplete={async () => {
          await loadNodlys(selectedAnlegg)
        }}
      />
    )
  }

  if (viewMode === 'bulk') {
    return (
      <BulkAddForm
        anleggId={selectedAnlegg}
        onSave={async () => {
          await loadNodlys(selectedAnlegg)
          setViewMode('list')
          setIsFullscreen(true)
        }}
        onCancel={() => {
          setViewMode('list')
          setIsFullscreen(true)
        }}
      />
    )
  }

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <NodlysForm
        nodlys={selectedNodlys}
        anleggId={selectedAnlegg}
        onSave={async () => {
          await loadNodlys(selectedAnlegg)
          setViewMode('list')
          setSelectedNodlys(null)
          setIsFullscreen(true)
        }}
        onCancel={() => {
          setViewMode('list')
          setSelectedNodlys(null)
          setIsFullscreen(true)
        }}
      />
    )
  }

  // Fullskjerm-visning (kun når viewMode === 'list')
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-dark-200 overflow-auto">
        <div className="min-h-screen p-4 sm:p-6">
          {/* Header med lukkeknapp */}
          <div className="flex flex-col gap-4 mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                Nødlysenheter - {selectedKundeNavn} - {selectedAnleggNavn}
                <span className="block sm:inline sm:ml-3 text-sm sm:text-lg text-gray-500 dark:text-gray-400 font-normal mt-1 sm:mt-0">
                  ({sortedNodlys.length} {sortedNodlys.length === 1 ? 'enhet' : 'enheter'})
                </span>
              </h2>
              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 sm:p-3 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors flex-shrink-0 touch-target"
                title="Lukk fullskjerm"
              >
                <Minimize2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setViewMode('bulk')
                }}
                className="btn-primary flex items-center gap-2 text-sm sm:text-base"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden xs:inline">Legg til flere</span>
                <span className="xs:hidden">Flere</span>
              </button>
              <button
                onClick={() => {
                  setSelectedNodlys(null)
                  setViewMode('create')
                }}
                className="btn-primary flex items-center gap-2 text-sm sm:text-base"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden xs:inline">Ny nødlysenhet</span>
                <span className="xs:hidden">Ny</span>
              </button>
              {nodlysListe.length > 0 && (
                <button
                  onClick={async () => {
                    if (!confirm(`Er du sikker på at du vil markere alle ${nodlysListe.length} nødlysenheter som kontrollert?`)) {
                      return
                    }
                    
                    try {
                      setIsSaving(true)
                      
                      // Oppdater alle enheter til kontrollert = true
                      const updates = nodlysListe.map(nodlys => ({
                        id: nodlys.id,
                        kontrollert: true
                      }))
                      
                      // Oppdater i databasen
                      for (const update of updates) {
                        const { error } = await supabase
                          .from('anleggsdata_nodlys')
                          .update({ kontrollert: true })
                          .eq('id', update.id)
                        
                        if (error) throw error
                      }
                      
                      // Oppdater lokal state
                      const updatedList = nodlysListe.map(n => ({ ...n, kontrollert: true }))
                      setNodlysListe(updatedList)
                      setOriginalData(updatedList)
                      setUnsavedChanges(new Map())
                      
                      alert(`✅ Alle ${nodlysListe.length} nødlysenheter er markert som kontrollert`)
                    } catch (error) {
                      console.error('Feil ved oppdatering:', error)
                      alert('Kunne ikke oppdatere alle enheter. Prøv igjen.')
                    } finally {
                      setIsSaving(false)
                    }
                  }}
                  className="btn bg-green-600 hover:bg-green-700 text-white focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm sm:text-base"
                  disabled={isSaving || nodlysListe.every(n => n.kontrollert)}
                  title={nodlysListe.every(n => n.kontrollert) ? 'Alle enheter er allerede kontrollert' : 'Marker alle som kontrollert'}
                >
                  <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden xs:inline">Marker alle som kontrollert</span>
                  <span className="xs:hidden">Alle OK</span>
                </button>
              )}
            </div>
          </div>

          {/* Lagre endringer banner */}
          {unsavedChanges.size > 0 && (
            <div className="mb-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <div>
                    <p className="text-yellow-500 font-medium">
                      {unsavedChanges.size} ulagret{unsavedChanges.size > 1 ? 'e' : ''} endring{unsavedChanges.size > 1 ? 'er' : ''}
                    </p>
                    <p className="text-sm text-gray-400">
                      Endringene dine er ikke lagret til databasen ennå
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={discardChanges}
                    className="btn-secondary text-sm"
                    disabled={isSaving}
                  >
                    Forkast
                  </button>
                  <button
                    onClick={saveAllChanges}
                    className="btn-primary flex items-center gap-2"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Lagrer...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Lagre alle endringer
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tabell i fullskjerm */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-400">Laster nødlysenheter...</p>
            </div>
          ) : sortedNodlys.length === 0 ? (
            <div className="text-center py-12">
              <Lightbulb className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Ingen nødlysenheter funnet</p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-white dark:bg-dark-100 rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium w-24">Intern nr.</th>
                    <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium w-28">Armatur ID</th>
                    <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium w-28">Fordeling</th>
                    <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium w-24">Kurs</th>
                    <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium w-24">Etasje</th>
                    <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium w-40">Plassering</th>
                    <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium w-32">Produsent</th>
                    <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium w-32">Type</th>
                    <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium w-28">Status</th>
                    <th className="text-center py-3 px-4 text-gray-500 dark:text-gray-400 font-medium w-28">Kontrollert</th>
                    <th className="text-right py-3 px-4 text-gray-500 dark:text-gray-400 font-medium w-24">Handlinger</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedNodlys.map((nodlys) => (
                    <tr
                      key={nodlys.id}
                      className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                            <Lightbulb className="w-5 h-5 text-yellow-500" />
                          </div>
                          <EditableCell 
                            nodlysId={nodlys.id} 
                            field="internnummer" 
                            value={nodlys.internnummer}
                            className="text-gray-900 dark:text-white font-medium"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <EditableCell nodlysId={nodlys.id} field="amatur_id" value={nodlys.amatur_id} />
                      </td>
                      <td className="py-3 px-4">
                        <EditableCell nodlysId={nodlys.id} field="fordeling" value={nodlys.fordeling} />
                      </td>
                      <td className="py-3 px-4">
                        <EditableCell nodlysId={nodlys.id} field="kurs" value={nodlys.kurs} />
                      </td>
                      <td className="py-3 px-4">
                        <EditableCell nodlysId={nodlys.id} field="etasje" value={nodlys.etasje} />
                      </td>
                      <td className="py-3 px-4">
                        <EditableCell nodlysId={nodlys.id} field="plassering" value={nodlys.plassering} />
                      </td>
                      <td className="py-3 px-4">
                        <EditableCell nodlysId={nodlys.id} field="produsent" value={nodlys.produsent} />
                      </td>
                      <td className="py-3 px-4">
                        <EditableCell nodlysId={nodlys.id} field="type" value={nodlys.type} />
                      </td>
                      <td className="py-3 px-4">
                        {editingCell?.id === nodlys.id && editingCell?.field === 'status' ? (
                          <select
                            ref={statusSelectRef}
                            value={editValue}
                            onChange={(e) => {
                              const newValue = e.target.value
                              setEditValue(newValue)
                              // Lagre umiddelbart når bruker velger fra dropdown
                              setTimeout(() => {
                                const updatedList = nodlysListe.map(n => 
                                  n.id === nodlys.id ? { ...n, status: newValue || null } : n
                                )
                                setNodlysListe(updatedList)
                                trackChange(nodlys.id, 'status', newValue || null)
                                setEditingCell(null)
                                setEditValue('')
                              }, 0)
                            }}
                            onBlur={() => {
                              // Backup: lagre hvis ikke allerede lagret
                              setTimeout(() => {
                                if (editingCell?.id === nodlys.id && editingCell?.field === 'status') {
                                  saveInlineEdit(nodlys.id, 'status')
                                }
                              }, 150)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveInlineEdit(nodlys.id, 'status')
                              if (e.key === 'Escape') cancelEditing()
                            }}
                            className="input py-1 px-2 text-sm"
                          >
                            <option value="">Velg status</option>
                            {statusTyper.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        ) : (
                          <span
                            onMouseDown={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              startEditing(nodlys.id, 'status', nodlys.status)
                            }}
                            className={`cursor-pointer ${
                              unsavedChanges.has(nodlys.id) && 'status' in (unsavedChanges.get(nodlys.id) || {})
                                ? 'bg-yellow-500/20 border border-yellow-500/50 px-2 py-1 rounded'
                                : ''
                            }`}
                            title={unsavedChanges.has(nodlys.id) && 'status' in (unsavedChanges.get(nodlys.id) || {}) ? "Ulagret endring - klikk for å redigere" : "Klikk for å redigere"}
                          >
                            {nodlys.status ? (
                              <span className={`badge ${
                                nodlys.status === 'OK' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-800' :
                                nodlys.status === 'Defekt' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800' :
                                nodlys.status === 'Mangler' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800' :
                                nodlys.status === 'Batterifeil' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-800' :
                                'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800'
                              }`}>
                                {nodlys.status}
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center">
                          <div className={`${
                            unsavedChanges.has(nodlys.id) && 'kontrollert' in (unsavedChanges.get(nodlys.id) || {})
                              ? 'bg-yellow-500/20 border border-yellow-500/50 px-2 py-1 rounded'
                              : ''
                          }`}>
                            <input
                              type="checkbox"
                              checked={nodlys.kontrollert === true}
                              onChange={(e) => {
                                const newValue = e.target.checked
                                
                                // Oppdater lokal state
                                const updatedList = nodlysListe.map(n => 
                                  n.id === nodlys.id ? { ...n, kontrollert: newValue } : n
                                )
                                setNodlysListe(updatedList)
                                
                                // Track endringen
                                trackChange(nodlys.id, 'kontrollert', newValue)
                              }}
                              className="w-5 h-5 text-green-600 bg-white dark:bg-dark-100 border-gray-300 dark:border-gray-700 rounded focus:ring-green-500 focus:ring-2 cursor-pointer"
                              title={nodlys.kontrollert ? 'Marker som ikke kontrollert' : 'Marker som kontrollert'}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedNodlys(nodlys)
                              setViewMode('edit')
                            }}
                            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                            title="Rediger"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteNodlys(nodlys.id)}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Slett"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              // Sjekk om det finnes ulagrede endringer
              if (unsavedChanges.size > 0) {
                if (!confirm('⚠️ ADVARSEL: Du har ' + unsavedChanges.size + ' ulagret' + (unsavedChanges.size > 1 ? 'e' : '') + ' endring' + (unsavedChanges.size > 1 ? 'er' : '') + '!\n\nHvis du går tilbake nå, vil alle ulagrede endringer gå tapt.\n\nVil du fortsette?')) {
                  return
                }
              }
              
              if (fromAnlegg && state?.anleggId) {
                // Naviger tilbake til anleggsvisningen
                navigate('/anlegg', { state: { viewAnleggId: state.anleggId } })
              } else {
                // Naviger til rapporter-oversikten
                onBack()
              }
            }}
            className="p-2 text-gray-400 hover:text-white hover:bg-dark-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Nødlys</h1>
            <p className="text-gray-600 dark:text-gray-400">Registrer og administrer nødlysarmaturer</p>
          </div>
        </div>
      </div>

      {/* Kunde og Anlegg Velger */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Kunde */}
          <div>
            <Combobox
              label="Velg kunde"
              options={kunder.map(k => ({ id: k.id, label: k.navn }))}
              value={selectedKunde}
              onChange={(val) => {
                // Sjekk om det finnes ulagrede endringer
                if (unsavedChanges.size > 0 && val !== selectedKunde) {
                  if (!confirm('⚠️ ADVARSEL: Du har ' + unsavedChanges.size + ' ulagret' + (unsavedChanges.size > 1 ? 'e' : '') + ' endring' + (unsavedChanges.size > 1 ? 'er' : '') + '!\n\nHvis du bytter kunde nå, vil alle ulagrede endringer gå tapt.\n\nVil du fortsette?')) {
                    return
                  }
                }
                setSelectedKunde(val)
                setSelectedAnlegg('')
              }}
              placeholder="Søk og velg kunde..."
              searchPlaceholder="Skriv for å søke..."
              emptyMessage="Ingen kunder funnet"
            />
          </div>

          {/* Anlegg */}
          <div>
            <Combobox
              label="Velg anlegg"
              options={anlegg.map(a => ({ 
                id: a.id, 
                label: a.anleggsnavn,
                sublabel: a.adresse ? `${a.adresse}${a.poststed ? `, ${a.poststed}` : ''}` : undefined
              }))}
              value={selectedAnlegg}
              onChange={(val) => {
                // Sjekk om det finnes ulagrede endringer
                if (unsavedChanges.size > 0 && val !== selectedAnlegg) {
                  if (!confirm('⚠️ ADVARSEL: Du har ' + unsavedChanges.size + ' ulagret' + (unsavedChanges.size > 1 ? 'e' : '') + ' endring' + (unsavedChanges.size > 1 ? 'er' : '') + '!\n\nHvis du bytter anlegg nå, vil alle ulagrede endringer gå tapt.\n\nVil du fortsette?')) {
                    return
                  }
                }
                setSelectedAnlegg(val)
              }}
              placeholder="Søk og velg anlegg..."
              searchPlaceholder="Skriv for å søke..."
              emptyMessage="Ingen anlegg funnet"
              disabled={!selectedKunde}
            />
          </div>
        </div>
      </div>

      {/* Nødlysliste */}
      {selectedAnlegg && (
        <>
          {/* Valgt anlegg info */}
          <div className="card bg-primary/5 border-primary/20">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Valgt anlegg</p>
                <p className="text-gray-900 dark:text-white font-medium">{selectedKundeNavn} - {selectedAnleggNavn}</p>
              </div>
            </div>
          </div>

          {/* Handlingsknapper */}
          <div className="card">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setViewMode('import')}
                className="btn-secondary flex items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Importer fra Excel/CSV
              </button>
              <button
                onClick={() => setViewMode('nettverk')}
                className="btn-primary flex items-center gap-2"
              >
                <Building2 className="w-5 h-5" />
                {harNettverk ? `Sentralisert anlegg (${nettverkListe.length})` : 'Legg til sentralisert anlegg'}
              </button>
              <button
                onClick={() => setViewMode('bulk')}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Legg til flere
              </button>
              <button
                onClick={() => {
                  setSelectedNodlys(null)
                  setViewMode('create')
                }}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Ny nødlysenhet
              </button>
              {nodlysListe.length > 0 && (
                <button
                  onClick={async () => {
                    if (!confirm(`Er du sikker på at du vil markere alle ${nodlysListe.length} nødlysenheter som kontrollert?`)) {
                      return
                    }
                    
                    try {
                      setIsSaving(true)
                      
                      // Oppdater alle enheter til kontrollert = true
                      const updates = nodlysListe.map(nodlys => ({
                        id: nodlys.id,
                        kontrollert: true
                      }))
                      
                      // Oppdater i databasen
                      for (const update of updates) {
                        const { error } = await supabase
                          .from('anleggsdata_nodlys')
                          .update({ kontrollert: true })
                          .eq('id', update.id)
                        
                        if (error) throw error
                      }
                      
                      // Oppdater lokal state
                      const updatedList = nodlysListe.map(n => ({ ...n, kontrollert: true }))
                      setNodlysListe(updatedList)
                      setOriginalData(updatedList)
                      setUnsavedChanges(new Map())
                      
                      alert(`✅ Alle ${nodlysListe.length} nødlysenheter er markert som kontrollert`)
                    } catch (error) {
                      console.error('Feil ved oppdatering:', error)
                      alert('Kunne ikke oppdatere alle enheter. Prøv igjen.')
                    } finally {
                      setIsSaving(false)
                    }
                  }}
                  className="btn bg-green-600 hover:bg-green-700 text-white focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  disabled={isSaving || nodlysListe.every(n => n.kontrollert)}
                  title={nodlysListe.every(n => n.kontrollert) ? 'Alle enheter er allerede kontrollert' : 'Marker alle som kontrollert'}
                >
                  <Lightbulb className="w-5 h-5" />
                  Marker alle som kontrollert
                </button>
              )}
            </div>
          </div>

          {/* Lagre endringer banner */}
          {unsavedChanges.size > 0 && (
            <div className="card bg-yellow-500/10 border-yellow-500/30">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <div>
                    <p className="text-yellow-500 font-medium">
                      {unsavedChanges.size} ulagret{unsavedChanges.size > 1 ? 'e' : ''} endring{unsavedChanges.size > 1 ? 'er' : ''}
                    </p>
                    <p className="text-sm text-gray-400">
                      Endringene dine er ikke lagret til databasen ennå
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={discardChanges}
                    className="btn-secondary text-sm"
                    disabled={isSaving}
                  >
                    Forkast
                  </button>
                  <button
                    onClick={saveAllChanges}
                    className="btn-primary flex items-center gap-2"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Lagrer...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Lagre alle endringer
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Search and Sort */}
          <div className="card">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Søk etter plassering, type, status..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>
              <div className="md:w-64">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="input"
                >
                  <option value="internnummer">Sorter: Internnummer</option>
                  <option value="amatur_id">Sorter: Armatur ID</option>
                  <option value="fordeling">Sorter: Fordeling</option>
                  <option value="kurs">Sorter: Kurs</option>
                  <option value="plassering">Sorter: Plassering</option>
                  <option value="etasje">Sorter: Etasje</option>
                  <option value="type">Sorter: Type</option>
                  <option value="status">Sorter: Status</option>
                  <option value="kontrollert">Sorter: Ikke kontrollert først</option>
                </select>
              </div>
            </div>
          </div>

          {/* Nødlys Tabell */}
          <div className="card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Nødlysenheter
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 font-normal">
                  ({sortedNodlys.length} {sortedNodlys.length === 1 ? 'enhet' : 'enheter'})
                </span>
              </h2>
              <div className="flex items-center gap-2">
                {/* View toggle */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-dark-100 rounded-lg p-1">
                  <button
                    onClick={() => setDisplayMode('table')}
                    className={`p-2 rounded transition-colors ${
                      displayMode === 'table'
                        ? 'bg-primary text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    title="Tabellvisning"
                  >
                    <Table className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDisplayMode('cards')}
                    className={`p-2 rounded transition-colors ${
                      displayMode === 'cards'
                        ? 'bg-primary text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    title="Kortvisning"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => setIsFullscreen(true)}
                  className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  title="Fullskjerm"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-400">Laster nødlysenheter...</p>
              </div>
            ) : sortedNodlys.length === 0 ? (
              <div className="text-center py-12">
                <Lightbulb className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">
                  {searchTerm ? 'Ingen nødlysenheter funnet' : 'Ingen nødlysenheter registrert ennå'}
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => {
                      setSelectedNodlys(null)
                      setViewMode('create')
                    }}
                    className="btn-primary mt-4"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Legg til første nødlysenhet
                  </button>
                )}
              </div>
            ) : displayMode === 'cards' ? (
              /* Kortvisning - Mobile-vennlig */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedNodlys.map((nodlys) => (
                  <div
                    key={nodlys.id}
                    className="bg-dark-100 rounded-lg p-4 border border-gray-800 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Lightbulb className="w-5 h-5 text-yellow-500" />
                        </div>
                        <div>
                          <p className="text-gray-900 dark:text-white font-medium">{nodlys.internnummer || '-'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Armatur: {nodlys.amatur_id || '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedNodlys(nodlys)
                            setViewMode('edit')
                          }}
                          className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors touch-target"
                          title="Rediger"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteNodlys(nodlys.id)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors touch-target"
                          title="Slett"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Fordeling:</span>
                        <span className="text-gray-700 dark:text-gray-200">{nodlys.fordeling || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Kurs:</span>
                        <span className="text-gray-700 dark:text-gray-200">{nodlys.kurs || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Etasje:</span>
                        <span className="text-gray-700 dark:text-gray-200">{nodlys.etasje || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Plassering:</span>
                        <span className="text-gray-700 dark:text-gray-200 text-right">{nodlys.plassering || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Produsent:</span>
                        <span className="text-gray-700 dark:text-gray-200">{nodlys.produsent || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Type:</span>
                        <span className="text-gray-700 dark:text-gray-200">{nodlys.type || '-'}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-800">
                        <span className="text-gray-400">Status:</span>
                        {nodlys.status ? (
                          <span className={`badge ${
                            nodlys.status === 'OK' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-800' :
                            nodlys.status === 'Defekt' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800' :
                            nodlys.status === 'Mangler' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800' :
                            nodlys.status === 'Batterifeil' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-800' :
                            'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800'
                          }`}>
                            {nodlys.status}
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Kontrollert:</span>
                        <input
                          type="checkbox"
                          checked={nodlys.kontrollert === true}
                          onChange={(e) => {
                            const newValue = e.target.checked
                            const updatedList = nodlysListe.map(n => 
                              n.id === nodlys.id ? { ...n, kontrollert: newValue } : n
                            )
                            setNodlysListe(updatedList)
                            trackChange(nodlys.id, 'kontrollert', newValue)
                          }}
                          className="w-5 h-5 text-green-600 bg-white dark:bg-dark-100 border-gray-300 dark:border-gray-700 rounded focus:ring-green-500 focus:ring-2 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Tabellvisning */
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800">
                      <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium w-24">Intern nr.</th>
                      <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium w-28">Armatur ID</th>
                      <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium w-28">Fordeling</th>
                      <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium w-24">Kurs</th>
                      <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium w-24">Etasje</th>
                      <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium w-40">Plassering</th>
                      <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium w-32">Produsent</th>
                      <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium w-32">Type</th>
                      <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium w-28">Status</th>
                      <th className="text-center py-3 px-4 text-gray-500 dark:text-gray-400 font-medium w-28">Kontrollert</th>
                      <th className="text-right py-3 px-4 text-gray-500 dark:text-gray-400 font-medium w-24">Handlinger</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedNodlys.map((nodlys) => (
                      <tr
                        key={nodlys.id}
                        className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                              <Lightbulb className="w-5 h-5 text-yellow-500" />
                            </div>
                            <EditableCell 
                              nodlysId={nodlys.id} 
                              field="internnummer" 
                              value={nodlys.internnummer}
                              className="text-gray-900 dark:text-white font-medium"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <EditableCell nodlysId={nodlys.id} field="amatur_id" value={nodlys.amatur_id} />
                        </td>
                        <td className="py-3 px-4">
                          <EditableCell nodlysId={nodlys.id} field="fordeling" value={nodlys.fordeling} />
                        </td>
                        <td className="py-3 px-4">
                          <EditableCell nodlysId={nodlys.id} field="kurs" value={nodlys.kurs} />
                        </td>
                        <td className="py-3 px-4">
                          <EditableCell nodlysId={nodlys.id} field="etasje" value={nodlys.etasje} />
                        </td>
                        <td className="py-3 px-4">
                          <EditableCell nodlysId={nodlys.id} field="plassering" value={nodlys.plassering} />
                        </td>
                        <td className="py-3 px-4">
                          <EditableCell nodlysId={nodlys.id} field="produsent" value={nodlys.produsent} />
                        </td>
                        <td className="py-3 px-4">
                          <EditableCell nodlysId={nodlys.id} field="type" value={nodlys.type} />
                        </td>
                        <td className="py-3 px-4">
                          {editingCell?.id === nodlys.id && editingCell?.field === 'status' ? (
                            <select
                              ref={statusSelectRef}
                              value={editValue}
                              onChange={(e) => {
                                const newValue = e.target.value
                                setEditValue(newValue)
                                // Lagre umiddelbart når bruker velger fra dropdown
                                setTimeout(() => {
                                  const updatedList = nodlysListe.map(n => 
                                    n.id === nodlys.id ? { ...n, status: newValue || null } : n
                                  )
                                  setNodlysListe(updatedList)
                                  trackChange(nodlys.id, 'status', newValue || null)
                                  setEditingCell(null)
                                  setEditValue('')
                                }, 0)
                              }}
                              onBlur={() => {
                                // Backup: lagre hvis ikke allerede lagret
                                setTimeout(() => {
                                  if (editingCell?.id === nodlys.id && editingCell?.field === 'status') {
                                    saveInlineEdit(nodlys.id, 'status')
                                  }
                                }, 150)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveInlineEdit(nodlys.id, 'status')
                                if (e.key === 'Escape') cancelEditing()
                              }}
                              className="input py-1 px-2 text-sm"
                            >
                              <option value="">Velg status</option>
                              {statusTyper.map((status) => (
                                <option key={status} value={status}>{status}</option>
                              ))}
                            </select>
                          ) : (
                            <span
                              onMouseDown={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                startEditing(nodlys.id, 'status', nodlys.status)
                              }}
                              className={`cursor-pointer ${
                                unsavedChanges.has(nodlys.id) && 'status' in (unsavedChanges.get(nodlys.id) || {})
                                  ? 'bg-yellow-500/20 border border-yellow-500/50 px-2 py-1 rounded'
                                  : ''
                              }`}
                              title={unsavedChanges.has(nodlys.id) && 'status' in (unsavedChanges.get(nodlys.id) || {}) ? "Ulagret endring - klikk for å redigere" : "Klikk for å redigere"}
                            >
                              {nodlys.status ? (
                                <span className={`badge ${
                                  nodlys.status === 'OK' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-800' :
                                  nodlys.status === 'Defekt' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800' :
                                  nodlys.status === 'Mangler' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800' :
                                  nodlys.status === 'Batterifeil' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-800' :
                                  'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800'
                                }`}>
                                  {nodlys.status}
                                </span>
                              ) : (
                                <span className="text-gray-500">-</span>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center">
                            <div className={`${
                              unsavedChanges.has(nodlys.id) && 'kontrollert' in (unsavedChanges.get(nodlys.id) || {})
                                ? 'bg-yellow-500/20 border border-yellow-500/50 px-2 py-1 rounded'
                                : ''
                            }`}>
                              <input
                                type="checkbox"
                                checked={nodlys.kontrollert === true}
                                onChange={(e) => {
                                  const newValue = e.target.checked
                                  
                                  // Oppdater lokal state
                                  const updatedList = nodlysListe.map(n => 
                                    n.id === nodlys.id ? { ...n, kontrollert: newValue } : n
                                  )
                                  setNodlysListe(updatedList)
                                  
                                  // Track endringen
                                  trackChange(nodlys.id, 'kontrollert', newValue)
                                }}
                                className="w-5 h-5 text-green-600 bg-dark-100 border-gray-700 rounded focus:ring-green-500 focus:ring-2 cursor-pointer"
                                title={nodlys.kontrollert ? 'Marker som ikke kontrollert' : 'Marker som kontrollert'}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedNodlys(nodlys)
                                setViewMode('edit')
                              }}
                              className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                              title="Rediger"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteNodlys(nodlys.id)}
                              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Slett"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Fullfør kontroll - Samlet seksjon */}
          <div className="card bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                <ClipboardCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Fullfør kontroll</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Sjekkliste før du genererer rapport</p>
              </div>
            </div>

            {/* Sjekkliste */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Status 1: Enheter kontrollert */}
              <div className={`p-4 rounded-xl border-2 transition-all ${
                nodlysListe.every(n => n.kontrollert) 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' 
                  : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    nodlysListe.every(n => n.kontrollert)
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                  }`}>
                    {nodlysListe.every(n => n.kontrollert) ? '✓' : '1'}
                  </div>
                  <div>
                    <p className={`font-medium ${nodlysListe.every(n => n.kontrollert) ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      Enheter kontrollert
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {nodlysListe.filter(n => n.kontrollert).length} av {nodlysListe.length} enheter
                    </p>
                  </div>
                </div>
              </div>

              {/* Status 2: Evakueringsplan */}
              <div className={`p-4 rounded-xl border-2 transition-all ${
                evakueringsplanStatus 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' 
                  : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    evakueringsplanStatus
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                  }`}>
                    {evakueringsplanStatus ? '✓' : '2'}
                  </div>
                  <div>
                    <p className={`font-medium ${evakueringsplanStatus ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      Evakueringsplan
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {evakueringsplanStatus || 'Ikke satt'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status 3: Dato valgt */}
              <div className="p-4 rounded-xl border-2 bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-500 text-white">
                    ✓
                  </div>
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-400">Kontrolldato</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {kontrolldato.toLocaleDateString('nb-NO')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Evakueringsplan dropdown */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Evakueringsplaner status
                  </label>
                  <select
                    value={evakueringsplanStatus}
                    onChange={(e) => {
                      setEvakueringsplanStatus(e.target.value)
                      // Auto-lagre når bruker velger
                      setTimeout(() => saveEvakueringsplan(), 100)
                    }}
                    className="input"
                  >
                    <option value="">Velg status</option>
                    <option value="Ja">✓ Ja - I orden</option>
                    <option value="Nei">✗ Nei - Mangler</option>
                    <option value="Må oppdateres">⚠ Må oppdateres</option>
                  </select>
                </div>
                <div>
                  <KontrolldatoVelger
                    kontrolldato={kontrolldato}
                    onDatoChange={setKontrolldato}
                    label="Kontrolldato"
                  />
                </div>
              </div>
            </div>

            {/* Hovedhandling - Stor knapp */}
            <button
              onClick={() => genererPDF('save')}
              disabled={loading || nodlysListe.length === 0}
              className="w-full py-4 px-6 bg-primary hover:bg-primary/90 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold text-lg rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
            >
              <Save className="w-6 h-6" />
              Generer rapport
            </button>

            {/* Sekundære handlinger */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
              <button
                onClick={() => genererPDF('preview')}
                disabled={loading || nodlysListe.length === 0}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <Eye className="w-4 h-4" />
                Forhåndsvis
              </button>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <button
                onClick={() => genererPDF('save')}
                disabled={loading || nodlysListe.length === 0}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                Kun lagre
              </button>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <button
                onClick={eksporterTilExcel}
                disabled={nodlysListe.length === 0}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </button>
            </div>
          </div>

          {/* Kommentarer seksjon */}
          <KommentarViewNodlys
            anleggId={selectedAnlegg}
            kundeNavn={kunder.find(k => k.id === selectedKunde)?.navn || ''}
            anleggNavn={anlegg.find(a => a.id === selectedAnlegg)?.anleggsnavn || ''}
            onBack={() => {}}
          />
        </>
      )}

      {/* Dialog for å sette tjeneste til fullført */}
      <TjenesteFullfortDialog
        tjeneste="Nødlys"
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

// Nødlys Form Component
interface NodlysFormProps {
  nodlys: NodlysEnhet | null
  anleggId: string
  onSave: () => void
  onCancel: () => void
}

function NodlysForm({ nodlys, anleggId, onSave, onCancel }: NodlysFormProps) {
  const { isOnline, queueInsert, queueUpdate } = useOfflineQueue()
  const [formData, setFormData] = useState({
    internnummer: nodlys?.internnummer || '',
    amatur_id: nodlys?.amatur_id || '',
    fordeling: nodlys?.fordeling || '',
    kurs: nodlys?.kurs || '',
    etasje: nodlys?.etasje || '',
    type: nodlys?.type || '',
    produsent: nodlys?.produsent || '',
    plassering: nodlys?.plassering || '',
    status: nodlys?.status || 'OK',
    kontrollert: nodlys?.kontrollert || false,
  })
  const [saving, setSaving] = useState(false)
  const [fordelingOptions, setFordelingOptions] = useState<string[]>([])
  const [kursOptions, setKursOptions] = useState<string[]>([])
  const [produsentOptions, setProdusentOptions] = useState<string[]>([])
  const [showFordelingSuggestions, setShowFordelingSuggestions] = useState(false)
  const [showKursSuggestions, setShowKursSuggestions] = useState(false)
  const [showProdusentSuggestions, setShowProdusentSuggestions] = useState(false)
  const [nesteInternnummer, setNesteInternnummer] = useState<number | null>(null)

  // Hent unike verdier fra eksisterende nødlysenheter og beregn neste internnummer
  useEffect(() => {
    async function loadOptions() {
      try {
        const { data, error } = await supabase
          .from('anleggsdata_nodlys')
          .select('fordeling, kurs, produsent, internnummer')
          .eq('anlegg_id', anleggId)

        if (error) throw error
        
        if (data) {
          const fordelinger = Array.from(new Set(data.map(d => d.fordeling).filter((v): v is string => v !== null && v !== ''))).sort()
          const kurser = Array.from(new Set(data.map(d => d.kurs).filter((v): v is string => v !== null && v !== ''))).sort()
          const produsenter = Array.from(new Set(data.map(d => d.produsent).filter((v): v is string => v !== null && v !== ''))).sort()
          
          setFordelingOptions(fordelinger)
          setKursOptions(kurser)
          setProdusentOptions(produsenter)

          // Beregn neste internnummer hvis vi oppretter ny enhet
          if (!nodlys) {
            const internnumre = data
              .map(d => parseInt(d.internnummer || '0'))
              .filter(n => !isNaN(n) && n > 0)
            
            const maxNummer = internnumre.length > 0 ? Math.max(...internnumre) : 0
            const neste = maxNummer + 1
            setNesteInternnummer(neste)
            setFormData(prev => ({ ...prev, internnummer: neste.toString() }))
          }
        }
      } catch (error) {
        console.error('Feil ved lasting av alternativer:', error)
      }
    }
    loadOptions()
  }, [anleggId, nodlys])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const dataToSave = {
        anlegg_id: anleggId,
        internnummer: formData.internnummer || null,
        amatur_id: formData.amatur_id || null,
        fordeling: formData.fordeling || null,
        kurs: formData.kurs || null,
        etasje: formData.etasje || null,
        type: formData.type || null,
        produsent: formData.produsent || null,
        plassering: formData.plassering || null,
        status: formData.status || null,
        kontrollert: formData.kontrollert,
      }

      if (nodlys) {
        // Update
        if (isOnline) {
          const { error } = await supabase
            .from('anleggsdata_nodlys')
            .update(dataToSave)
            .eq('id', nodlys.id)

          if (error) throw error
        } else {
          queueUpdate('anleggsdata_nodlys', { id: nodlys.id, ...dataToSave })
          console.log('📝 Endring lagret lokalt - synkroniseres når du er online igjen')
        }
      } else {
        // Create
        if (isOnline) {
          const { error } = await supabase
            .from('anleggsdata_nodlys')
            .insert([dataToSave])

          if (error) throw error
        } else {
          queueInsert('anleggsdata_nodlys', dataToSave)
          console.log('📝 Ny enhet lagret lokalt - synkroniseres når du er online igjen')
        }
      }

      onSave()
    } catch (error) {
      console.error('Feil ved lagring:', error)
      alert('Kunne ikke lagre nødlysenhet')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-white hover:bg-dark-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {nodlys ? 'Rediger nødlysenhet' : 'Ny nødlysenhet'}
          </h1>
          <p className="text-gray-400">
            {nodlys ? 'Oppdater nødlysinformasjon' : 'Registrer ny nødlysarmatur'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Internnummer */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Internnummer
              {!nodlys && nesteInternnummer && (
                <span className="ml-2 text-xs text-green-400">
                  (Foreslått: {nesteInternnummer})
                </span>
              )}
            </label>
            <input
              type="text"
              value={formData.internnummer}
              onChange={(e) => setFormData({ ...formData, internnummer: e.target.value })}
              className="input"
              placeholder={nesteInternnummer ? `Foreslått: ${nesteInternnummer}` : "F.eks. 1, 2, 3, etc."}
            />
          </div>

          {/* Armatur ID */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Armatur ID
            </label>
            <input
              type="text"
              value={formData.amatur_id}
              onChange={(e) => setFormData({ ...formData, amatur_id: e.target.value })}
              className="input"
              placeholder="Armatur-identifikator"
            />
          </div>

          {/* Plassering */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Plassering
            </label>
            <input
              type="text"
              value={formData.plassering}
              onChange={(e) => setFormData({ ...formData, plassering: e.target.value })}
              className="input"
              placeholder="F.eks. Gang, Over hoveddør, etc."
            />
          </div>

          {/* Fordeling */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Fordeling
            </label>
            <input
              type="text"
              value={formData.fordeling}
              onChange={(e) => {
                setFormData({ ...formData, fordeling: e.target.value })
                setShowFordelingSuggestions(e.target.value.length > 0)
              }}
              onFocus={() => setShowFordelingSuggestions(formData.fordeling.length > 0)}
              onBlur={() => setTimeout(() => setShowFordelingSuggestions(false), 200)}
              className="input"
              placeholder="Skriv eller velg fordeling"
            />
            {showFordelingSuggestions && fordelingOptions.filter(opt => 
              opt.toLowerCase().includes(formData.fordeling.toLowerCase())
            ).length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-dark-100 border border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {fordelingOptions
                  .filter(opt => opt.toLowerCase().includes(formData.fordeling.toLowerCase()))
                  .map((option, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        setFormData({ ...formData, fordeling: option })
                        setShowFordelingSuggestions(false)
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-primary/20 text-gray-300 text-sm transition-colors"
                    >
                      {option}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Kurs */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Kurs
            </label>
            <input
              type="text"
              value={formData.kurs}
              onChange={(e) => {
                setFormData({ ...formData, kurs: e.target.value })
                setShowKursSuggestions(e.target.value.length > 0)
              }}
              onFocus={() => setShowKursSuggestions(formData.kurs.length > 0)}
              onBlur={() => setTimeout(() => setShowKursSuggestions(false), 200)}
              className="input"
              placeholder="Skriv eller velg kurs"
            />
            {showKursSuggestions && kursOptions.filter(opt => 
              opt.toLowerCase().includes(formData.kurs.toLowerCase())
            ).length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-dark-100 border border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {kursOptions
                  .filter(opt => opt.toLowerCase().includes(formData.kurs.toLowerCase()))
                  .map((option, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        setFormData({ ...formData, kurs: option })
                        setShowKursSuggestions(false)
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-primary/20 text-gray-300 text-sm transition-colors"
                    >
                      {option}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Etasje */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Etasje
            </label>
            <select
              value={formData.etasje}
              onChange={(e) => setFormData({ ...formData, etasje: e.target.value })}
              className="input"
            >
              <option value="">Velg etasje</option>
              {etasjeOptions.map((etasje) => (
                <option key={etasje} value={etasje}>{etasje}</option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="input"
            >
              <option value="">Velg type</option>
              {typeOptions.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Produsent */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Produsent
            </label>
            <input
              type="text"
              value={formData.produsent}
              onChange={(e) => {
                setFormData({ ...formData, produsent: e.target.value })
                setShowProdusentSuggestions(e.target.value.length > 0)
              }}
              onFocus={() => setShowProdusentSuggestions(formData.produsent.length > 0)}
              onBlur={() => setTimeout(() => setShowProdusentSuggestions(false), 200)}
              className="input"
              placeholder="Skriv eller velg produsent"
            />
            {showProdusentSuggestions && produsentOptions.filter(opt => 
              opt.toLowerCase().includes(formData.produsent.toLowerCase())
            ).length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-dark-100 border border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {produsentOptions
                  .filter(opt => opt.toLowerCase().includes(formData.produsent.toLowerCase()))
                  .map((option, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        setFormData({ ...formData, produsent: option })
                        setShowProdusentSuggestions(false)
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-primary/20 text-gray-300 text-sm transition-colors"
                    >
                      {option}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="input"
            >
              <option value="">Velg status</option>
              {statusTyper.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          {/* Kontrollert */}
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.kontrollert}
                onChange={(e) => setFormData({ ...formData, kontrollert: e.target.checked })}
                className="w-4 h-4 text-primary bg-dark-100 border-gray-700 rounded focus:ring-primary focus:ring-2"
              />
              <span className="text-sm font-medium text-gray-300">Kontrollert</span>
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-gray-800">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Lagrer...' : nodlys ? 'Oppdater' : 'Opprett'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
          >
            Avbryt
          </button>
        </div>
      </form>
    </div>
  )
}

// Nettverk View Component
interface NettverkViewProps {
  anleggId: string
  nettverkListe: NettverkEnhet[]
  onBack: () => void
  onUpdate: () => void
}

function NettverkView({ anleggId, nettverkListe, onBack, onUpdate }: NettverkViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<NettverkEnhet>>({})
  const [isCreating, setIsCreating] = useState(false)

  async function saveNettverk() {
    try {
      if (isCreating) {
        // Opprett ny
        const { error } = await supabase
          .from('nettverk_nodlys')
          .insert([{ ...editData, anlegg_id: anleggId }])

        if (error) throw error
      } else if (editingId) {
        // Oppdater eksisterende
        const { error } = await supabase
          .from('nettverk_nodlys')
          .update(editData)
          .eq('id', editingId)

        if (error) throw error
      }
      
      setEditingId(null)
      setEditData({})
      setIsCreating(false)
      onUpdate()
    } catch (error) {
      console.error('Feil ved lagring:', error)
      alert('Kunne ikke lagre endringer')
    }
  }

  function startCreate() {
    setIsCreating(true)
    setEditingId(null)
    setEditData({})
  }

  function cancelEdit() {
    setEditingId(null)
    setEditData({})
    setIsCreating(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 text-gray-400 hover:text-white hover:bg-dark-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Sentralisert nødlysanlegg</h1>
          <p className="text-gray-400">Nettverksenheter for dette anlegget</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            Nettverksenheter ({nettverkListe.length})
          </h2>
          <button
            onClick={startCreate}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Ny nettverksenhet
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Nettverk ID</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Plassering</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Type</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">AH</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Spenning</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Batterialder</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Handlinger</th>
              </tr>
            </thead>
            <tbody>
              {nettverkListe.map((enhet) => (
                <tr key={enhet.id} className="border-b border-gray-800 hover:bg-dark-100">
                  <td className="py-3 px-4 text-gray-300">{enhet.nettverk_id || '-'}</td>
                  <td className="py-3 px-4 text-gray-300">{enhet.plassering || '-'}</td>
                  <td className="py-3 px-4 text-gray-300">{enhet.type || '-'}</td>
                  <td className="py-3 px-4 text-gray-300">{enhet.ah || '-'}</td>
                  <td className="py-3 px-4 text-gray-300">{enhet.spenning || '-'}</td>
                  <td className="py-3 px-4 text-gray-300">{enhet.batterialder || '-'}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingId(enhet.id)
                          setEditData(enhet)
                        }}
                        className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                        title="Rediger"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(editingId || isCreating) && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">
            {isCreating ? 'Ny nettverksenhet' : 'Rediger nettverksenhet'}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Nettverk ID</label>
              <input
                type="text"
                value={editData.nettverk_id || ''}
                onChange={(e) => setEditData({ ...editData, nettverk_id: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Plassering</label>
              <input
                type="text"
                value={editData.plassering || ''}
                onChange={(e) => setEditData({ ...editData, plassering: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
              <input
                type="text"
                value={editData.type || ''}
                onChange={(e) => setEditData({ ...editData, type: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">AH</label>
              <input
                type="text"
                value={editData.ah || ''}
                onChange={(e) => setEditData({ ...editData, ah: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Spenning</label>
              <input
                type="text"
                value={editData.spenning || ''}
                onChange={(e) => setEditData({ ...editData, spenning: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Batterialder</label>
              <input
                type="number"
                value={editData.batterialder || ''}
                onChange={(e) => setEditData({ ...editData, batterialder: parseInt(e.target.value) || null })}
                className="input"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button onClick={saveNettverk} className="btn-primary">
              {isCreating ? 'Opprett' : 'Lagre'}
            </button>
            <button onClick={cancelEdit} className="btn-secondary">Avbryt</button>
          </div>
        </div>
      )}
    </div>
  )
}

// Bulk Add Form Component
interface BulkAddFormProps {
  anleggId: string
  onSave: () => void
  onCancel: () => void
}

function BulkAddForm({ anleggId, onSave, onCancel }: BulkAddFormProps) {
  const { isOnline, queueInsert } = useOfflineQueue()
  const [antall, setAntall] = useState(5)
  const [saving, setSaving] = useState(false)
  const [startNummer, setStartNummer] = useState<number>(1)

  // Hent neste ledige internnummer
  useEffect(() => {
    async function getNesteNummer() {
      try {
        const { data, error } = await supabase
          .from('anleggsdata_nodlys')
          .select('internnummer')
          .eq('anlegg_id', anleggId)

        if (error) throw error
        
        if (data) {
          const internnumre = data
            .map(d => parseInt(d.internnummer || '0'))
            .filter(n => !isNaN(n) && n > 0)
          
          const maxNummer = internnumre.length > 0 ? Math.max(...internnumre) : 0
          setStartNummer(maxNummer + 1)
        }
      } catch (error) {
        console.error('Feil ved henting av neste nummer:', error)
      }
    }
    getNesteNummer()
  }, [anleggId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (antall < 1 || antall > 25) {
      alert('Antall må være mellom 1 og 25')
      return
    }

    setSaving(true)

    try {
      // Opprett array med nødlysenheter med automatisk nummerering
      const nyeEnheter = Array.from({ length: antall }, (_, index) => ({
        anlegg_id: anleggId,
        internnummer: (startNummer + index).toString(),
        amatur_id: null,
        fordeling: null,
        kurs: null,
        etasje: null,
        type: null,
        produsent: null,
        plassering: null,
        status: null,
        kontrollert: false,
      }))

      if (isOnline) {
        const { error } = await supabase
          .from('anleggsdata_nodlys')
          .insert(nyeEnheter)

        if (error) throw error
      } else {
        // Offline: legg alle enheter i kø
        nyeEnheter.forEach(enhet => {
          queueInsert('anleggsdata_nodlys', enhet)
        })
        console.log(`📝 ${antall} nye enheter lagret lokalt - synkroniseres når du er online igjen`)
      }

      onSave()
    } catch (error) {
      console.error('Feil ved opprettelse:', error)
      alert('Kunne ikke opprette nødlysenheter')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-white hover:bg-dark-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Legg til flere nødlysenheter</h1>
          <p className="text-gray-400">Opprett flere tomme rader som du kan fylle ut etterpå</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div className="max-w-md">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Antall enheter å opprette <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={antall}
            onChange={(e) => setAntall(parseInt(e.target.value) || 0)}
            className="input"
            min="1"
            max="25"
            required
          />
          <p className="text-sm text-gray-400 mt-2">
            Maks 25 enheter om gangen. Internnummer vil automatisk bli satt fra <span className="text-green-400 font-semibold">{startNummer}</span> til <span className="text-green-400 font-semibold">{startNummer + antall - 1}</span>.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-gray-800">
          <button
            type="submit"
            disabled={saving || antall < 1 || antall > 25}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Oppretter...' : `Opprett ${antall} ${antall === 1 ? 'enhet' : 'enheter'}`}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
          >
            Avbryt
          </button>
        </div>
      </form>

      <div className="card bg-blue-900/10 border-blue-800/30">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Tips</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Internnummer settes automatisk basert på eksisterende enheter</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Klikk på en celle i tabellen for å redigere</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Autocomplete for Fordeling, Kurs og Produsent basert på tidligere verdier</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Perfekt når du skal registrere mange nødlys raskt</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
