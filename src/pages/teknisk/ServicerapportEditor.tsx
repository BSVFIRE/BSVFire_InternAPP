import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Eye, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { BSV_LOGO } from '@/assets/logoBase64'
import { SendRapportDialog } from '@/components/SendRapportDialog'

interface Servicerapport {
  id: string
  anlegg_id: string
  anlegg_navn?: string
  ordre_id?: string
  rapport_dato: string
  tekniker_navn: string
  header: string
  rapport_innhold: string
  opprettet_dato?: string
  sist_oppdatert?: string
}

interface Anlegg {
  id: string
  anleggsnavn: string
  kundenr: string
  adresse?: string
  postnr?: string
  poststed?: string
  customer?: {
    navn: string
  }
}

interface AnleggDetails {
  anleggsnavn: string
  adresse: string
  postnr: string
  poststed: string
  kunde_navn: string
  kontaktperson_navn?: string
  kontaktperson_telefon?: string
  kontaktperson_epost?: string
}

interface Ansatt {
  id: string
  navn: string
}

interface ServicerapportEditorProps {
  rapport: Servicerapport
  onSave: (rapport: Servicerapport) => Promise<Servicerapport>
  onCancel: () => void
}

export function ServicerapportEditor({ rapport, onSave, onCancel }: ServicerapportEditorProps) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<Servicerapport>(rapport)
  const [anlegg, setAnlegg] = useState<Anlegg[]>([])
  const [filteredAnlegg, setFilteredAnlegg] = useState<Anlegg[]>([])
  const [anleggSok, setAnleggSok] = useState('')
  const [ansatte, setAnsatte] = useState<Ansatt[]>([])
  const [anleggDetails, setAnleggDetails] = useState<AnleggDetails | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [showSendRapportDialog, setShowSendRapportDialog] = useState(false)
  const [savedRapportData, setSavedRapportData] = useState<{ kundeId: string; anleggId: string } | null>(null)

  useEffect(() => {
    loadAnlegg()
    loadAnsatte()
  }, [])

  useEffect(() => {
    if (formData.anlegg_id && anlegg.length > 0) {
      loadAnleggDetails(formData.anlegg_id)
    } else {
      setAnleggDetails(null)
    }
  }, [formData.anlegg_id, anlegg])

  useEffect(() => {
    // Filter anlegg based on search
    if (anleggSok.trim() === '') {
      setFilteredAnlegg(anlegg)
    } else {
      const searchLower = anleggSok.toLowerCase()
      const filtered = anlegg.filter(a => 
        a.anleggsnavn.toLowerCase().includes(searchLower)
      )
      setFilteredAnlegg(filtered)
    }
  }, [anleggSok, anlegg])

  async function loadAnlegg() {
    try {
      const { data, error } = await supabase
        .from('anlegg')
        .select('id, anleggsnavn, kundenr')
        .order('anleggsnavn')

      if (error) throw error
      const anleggData = data || []
      setAnlegg(anleggData)
      setFilteredAnlegg(anleggData)
    } catch (error) {
      console.error('Feil ved lasting av anlegg:', error)
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
    } catch (error) {
      console.error('Feil ved lasting av ansatte:', error)
    }
  }

  async function loadAnleggDetails(anleggId: string) {
    try {
      console.log('Loading anlegg details for:', anleggId)
      
      const { data: anleggData, error: anleggError } = await supabase
        .from('anlegg')
        .select('anleggsnavn, adresse, postnummer, poststed, kundenr')
        .eq('id', anleggId)
        .single()

      console.log('Anlegg data:', anleggData, 'Error:', anleggError)

      if (anleggError) {
        console.error('Error loading anlegg:', anleggError)
        // Vis i det minste anleggsnavnet fra dropdown
        const selectedAnlegg = anlegg.find(a => a.id === anleggId)
        if (selectedAnlegg) {
          setAnleggDetails({
            anleggsnavn: selectedAnlegg.anleggsnavn,
            adresse: '',
            postnr: '',
            poststed: '',
            kunde_navn: ''
          })
        }
        return
      }

      // Hent primær kontaktperson for anlegget (ikke kritisk hvis det feiler)
      const { data: kontaktData, error: kontaktError } = await supabase
        .from('anlegg_kontaktpersoner')
        .select(`
          kontaktpersoner:kontaktperson_id (
            navn,
            telefon,
            epost
          )
        `)
        .eq('anlegg_id', anleggId)
        .eq('primar', true)
        .maybeSingle()

      console.log('Kontakt data:', kontaktData, 'Error:', kontaktError)

      // Hent kundenavn separat
      let kundeNavn = ''
      if (anleggData.kundenr) {
        const { data: kundeData } = await supabase
          .from('customer')
          .select('navn')
          .eq('id', anleggData.kundenr)
          .single()
        kundeNavn = kundeData?.navn || ''
      }

      const details: AnleggDetails = {
        anleggsnavn: anleggData.anleggsnavn || '',
        adresse: anleggData.adresse || '',
        postnr: anleggData.postnummer || '',
        poststed: anleggData.poststed || '',
        kunde_navn: kundeNavn,
        kontaktperson_navn: (kontaktData?.kontaktpersoner as any)?.navn,
        kontaktperson_telefon: (kontaktData?.kontaktpersoner as any)?.telefon,
        kontaktperson_epost: (kontaktData?.kontaktpersoner as any)?.epost
      }

      console.log('Setting anlegg details:', details)
      setAnleggDetails(details)
    } catch (error) {
      console.error('Feil ved lasting av anleggsdetaljer:', error)
      // Vis i det minste anleggsnavnet
      const selectedAnlegg = anlegg.find(a => a.id === anleggId)
      if (selectedAnlegg) {
        setAnleggDetails({
          anleggsnavn: selectedAnlegg.anleggsnavn,
          adresse: '',
          postnr: '',
          poststed: '',
          kunde_navn: ''
        })
      }
    }
  }

  function handleChange(field: keyof Servicerapport, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  async function handleAiImprove() {
    if (!formData.rapport_innhold.trim()) {
      alert('Skriv inn stikkord eller en kort beskrivelse først')
      return
    }

    setAiLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('ai-improve-servicerapport', {
        body: {
          keywords: formData.rapport_innhold,
          anleggType: anlegg.find(a => a.id === formData.anlegg_id)?.anleggsnavn,
          tekniker: formData.tekniker_navn
        }
      })

      if (error) {
        console.error('Supabase function error:', error)
        throw error
      }

      if (data?.error) {
        console.error('Function returned error:', data.error)
        alert(`❌ Feil: ${data.error}\n\n${data.details || 'Sjekk at Azure OpenAI er konfigurert i Supabase.'}`)
        return
      }

      if (data?.improvedReport) {
        // Vis forbedret rapport i en dialog for godkjenning
        const userApproved = confirm(
          'AI har generert en forbedret rapport. Vil du erstatte den nåværende teksten?\n\n' +
          'Klikk OK for å godkjenne, eller Avbryt for å beholde den nåværende teksten.'
        )

        if (userApproved) {
          handleChange('rapport_innhold', data.improvedReport)
          alert('✅ Rapporten er oppdatert med AI-forbedret innhold!')
        }
      } else {
        alert('⚠️ Ingen forbedret rapport mottatt fra AI.')
      }
    } catch (error) {
      console.error('Feil ved AI-forbedring:', error)
      alert('❌ Kunne ikke forbedre rapporten med AI.\n\nSjekk at Azure OpenAI er konfigurert i Supabase Dashboard → Edge Functions → Secrets.')
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      // Lagre rapporten først og få tilbake den lagrede rapporten med ID
      const savedRapport = await onSave(formData)
      
      // Generer og lagre PDF til storage
      if (savedRapport.anlegg_id && savedRapport.id) {
        const { generateServicerapportPDF } = await import('./ServicerapportPDF')
        const result = await generateServicerapportPDF(savedRapport, true)
        if (result.success) {
          // Hent kunde-ID fra anlegget
          const selectedAnlegg = anlegg.find(a => a.id === savedRapport.anlegg_id)
          if (selectedAnlegg) {
            setSavedRapportData({
              kundeId: selectedAnlegg.kundenr,
              anleggId: savedRapport.anlegg_id
            })
          }
          // Vis dialog for å sende rapport
          setShowSendRapportDialog(true)
        }
      }
    } catch (error) {
      console.error('Feil ved lagring/generering:', error)
      alert('Kunne ikke lagre servicerapport')
      setLoading(false)
    }
  }

  function handleSendRapportConfirm() {
    // Naviger til Send Rapporter med kunde og anlegg pre-valgt
    setShowSendRapportDialog(false)
    setLoading(false)
    if (savedRapportData) {
      navigate('/send-rapporter', { 
        state: { 
          kundeId: savedRapportData.kundeId, 
          anleggId: savedRapportData.anleggId 
        } 
      })
    }
  }

  function handleSendRapportCancel() {
    // Lukk dialogen og editoren
    setShowSendRapportDialog(false)
    setLoading(false)
    onCancel() // Lukk editoren og gå tilbake til listen
  }

  if (showPreview) {
    return (
      <div className="space-y-6">
        {/* Preview Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowPreview(false)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Forhåndsvisning</h1>
              <p className="text-gray-600 dark:text-gray-400">Slik vil rapporten se ut</p>
            </div>
          </div>
        </div>

        {/* Preview Content */}
        <div className="card max-w-4xl mx-auto !bg-white text-black p-8">
          {/* Logo */}
          <div className="mb-6">
            <img src={BSV_LOGO} alt="BSV Logo" className="w-48 h-auto mb-4" />
            <h1 className="text-3xl font-bold text-blue-600 uppercase mb-2">SERVICERAPPORT</h1>
          </div>
          
          {/* Header */}
          <div className="border-b-2 border-blue-600 pb-4 mb-6">
            <h2 className="text-2xl font-bold mb-4">{formData.header || 'Servicerapport'}</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold">Anlegg:</span>{' '}
                {anlegg.find(a => a.id === formData.anlegg_id)?.anleggsnavn || 'Ikke valgt'}
              </div>
              <div>
                <span className="font-semibold">Dato:</span>{' '}
                {new Date(formData.rapport_dato).toLocaleDateString('nb-NO')}
              </div>
              <div>
                <span className="font-semibold">Tekniker:</span> {formData.tekniker_navn || 'Ikke angitt'}
              </div>
            </div>
          </div>

          {/* Report Content */}
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap">{formData.rapport_innhold || 'Ingen innhold ennå...'}</div>
          </div>
          
          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-gray-300">
            <p className="text-sm font-bold text-blue-600 mb-2">Brannteknisk Service og Vedlikehold AS</p>
            <p className="text-xs text-gray-600">
              Org.nr: 921044879 | E-post: mail@bsvfire.no | Telefon: 900 46 600
            </p>
            <p className="text-xs text-gray-600">
              Adresse: Sælenveien 44, 5151 Straumsgrend
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Generert: {new Date().toLocaleDateString('nb-NO')} {new Date().toLocaleTimeString('nb-NO')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Dialog */}
      <SendRapportDialog
        onConfirm={handleSendRapportConfirm}
        onCancel={handleSendRapportCancel}
        isOpen={showSendRapportDialog}
      />

      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onCancel}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {rapport.id ? 'Rediger servicerapport' : 'Ny servicerapport'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Fyll ut informasjon og rapportinnhold</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Section */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Header</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rapporttittel *
              </label>
              <input
                type="text"
                value={formData.header}
                onChange={(e) => handleChange('header', e.target.value)}
                className="input w-full"
                placeholder="F.eks. Årlig service brannalarmanlegg"
                required
              />
            </div>

            {/* Anlegg */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Anlegg <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Søk etter anlegg..."
                  value={anleggSok}
                  onChange={(e) => setAnleggSok(e.target.value)}
                  className="input"
                />
                <select
                  value={formData.anlegg_id}
                  onChange={(e) => handleChange('anlegg_id', e.target.value)}
                  className="input"
                  required
                  size={Math.min(filteredAnlegg.length + 1, 10)}
                >
                  <option value="">Velg anlegg ({filteredAnlegg.length} av {anlegg.length})</option>
                  {filteredAnlegg.slice(0, 100).map((a) => (
                    <option key={a.id} value={a.id}>{a.anleggsnavn}</option>
                  ))}
                  {filteredAnlegg.length > 100 && (
                    <option disabled>... og {filteredAnlegg.length - 100} flere (søk for å begrense)</option>
                  )}
                </select>
                {filteredAnlegg.length === 0 && anleggSok && (
                  <p className="text-sm text-yellow-400 mt-1">⚠️ Ingen anlegg funnet for "{anleggSok}"</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Dato *
              </label>
              <input
                type="date"
                value={formData.rapport_dato}
                onChange={(e) => handleChange('rapport_dato', e.target.value)}
                className="input w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tekniker *
              </label>
              <select
                value={formData.tekniker_navn}
                onChange={(e) => handleChange('tekniker_navn', e.target.value)}
                className="input w-full"
                required
              >
                <option value="">Velg tekniker</option>
                {ansatte.map((ansatt) => (
                  <option key={ansatt.id} value={ansatt.navn}>
                    {ansatt.navn}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Anleggsdetaljer */}
        {anleggDetails && (
          <div className="card bg-blue-500/5 border-blue-500/20">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Anleggsdetaljer</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Kunde</label>
                <p className="text-gray-900 dark:text-white">{anleggDetails.kunde_navn || 'Ikke angitt'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Anlegg</label>
                <p className="text-gray-900 dark:text-white">{anleggDetails.anleggsnavn}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Adresse</label>
                <p className="text-gray-900 dark:text-white">
                  {anleggDetails.adresse || 'Ikke angitt'}
                  {anleggDetails.postnr && anleggDetails.poststed && (
                    <><br />{anleggDetails.postnr} {anleggDetails.poststed}</>
                  )}
                </p>
              </div>
              {anleggDetails.kontaktperson_navn && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Kontaktperson</label>
                  <p className="text-gray-900 dark:text-white">{anleggDetails.kontaktperson_navn}</p>
                  {anleggDetails.kontaktperson_telefon && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">{anleggDetails.kontaktperson_telefon}</p>
                  )}
                  {anleggDetails.kontaktperson_epost && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">{anleggDetails.kontaktperson_epost}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Report Content Section */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Rapportinnhold</h2>
            <button
              type="button"
              onClick={handleAiImprove}
              disabled={aiLoading || !formData.rapport_innhold.trim()}
              className="btn-primary flex items-center gap-2 text-sm"
              title="Bruk AI til å forbedre rapporten"
            >
              <Sparkles className="w-4 h-4" />
              {aiLoading ? 'Genererer...' : 'Forbedre med AI'}
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rapport tekst *
            </label>
            <textarea
              value={formData.rapport_innhold}
              onChange={(e) => handleChange('rapport_innhold', e.target.value)}
              className="input w-full font-mono"
              rows={20}
              placeholder="Skriv rapportinnholdet her...

Eksempel:
1. INNLEDNING
   - Formål med service
   - Dato og tid for utførelse

2. UTFØRT ARBEID
   - Beskrivelse av utførte arbeider
   - Komponenter som er kontrollert

3. FUNN OG OBSERVASJONER
   - Eventuelle avvik
   - Anbefalinger

4. KONKLUSJON
   - Oppsummering
   - Neste service"
              required
            />
            <div className="flex items-start gap-2 mt-2">
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  💡 <strong>Tips:</strong> Skriv stikkord eller en kort beskrivelse, og klikk "Forbedre med AI" for å få en profesjonell rapport.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
          >
            Avbryt
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Eye className="w-5 h-5" />
              Forhåndsvisning
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Lagrer og genererer...' : 'Lagre og generer rapport'}
            </button>
          </div>
        </div>
      </form>
    </div>
    </>
  )
}
