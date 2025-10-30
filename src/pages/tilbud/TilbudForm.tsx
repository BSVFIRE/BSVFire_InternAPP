import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { ArrowLeft, Building, User, FileText, DollarSign, Download, Eye } from 'lucide-react'
import { CustomerSection } from './CustomerSection'
import { ContactPersonSection } from './ContactPersonSection'
import { ServicesSection } from './ServicesSection'
import { PricingSection } from './PricingSection'
import { TilbudPreview } from './TilbudPreview'
import { downloadTilbudPDF } from './TilbudPDF'
import type { ServiceavtaleTilbud } from '../TilbudServiceavtale'

interface TilbudFormProps {
  tilbud: ServiceavtaleTilbud | null
  onSave: () => void
  onCancel: () => void
}

export function TilbudForm({ tilbud, onSave, onCancel }: TilbudFormProps) {
  const { user } = useAuthStore()
  
  const DEFAULT_BESKRIVELSE = 'Kontroll blir utført 1 gang pr. kalenderår med ca. 12 mnd. intervall. Når det nærmer seg ny kontroll tar BSV kontakt med deres kontaktperson for nærmere avtale om kontroll-dato. Alle kontroller blir utført iht. gjeldende forskrifter.'
  
  const [formData, setFormData] = useState({
    kunde_id: tilbud?.kunde_id || '',
    kunde_navn: tilbud?.kunde_navn || '',
    kunde_organisasjonsnummer: tilbud?.kunde_organisasjonsnummer || '',
    lokasjon: tilbud?.lokasjon || '',
    anlegg_id: tilbud?.anlegg_id || '',
    anlegg_navn: tilbud?.anlegg_navn || '',
    kontaktperson_id: tilbud?.kontaktperson_id || '',
    kontaktperson_navn: tilbud?.kontaktperson_navn || '',
    kontaktperson_epost: tilbud?.kontaktperson_epost || '',
    kontaktperson_telefon: tilbud?.kontaktperson_telefon || '',
    tjeneste_brannalarm: tilbud?.tjeneste_brannalarm || false,
    tjeneste_nodlys: tilbud?.tjeneste_nodlys || false,
    tjeneste_slukkeutstyr: tilbud?.tjeneste_slukkeutstyr || false,
    tjeneste_rokluker: tilbud?.tjeneste_rokluker || false,
    tjeneste_eksternt: tilbud?.tjeneste_eksternt || false,
    tilbud_nummer: tilbud?.tilbud_nummer || '',
    beskrivelse: tilbud?.beskrivelse || DEFAULT_BESKRIVELSE,
    notater: tilbud?.notater || '',
    status: tilbud?.status || 'utkast',
    pris_detaljer: tilbud?.pris_detaljer || {},
    total_pris: tilbud?.total_pris || 0,
    rabatt_prosent: tilbud?.rabatt_prosent || 0,
    timespris: tilbud?.timespris || 925,
    betalingsbetingelser: tilbud?.betalingsbetingelser || 20,
    opprettet_av_navn: tilbud?.opprettet_av_navn || '',
  })

  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Fetch logged in user's name
  useEffect(() => {
    async function fetchUserName() {
      if (user && !formData.opprettet_av_navn) {
        console.log('Fetching user name for:', user.email)
        console.log('User object:', { id: user.id, email: user.email, metadata: user.user_metadata })
        
        // Try to find user by email in ansatte table
        // First try with 'epost' column
        console.log('Attempting to fetch from ansatte with email:', user.email)
        let result = await supabase
          .from('ansatte')
          .select('navn, epost')
          .eq('epost', user.email)
          .maybeSingle()
        
        console.log('Raw result:', result)
        let data = result.data
        let error = result.error
        
        // If not found, try with 'email' column
        if (!data) {
          const result2 = await supabase
            .from('ansatte')
            .select('navn, email')
            .eq('email', user.email)
            .maybeSingle()
          data = result2.data as any
          error = result2.error
        }
        
        console.log('Search result for', user.email, ':', { data, error })
        
        if (error || !data) {
          if (error) {
            console.error('Error fetching user name from ansatte by email:', error)
          } else {
            console.log('No match found for email:', user.email)
          }
          
          // Fallback 1: Try by ID
          const { data: dataById, error: errorById } = await supabase
            .from('ansatte')
            .select('navn')
            .eq('id', user.id)
            .single()
          
          if (!errorById && dataById?.navn) {
            setFormData(prev => ({ ...prev, opprettet_av_navn: dataById.navn }))
            console.log('Successfully fetched name from ansatte by ID:', dataById.navn)
            return
          }
          
          // Fallback 2: Try to get name from user metadata
          if (user.user_metadata?.navn) {
            setFormData(prev => ({ ...prev, opprettet_av_navn: user.user_metadata.navn }))
            console.log('Using name from user metadata:', user.user_metadata.navn)
          } else if (user.user_metadata?.full_name) {
            setFormData(prev => ({ ...prev, opprettet_av_navn: user.user_metadata.full_name }))
            console.log('Using full_name from user metadata:', user.user_metadata.full_name)
          } else if (user.email) {
            // Last resort: use email name part
            const emailName = user.email.split('@')[0].replace(/[._]/g, ' ')
            const capitalizedName = emailName.split(' ').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ')
            setFormData(prev => ({ ...prev, opprettet_av_navn: capitalizedName }))
            console.log('Using email-based name:', capitalizedName)
          }
        } else if (data?.navn) {
          setFormData(prev => ({ ...prev, opprettet_av_navn: data.navn }))
          console.log('Successfully fetched name from ansatte by email:', data.navn)
        } else {
          console.warn('No name found in ansatte table for user:', user.email)
        }
      }
    }
    fetchUserName()
  }, [user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!formData.kunde_navn.trim()) {
      alert('Kundenavn er påkrevd')
      return
    }

    setSaving(true)

    try {
      const payload = {
        ...formData,
        kunde_id: formData.kunde_id || null,
        anlegg_id: formData.anlegg_id || null,
        kontaktperson_id: formData.kontaktperson_id || null,
      }

      if (tilbud) {
        const { error } = await supabase
          .from('serviceavtale_tilbud')
          .update(payload)
          .eq('id', tilbud.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('serviceavtale_tilbud')
          .insert([payload])

        if (error) throw error
      }

      onSave()
    } catch (error) {
      console.error('Feil ved lagring:', error)
      alert('Kunne ikke lagre tilbud')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {tilbud ? 'Rediger tilbud' : 'Nytt tilbud'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {tilbud ? 'Oppdater tilbudsinformasjon' : 'Opprett nytt serviceavtaletilbud'}
          </p>
        </div>
        <button onClick={onCancel} className="btn-secondary flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Tilbake
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Section */}
        <div className="card space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Building className="w-5 h-5 text-primary" />
            Kundeinformasjon
          </h2>
          <CustomerSection formData={formData} setFormData={setFormData} />
        </div>

        {/* Contact Person Section */}
        <div className="card space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Kontaktperson
          </h2>
          <ContactPersonSection formData={formData} setFormData={setFormData} />
        </div>

        {/* Services Section */}
        <div className="card space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Inkluderte tjenester
          </h2>
          <ServicesSection formData={formData} setFormData={setFormData} />
        </div>

        {/* Pricing Section */}
        <div className="card space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Prisberegning
          </h2>
          <PricingSection formData={formData} setFormData={setFormData} />
        </div>

        {/* Additional Details */}
        <div className="card space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Tilleggsdetaljer</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
                Tilbudsnummer
              </label>
              <input
                type="text"
                value={formData.tilbud_nummer}
                onChange={(e) => setFormData({ ...formData, tilbud_nummer: e.target.value })}
                className="input"
                placeholder="T-2024-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="input"
              >
                <option value="utkast">Utkast</option>
                <option value="sendt">Sendt</option>
                <option value="godkjent">Godkjent</option>
                <option value="avvist">Avvist</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
                Betalingsbetingelser (dager)
              </label>
              <input
                type="number"
                value={formData.betalingsbetingelser}
                onChange={(e) => setFormData({ ...formData, betalingsbetingelser: parseInt(e.target.value) || 20 })}
                className="input"
                placeholder="20"
                min="1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Beskrivelse
            </label>
            <textarea
              value={formData.beskrivelse}
              onChange={(e) => setFormData({ ...formData, beskrivelse: e.target.value })}
              className="input min-h-[100px]"
              placeholder="Beskrivelse av tilbudet..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Interne notater
            </label>
            <textarea
              value={formData.notater}
              onChange={(e) => setFormData({ ...formData, notater: e.target.value })}
              className="input min-h-[100px]"
              placeholder="Interne notater..."
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Lagrer...' : tilbud ? 'Oppdater tilbud' : 'Opprett tilbud'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary"
            >
              Avbryt
            </button>
          </div>

          {/* PDF Actions - Only show if tilbud has been saved */}
          {tilbud && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Forhåndsvis PDF
              </button>
              <button
                type="button"
                onClick={() => downloadTilbudPDF({
                  ...formData,
                  opprettet: tilbud.opprettet,
                  tilbudsnummer: formData.tilbud_nummer
                })}
                className="btn-primary flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Last ned PDF
              </button>
            </div>
          )}
        </div>
      </form>

      {/* PDF Preview Modal */}
      {showPreview && tilbud && (
        <TilbudPreview
          tilbudData={{
            ...formData,
            opprettet: tilbud.opprettet,
            tilbudsnummer: formData.tilbud_nummer
          }}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  )
}
