import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  X, Building2, Plus, Trash2, 
  Home, ChevronDown, ChevronUp, Loader2,
  CheckCircle, XCircle, HelpCircle, Save, FileDown
} from 'lucide-react'
import jsPDF from 'jspdf'

interface Leilighet {
  id: string
  leilighet_nummer: string
  etasje: number
  beskrivelse: string | null
}

interface LeilighetKontroll {
  id: string
  leilighet_id: string
  kontroll_dato: string
  kontroll_aar: number
  status: 'ok' | 'avvik' | 'ikke_hjemme'
  avvik_beskrivelse: string | null
  kommentar: string | null
}

interface LeilighetsOversiktProps {
  anleggId: string
  anleggNavn: string
  antallEtasjer: number | null
  onClose: () => void
  onUpdate?: () => void
}

export function LeilighetsOversikt({ 
  anleggId, 
  anleggNavn, 
  antallEtasjer: initialEtasjer,
  onClose,
  onUpdate 
}: LeilighetsOversiktProps) {
  const [leiligheter, setLeiligheter] = useState<Leilighet[]>([])
  const [kontroller, setKontroller] = useState<LeilighetKontroll[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Oppsett-modus
  const [antallEtasjer, setAntallEtasjer] = useState(initialEtasjer || 1)
  const [leiligheterPerEtasje, setLeiligheterPerEtasje] = useState(4)
  const [startNummer, setStartNummer] = useState('H')
  const [showSetup, setShowSetup] = useState(false)
  
  // Kontroll-modus
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [expandedEtasjer, setExpandedEtasjer] = useState<Set<number>>(new Set([1]))
  const [pendingChanges, setPendingChanges] = useState<Map<string, { status: string, kommentar?: string }>>(new Map())

  useEffect(() => {
    loadData()
  }, [anleggId])

  async function loadData() {
    setLoading(true)
    try {
      // Last leiligheter
      const { data: leilighetData, error: leilighetError } = await supabase
        .from('anlegg_leiligheter')
        .select('*')
        .eq('anlegg_id', anleggId)
        .order('etasje')
        .order('leilighet_nummer')

      if (leilighetError) throw leilighetError
      setLeiligheter(leilighetData || [])
      
      // Vis oppsett hvis ingen leiligheter
      if (!leilighetData || leilighetData.length === 0) {
        setShowSetup(true)
      }

      // Last kontroller
      const { data: kontrollData, error: kontrollError } = await supabase
        .from('leilighet_kontroller')
        .select('*')
        .eq('anlegg_id', anleggId)
        .order('kontroll_aar', { ascending: false })

      if (kontrollError) throw kontrollError
      setKontroller(kontrollData || [])

    } catch (error) {
      console.error('Feil ved lasting av data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Generer leiligheter basert på oppsett
  async function generateLeiligheter() {
    // Sjekk om det allerede finnes leiligheter
    if (leiligheter.length > 0) {
      if (!confirm(`Det finnes allerede ${leiligheter.length} leiligheter. Vil du slette alle og starte på nytt?`)) {
        return
      }
      // Slett eksisterende leiligheter (kontroller slettes automatisk pga CASCADE)
      await supabase
        .from('anlegg_leiligheter')
        .delete()
        .eq('anlegg_id', anleggId)
    }

    setSaving(true)
    try {
      const nyeLeiligheter: { anlegg_id: string, leilighet_nummer: string, etasje: number }[] = []
      
      for (let etasje = 1; etasje <= antallEtasjer; etasje++) {
        for (let leil = 1; leil <= leiligheterPerEtasje; leil++) {
          const nummer = `${startNummer}${String(etasje).padStart(2, '0')}${String(leil).padStart(2, '0')}`
          nyeLeiligheter.push({
            anlegg_id: anleggId,
            leilighet_nummer: nummer,
            etasje: etasje
          })
        }
      }

      // Oppdater antall etasjer på anlegget
      await supabase
        .from('anlegg')
        .update({ antall_etasjer: antallEtasjer, er_leilighetsbygg: true })
        .eq('id', anleggId)

      // Sett inn leiligheter
      const { error } = await supabase
        .from('anlegg_leiligheter')
        .insert(nyeLeiligheter)

      if (error) throw error

      setShowSetup(false)
      loadData()
      onUpdate?.()
    } catch (error) {
      console.error('Feil ved generering av leiligheter:', error)
      alert('Kunne ikke generere leiligheter')
    } finally {
      setSaving(false)
    }
  }

  // Legg til enkelt leilighet
  async function addLeilighet(etasje: number) {
    const eksisterende = leiligheter.filter(l => l.etasje === etasje)
    const nesteNr = eksisterende.length + 1
    const nummer = `${startNummer}${String(etasje).padStart(2, '0')}${String(nesteNr).padStart(2, '0')}`

    try {
      const { error } = await supabase
        .from('anlegg_leiligheter')
        .insert({
          anlegg_id: anleggId,
          leilighet_nummer: nummer,
          etasje: etasje
        })

      if (error) throw error
      loadData()
    } catch (error) {
      console.error('Feil ved opprettelse av leilighet:', error)
    }
  }

  // Legg til ny etasje
  async function addEtasje() {
    const høyesteEtasje = etasjer.length > 0 ? Math.max(...etasjer) : 0
    const nyEtasje = høyesteEtasje + 1
    
    // Legg til 4 leiligheter som standard
    const nyeLeiligheter = []
    for (let leil = 1; leil <= 4; leil++) {
      nyeLeiligheter.push({
        anlegg_id: anleggId,
        leilighet_nummer: `${startNummer}${String(nyEtasje).padStart(2, '0')}${String(leil).padStart(2, '0')}`,
        etasje: nyEtasje
      })
    }

    try {
      const { error } = await supabase
        .from('anlegg_leiligheter')
        .insert(nyeLeiligheter)

      if (error) throw error
      
      // Oppdater antall etasjer på anlegget
      await supabase
        .from('anlegg')
        .update({ antall_etasjer: nyEtasje })
        .eq('id', anleggId)
      
      // Utvid den nye etasjen automatisk
      setExpandedEtasjer(prev => new Set([...prev, nyEtasje]))
      loadData()
    } catch (error) {
      console.error('Feil ved opprettelse av etasje:', error)
    }
  }

  // Slett leilighet
  async function deleteLeilighet(id: string) {
    if (!confirm('Er du sikker på at du vil slette denne leiligheten og alle kontroller?')) return

    try {
      const { error } = await supabase
        .from('anlegg_leiligheter')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadData()
    } catch (error) {
      console.error('Feil ved sletting:', error)
    }
  }

  // Registrer kontroll
  function setKontrollStatus(leilighetId: string, status: string, kommentar?: string) {
    const newChanges = new Map(pendingChanges)
    newChanges.set(leilighetId, { status, kommentar })
    setPendingChanges(newChanges)
  }

  // Lagre alle kontroller
  async function saveKontroller() {
    if (pendingChanges.size === 0) return
    
    setSaving(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      
      for (const [leilighetId, data] of pendingChanges) {
        // Sjekk om det allerede finnes en kontroll for dette året
        const existing = kontroller.find(
          k => k.leilighet_id === leilighetId && k.kontroll_aar === selectedYear
        )

        if (existing) {
          // Oppdater eksisterende
          await supabase
            .from('leilighet_kontroller')
            .update({
              status: data.status,
              kommentar: data.kommentar,
              kontroll_dato: today
            })
            .eq('id', existing.id)
        } else {
          // Opprett ny
          await supabase
            .from('leilighet_kontroller')
            .insert({
              leilighet_id: leilighetId,
              anlegg_id: anleggId,
              kontroll_dato: today,
              kontroll_aar: selectedYear,
              status: data.status,
              kommentar: data.kommentar
            })
        }
      }

      setPendingChanges(new Map())
      loadData()
      onUpdate?.()
    } catch (error) {
      console.error('Feil ved lagring av kontroller:', error)
      alert('Kunne ikke lagre kontroller')
    } finally {
      setSaving(false)
    }
  }

  // Hent kontrollstatus for en leilighet
  function getKontrollStatus(leilighetId: string, year: number): LeilighetKontroll | undefined {
    return kontroller.find(k => k.leilighet_id === leilighetId && k.kontroll_aar === year)
  }

  // Generer PDF-rapport
  function generatePDF() {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    let y = 20

    // Header
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('Leilighetskontroll', pageWidth / 2, y, { align: 'center' })
    y += 10

    doc.setFontSize(14)
    doc.text(anleggNavn, pageWidth / 2, y, { align: 'center' })
    y += 10

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Kontrollår: ${selectedYear}`, pageWidth / 2, y, { align: 'center' })
    y += 5
    doc.text(`Generert: ${new Date().toLocaleDateString('nb-NO')}`, pageWidth / 2, y, { align: 'center' })
    y += 15

    // Statistikk
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Oppsummering:', 20, y)
    y += 7
    doc.setFont('helvetica', 'normal')
    doc.text(`Totalt antall leiligheter: ${totalLeiligheter}`, 25, y)
    y += 5
    doc.text(`Kontrollert OK: ${kontrollertIÅr}`, 25, y)
    y += 5
    doc.text(`Avvik: ${avvikIÅr}`, 25, y)
    y += 5
    doc.text(`Ikke kontrollert siste 4 år: ${ikkeKontrollertSiste4År.length}`, 25, y)
    y += 15

    // Tabell-header
    doc.setFillColor(240, 240, 240)
    doc.rect(20, y - 5, pageWidth - 40, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.text('Leilighet', 25, y)
    doc.text('Etasje', 70, y)
    doc.text('Status ' + selectedYear, 100, y)
    doc.text('Historikk', 140, y)
    y += 10

    // Leiligheter sortert per etasje
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)

    const sortedLeiligheter = [...leiligheter].sort((a, b) => {
      if (a.etasje !== b.etasje) return a.etasje - b.etasje
      return a.leilighet_nummer.localeCompare(b.leilighet_nummer)
    })

    for (const leilighet of sortedLeiligheter) {
      if (y > 270) {
        doc.addPage()
        y = 20
      }

      const kontroll = getKontrollStatus(leilighet.id, selectedYear)
      const historikk = getKontrollHistorikk(leilighet.id)
      
      let statusText = '-'
      if (kontroll?.status === 'ok') statusText = '✓ OK'
      else if (kontroll?.status === 'avvik') statusText = '✗ Avvik'
      else if (kontroll?.status === 'ikke_hjemme') statusText = '? Ikke hjemme'

      doc.text(leilighet.leilighet_nummer, 25, y)
      doc.text(String(leilighet.etasje), 70, y)
      doc.text(statusText, 100, y)
      doc.text(historikk.slice(-5).join(', ') || '-', 140, y)
      y += 6
    }

    // Avvik-liste hvis det finnes
    const avvikLeiligheter = leiligheter.filter(l => {
      const k = getKontrollStatus(l.id, selectedYear)
      return k?.status === 'avvik'
    })

    if (avvikLeiligheter.length > 0) {
      if (y > 240) {
        doc.addPage()
        y = 20
      }
      y += 10
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Leiligheter med avvik:', 20, y)
      y += 7
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      
      for (const leilighet of avvikLeiligheter) {
        if (y > 270) {
          doc.addPage()
          y = 20
        }
        const kontroll = getKontrollStatus(leilighet.id, selectedYear)
        doc.text(`• ${leilighet.leilighet_nummer}: ${kontroll?.kommentar || 'Ingen beskrivelse'}`, 25, y)
        y += 5
      }
    }

    // Ikke kontrollert siste 4 år
    if (ikkeKontrollertSiste4År.length > 0) {
      if (y > 240) {
        doc.addPage()
        y = 20
      }
      y += 10
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 100, 0)
      doc.text('Ikke kontrollert siste 4 år:', 20, y)
      doc.setTextColor(0, 0, 0)
      y += 7
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      
      const nummerListe = ikkeKontrollertSiste4År.map(l => l.leilighet_nummer).join(', ')
      const lines = doc.splitTextToSize(nummerListe, pageWidth - 50)
      doc.text(lines, 25, y)
    }

    // Footer
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(128, 128, 128)
      doc.text(`Side ${i} av ${pageCount}`, pageWidth / 2, 290, { align: 'center' })
      doc.text('BSVFire - Leilighetskontroll', 20, 290)
    }

    // Last ned
    doc.save(`Leilighetskontroll_${anleggNavn.replace(/[^a-zA-Z0-9]/g, '_')}_${selectedYear}.pdf`)
  }

  // Hent alle kontrollår for en leilighet
  function getKontrollHistorikk(leilighetId: string): number[] {
    return kontroller
      .filter(k => k.leilighet_id === leilighetId && k.status === 'ok')
      .map(k => k.kontroll_aar)
      .sort((a, b) => a - b)
  }

  // Grupper leiligheter per etasje
  const leiligheterPerEtasjeMap = leiligheter.reduce((acc, l) => {
    if (!acc[l.etasje]) acc[l.etasje] = []
    acc[l.etasje].push(l)
    return acc
  }, {} as Record<number, Leilighet[]>)

  const etasjer = Object.keys(leiligheterPerEtasjeMap).map(Number).sort((a, b) => b - a) // Høyeste først

  // Statistikk
  const totalLeiligheter = leiligheter.length
  const kontrollertIÅr = kontroller.filter(k => k.kontroll_aar === selectedYear && k.status === 'ok').length
  const avvikIÅr = kontroller.filter(k => k.kontroll_aar === selectedYear && k.status === 'avvik').length

  // Finn leiligheter som ikke er kontrollert siste 4 år
  const fireÅrSiden = selectedYear - 4
  const ikkeKontrollertSiste4År = leiligheter.filter(l => {
    const historikk = getKontrollHistorikk(l.id)
    return historikk.length === 0 || Math.max(...historikk) < fireÅrSiden
  })

  const toggleEtasje = (etasje: number) => {
    const newExpanded = new Set(expandedEtasjer)
    if (newExpanded.has(etasje)) {
      newExpanded.delete(etasje)
    } else {
      newExpanded.add(etasje)
    }
    setExpandedEtasjer(newExpanded)
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-dark-200 rounded-xl p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Laster leiligheter...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-200 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Leilighetsoversikt
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{anleggNavn}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Oppsett-modus */}
        {showSetup && (
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Sett opp leiligheter
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Antall etasjer
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={antallEtasjer}
                  onChange={(e) => setAntallEtasjer(parseInt(e.target.value) || 1)}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Leiligheter per etasje
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={leiligheterPerEtasje}
                  onChange={(e) => setLeiligheterPerEtasje(parseInt(e.target.value) || 1)}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Prefix (f.eks. H)
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={startNummer}
                  onChange={(e) => setStartNummer(e.target.value.toUpperCase())}
                  className="input"
                />
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Eksempel: {startNummer}0101, {startNummer}0102, ... {startNummer}{String(antallEtasjer).padStart(2, '0')}{String(leiligheterPerEtasje).padStart(2, '0')}
            </p>
            <div className="flex gap-2">
              <button
                onClick={generateLeiligheter}
                disabled={saving}
                className="btn-primary flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Generer {antallEtasjer * leiligheterPerEtasje} leiligheter
              </button>
              {leiligheter.length > 0 && (
                <button
                  onClick={() => setShowSetup(false)}
                  className="btn-secondary"
                >
                  Avbryt
                </button>
              )}
            </div>
          </div>
        )}

        {/* Statistikk og år-velger */}
        {!showSetup && leiligheter.length > 0 && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-100">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalLeiligheter}</p>
                  <p className="text-xs text-gray-500">Totalt</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{kontrollertIÅr}</p>
                  <p className="text-xs text-gray-500">OK i {selectedYear}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{avvikIÅr}</p>
                  <p className="text-xs text-gray-500">Avvik i {selectedYear}</p>
                </div>
                {ikkeKontrollertSiste4År.length > 0 && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">{ikkeKontrollertSiste4År.length}</p>
                    <p className="text-xs text-gray-500">Ikke kontrollert siste 4 år</p>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">År:</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="input w-24"
                >
                  {[...Array(5)].map((_, i) => {
                    const year = new Date().getFullYear() - i
                    return <option key={year} value={year}>{year}</option>
                  })}
                </select>
                
                <button
                  onClick={generatePDF}
                  className="btn-secondary text-sm flex items-center gap-1"
                  title="Last ned PDF-rapport"
                >
                  <FileDown className="w-4 h-4" />
                  PDF
                </button>
                
                <button
                  onClick={addEtasje}
                  className="btn-secondary text-sm flex items-center gap-1"
                  title="Legg til etasje"
                >
                  <Plus className="w-4 h-4" />
                  Etasje
                </button>
                
                <button
                  onClick={() => setShowSetup(true)}
                  className="btn-secondary text-sm"
                  title="Oppsett"
                >
                  ⚙️
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Leilighets-liste */}
        <div className="flex-1 overflow-y-auto p-4">
          {leiligheter.length === 0 && !showSetup ? (
            <div className="text-center py-12">
              <Home className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Ingen leiligheter registrert</p>
              <button
                onClick={() => setShowSetup(true)}
                className="btn-primary mt-4"
              >
                Sett opp leiligheter
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {etasjer.map(etasje => (
                <div key={etasje} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleEtasje(etasje)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-100 hover:bg-gray-100 dark:hover:bg-dark-200"
                  >
                    <div className="flex items-center gap-2">
                      {expandedEtasjer.has(etasje) ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                      <span className="font-medium">Etasje {etasje}</span>
                      <span className="text-sm text-gray-500">
                        ({leiligheterPerEtasjeMap[etasje]?.length || 0} leiligheter)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Mini-statistikk for etasjen */}
                      {(() => {
                        const etasjeLeiligheter = leiligheterPerEtasjeMap[etasje] || []
                        const ok = etasjeLeiligheter.filter(l => {
                          const k = getKontrollStatus(l.id, selectedYear)
                          return k?.status === 'ok'
                        }).length
                        const avvik = etasjeLeiligheter.filter(l => {
                          const k = getKontrollStatus(l.id, selectedYear)
                          return k?.status === 'avvik'
                        }).length
                        return (
                          <>
                            {ok > 0 && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">{ok} OK</span>}
                            {avvik > 0 && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">{avvik} Avvik</span>}
                          </>
                        )
                      })()}
                    </div>
                  </button>
                  
                  {expandedEtasjer.has(etasje) && (
                    <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {(leiligheterPerEtasjeMap[etasje] || []).map(leilighet => {
                        const kontroll = getKontrollStatus(leilighet.id, selectedYear)
                        const pending = pendingChanges.get(leilighet.id)
                        const currentStatus = pending?.status || kontroll?.status
                        const historikk = getKontrollHistorikk(leilighet.id)
                        
                        return (
                          <div
                            key={leilighet.id}
                            className={`p-3 rounded-lg border-2 transition-colors ${
                              currentStatus === 'ok' 
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                                : currentStatus === 'avvik'
                                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                : currentStatus === 'ikke_hjemme'
                                ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-mono font-bold text-sm">
                                {leilighet.leilighet_nummer}
                              </span>
                              <button
                                onClick={() => deleteLeilighet(leilighet.id)}
                                className="p-1 text-gray-400 hover:text-red-500"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            
                            {/* Kontroll-knapper */}
                            <div className="flex gap-1 mb-2">
                              <button
                                onClick={() => setKontrollStatus(leilighet.id, 'ok')}
                                className={`flex-1 p-1.5 rounded text-xs font-medium transition-colors ${
                                  currentStatus === 'ok'
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-100 dark:bg-dark-100 hover:bg-green-100'
                                }`}
                                title="OK"
                              >
                                <CheckCircle className="w-4 h-4 mx-auto" />
                              </button>
                              <button
                                onClick={() => setKontrollStatus(leilighet.id, 'avvik')}
                                className={`flex-1 p-1.5 rounded text-xs font-medium transition-colors ${
                                  currentStatus === 'avvik'
                                    ? 'bg-red-500 text-white'
                                    : 'bg-gray-100 dark:bg-dark-100 hover:bg-red-100'
                                }`}
                                title="Avvik"
                              >
                                <XCircle className="w-4 h-4 mx-auto" />
                              </button>
                              <button
                                onClick={() => setKontrollStatus(leilighet.id, 'ikke_hjemme')}
                                className={`flex-1 p-1.5 rounded text-xs font-medium transition-colors ${
                                  currentStatus === 'ikke_hjemme'
                                    ? 'bg-yellow-500 text-white'
                                    : 'bg-gray-100 dark:bg-dark-100 hover:bg-yellow-100'
                                }`}
                                title="Ikke hjemme"
                              >
                                <HelpCircle className="w-4 h-4 mx-auto" />
                              </button>
                            </div>
                            
                            {/* Historikk */}
                            {historikk.length > 0 && (
                              <div className="text-xs text-gray-500 flex flex-wrap gap-1">
                                {historikk.slice(-4).map(år => (
                                  <span key={år} className="bg-gray-100 dark:bg-dark-100 px-1 rounded">
                                    {år}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                      
                      {/* Legg til leilighet */}
                      <button
                        onClick={() => addLeilighet(etasje)}
                        className="p-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary hover:bg-primary/5 flex items-center justify-center"
                      >
                        <Plus className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer med lagre-knapp */}
        {pendingChanges.size > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-primary/5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {pendingChanges.size} endring{pendingChanges.size > 1 ? 'er' : ''} ikke lagret
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPendingChanges(new Map())}
                  className="btn-secondary"
                >
                  Avbryt
                </button>
                <button
                  onClick={saveKontroller}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Lagre kontroller
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
