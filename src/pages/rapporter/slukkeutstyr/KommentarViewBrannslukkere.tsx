import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, MessageSquare, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

interface Kommentar {
  id?: string
  anlegg_id: string
  kommentar?: string | null
  opprettet_av?: string | null
  opprettet_dato?: string | null
  created_at?: string
}

interface KommentarViewProps {
  anleggId: string
  kundeNavn: string
  anleggNavn: string
  onBack: () => void
}

export function KommentarViewBrannslukkere({ anleggId, kundeNavn: _kundeNavn, anleggNavn: _anleggNavn, onBack }: KommentarViewProps) {
  const { user } = useAuthStore()
  const [kommentarer, setKommentarer] = useState<Kommentar[]>([])
  const [loading, setLoading] = useState(false)
  const [nyKommentar, setNyKommentar] = useState('')
  const [brukerNavn, setBrukerNavn] = useState<string>('')
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    loadKommentarer()
    loadBrukerNavn()
  }, [anleggId])

  async function loadBrukerNavn() {
    if (!user?.id) return

    try {
      const { data, error } = await supabase
        .from('ansatte')
        .select('navn')
        .eq('bruker_id', user.id)
        .maybeSingle()

      if (error) throw error
      if (data?.navn) {
        setBrukerNavn(data.navn)
      }
    } catch (error) {
      console.error('Feil ved lasting av brukernavn:', error)
    }
  }

  async function loadKommentarer() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('kommentar_brannslukkere')
        .select('*')
        .eq('anlegg_id', anleggId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setKommentarer(data || [])
    } catch (error) {
      console.error('Feil ved lasting av kommentarer:', error)
      alert('Kunne ikke laste kommentarer')
    } finally {
      setLoading(false)
    }
  }

  async function leggTilKommentar() {
    if (!nyKommentar.trim()) {
      alert('Skriv inn en kommentar først')
      return
    }

    try {
      const kommentar: Kommentar = {
        anlegg_id: anleggId,
        kommentar: nyKommentar,
        opprettet_av: brukerNavn || user?.email || 'Ukjent',
        opprettet_dato: new Date().toISOString().split('T')[0]
      }

      const { error } = await supabase
        .from('kommentar_brannslukkere')
        .insert([kommentar])

      if (error) throw error
      
      setNyKommentar('')
      await loadKommentarer()
    } catch (error) {
      console.error('Feil ved opprettelse av kommentar:', error)
      alert('Kunne ikke legge til kommentar')
    }
  }

  async function slettKommentar(id: string) {
    if (!confirm('Er du sikker på at du vil slette denne kommentaren?')) return

    try {
      const { error } = await supabase
        .from('kommentar_brannslukkere')
        .delete()
        .eq('id', id)

      if (error) throw error
      setKommentarer(kommentarer.filter(k => k.id !== id))
    } catch (error) {
      console.error('Feil ved sletting:', error)
      alert('Kunne ikke slette kommentar')
    }
  }

  function formaterDato(dato: string | null | undefined) {
    if (!dato) return 'Ukjent dato'
    
    try {
      const d = new Date(dato)
      return d.toLocaleDateString('nb-NO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dato
    }
  }

  if (loading && kommentarer.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Laster kommentarer...</div>
      </div>
    )
  }

  return (
    <div className="card">
      {/* Header med toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left mb-4 hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-red-500" />
          <h3 className="text-lg font-semibold text-white">
            Kommentarer {kommentarer.length > 0 && `(${kommentarer.length})`}
          </h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <>
          {/* Ny kommentar */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h4 className="text-md font-semibold text-white">Legg til kommentar</h4>
            </div>

        <div className="space-y-3">
          <textarea
            value={nyKommentar}
            onChange={(e) => setNyKommentar(e.target.value)}
            className="input min-h-[120px]"
            placeholder="Skriv en kommentar om brannslukkere, observasjoner, avvik eller annen relevant informasjon..."
          />
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Kommentar av: <span className="text-white">{brukerNavn || user?.email || 'Ukjent'}</span>
            </p>
            <button
              onClick={leggTilKommentar}
              disabled={!nyKommentar.trim()}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" />
              Legg til kommentar
            </button>
          </div>
        </div>
      </div>

          {/* Kommentarliste */}
          <div className="space-y-4 mt-6">
            <h3 className="text-lg font-semibold text-white">
              Tidligere kommentarer ({kommentarer.length})
            </h3>

            {kommentarer.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400">Ingen kommentarer ennå</p>
                <p className="text-sm text-gray-500 mt-2">Legg til den første kommentaren ovenfor</p>
              </div>
            ) : (
              kommentarer.map((kommentar) => (
                <div key={kommentar.id} className="border border-gray-800 rounded-lg p-4 hover:border-red-500/20 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
                          <MessageSquare className="w-4 h-4 text-red-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {kommentar.opprettet_av || 'Ukjent'}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Calendar className="w-3 h-3" />
                            {formaterDato(kommentar.opprettet_dato || kommentar.created_at)}
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-300 whitespace-pre-wrap ml-11">
                        {kommentar.kommentar}
                      </p>
                    </div>
                    <button
                      onClick={() => slettKommentar(kommentar.id!)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
