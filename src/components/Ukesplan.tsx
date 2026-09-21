import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Calendar, X, FileText,
  ChevronLeft, ChevronRight, Save,
  GripVertical, ChevronUp, ChevronDown
} from 'lucide-react'
import { createDropboxFolder, uploadToDropbox } from '@/services/dropboxServiceV2'
import { toast } from '@/lib/toast'
import { Combobox } from '@/components/ui/Combobox'

interface Kunde {
  id: string
  navn: string
  kunde_nummer: string | null
}

interface Anlegg {
  id: string
  anleggsnavn: string
  adresse: string | null
  postnummer: string | null
  poststed: string | null
  kontroll_type: string[] | null
  kontroll_status: string | null
}

interface UkesplanDag {
  id?: string
  dag: number
  anlegg_id: string
  anlegg?: Anlegg
  rekkefolge: number
  estimert_oppstart: string | null
  alarmprove_tid: string | null
  notater: string | null
}

interface Ansatt {
  id: string
  navn: string
}

interface UkesplanProps {
  kundeId?: string
  editPlanId?: string
  onClose: () => void
  onSave?: () => void
}

const UKEDAGER = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag']

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function getWeekDates(year: number, week: number): Date[] {
  const simple = new Date(year, 0, 1 + (week - 1) * 7)
  const dow = simple.getDay()
  const ISOweekStart = simple
  if (dow <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1)
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay())
  }
  
  const dates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(ISOweekStart)
    date.setDate(ISOweekStart.getDate() + i)
    dates.push(date)
  }
  return dates
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })
}

