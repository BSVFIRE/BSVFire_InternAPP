import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Plus, Save, Trash2, Shield, Search, Maximize2, Minimize2, Eye, FileDown } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { BrannslukkerPreview } from '../BrannslukkerPreview'
import { useAuthStore } from '@/store/authStore'
import { KommentarViewBrannslukkere } from './KommentarViewBrannslukkere'

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
  'Byttet ved kontroll',
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
  const _saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
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

  // AUTOLAGRING DEAKTIVERT - forårsaker duplikater
  // useEffect(() => {
  //   if (saveTimeoutRef.current) {
  //     clearTimeout(saveTimeoutRef.current)
  //   }

  //   saveTimeoutRef.current = setTimeout(() => {
  //     autoSave()
  //   }, 3000) // 3 sekunder debounce

  //   return () => {
  //     if (saveTimeoutRef.current) {
  //       clearTimeout(saveTimeoutRef.current)
  //     }
  //   }
  // }, [slukkere])

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

  async function _autoSave() {
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
        .from('kommentar_brannslukkere')
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
      doc.text('RAPPORT - BRANNSLUKKERE', 20, yPos)
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

      // Statistikk
      const totalt = slukkere.length
      const ok = slukkere.filter(s => 
        s.status?.includes('OK') || s.status?.includes('OK Byttet') || s.status?.includes('Byttet ved kontroll')
      ).length
      const ikkeKontrollert = slukkere.filter(s => 
        s.status?.includes('Ikke funnet') || s.status?.includes('Ikke tilkomst')
      ).length
      const avvik = slukkere.filter(s => 
        s.status?.some(st => !['OK', 'OK Byttet', 'Byttet ved kontroll', 'Ikke funnet', 'Ikke tilkomst'].includes(st))
      ).length

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
      
      doc.setTextColor(0, 0, 0)
      yPos += boxHeight + 8

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
          // Vis alle statuser kommaseparert
          (Array.isArray(s.status) && s.status.length > 0) 
            ? s.status.join(', ') 
            : 'OK'
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
        doc.setFillColor(220, 53, 69) // Red color for brannslukkere
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
    // Finn høyeste nummer
    let hoyesteNummer = 0
    slukkere.forEach(s => {
      const num = parseInt(s.apparat_nr || '0')
      if (!isNaN(num) && num > hoyesteNummer) {
        hoyesteNummer = num
      }
    })

    const nyeSlukkere: Brannslukker[] = Array.from({ length: antallNye }, (_, index) => ({
      anlegg_id: anleggId,
      apparat_nr: String(hoyesteNummer + index + 1),
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
  const ok = slukkere.filter(s => 
    s.status?.includes('OK') || s.status?.includes('OK Byttet') || s.status?.includes('Byttet ved kontroll')
  ).length
  const _ikkeKontrollert = slukkere.filter(s => 
    s.status?.includes('Ikke funnet') || s.status?.includes('Ikke tilkomst')
  ).length
  const avvik = slukkere.filter(s => 
    s.status?.some(st => !['OK', 'OK Byttet', 'Byttet ved kontroll', 'Ikke funnet', 'Ikke tilkomst'].includes(st))
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
                              const originalIndex = slukkere.findIndex(s => s === slukker)
                              if (originalIndex !== -1) {
                                nyeSlukkere[originalIndex].apparat_nr = e.target.value
                                setSlukkere(nyeSlukkere)
                              }
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
                            const originalIndex = slukkere.findIndex(s => s === slukker)
                            if (originalIndex !== -1) {
                              nyeSlukkere[originalIndex].plassering = e.target.value
                              setSlukkere(nyeSlukkere)
                            }
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
                            const originalIndex = slukkere.findIndex(s => s === slukker)
                            if (originalIndex !== -1) {
                              nyeSlukkere[originalIndex].etasje = e.target.value
                              setSlukkere(nyeSlukkere)
                            }
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
                            const originalIndex = slukkere.findIndex(s => s === slukker)
                            if (originalIndex !== -1) {
                              nyeSlukkere[originalIndex].produsent = e.target.value
                              setSlukkere(nyeSlukkere)
                            }
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
                            const originalIndex = slukkere.findIndex(s => s === slukker)
                            if (originalIndex !== -1) {
                              nyeSlukkere[originalIndex].modell = e.target.value
                              setSlukkere(nyeSlukkere)
                            }
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
                            const originalIndex = slukkere.findIndex(s => s === slukker)
                            if (originalIndex !== -1) {
                              nyeSlukkere[originalIndex].brannklasse = e.target.value
                              setSlukkere(nyeSlukkere)
                            }
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
                            const originalIndex = slukkere.findIndex(s => s === slukker)
                            if (originalIndex !== -1) {
                              nyeSlukkere[originalIndex].produksjonsaar = e.target.value
                              setSlukkere(nyeSlukkere)
                            }
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
                            const originalIndex = slukkere.findIndex(s => s === slukker)
                            if (originalIndex !== -1) {
                              nyeSlukkere[originalIndex].service = e.target.value
                              setSlukkere(nyeSlukkere)
                            }
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
                            const originalIndex = slukkere.findIndex(s => s === slukker)
                            if (originalIndex !== -1) {
                              nyeSlukkere[originalIndex].siste_kontroll = e.target.value
                              setSlukkere(nyeSlukkere)
                            }
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
                            slukker.status.map((st: string) => (
                              <span
                                key={st}
                                className={`px-2 py-1 rounded text-xs ${
                                  st === 'OK' || st === 'OK Byttet' || st === 'Byttet ved kontroll'
                                    ? 'bg-green-500/20 text-green-400' 
                                    : 'bg-red-500/20 text-red-400'
                                }`}
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
                          st === 'OK' || st === 'OK Byttet' || st === 'Byttet ved kontroll'
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {st}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-500 text-xs">-</span>
                )}
              </td>
            </tr>
          ))}
            </tbody>
          </table>
        </div>
      )}
      </div>

      {/* Kommentarer seksjon */}
      <KommentarViewBrannslukkere
        anleggId={anleggId}
        kundeNavn={kundeNavn}
        anleggNavn={anleggNavn}
      />
    </div>
  )
}
