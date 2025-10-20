import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, User } from 'lucide-react'

interface Kontaktperson {
  id: string
  navn: string
  epost: string | null
  telefon: string | null
}

interface ContactPersonSectionProps {
  formData: any
  setFormData: (data: any) => void
}

export function ContactPersonSection({ formData, setFormData }: ContactPersonSectionProps) {
  const [kontaktpersoner, setKontaktpersoner] = useState<Kontaktperson[]>([])
  const [showKontaktpersonForm, setShowKontaktpersonForm] = useState(false)
  const [newKontaktperson, setNewKontaktperson] = useState({ navn: '', epost: '', telefon: '' })
  const [savingKontaktperson, setSavingKontaktperson] = useState(false)
  
  // Search state
  const [contactSearchQuery, setContactSearchQuery] = useState('')
  const [showContactResults, setShowContactResults] = useState(false)
  const contactResultsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (formData.anlegg_id) {
      loadKontaktpersonerForAnlegg(formData.anlegg_id)
    } else {
      loadKontaktpersoner()
    }
  }, [formData.anlegg_id])

  // Close search results when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (contactResultsRef.current && !contactResultsRef.current.contains(event.target as Node)) {
        setShowContactResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function loadKontaktpersoner() {
    try {
      const { data, error } = await supabase
        .from('kontaktpersoner')
        .select('id, navn, epost, telefon')
        .order('navn', { ascending: true })

      if (error) throw error
      setKontaktpersoner(data || [])
    } catch (error) {
      console.error('Feil ved lasting av kontaktpersoner:', error)
    }
  }

  async function loadKontaktpersonerForAnlegg(anleggId: string) {
    try {
      const { data, error } = await supabase
        .from('kontaktpersoner')
        .select(`
          id,
          navn,
          epost,
          telefon,
          anlegg_kontaktpersoner!inner(anlegg_id, primar)
        `)
        .eq('anlegg_kontaktpersoner.anlegg_id', anleggId)
        .order('navn', { ascending: true })

      if (error) throw error
      setKontaktpersoner(data || [])
    } catch (error) {
      console.error('Feil ved lasting av kontaktpersoner for anlegg:', error)
      // Fallback to all contacts if junction table query fails
      loadKontaktpersoner()
    }
  }

  function selectContact(kp: Kontaktperson) {
    setFormData({
      ...formData,
      kontaktperson_id: kp.id,
      kontaktperson_navn: kp.navn,
      kontaktperson_epost: kp.epost || '',
      kontaktperson_telefon: kp.telefon || ''
    })
    setContactSearchQuery(kp.navn)
    setShowContactResults(false)
  }

  const filteredKontaktpersoner = kontaktpersoner.filter(kp => 
    kp.navn.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
    (kp.epost && kp.epost.toLowerCase().includes(contactSearchQuery.toLowerCase())) ||
    (kp.telefon && kp.telefon.includes(contactSearchQuery))
  )

  async function handleCreateKontaktperson() {
    if (!newKontaktperson.navn.trim()) {
      alert('Navn er påkrevd')
      return
    }

    setSavingKontaktperson(true)
    try {
      const { data, error } = await supabase
        .from('kontaktpersoner')
        .insert([{
          navn: newKontaktperson.navn,
          epost: newKontaktperson.epost || null,
          telefon: newKontaktperson.telefon || null
        }])
        .select()
        .single()

      if (error) throw error

      await loadKontaktpersoner()
      setFormData({ 
        ...formData, 
        kontaktperson_id: data.id,
        kontaktperson_navn: data.navn,
        kontaktperson_epost: data.epost || '',
        kontaktperson_telefon: data.telefon || ''
      })
      setShowKontaktpersonForm(false)
      setNewKontaktperson({ navn: '', epost: '', telefon: '' })
    } catch (error) {
      console.error('Feil ved opprettelse av kontaktperson:', error)
      alert('Kunne ikke opprette kontaktperson')
    } finally {
      setSavingKontaktperson(false)
    }
  }

  return (
    <>
      {!showKontaktpersonForm ? (
        <div className="space-y-3">
          <div className="relative" ref={contactResultsRef}>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
              Velg kontaktperson
              {formData.anlegg_id && kontaktpersoner.length > 0 && (
                <span className="ml-2 text-xs text-primary">
                  ({kontaktpersoner.length} tilknyttet valgt anlegg)
                </span>
              )}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
              <input
                type="text"
                value={contactSearchQuery}
                onChange={(e) => {
                  setContactSearchQuery(e.target.value)
                  setShowContactResults(true)
                }}
                onFocus={() => setShowContactResults(true)}
                className="input pl-10"
                placeholder="Søk etter kontaktperson..."
              />
            </div>

            {showContactResults && filteredKontaktpersoner.length > 0 && (
              <div className="absolute z-10 w-full mt-2 bg-white dark:bg-dark-200 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 overflow-y-auto">
                {filteredKontaktpersoner.slice(0, 50).map((kp) => (
                  <button
                    key={kp.id}
                    type="button"
                    onClick={() => selectContact(kp)}
                    className="w-full text-left px-4 py-3 hover:bg-primary/10 border-b border-gray-200 dark:border-gray-800 last:border-b-0 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{kp.navn}</p>
                        {kp.epost && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {kp.epost}
                          </p>
                        )}
                        {kp.telefon && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {kp.telefon}
                          </p>
                        )}
                      </div>
                      <User className="w-5 h-5 text-primary flex-shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {showContactResults && filteredKontaktpersoner.length === 0 && contactSearchQuery.length > 0 && (
              <div className="absolute z-10 w-full mt-2 bg-white dark:bg-dark-200 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4">
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center">Ingen kontaktpersoner funnet</p>
              </div>
            )}

            {formData.anlegg_id && kontaktpersoner.length === 0 && !contactSearchQuery && (
              <p className="text-xs text-gray-400 mt-1">
                Ingen kontaktpersoner funnet for valgt anlegg
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowKontaktpersonForm(true)}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Opprett ny kontaktperson
          </button>
        </div>
      ) : (
        <div className="space-y-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <h3 className="font-medium text-gray-900 dark:text-white">Ny kontaktperson</h3>
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Navn *</label>
            <input
              type="text"
              value={newKontaktperson.navn}
              onChange={(e) => setNewKontaktperson({ ...newKontaktperson, navn: e.target.value })}
              className="input"
              placeholder="Navn"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">E-post</label>
            <input
              type="email"
              value={newKontaktperson.epost}
              onChange={(e) => setNewKontaktperson({ ...newKontaktperson, epost: e.target.value })}
              className="input"
              placeholder="epost@eksempel.no"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Telefon</label>
            <input
              type="tel"
              value={newKontaktperson.telefon}
              onChange={(e) => setNewKontaktperson({ ...newKontaktperson, telefon: e.target.value })}
              className="input"
              placeholder="+47 123 45 678"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreateKontaktperson}
              disabled={savingKontaktperson}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {savingKontaktperson ? 'Oppretter...' : 'Opprett'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowKontaktpersonForm(false)
                setNewKontaktperson({ navn: '', epost: '', telefon: '' })
              }}
              className="btn-secondary flex-1"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}
    </>
  )
}