export function UkesplanEditor({ kundeId, editPlanId, onClose, onSave }: UkesplanProps) {
  const [kunder, setKunder] = useState<Kunde[]>([])
  const [selectedKundeId, setSelectedKundeId] = useState<string>(kundeId || '')
  const [kundeAnlegg, setKundeAnlegg] = useState<Anlegg[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [week, setWeek] = useState(getWeekNumber(today))
  const [weekDates, setWeekDates] = useState<Date[]>([])
  
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]) // Man-Fre
  const [dagPlaner, setDagPlaner] = useState<Record<number, UkesplanDag[]>>({})
  const [notater, setNotater] = useState('')
  const [existingPlanId, setExistingPlanId] = useState<string | null>(editPlanId || null)
  
  // Teknikere
  const [ansatte, setAnsatte] = useState<Ansatt[]>([])
  const [selectedTeknikere, setSelectedTeknikere] = useState<string[]>([])
  
  // Plan navn (for flere planer per uke)
  const [planNavn, setPlanNavn] = useState('')
  
  // Vis utførte anlegg
  const [showUtforte, setShowUtforte] = useState(false)
  
  // Paginering for anlegg
  const [anleggPage, setAnleggPage] = useState(1)
  const ANLEGG_PER_PAGE = 8
  
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  
  // Drag and drop state
  const [draggedAnlegg, setDraggedAnlegg] = useState<Anlegg | null>(null)
  const [dragOverDay, setDragOverDay] = useState<number | null>(null)
  // Et anlegg som allerede ligger i planen og dras for å endre rekkefølge eller flyttes til en annen dag
  const [draggedPlanItem, setDraggedPlanItem] = useState<{ dag: number; anleggId: string } | null>(null)

  useEffect(() => {
    loadKunder()
    loadAnsatte()
    // Last eksisterende plan hvis editPlanId er satt
    if (editPlanId) {
      loadExistingPlan(editPlanId)
    }
  }, [])

  useEffect(() => {
    setWeekDates(getWeekDates(year, week))
  }, [year, week])

  useEffect(() => {
    if (selectedKundeId) {
      loadKundeAnlegg(selectedKundeId)
      // Reset plan når kunde endres (kan ha flere planer per uke nå)
      setExistingPlanId(null)
      setDagPlaner({})
      setNotater('')
      setSelectedTeknikere([])
      setPlanNavn('')
      setAnleggPage(1)
    }
  }, [selectedKundeId])
  
  // Last anlegg på nytt når uke endres (for å se oppdatert status)
  useEffect(() => {
    if (selectedKundeId) {
      loadKundeAnlegg(selectedKundeId)
    }
  }, [year, week])

  async function loadKunder() {
    try {
      const { data, error } = await supabase
        .from('customer')
        .select('id, navn, kunde_nummer')
        .or('skjult.is.null,skjult.eq.false')
        .order('navn')
      
      if (error) throw error
      setKunder(data || [])
    } catch (err) {
      console.error('Feil ved lasting av kunder:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadAnsatte() {
    try {
      const { data, error } = await supabase
        .from('ansatte')
        .select('id, navn')
        .order('navn')
      
      if (error) throw error
      setAnsatte(data || [])
    } catch (err) {
      console.error('Feil ved lasting av ansatte:', err)
    }
  }

  async function loadKundeAnlegg(kundeId: string) {
    try {
      const { data, error } = await supabase
        .from('anlegg')
        .select('id, anleggsnavn, adresse, postnummer, poststed, kontroll_type, kontroll_status')
        .eq('kundenr', kundeId)
        .or('skjult.is.null,skjult.eq.false')
        .order('anleggsnavn')
      
      if (error) throw error
      setKundeAnlegg(data || [])
    } catch (err) {
      console.error('Feil ved lasting av anlegg:', err)
    }
  }

  async function loadExistingPlan(planId: string) {
    try {
      const { data: plan, error } = await supabase
        .from('ukesplaner')
        .select(`
          *,
          ukesplan_dager(
            *,
            anlegg:anlegg_id(id, anleggsnavn, adresse, postnummer, poststed, kontroll_type, kontroll_status)
          )
        `)
        .eq('id', planId)
        .single()
      
      if (error) throw error
      
      if (plan) {
        setSelectedKundeId(plan.kunde_id)
        setYear(plan.aar)
        setWeek(plan.uke_nummer)
        setNotater(plan.notater || '')
        setPlanNavn(plan.navn || '')
        
        // Bygg dagplaner fra eksisterende data
        const dager: Record<number, UkesplanDag[]> = {}
        const aktiveDager: number[] = []
        
        for (const dag of plan.ukesplan_dager || []) {
          if (!dager[dag.dag]) {
            dager[dag.dag] = []
            aktiveDager.push(dag.dag)
          }
          dager[dag.dag].push({
            id: dag.id,
            dag: dag.dag,
            anlegg_id: dag.anlegg_id,
            anlegg: dag.anlegg,
            rekkefolge: dag.rekkefolge,
            estimert_oppstart: dag.estimert_oppstart,
            alarmprove_tid: dag.alarmprove_tid,
            notater: dag.notater
          })
        }
        
        // Sorter etter rekkefølge
        for (const d of Object.keys(dager)) {
          dager[Number(d)].sort((a, b) => a.rekkefolge - b.rekkefolge)
        }
        
        setDagPlaner(dager)
        if (aktiveDager.length > 0) {
          setSelectedDays([...new Set(aktiveDager)].sort())
        }
        
        // Last teknikere for denne planen
        const { data: teknikereData } = await supabase
          .from('ukesplan_teknikere')
          .select('ansatt_id')
          .eq('ukesplan_id', plan.id)
        
        if (teknikereData) {
          setSelectedTeknikere(teknikereData.map(t => t.ansatt_id))
        }
        
        // Last anlegg for kunden
        loadKundeAnlegg(plan.kunde_id)
      }
    } catch (err) {
      console.error('Feil ved lasting av eksisterende plan:', err)
    }
  }

  function changeWeek(delta: number) {
    let newWeek = week + delta
    let newYear = year
    
    if (newWeek < 1) {
      newYear--
      newWeek = 52
    } else if (newWeek > 52) {
      newYear++
      newWeek = 1
    }
    
    setWeek(newWeek)
    setYear(newYear)
  }

  function toggleDay(dag: number) {
    if (selectedDays.includes(dag)) {
      setSelectedDays(selectedDays.filter(d => d !== dag))
      // Fjern anlegg fra denne dagen
      const newDagPlaner = { ...dagPlaner }
      delete newDagPlaner[dag]
      setDagPlaner(newDagPlaner)
    } else {
      setSelectedDays([...selectedDays, dag].sort())
    }
  }

  function addAnleggToDay(dag: number, anleggId: string) {
    const anlegg = kundeAnlegg.find(a => a.id === anleggId)
    if (!anlegg) return
    
    // Sjekk om anlegget allerede er lagt til denne dagen
    if (dagPlaner[dag]?.some(d => d.anlegg_id === anleggId)) return
    
    const newDagPlaner = { ...dagPlaner }
    if (!newDagPlaner[dag]) {
      newDagPlaner[dag] = []
    }
    
    newDagPlaner[dag].push({
      dag,
      anlegg_id: anleggId,
      anlegg,
      rekkefolge: newDagPlaner[dag].length,
      estimert_oppstart: null,
      alarmprove_tid: null,
      notater: null
    })
    
    setDagPlaner(newDagPlaner)
  }

  function removeAnleggFromDay(dag: number, anleggId: string) {
    const newDagPlaner = { ...dagPlaner }
    newDagPlaner[dag] = newDagPlaner[dag].filter(d => d.anlegg_id !== anleggId)
    if (newDagPlaner[dag].length === 0) {
      delete newDagPlaner[dag]
    }
    setDagPlaner(newDagPlaner)
  }

  /** Flytt et anlegg opp/ned innen dagen, eller til en bestemt posisjon */
  function moveAnlegg(dag: number, anleggId: string, tilIndex: number) {
    const liste = [...(dagPlaner[dag] || [])]
    const fra = liste.findIndex(d => d.anlegg_id === anleggId)
    if (fra < 0) return
    const mal = Math.max(0, Math.min(liste.length - 1, tilIndex))
    if (fra === mal) return
    const [item] = liste.splice(fra, 1)
    liste.splice(mal, 0, item)
    setDagPlaner({ ...dagPlaner, [dag]: liste.map((d, i) => ({ ...d, rekkefolge: i })) })
  }

  /** Flytt et anlegg fra én dag til en annen (legges sist) */
  function moveAnleggToDay(fraDag: number, anleggId: string, tilDag: number) {
    if (fraDag === tilDag) return
    const item = dagPlaner[fraDag]?.find(d => d.anlegg_id === anleggId)
    if (!item || dagPlaner[tilDag]?.some(d => d.anlegg_id === anleggId)) return
    const ny = { ...dagPlaner }
    ny[fraDag] = ny[fraDag].filter(d => d.anlegg_id !== anleggId)
    if (ny[fraDag].length === 0) delete ny[fraDag]
    ny[tilDag] = [...(ny[tilDag] || []), { ...item, dag: tilDag, rekkefolge: (ny[tilDag] || []).length }]
    setDagPlaner(ny)
  }

  function updateAnleggTime(dag: number, anleggId: string, field: 'estimert_oppstart' | 'alarmprove_tid', value: string) {
    const newDagPlaner = { ...dagPlaner }
    const anleggIndex = newDagPlaner[dag]?.findIndex(d => d.anlegg_id === anleggId)
    if (anleggIndex !== undefined && anleggIndex >= 0) {
      newDagPlaner[dag][anleggIndex][field] = value || null
      setDagPlaner(newDagPlaner)
    }
  }

  async function savePlan() {
    if (!selectedKundeId) return
    
    setSaving(true)
    try {
      let planId = existingPlanId
      
      if (existingPlanId) {
        // Oppdater eksisterende plan
        const { error } = await supabase
          .from('ukesplaner')
          .update({
            navn: planNavn || null,
            notater,
            status: 'utkast'
          })
          .eq('id', existingPlanId)
        
        if (error) throw error
        
        // Slett gamle dager
        await supabase
          .from('ukesplan_dager')
          .delete()
          .eq('ukesplan_id', existingPlanId)
      } else {
        // Opprett ny plan
        const { data, error } = await supabase
          .from('ukesplaner')
          .insert({
            kunde_id: selectedKundeId,
            uke_nummer: week,
            aar: year,
            navn: planNavn || null,
            notater,
            status: 'utkast'
          })
          .select('id')
          .single()
        
        if (error) throw error
        planId = data.id
        setExistingPlanId(planId)
      }
      
      // Legg til dager
      const dagerToInsert: any[] = []
      for (const [dag, anleggListe] of Object.entries(dagPlaner)) {
        for (let i = 0; i < anleggListe.length; i++) {
          const a = anleggListe[i]
          dagerToInsert.push({
            ukesplan_id: planId,
            dag: Number(dag),
            anlegg_id: a.anlegg_id,
            rekkefolge: i,
            estimert_oppstart: a.estimert_oppstart,
            alarmprove_tid: a.alarmprove_tid,
            notater: a.notater
          })
        }
      }
      
      if (dagerToInsert.length > 0) {
        const { error } = await supabase
          .from('ukesplan_dager')
          .insert(dagerToInsert)
        
        if (error) throw error
      }
      
      // Lagre teknikere - slett gamle først
      await supabase
        .from('ukesplan_teknikere')
        .delete()
        .eq('ukesplan_id', planId)
      
      if (selectedTeknikere.length > 0) {
        const teknikereToInsert = selectedTeknikere.map(ansattId => ({
          ukesplan_id: planId,
          ansatt_id: ansattId
        }))
        
        const { error: teknikerError } = await supabase
          .from('ukesplan_teknikere')
          .insert(teknikereToInsert)
        
        if (teknikerError) throw teknikerError
      }
      
      toast.success('Ukesplan lagret')
      onSave?.()
    } catch (err) {
      console.error('Feil ved lagring:', err)
      toast.error('Kunne ikke lagre ukesplanen', err)
    } finally {
      setSaving(false)
    }
  }

  // Vis forhåndsvisning
  function showPdfPreview() {
    if (!selectedKundeId || Object.keys(dagPlaner).length === 0) {
      toast.warning('Legg til minst ett anlegg før du genererer PDF')
      return
    }
    
    const kunde = kunder.find(k => k.id === selectedKundeId)
    if (!kunde) return
    
    const html = generatePdfHtml(kunde)
    setPreviewHtml(html)
    setShowPreview(true)
  }

  // Skriv ut og lagre PDF
  async function printAndSavePdf() {
    setGeneratingPdf(true)
    
    try {
      // Først lagre planen
      await savePlan()
      
      const kunde = kunder.find(k => k.id === selectedKundeId)
      if (!kunde) throw new Error('Kunde ikke funnet')
      
      // Åpne i nytt vindu for utskrift/nedlasting
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(previewHtml)
        printWindow.document.close()
        
        // Vent litt før print
        setTimeout(() => {
          printWindow.print()
        }, 500)
      }
      
      // Lagre til Dropbox
      if (kunde.kunde_nummer) {
        try {
          const blob = new Blob([previewHtml], { type: 'text/html' })
          const fileName = `Ukesplan_Uke${week}_${year}.html`
          const folderPath = `/NY MAPPESTRUKTUR 2026/01_KUNDER/${kunde.kunde_nummer}_${kunde.navn}/01_Avtaler/03_Ukesplaner`
          
          await createDropboxFolder(folderPath)
          await uploadToDropbox(`${folderPath}/${fileName}`, blob)
          
          // Oppdater dropbox_path i databasen
          if (existingPlanId) {
            await supabase
              .from('ukesplaner')
              .update({ dropbox_path: `${folderPath}/${fileName}` })
              .eq('id', existingPlanId)
          }
        } catch (dropboxErr) {
          console.warn('Kunne ikke lagre til Dropbox:', dropboxErr)
        }
      }
      
      setShowPreview(false)
    } catch (err) {
      console.error('Feil ved PDF-generering:', err)
      toast.error('Kunne ikke generere PDF', err)
    } finally {
      setGeneratingPdf(false)
    }
  }

  function generatePdfHtml(kunde: Kunde): string {
    const sortedDays = Object.keys(dagPlaner).map(Number).sort()
    
    let daysHtml = ''
    for (const dag of sortedDays) {
      const date = weekDates[dag - 1]
      const anleggListe = dagPlaner[dag] || []
      
      let anleggRows = ''
      for (const a of anleggListe) {
        const kontrollTyper = a.anlegg?.kontroll_type?.join(', ') || '-'
        anleggRows += `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
              <strong>${a.anlegg?.anleggsnavn || 'Ukjent'}</strong><br>
              <span style="color: #6b7280; font-size: 13px;">${a.anlegg?.adresse || ''} ${a.anlegg?.postnummer || ''} ${a.anlegg?.poststed || ''}</span>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
              ${a.estimert_oppstart?.slice(0, 5) || '-'}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
              ${a.alarmprove_tid?.slice(0, 5) || '-'}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
              ${kontrollTyper}
            </td>
          </tr>
        `
      }
      
      daysHtml += `
        <div style="margin-bottom: 24px;">
          <h3 style="background: #14b8a6; color: white; padding: 10px 16px; margin: 0; border-radius: 8px 8px 0 0;">
            ${UKEDAGER[dag - 1]} ${formatDate(date)}
          </h3>
          <table style="width: 100%; border-collapse: collapse; background: white; border: 1px solid #e5e7eb; border-top: none;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 10px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Anlegg</th>
                <th style="padding: 10px; text-align: center; font-weight: 600; border-bottom: 2px solid #e5e7eb; width: 100px;">Oppstart</th>
                <th style="padding: 10px; text-align: center; font-weight: 600; border-bottom: 2px solid #e5e7eb; width: 100px;">Alarmprøve</th>
                <th style="padding: 10px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Kontrolltyper</th>
              </tr>
            </thead>
            <tbody>
              ${anleggRows}
            </tbody>
          </table>
        </div>
      `
    }
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Ukesplan - Uke ${week}, ${year}</title>
        <style>
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
            color: #1f2937;
          }
        </style>
      </head>
      <body>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px;">
          <div>
            <h1 style="margin: 0 0 8px 0; color: #14b8a6;">Ukesplan</h1>
            <h2 style="margin: 0; font-weight: normal; color: #6b7280;">Uke ${week}, ${year}</h2>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 18px; font-weight: 600;">${kunde.navn}</div>
            ${kunde.kunde_nummer ? `<div style="color: #6b7280;">Kundenr: ${kunde.kunde_nummer}</div>` : ''}
          </div>
        </div>
        
        ${selectedTeknikere.length > 0 ? `
          <div style="margin-bottom: 24px; padding: 12px 16px; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px;">
            <strong style="color: #0d9488;">Teknikere:</strong>
            <span style="margin-left: 8px; color: #115e59;">
              ${selectedTeknikere.map(id => ansatte.find(a => a.id === id)?.navn || '').filter(Boolean).join(', ')}
            </span>
          </div>
        ` : ''}
        
        ${daysHtml}
        
        ${notater ? `
          <div style="margin-top: 32px; padding: 16px; background: #f3f4f6; border-radius: 8px;">
            <h4 style="margin: 0 0 8px 0;">Notater</h4>
            <p style="margin: 0; white-space: pre-wrap;">${notater}</p>
          </div>
        ` : ''}
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px;">
          Generert ${new Date().toLocaleDateString('nb-NO')} kl. ${new Date().toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </body>
      </html>
    `
  }

  // Finn anlegg som ikke er tildelt noen dag
  const assignedAnleggIds = new Set(
    Object.values(dagPlaner).flat().map(d => d.anlegg_id)
  )
  const unassignedAnlegg = kundeAnlegg.filter(a => !assignedAnleggIds.has(a.id))

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-dark-200 rounded-xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-200 rounded-xl shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {existingPlanId ? 'Rediger ukesplan' : 'Ny ukesplan'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <div className="flex gap-4 h-full">
            {/* Venstre: Innstillinger (kompakt) */}
            <div className="w-64 flex-shrink-0 space-y-4">
              {/* Kunde-velger */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Kunde
                </label>
                <Combobox
                  options={kunder.map(k => ({ id: k.id, value: k.id, label: k.navn, sublabel: k.kunde_nummer ? `Kundenr. ${k.kunde_nummer}` : undefined }))}
                  value={selectedKundeId}
                  onChange={setSelectedKundeId}
                  placeholder="Velg kunde…"
                  searchPlaceholder="Søk på navn eller kundenummer…"
                  emptyMessage="Ingen kunder funnet"
                  disabled={!!kundeId}
                />
              </div>

              {/* Plan-navn (for flere planer per uke) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Plannavn (valgfritt)
                </label>
                <input
                  type="text"
                  value={planNavn}
                  onChange={(e) => setPlanNavn(e.target.value)}
                  placeholder="F.eks. 'Team 1' eller 'Ola'"
                  className="input"
                />
              </div>

              {/* Uke-velger */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Uke
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => changeWeek(-1)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex-1 text-center">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      Uke {week}, {year}
                    </div>
                    <div className="text-sm text-gray-500">
                      {weekDates.length > 0 && (
                        <>
                          {formatDate(weekDates[0])} - {formatDate(weekDates[6])}
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => changeWeek(1)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Dag-velger */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Aktive dager
                </label>
                <div className="flex flex-wrap gap-2">
                  {UKEDAGER.slice(0, 5).map((dag, idx) => (
                    <button
                      key={idx}
                      onClick={() => toggleDay(idx + 1)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        selectedDays.includes(idx + 1)
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {dag.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Teknikere - chips */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Teknikere
                </label>
                <div className="flex flex-wrap gap-1">
                  {ansatte.map(ansatt => {
                    const isSelected = selectedTeknikere.includes(ansatt.id)
                    const navn = ansatt.navn || ''
                    const initials = navn.split(' ').filter(n => n.length > 0).map(n => n[0]).join('').slice(0, 2) || '?'
                    return (
                      <button
                        key={ansatt.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTeknikere(selectedTeknikere.filter(id => id !== ansatt.id))
                          } else {
                            setSelectedTeknikere([...selectedTeknikere, ansatt.id])
                          }
                        }}
                        title={ansatt.navn}
                        className={`px-2 py-1 text-xs rounded-full transition-colors ${
                          isSelected
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {initials}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Notater - én linje */}
              <div>
                <input
                  type="text"
                  value={notater}
                  onChange={(e) => setNotater(e.target.value)}
                  placeholder="Notater..."
                  className="input text-sm"
                />
              </div>
            </div>

            {/* Midt: Tilgjengelige anlegg */}
            {selectedKundeId && (() => {
              const filteredAnlegg = unassignedAnlegg.filter(a => showUtforte || a.kontroll_status !== 'Utført')
              const totalPages = Math.ceil(filteredAnlegg.length / ANLEGG_PER_PAGE)
              const startIdx = (anleggPage - 1) * ANLEGG_PER_PAGE
              const paginatedAnlegg = filteredAnlegg.slice(startIdx, startIdx + ANLEGG_PER_PAGE)
              
              return (
              <div className="w-72 flex-shrink-0 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Anlegg ({filteredAnlegg.length})
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showUtforte}
                      onChange={(e) => setShowUtforte(e.target.checked)}
                      className="w-3.5 h-3.5 text-primary rounded"
                    />
                    <span className="text-gray-500">Utførte</span>
                  </label>
                </div>
                
                <div className="space-y-1.5 flex-1">
                  {paginatedAnlegg.map(anlegg => {
                    const isUtfort = anlegg.kontroll_status === 'Utført'
                    return (
                      <div
                        key={anlegg.id}
                        draggable={!isUtfort}
                        onDragStart={(e) => {
                          if (isUtfort) return
                          setDraggedAnlegg(anlegg)
                          e.dataTransfer.effectAllowed = 'move'
                          e.dataTransfer.setData('text/plain', anlegg.id)
                        }}
                        onDragEnd={() => {
                          setDraggedAnlegg(null)
                          setDragOverDay(null)
                        }}
                        className={`p-2 rounded-lg transition-colors border ${
                          isUtfort 
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 opacity-60' 
                            : 'bg-gray-50 dark:bg-dark-100 cursor-grab active:cursor-grabbing hover:bg-gray-100 dark:hover:bg-dark-50 border-transparent hover:border-primary/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {!isUtfort && <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                          {isUtfort && <span className="text-green-600 text-xs">✓</span>}
                          <div className="min-w-0 flex-1">
                            <div className={`text-sm font-medium truncate ${isUtfort ? 'text-green-700 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                              {anlegg.anleggsnavn}
                            </div>
                          </div>
                          {!isUtfort && (
                            <select
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                if (e.target.value) {
                                  addAnleggToDay(Number(e.target.value), anlegg.id)
                                  e.target.value = ''
                                }
                              }}
                              className="text-xs px-1 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-200"
                            >
                              <option value="">+</option>
                              {selectedDays.map(dag => (
                                <option key={dag} value={dag}>{UKEDAGER[dag - 1].slice(0, 2)}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {filteredAnlegg.length === 0 && kundeAnlegg.length > 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Alle anlegg er tildelt
                    </p>
                  )}
                </div>
                
                {/* Paginering */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-1 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setAnleggPage(p => Math.max(1, p - 1))}
                      disabled={anleggPage === 1}
                      className="px-2 py-1 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
                    >
                      ←
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setAnleggPage(page)}
                        className={`w-6 h-6 text-xs rounded ${
                          page === anleggPage
                            ? 'bg-primary text-white'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setAnleggPage(p => Math.min(totalPages, p + 1))}
                      disabled={anleggPage === totalPages}
                      className="px-2 py-1 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
              )
            })()}

            {/* Høyre: Ukeplan-visning */}
            <div className="flex-1 min-w-0">
              <div className="space-y-4">
                {selectedDays.map(dag => {
                  const date = weekDates[dag - 1]
                  const anleggListe = dagPlaner[dag] || []
                  
                  return (
                    <div 
                      key={dag} 
                      className={`border-2 rounded-lg overflow-hidden transition-colors ${
                        dragOverDay === dag 
                          ? 'border-primary bg-primary/5' 
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = 'move'
                        setDragOverDay(dag)
                      }}
                      onDragLeave={() => {
                        setDragOverDay(null)
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        setDragOverDay(null)
                        if (draggedAnlegg) {
                          addAnleggToDay(dag, draggedAnlegg.id)
                          setDraggedAnlegg(null)
                        } else if (draggedPlanItem && draggedPlanItem.dag !== dag) {
                          moveAnleggToDay(draggedPlanItem.dag, draggedPlanItem.anleggId, dag)
                          setDraggedPlanItem(null)
                        }
                      }}
                    >
                      <div className="bg-primary/10 dark:bg-primary/20 px-3 py-1.5 flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {UKEDAGER[dag - 1].slice(0, 3)} {date && formatDate(date)}
                        </div>
                        <span className="text-xs text-gray-500">
                          {anleggListe.length}
                        </span>
                      </div>
                      
                      <div className={`p-2 space-y-1 min-h-[60px] ${dragOverDay === dag ? 'bg-primary/5' : ''}`}>
                        {anleggListe.map((item, index) => (
                          <div
                            key={item.anlegg_id}
                            draggable
                            onDragStart={(e) => {
                              setDraggedPlanItem({ dag, anleggId: item.anlegg_id })
                              e.dataTransfer.effectAllowed = 'move'
                              e.dataTransfer.setData('text/plain', item.anlegg_id)
                            }}
                            onDragEnd={() => { setDraggedPlanItem(null); setDragOverDay(null) }}
                            onDragOver={(e) => {
                              // Dra innen samme dag: bytt plass fortløpende mens en drar over
                              if (draggedPlanItem && draggedPlanItem.dag === dag && draggedPlanItem.anleggId !== item.anlegg_id) {
                                e.preventDefault()
                                e.stopPropagation()
                                moveAnlegg(dag, draggedPlanItem.anleggId, index)
                              }
                            }}
                            className={`flex items-center gap-2 p-2 bg-gray-50 dark:bg-dark-100 rounded text-sm ${draggedPlanItem?.anleggId === item.anlegg_id ? 'opacity-40' : ''}`}
                          >
                            <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0 cursor-grab active:cursor-grabbing hidden sm:block" />
                            <span className="text-xs text-gray-400 tabular-nums w-4 text-right flex-shrink-0">{index + 1}</span>
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-gray-900 dark:text-white truncate block">
                                {item.anlegg?.anleggsnavn}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <div className="flex flex-col -my-1">
                                <button type="button" onClick={() => moveAnlegg(dag, item.anlegg_id, index - 1)} disabled={index === 0} title="Flytt opp" className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-dark-200 disabled:opacity-25 text-gray-500"><ChevronUp className="w-3.5 h-3.5" /></button>
                                <button type="button" onClick={() => moveAnlegg(dag, item.anlegg_id, index + 1)} disabled={index === anleggListe.length - 1} title="Flytt ned" className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-dark-200 disabled:opacity-25 text-gray-500"><ChevronDown className="w-3.5 h-3.5" /></button>
                              </div>
                              <TidInput
                                value={item.estimert_oppstart}
                                onChange={(v) => updateAnleggTime(dag, item.anlegg_id, 'estimert_oppstart', v)}
                                title="Oppstart (24-timers, f.eks. 08:00)"
                                placeholder="08:00"
                              />
                              <TidInput
                                value={item.alarmprove_tid}
                                onChange={(v) => updateAnleggTime(dag, item.anlegg_id, 'alarmprove_tid', v)}
                                title="Alarmprøve (24-timers, f.eks. 12:30)"
                                placeholder="12:30"
                              />
                              <button
                                onClick={() => removeAnleggFromDay(dag, item.anlegg_id)}
                                className="p-0.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                        
                        {anleggListe.length === 0 && (
                          <div className={`text-center py-4 text-sm transition-colors ${
                            dragOverDay === dag 
                              ? 'text-primary font-medium' 
                              : 'text-gray-400'
                          }`}>
                            {dragOverDay === dag 
                              ? '↓ Slipp her for å legge til' 
                              : 'Dra anlegg hit eller velg fra listen'}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                
                {selectedDays.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    Velg minst én dag for å planlegge
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Avbryt
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={savePlan}
              disabled={saving || !selectedKundeId}
              className="btn-secondary flex items-center gap-2"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Lagre utkast
            </button>
            
            <button
              onClick={showPdfPreview}
              disabled={generatingPdf || !selectedKundeId || Object.keys(dagPlaner).length === 0}
              className="btn-primary flex items-center gap-2"
            >
              {generatingPdf ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              Forhåndsvis PDF
            </button>
          </div>
        </div>
      </div>

      {/* PDF Forhåndsvisning Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-dark-200 rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Forhåndsvisning - Ukesplan
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Preview iframe */}
            <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-800 p-4">
              <div className="bg-white rounded-lg shadow-lg mx-auto max-w-3xl">
                <iframe
                  srcDoc={previewHtml}
                  className="w-full h-[600px] border-0"
                  title="PDF Forhåndsvisning"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowPreview(false)}
                className="btn-secondary"
              >
                Tilbake
              </button>
              
              <button
                onClick={printAndSavePdf}
                disabled={generatingPdf}
                className="btn-primary flex items-center gap-2"
              >
                {generatingPdf ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                Skriv ut & Lagre til Dropbox
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Tolker det brukeren skriver til HH:MM (24-timers): «8» → 08:00, «830» → 08:30, «8.30» → 08:30, «1245» → 12:45 */
function normaliserTid(tekst: string): string | null {
  const t = tekst.trim()
  if (!t) return null
  const m = t.match(/^(\d{1,2})(?:[:.,h ]?(\d{2}))?$/)
  if (!m) return null
  let timer = Number(m[1])
  let min = m[2] ? Number(m[2]) : 0
  if (!m[2] && m[1].length === 4) { timer = Number(m[1].slice(0, 2)); min = Number(m[1].slice(2)) }
  if (!m[2] && m[1].length === 3) { timer = Number(m[1].slice(0, 1)); min = Number(m[1].slice(1)) }
  if (timer > 23 || min > 59) return null
  return `${String(timer).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

/**
 * Klokkeslett som tekstfelt i 24-timers format. <input type="time"> følger nettleserens/OS-ets
 * innstilling og viser AM/PM på mange Mac-er og iPhoner – dette feltet er alltid HH:MM.
 */
function TidInput({ value, onChange, title, placeholder }: { value: string | null; onChange: (v: string) => void; title?: string; placeholder?: string }) {
  const [tekst, setTekst] = useState(value?.slice(0, 5) ?? '')
  const [ugyldig, setUgyldig] = useState(false)
  useEffect(() => { setTekst(value?.slice(0, 5) ?? '') }, [value])
  function ferdig() {
    if (!tekst.trim()) { setUgyldig(false); onChange(''); return }
    const n = normaliserTid(tekst)
    if (n) { setUgyldig(false); setTekst(n); onChange(n) } else { setUgyldig(true) }
  }
  return (
    <input
      type="text"
      inputMode="numeric"
      value={tekst}
      onChange={(e) => setTekst(e.target.value.replace(/[^\d:., h]/g, '').slice(0, 5))}
      onBlur={ferdig}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
      onFocus={(e) => e.target.select()}
      title={title}
      placeholder={placeholder}
      aria-invalid={ugyldig || undefined}
      className={`text-xs px-1 py-0.5 rounded border bg-white dark:bg-dark-200 w-14 text-center tabular-nums ${ugyldig ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
    />
  )
}
