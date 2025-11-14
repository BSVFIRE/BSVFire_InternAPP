import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { createLogger } from '@/lib/logger'
import { Plus, Search, User, Edit, Trash2, Phone, Mail, Building2, AlertCircle, ArrowLeft } from 'lucide-react'

const log = createLogger('EksternKontaktpersoner')

interface EksternKontaktperson {
  id: string
  navn: string
  firma: string | null
  telefon: string | null
  epost: string | null
  ekstern_type: string | null
  notater: string | null
  created_at: string
  updated_at: string | null
}

export function EksternKontaktpersoner() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { returnTo?: string; anleggId?: string; editMode?: boolean } | null
  
  const [kontakter, setKontakter] = useState<EksternKontaktperson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit'>('list')
  const [selectedKontakt, setSelectedKontakt] = useState<EksternKontaktperson | null>(null)

  useEffect(() => {
    loadKontakter()
  }, [])

  async function loadKontakter() {
    try {
      setError(null)
      const { data, error } = await supabase
        .from('kontaktperson_ekstern')
        .select('*')
        .order('navn', { ascending: true })

      if (error) throw error
      setKontakter(data || [])
    } catch (err) {
      log.error('Feil ved lasting av eksterne kontaktpersoner', { error: err })
      setError(err instanceof Error ? err.message : 'Kunne ikke laste data')
    } finally {
      setLoading(false)
    }
  }

  async function deleteKontakt(id: string) {
    if (!confirm('Er du sikker på at du vil slette denne kontaktpersonen?')) return

    try {
      const { error } = await supabase
        .from('kontaktperson_ekstern')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadKontakter()
    } catch (error) {
      log.error('Feil ved sletting av ekstern kontaktperson', { error, kontaktId: id })
      alert('Kunne ikke slette kontaktperson')
    }
  }

  const filteredKontakter = kontakter.filter(k => {
    const searchLower = searchTerm.toLowerCase()
    return (
      k.navn.toLowerCase().includes(searchLower) ||
      k.firma?.toLowerCase().includes(searchLower) ||
      k.telefon?.toLowerCase().includes(searchLower) ||
      k.epost?.toLowerCase().includes(searchLower) ||
      k.ekstern_type?.toLowerCase().includes(searchLower)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-400 dark:text-gray-400">Laster eksterne kontaktpersoner...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Eksterne kontaktpersoner</h1>
          <p className="text-gray-400 dark:text-gray-400">Administrer eksterne kontaktpersoner</p>
        </div>
        <div className="card bg-red-900/20 border-red-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold text-red-400 mb-2">Kunne ikke laste kontaktpersoner</h3>
              <p className="text-red-300 text-sm mb-4">{error}</p>
              <button onClick={loadKontakter} className="btn-primary text-sm">
                Prøv igjen
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <KontaktForm
        kontakt={selectedKontakt}
        onSave={async () => {
          await loadKontakter()
          setViewMode('list')
          setSelectedKontakt(null)
          
          // Hvis vi kom fra anlegg, naviger tilbake
          if (state?.returnTo === 'anlegg' && state.anleggId && state.editMode) {
            navigate('/anlegg', { 
              state: { 
                editAnleggId: state.anleggId 
              } 
            })
          }
        }}
        onCancel={() => {
          setViewMode('list')
          setSelectedKontakt(null)
        }}
        returnToAnlegg={state?.returnTo === 'anlegg'}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            {state?.returnTo === 'anlegg' && (
              <button
                onClick={() => {
                  if (state.anleggId && state.editMode) {
                    navigate('/anlegg', { 
                      state: { 
                        editAnleggId: state.anleggId 
                      } 
                    })
                  } else {
                    navigate('/anlegg')
                  }
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-dark-100 rounded-lg transition-colors"
                title="Tilbake til anlegg"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400 dark:text-gray-400" />
              </button>
            )}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Eksterne kontaktpersoner</h1>
          </div>
          <p className="text-gray-400 dark:text-gray-400">Administrer eksterne kontaktpersoner som kan gjenbrukes på tvers av anlegg</p>
        </div>
        <button
          onClick={() => {
            setSelectedKontakt(null)
            setViewMode('create')
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Ny kontaktperson
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-400" />
          <input
            type="text"
            placeholder="Søk etter navn, firma, telefon, e-post..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-gray-400 dark:text-gray-400 text-sm">Totalt kontakter</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{kontakter.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <Building2 className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-gray-400 dark:text-gray-400 text-sm">Unike firmaer</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {new Set(kontakter.filter(k => k.firma).map(k => k.firma)).size}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Search className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-gray-400 dark:text-gray-400 text-sm">Søkeresultater</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{filteredKontakter.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Kontaktliste */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Kontaktliste
            <span className="ml-2 text-sm text-gray-400 dark:text-gray-400 font-normal">
              ({filteredKontakter.length} kontakter)
            </span>
          </h2>
        </div>

        {filteredKontakter.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-gray-500 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 dark:text-gray-400">
              {searchTerm ? 'Ingen kontakter funnet' : 'Ingen eksterne kontaktpersoner registrert ennå'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredKontakter.map((kontakt) => (
              <div
                key={kontakt.id}
                className="p-4 bg-gray-50 dark:bg-dark-100 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-primary transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-gray-900 dark:text-white font-medium mb-1">{kontakt.navn}</h3>
                      {kontakt.firma && (
                        <p className="text-sm text-gray-400 dark:text-gray-400 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {kontakt.firma}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {kontakt.ekstern_type && (
                  <span className="badge badge-info text-xs mb-3">{kontakt.ekstern_type}</span>
                )}

                <div className="space-y-2 mb-3">
                  {kontakt.telefon && (
                    <a
                      href={`tel:${kontakt.telefon}`}
                      className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-400 hover:text-primary transition-colors"
                    >
                      <Phone className="w-3 h-3" />
                      {kontakt.telefon}
                    </a>
                  )}
                  {kontakt.epost && (
                    <a
                      href={`mailto:${kontakt.epost}`}
                      className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-400 hover:text-primary transition-colors break-all"
                    >
                      <Mail className="w-3 h-3" />
                      {kontakt.epost}
                    </a>
                  )}
                </div>

                {kontakt.notater && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 italic mb-3 line-clamp-2">
                    {kontakt.notater}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-800">
                  <button
                    onClick={() => {
                      setSelectedKontakt(kontakt)
                      setViewMode('edit')
                    }}
                    className="flex-1 p-2 text-gray-400 dark:text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors text-sm flex items-center justify-center gap-1"
                  >
                    <Edit className="w-4 h-4" />
                    Rediger
                  </button>
                  <button
                    onClick={() => deleteKontakt(kontakt.id)}
                    className="flex-1 p-2 text-gray-400 dark:text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    Slett
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Kontakt Form Component
interface KontaktFormProps {
  kontakt: EksternKontaktperson | null
  onSave: () => void
  onCancel: () => void
  returnToAnlegg?: boolean
}

function KontaktForm({ kontakt, onSave, onCancel, returnToAnlegg }: KontaktFormProps) {
  const [formData, setFormData] = useState({
    navn: kontakt?.navn || '',
    firma: kontakt?.firma || '',
    telefon: kontakt?.telefon || '',
    epost: kontakt?.epost || '',
    ekstern_type: kontakt?.ekstern_type || '',
    notater: kontakt?.notater || '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const dataToSave = {
        navn: formData.navn,
        firma: formData.firma || null,
        telefon: formData.telefon || null,
        epost: formData.epost || null,
        ekstern_type: formData.ekstern_type || null,
        notater: formData.notater || null,
      }

      if (kontakt) {
        // Update
        const { error } = await supabase
          .from('kontaktperson_ekstern')
          .update(dataToSave)
          .eq('id', kontakt.id)

        if (error) throw error
      } else {
        // Create
        const { error } = await supabase
          .from('kontaktperson_ekstern')
          .insert([dataToSave])

        if (error) throw error
      }

      onSave()
    } catch (error) {
      log.error('Feil ved lagring av ekstern kontaktperson', { error, formData })
      alert('Kunne ikke lagre kontaktperson')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {kontakt ? 'Rediger kontaktperson' : 'Ny ekstern kontaktperson'}
          </h1>
          <p className="text-gray-400 dark:text-gray-400">
            {kontakt ? 'Oppdater informasjon om kontaktpersonen' : 'Legg til en ny ekstern kontaktperson'}
          </p>
          {returnToAnlegg && (
            <p className="text-primary text-sm mt-2">
              💡 Du vil bli sendt tilbake til anlegget etter lagring
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Navn <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.navn}
              onChange={(e) => setFormData({ ...formData, navn: e.target.value })}
              className="input"
              placeholder="Fullt navn..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Firma
            </label>
            <input
              type="text"
              value={formData.firma}
              onChange={(e) => setFormData({ ...formData, firma: e.target.value })}
              className="input"
              placeholder="Firmanavn..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Type ekstern tjeneste
            </label>
            <select
              value={formData.ekstern_type}
              onChange={(e) => setFormData({ ...formData, ekstern_type: e.target.value })}
              className="input"
            >
              <option value="">Velg type</option>
              <option value="Sprinkler">Sprinkler</option>
              <option value="Elektro">Elektro</option>
              <option value="Ventilasjon">Ventilasjon</option>
              <option value="Rør">Rør</option>
              <option value="Gass anlegg">Gass anlegg</option>
              <option value="Slukke anlegg">Slukke anlegg</option>
              <option value="Annet">Annet</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Telefon
            </label>
            <input
              type="tel"
              value={formData.telefon}
              onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
              className="input"
              placeholder="Telefonnummer..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              E-post
            </label>
            <input
              type="email"
              value={formData.epost}
              onChange={(e) => setFormData({ ...formData, epost: e.target.value })}
              className="input"
              placeholder="epost@eksempel.no"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Notater
            </label>
            <textarea
              value={formData.notater}
              onChange={(e) => setFormData({ ...formData, notater: e.target.value })}
              className="input"
              rows={3}
              placeholder="Interne notater om kontaktpersonen..."
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
          <button
            type="submit"
            disabled={saving || !formData.navn}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Lagrer...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                {kontakt ? 'Oppdater' : 'Opprett'}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
            disabled={saving}
          >
            Avbryt
          </button>
        </div>
      </form>
    </div>
  )
}
