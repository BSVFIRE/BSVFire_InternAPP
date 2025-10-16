import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Plus, Search, Lightbulb, Edit, Trash2, Building2, FileDown, Eye, Maximize2, Minimize2 } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useOfflineQueue } from '@/hooks/useOffline'
import { cacheData } from '@/lib/offline'
import { NodlysPreview } from './NodlysPreview'

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
}

const statusTyper = ['OK', 'Defekt', 'Mangler', 'Utskiftet']

export function Nodlys({ onBack }: NodlysProps) {
  const location = useLocation()
  const state = location.state as { kundeId?: string; anleggId?: string } | null
  const { isOnline, queueUpdate } = useOfflineQueue()
  
  const [kunder, setKunder] = useState<Kunde[]>([])
  const [anlegg, setAnlegg] = useState<Anlegg[]>([])
  const [nodlysListe, setNodlysListe] = useState<NodlysEnhet[]>([])
  const [nettverkListe, setNettverkListe] = useState<NettverkEnhet[]>([])
  const [harNettverk, setHarNettverk] = useState(false)
  const [kommentar, setKommentar] = useState('')
  const [evakueringsplanStatus, setEvakueringsplanStatus] = useState('')
  const [kommentarId, setKommentarId] = useState<string | null>(null)
  const [selectedKunde, setSelectedKunde] = useState(state?.kundeId || '')
  const [selectedAnlegg, setSelectedAnlegg] = useState(state?.anleggId || '')
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit' | 'bulk' | 'nettverk'>('list')
  const [selectedNodlys, setSelectedNodlys] = useState<NodlysEnhet | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [kundeSok, setKundeSok] = useState('')
  const [anleggSok, setAnleggSok] = useState('')
  const [sortBy, setSortBy] = useState<'internnummer' | 'amatur_id' | 'fordeling' | 'kurs' | 'plassering' | 'etasje' | 'type' | 'status' | 'kontrollert'>('internnummer')
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [previewPdf, setPreviewPdf] = useState<{ blob: Blob; fileName: string } | null>(null)

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
      loadNodlys(selectedAnlegg)
      checkNettverk(selectedAnlegg)
      loadKommentar(selectedAnlegg)
    } else {
      setNodlysListe([])
      setNettverkListe([])
      setHarNettverk(false)
      setKommentar('')
      setEvakueringsplanStatus('')
      setKommentarId(null)
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
        // Cache data for offline use
        cacheData(`nodlys_${anleggId}`, data || [])
      } else {
        // Offline: bruk cached data
        const { getCachedData } = await import('@/lib/offline')
        const cached = getCachedData<NodlysEnhet[]>(`nodlys_${anleggId}`)
        if (cached) {
          setNodlysListe(cached)
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

  async function loadKommentar(anleggId: string) {
    try {
      const { data, error } = await supabase
        .from('kommentar_nodlys')
        .select('*')
        .eq('anlegg_id', anleggId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      
      if (data) {
        setKommentar(data.kommentar || '')
        setEvakueringsplanStatus(data.evakueringsplan_status || '')
        setKommentarId(data.id)
      }
    } catch (error) {
      console.error('Feil ved lasting av kommentar:', error)
    }
  }

  async function saveKommentar() {
    try {
      if (kommentarId) {
        // Oppdater eksisterende
        const { error } = await supabase
          .from('kommentar_nodlys')
          .update({
            kommentar,
            evakueringsplan_status: evakueringsplanStatus
          })
          .eq('id', kommentarId)

        if (error) throw error
      } else {
        // Opprett ny
        const { data, error } = await supabase
          .from('kommentar_nodlys')
          .insert([{
            anlegg_id: selectedAnlegg,
            kommentar,
            evakueringsplan_status: evakueringsplanStatus
          }])
          .select()
          .single()

        if (error) throw error
        if (data) setKommentarId(data.id)
      }
      
      alert('Kommentar lagret!')
    } catch (error) {
      console.error('Feil ved lagring av kommentar:', error)
      alert('Kunne ikke lagre kommentar')
    }
  }

  async function deleteNodlys(id: string) {
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

  async function saveInlineEdit(id: string, field: string) {
    try {
      const updateData = { id, [field]: editValue || null }
      
      if (isOnline) {
        // Online: oppdater direkte i databasen
        const { error } = await supabase
          .from('anleggsdata_nodlys')
          .update({ [field]: editValue || null })
          .eq('id', id)

        if (error) throw error
      } else {
        // Offline: legg i kø for senere synkronisering
        queueUpdate('anleggsdata_nodlys', updateData)
        console.log('📝 Endring lagret lokalt - synkroniseres når du er online igjen')
      }

      // Oppdater lokal state uansett (optimistisk oppdatering)
      const updatedList = nodlysListe.map(n => 
        n.id === id ? { ...n, [field]: editValue || null } : n
      )
      setNodlysListe(updatedList)
      
      // Cache oppdatert liste
      cacheData(`nodlys_${selectedAnlegg}`, updatedList)
      
      setEditingCell(null)
      setEditValue('')
    } catch (error) {
      console.error('Feil ved oppdatering:', error)
      alert('Kunne ikke oppdatere felt')
    }
  }

  function cancelEditing() {
    setEditingCell(null)
    setEditValue('')
  }

  async function genererPDF(forhandsvisning: boolean = false) {
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

      // Header
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('NØDLYSRAPPORT', pageWidth / 2, yPos, { align: 'center' })
      yPos += 15

      // Kunde og anlegg info
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Kunde:', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(kundeData?.navn || selectedKundeNavn || '-', 50, yPos)
      yPos += 7

      doc.setFont('helvetica', 'bold')
      doc.text('Anlegg:', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(anleggData?.anleggsnavn || '-', 50, yPos)
      yPos += 7

      if (anleggData?.adresse) {
        doc.setFont('helvetica', 'bold')
        doc.text('Adresse:', 20, yPos)
        doc.setFont('helvetica', 'normal')
        doc.text(`${anleggData.adresse}, ${anleggData.postnummer || ''} ${anleggData.poststed || ''}`, 50, yPos)
        yPos += 7
      }

      yPos += 2

      // Dato
      doc.setFont('helvetica', 'bold')
      doc.text('Dato:', 20, yPos)
      doc.setFont('helvetica', 'normal')
      const idag = new Date()
      doc.text(idag.toLocaleDateString('nb-NO'), 50, yPos)
      yPos += 7

      // Neste kontroll (12 måneder fram)
      const nesteKontroll = new Date(idag)
      nesteKontroll.setMonth(nesteKontroll.getMonth() + 12)
      doc.setFont('helvetica', 'bold')
      doc.text('Neste kontroll:', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(nesteKontroll.toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' }), 50, yPos)
      yPos += 10

      // Kontaktperson
      if (primaerKontakt?.navn) {
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('Kontaktperson:', 20, yPos)
        doc.setFont('helvetica', 'normal')
        yPos += 5
        doc.text(primaerKontakt.navn, 20, yPos)
        yPos += 4
        if (primaerKontakt.telefon) {
          doc.text(`Tlf: ${primaerKontakt.telefon}`, 20, yPos)
          yPos += 4
        }
        if (primaerKontakt.epost) {
          doc.text(`E-post: ${primaerKontakt.epost}`, 20, yPos)
          yPos += 4
        }
        yPos += 4
      }

      // Utført av
      if (tekniker?.navn) {
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('Utført av:', 20, yPos)
        doc.setFont('helvetica', 'normal')
        yPos += 5
        doc.text(tekniker.navn, 20, yPos)
        yPos += 4
        if (tekniker.telefon) {
          doc.text(`Tlf: ${tekniker.telefon}`, 20, yPos)
          yPos += 4
        }
        if (tekniker.epost) {
          doc.text(`E-post: ${tekniker.epost}`, 20, yPos)
          yPos += 4
        }
        yPos += 4
      }

      yPos += 5

      // Oppsummering
      const totalt = nodlysListe.length
      const ok = nodlysListe.filter(n => n.status === 'OK').length
      const defekt = nodlysListe.filter(n => n.status === 'Defekt').length
      const kontrollert = nodlysListe.filter(n => n.kontrollert).length

      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('OPPSUMMERING', 20, yPos)
      yPos += 10

      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(`Totalt antall nødlysenheter: ${totalt}`, 20, yPos)
      yPos += 6
      doc.text(`Kontrollert: ${kontrollert} av ${totalt}`, 20, yPos)
      yPos += 6
      doc.text(`Status OK: ${ok}`, 20, yPos)
      yPos += 6
      doc.text(`Defekte: ${defekt}`, 20, yPos)
      yPos += 15

      // Evakueringsplan og kommentar
      if (evakueringsplanStatus || kommentar) {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('TILLEGGSINFORMASJON', 20, yPos)
        yPos += 10

        doc.setFontSize(11)
        
        if (evakueringsplanStatus) {
          doc.setFont('helvetica', 'bold')
          doc.text('Evakueringsplaner:', 20, yPos)
          doc.setFont('helvetica', 'normal')
          doc.text(evakueringsplanStatus, 70, yPos)
          yPos += 7
        }

        if (kommentar) {
          doc.setFont('helvetica', 'bold')
          doc.text('Kommentar:', 20, yPos)
          yPos += 6
          doc.setFont('helvetica', 'normal')
          const kommentarLines = doc.splitTextToSize(kommentar, pageWidth - 40)
          doc.text(kommentarLines, 20, yPos)
          yPos += (kommentarLines.length * 6) + 5
        }
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

      const pdfBlob = doc.output('blob')
      const fileName = `Rapport_Nodlys_${new Date().getFullYear()}_${(anleggData?.anleggsnavn || 'Anlegg').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`

      if (forhandsvisning) {
        // Vis forhåndsvisning i samme vindu
        setPreviewPdf({ blob: pdfBlob, fileName })
      } else {
        // Lagre PDF til Supabase Storage
        const pdfBlob = doc.output('blob')
        const fileName = `Rapport_Nodlys_${new Date().getFullYear()}_${(anleggData?.anleggsnavn || 'Anlegg').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
        
        const { error: uploadError } = await supabase.storage
          .from('rapporter')
          .upload(`${selectedAnlegg}/${fileName}`, pdfBlob, {
            contentType: 'application/pdf',
            upsert: true
          })

        if (uploadError) throw uploadError

        // Last ned PDF også
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

  // Redigerbar celle-komponent
  function EditableCell({ 
    nodlysId, 
    field, 
    value, 
    className = "text-gray-300" 
  }: { 
    nodlysId: string
    field: string
    value: string | null
    className?: string 
  }) {
    const isEditing = editingCell?.id === nodlysId && editingCell?.field === field

    if (isEditing) {
      return (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => saveInlineEdit(nodlysId, field)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveInlineEdit(nodlysId, field)
            if (e.key === 'Escape') cancelEditing()
          }}
          autoFocus
          className="input py-1 px-2 text-sm w-full"
        />
      )
    }

    return (
      <span
        onDoubleClick={() => startEditing(nodlysId, field, value)}
        className={`${className} cursor-pointer hover:bg-dark-100 px-2 py-1 rounded transition-colors`}
        title="Dobbeltklikk for å redigere"
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
          const { error: uploadError } = await supabase.storage
            .from('rapporter')
            .upload(`${selectedAnlegg}/${previewPdf.fileName}`, previewPdf.blob, {
              contentType: 'application/pdf',
              upsert: true
            })

          if (uploadError) throw uploadError
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
      <div className="fixed inset-0 z-50 bg-dark-200 overflow-auto">
        <div className="min-h-screen p-4">
          {/* Header med lukkeknapp */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-800">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-white">
                Nødlysenheter - {selectedKundeNavn} - {selectedAnleggNavn}
                <span className="ml-3 text-lg text-gray-400 font-normal">
                  ({sortedNodlys.length} {sortedNodlys.length === 1 ? 'enhet' : 'enheter'})
                </span>
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setViewMode('bulk')
                }}
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
              <p className="text-gray-400">Laster nødlysenheter...</p>
            </div>
          ) : sortedNodlys.length === 0 ? (
            <div className="text-center py-12">
              <Lightbulb className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Ingen nødlysenheter funnet</p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-dark-100 rounded-lg">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Intern nr.</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Armatur ID</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Fordeling</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Kurs</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Etasje</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Plassering</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Produsent</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Type</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">Kontrollert</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Handlinger</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedNodlys.map((nodlys) => (
                    <tr
                      key={nodlys.id}
                      className="border-b border-gray-800 hover:bg-dark-200 transition-colors"
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
                            className="text-white font-medium"
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
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => saveInlineEdit(nodlys.id, 'status')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveInlineEdit(nodlys.id, 'status')
                              if (e.key === 'Escape') cancelEditing()
                            }}
                            autoFocus
                            className="input py-1 px-2 text-sm"
                          >
                            <option value="">Velg status</option>
                            {statusTyper.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        ) : (
                          <span
                            onDoubleClick={() => startEditing(nodlys.id, 'status', nodlys.status)}
                            className="cursor-pointer"
                            title="Dobbeltklikk for å redigere"
                          >
                            {nodlys.status ? (
                              <span className={`badge ${
                                nodlys.status === 'OK' ? 'bg-green-900/30 text-green-400 border-green-800' :
                                nodlys.status === 'Defekt' ? 'bg-red-900/30 text-red-400 border-red-800' :
                                nodlys.status === 'Mangler' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800' :
                                'bg-blue-900/30 text-blue-400 border-blue-800'
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
                          <input
                            type="checkbox"
                            checked={nodlys.kontrollert === true}
                            onChange={async (e) => {
                              const newValue = e.target.checked
                              
                              // Oppdater lokal state først (optimistisk oppdatering)
                              const updatedList = nodlysListe.map(n => 
                                n.id === nodlys.id ? { ...n, kontrollert: newValue } : n
                              )
                              setNodlysListe(updatedList)
                              
                              try {
                                if (isOnline) {
                                  const { error } = await supabase
                                    .from('anleggsdata_nodlys')
                                    .update({ kontrollert: newValue })
                                    .eq('id', nodlys.id)
                                  
                                  if (error) throw error
                                } else {
                                  queueUpdate('anleggsdata_nodlys', { id: nodlys.id, kontrollert: newValue })
                                  console.log('📝 Kontrollstatus lagret lokalt')
                                }
                                // Cache oppdatert liste
                                cacheData(`nodlys_${selectedAnlegg}`, updatedList)
                              } catch (error) {
                                console.error('Feil ved oppdatering:', error)
                                alert('Kunne ikke oppdatere kontrollstatus')
                                // Reverter ved feil
                                setNodlysListe(prev => prev.map(n => 
                                  n.id === nodlys.id ? { ...n, kontrollert: !newValue } : n
                                ))
                              }
                            }}
                            className="w-5 h-5 text-green-600 bg-dark-100 border-gray-700 rounded focus:ring-green-500 focus:ring-2 cursor-pointer"
                            title={nodlys.kontrollert ? 'Marker som ikke kontrollert' : 'Marker som kontrollert'}
                          />
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
            onClick={onBack}
            className="p-2 text-gray-400 hover:text-white hover:bg-dark-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Nødlys</h1>
            <p className="text-gray-400">Registrer og administrer nødlysarmaturer</p>
          </div>
        </div>
      </div>

      {/* Kunde og Anlegg Velger */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Kunde */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Velg kunde <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Søk etter kunde..."
                value={kundeSok}
                onChange={(e) => setKundeSok(e.target.value)}
                className="input"
              />
              <select
                value={selectedKunde}
                onChange={(e) => {
                  setSelectedKunde(e.target.value)
                  setSelectedAnlegg('')
                }}
                className="input"
                size={Math.min(kunder.filter(k => 
                  k.navn.toLowerCase().includes(kundeSok.toLowerCase())
                ).length + 1, 8)}
              >
                <option value="">Velg kunde</option>
                {kunder
                  .filter(k => k.navn.toLowerCase().includes(kundeSok.toLowerCase()))
                  .map((kunde) => (
                    <option key={kunde.id} value={kunde.id}>{kunde.navn}</option>
                  ))}
              </select>
            </div>
          </div>

          {/* Anlegg */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Velg anlegg <span className="text-red-500">*</span>
            </label>
            {!selectedKunde ? (
              <div className="input bg-dark-100 text-gray-500 cursor-not-allowed">
                Velg kunde først
              </div>
            ) : anlegg.length === 0 ? (
              <div className="input bg-dark-100 text-gray-500">
                Ingen anlegg funnet for denne kunden
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Søk etter anlegg..."
                  value={anleggSok}
                  onChange={(e) => setAnleggSok(e.target.value)}
                  className="input"
                />
                <select
                  value={selectedAnlegg}
                  onChange={(e) => setSelectedAnlegg(e.target.value)}
                  className="input"
                  size={Math.min(anlegg.filter(a => 
                    a.anleggsnavn.toLowerCase().includes(anleggSok.toLowerCase())
                  ).length + 1, 8)}
                >
                  <option value="">Velg anlegg</option>
                  {anlegg
                    .filter(a => a.anleggsnavn.toLowerCase().includes(anleggSok.toLowerCase()))
                    .map((a) => (
                      <option key={a.id} value={a.id}>{a.anleggsnavn}</option>
                    ))}
                </select>
              </div>
            )}
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
                <p className="text-sm text-gray-400">Valgt anlegg</p>
                <p className="text-white font-medium">{selectedKundeNavn} - {selectedAnleggNavn}</p>
              </div>
            </div>
          </div>

          {/* Handlingsknapper */}
          <div className="card">
            <div className="flex flex-wrap items-center gap-3">
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
            </div>
          </div>

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
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">
                Nødlysenheter
                <span className="ml-2 text-sm text-gray-400 font-normal">
                  ({sortedNodlys.length} {sortedNodlys.length === 1 ? 'enhet' : 'enheter'})
                </span>
              </h2>
              <button
                onClick={() => setIsFullscreen(true)}
                className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                title="Fullskjerm"
              >
                <Maximize2 className="w-5 h-5" />
              </button>
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
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Intern nr.</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Armatur ID</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Fordeling</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Kurs</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Etasje</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Plassering</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Produsent</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Type</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                      <th className="text-center py-3 px-4 text-gray-400 font-medium">Kontrollert</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">Handlinger</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedNodlys.map((nodlys) => (
                      <tr
                        key={nodlys.id}
                        className="border-b border-gray-800 hover:bg-dark-100 transition-colors"
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
                              className="text-white font-medium"
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
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => saveInlineEdit(nodlys.id, 'status')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveInlineEdit(nodlys.id, 'status')
                                if (e.key === 'Escape') cancelEditing()
                              }}
                              autoFocus
                              className="input py-1 px-2 text-sm"
                            >
                              <option value="">Velg status</option>
                              {statusTyper.map((status) => (
                                <option key={status} value={status}>{status}</option>
                              ))}
                            </select>
                          ) : (
                            <span
                              onDoubleClick={() => startEditing(nodlys.id, 'status', nodlys.status)}
                              className="cursor-pointer"
                              title="Dobbeltklikk for å redigere"
                            >
                              {nodlys.status ? (
                                <span className={`badge ${
                                  nodlys.status === 'OK' ? 'bg-green-900/30 text-green-400 border-green-800' :
                                  nodlys.status === 'Defekt' ? 'bg-red-900/30 text-red-400 border-red-800' :
                                  nodlys.status === 'Mangler' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800' :
                                  'bg-blue-900/30 text-blue-400 border-blue-800'
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
                            <input
                              type="checkbox"
                              checked={nodlys.kontrollert === true}
                              onChange={async (e) => {
                                const newValue = e.target.checked
                                
                                // Oppdater lokal state først (optimistisk oppdatering)
                                const updatedList = nodlysListe.map(n => 
                                  n.id === nodlys.id ? { ...n, kontrollert: newValue } : n
                                )
                                setNodlysListe(updatedList)
                                
                                try {
                                  if (isOnline) {
                                    const { error } = await supabase
                                      .from('anleggsdata_nodlys')
                                      .update({ kontrollert: newValue })
                                      .eq('id', nodlys.id)
                                    
                                    if (error) throw error
                                  } else {
                                    queueUpdate('anleggsdata_nodlys', { id: nodlys.id, kontrollert: newValue })
                                    console.log('📝 Kontrollstatus lagret lokalt')
                                  }
                                  // Cache oppdatert liste
                                  cacheData(`nodlys_${selectedAnlegg}`, updatedList)
                                } catch (error) {
                                  console.error('Feil ved oppdatering:', error)
                                  alert('Kunne ikke oppdatere kontrollstatus')
                                  // Reverter ved feil
                                  setNodlysListe(prev => prev.map(n => 
                                    n.id === nodlys.id ? { ...n, kontrollert: !newValue } : n
                                  ))
                                }
                              }}
                              className="w-5 h-5 text-green-600 bg-dark-100 border-gray-700 rounded focus:ring-green-500 focus:ring-2 cursor-pointer"
                              title={nodlys.kontrollert ? 'Marker som ikke kontrollert' : 'Marker som kontrollert'}
                            />
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

          {/* Kommentar og Evakueringsplan */}
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4">Kommentar og Evakueringsplan</h2>
            
            <div className="space-y-4">
              {/* Evakueringsplan status */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Har anlegget evakueringsplaner?
                </label>
                <select
                  value={evakueringsplanStatus}
                  onChange={(e) => setEvakueringsplanStatus(e.target.value)}
                  className="input"
                >
                  <option value="">Velg status</option>
                  <option value="Ja">Ja</option>
                  <option value="Nei">Nei</option>
                  <option value="Mangler">Mangler</option>
                  <option value="Må oppdateres">Må oppdateres</option>
                </select>
              </div>

              {/* Kommentar */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Kommentar
                </label>
                <textarea
                  value={kommentar}
                  onChange={(e) => setKommentar(e.target.value)}
                  className="input min-h-[120px]"
                  placeholder="Skriv kommentar her..."
                />
              </div>

              {/* Handlingsknapper */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={saveKommentar}
                  className="btn-primary"
                >
                  Lagre kommentar
                </button>
                <button
                  onClick={() => genererPDF(true)}
                  disabled={loading || nodlysListe.length === 0}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Eye className="w-5 h-5" />
                  Forhåndsvis rapport
                </button>
                <button
                  onClick={() => genererPDF(false)}
                  disabled={loading || nodlysListe.length === 0}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileDown className="w-5 h-5" />
                  Generer og lagre rapport
                </button>
              </div>
            </div>
          </div>
        </>
      )}
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
            </label>
            <input
              type="text"
              value={formData.internnummer}
              onChange={(e) => setFormData({ ...formData, internnummer: e.target.value })}
              className="input"
              placeholder="F.eks. 001, 002, etc."
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
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Fordeling
            </label>
            <input
              type="text"
              value={formData.fordeling}
              onChange={(e) => setFormData({ ...formData, fordeling: e.target.value })}
              className="input"
              placeholder="Fordelingsnavn"
            />
          </div>

          {/* Kurs */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Kurs
            </label>
            <input
              type="text"
              value={formData.kurs}
              onChange={(e) => setFormData({ ...formData, kurs: e.target.value })}
              className="input"
              placeholder="Kursnummer"
            />
          </div>

          {/* Etasje */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Etasje
            </label>
            <input
              type="text"
              value={formData.etasje}
              onChange={(e) => setFormData({ ...formData, etasje: e.target.value })}
              className="input"
              placeholder="F.eks. 1, 2, U1, etc."
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Type
            </label>
            <input
              type="text"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="input"
              placeholder="F.eks. LED, Halogen, etc."
            />
          </div>

          {/* Produsent */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Produsent
            </label>
            <input
              type="text"
              value={formData.produsent}
              onChange={(e) => setFormData({ ...formData, produsent: e.target.value })}
              className="input"
              placeholder="Produsentnavn"
            />
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (antall < 1 || antall > 25) {
      alert('Antall må være mellom 1 og 25')
      return
    }

    setSaving(true)

    try {
      // Opprett array med tomme nødlysenheter
      const nyeEnheter = Array.from({ length: antall }, () => ({
        anlegg_id: anleggId,
        internnummer: null,
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
            Maks 25 enheter om gangen. Alle felt vil være tomme og kan fylles ut ved å dobbeltklikke i tabellen.
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
                <span>Enhetene opprettes tomme - du fyller ut feltene etterpå</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Dobbeltklikk på en celle i tabellen for å redigere</span>
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
