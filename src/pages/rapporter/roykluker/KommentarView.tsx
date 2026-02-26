import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, MessageSquare, Calendar } from 'lucide-react'
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
}

export function KommentarView({ anleggId, kundeNavn, anleggNavn }: KommentarViewProps) {
  const { user } = useAuthStore()
  const [kommentarer, setKommentarer] = useState<Kommentar[]>([])
  const [loading, setLoading] = useState(false)
  const [nyKommentar, setNyKommentar] = useState('')
  const [brukerNavn, setBrukerNavn] = useState<string>('')

  useEffect(() => {
    loadKommentarer()
    loadBrukerNavn()
  }, [anleggId])

  async function loadBrukerNavn() {
    if (!user?.email) return

    try {
      const { data, error } = await supabase
        .from('ansatte')
        .select('navn')
        .eq('epost', user.email)
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
        .from('kommentar_roykluker')
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
        .from('kommentar_roykluker')
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
        .from('kommentar_roykluker')
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Kommentarer</h2>
        <p className="text-gray-600 dark:text-gray-400">{kundeNavn} - {anleggNavn}</p>
      </div>

      {/* Ny kommentar */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Legg til kommentar</h3>
        </div>

        <div className="space-y-3">
          <textarea
            value={nyKommentar}
            onChange={(e) => setNyKommentar(e.target.value)}
            className="input min-h-[120px]"
            placeholder="Skriv en kommentar om røyklukesystemet, observasjoner, avvik eller annen relevant informasjon..."
          />
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Kommentar av: <span className="text-gray-900 dark:text-white">{brukerNavn || user?.email || 'Ukjent'}</span>
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
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Tidligere kommentarer ({kommentarer.length})
        </h3>

        {kommentarer.length === 0 ? (
          <div className="card text-center py-12">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400">Ingen kommentarer ennå</p>
            <p className="text-sm text-gray-500 mt-2">Legg til den første kommentaren ovenfor</p>
          </div>
        ) : (
          kommentarer.map((kommentar) => (
            <div key={kommentar.id} className="card hover:border-primary/20 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {kommentar.opprettet_av || 'Ukjent'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Calendar className="w-3 h-3" />
                        {formaterDato(kommentar.opprettet_dato || kommentar.created_at)}
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap ml-11">
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
    </div>
  )
}
