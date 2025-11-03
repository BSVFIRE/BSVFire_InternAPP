import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { createLogger } from '@/lib/logger'
import { Inbox, Check, Eye, Building2, Calendar, User } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

const log = createLogger('Meldinger')

interface Melding {
  id: string
  anlegg_id: string
  kunde: string | null
  intern_kommentar: string
  created_at: string
  lest: boolean
  lest_dato: string | null
  anleggsnavn: string | null
  kunde_navn: string | null
}

export function Meldinger() {
  const navigate = useNavigate()
  const [meldinger, setMeldinger] = useState<Melding[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visKunUleste, setVisKunUleste] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    loadCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUserId) {
      loadMeldinger()
    }
  }, [currentUserId, visKunUleste])

  async function loadCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Finn ansatt basert på email
        const { data: ansatt } = await supabase
          .from('ansatte')
          .select('id')
          .eq('epost', user.email)
          .single()
        
        if (ansatt) {
          setCurrentUserId(ansatt.id)
        }
      }
    } catch (error) {
      log.error('Feil ved lasting av bruker', { error })
    }
  }

  async function loadMeldinger() {
    try {
      setError(null)
      
      let query = supabase
        .from('intern_kommentar')
        .select(`
          id,
          anlegg_id,
          kunde,
          intern_kommentar,
          created_at,
          lest,
          lest_dato,
          anlegg:anlegg_id (
            anleggsnavn,
            customer:kundenr (
              navn
            )
          )
        `)
        .eq('mottaker_id', currentUserId)
        .order('created_at', { ascending: false })

      if (visKunUleste) {
        query = query.eq('lest', false)
      }

      const { data, error } = await query

      if (error) throw error

      // Transform data
      const transformedData: Melding[] = (data || []).map((m: any) => ({
        id: m.id,
        anlegg_id: m.anlegg_id,
        kunde: m.kunde,
        intern_kommentar: m.intern_kommentar,
        created_at: m.created_at,
        lest: m.lest,
        lest_dato: m.lest_dato,
        anleggsnavn: m.anlegg?.anleggsnavn || null,
        kunde_navn: m.anlegg?.customer?.navn || m.kunde
      }))

      setMeldinger(transformedData)
    } catch (err) {
      log.error('Feil ved lasting av meldinger', { error: err })
      setError(err instanceof Error ? err.message : 'Kunne ikke laste meldinger')
    } finally {
      setLoading(false)
    }
  }

  async function markerSomLest(meldingId: string) {
    try {
      const { error } = await supabase
        .from('intern_kommentar')
        .update({ 
          lest: true,
          lest_dato: new Date().toISOString()
        })
        .eq('id', meldingId)

      if (error) throw error
      
      // Oppdater lokal state
      setMeldinger(meldinger.map(m => 
        m.id === meldingId 
          ? { ...m, lest: true, lest_dato: new Date().toISOString() }
          : m
      ))
    } catch (error) {
      log.error('Feil ved markering som lest', { error, meldingId })
      alert('Kunne ikke markere melding som lest')
    }
  }

  async function visAnlegg(melding: Melding) {
    // Marker som lest først
    if (!melding.lest) {
      await markerSomLest(melding.id)
    }
    
    // Naviger til anlegget
    navigate('/anlegg', { state: { viewAnleggId: melding.anlegg_id } })
  }

  const ulestemeldinger = meldinger.filter(m => !m.lest).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={loadMeldinger} className="btn-primary">
            Prøv igjen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Meldinger</h1>
          <p className="text-gray-400 dark:text-gray-400">
            {ulestemeldinger > 0 
              ? `Du har ${ulestemeldinger} ulest${ulestemeldinger === 1 ? '' : 'e'} melding${ulestemeldinger === 1 ? '' : 'er'}`
              : 'Ingen uleste meldinger'
            }
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="card">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={visKunUleste}
            onChange={(e) => setVisKunUleste(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-primary focus:ring-primary"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">Vis kun uleste</span>
        </label>
      </div>

      {/* Meldingsliste */}
      <div className="space-y-3">
        {meldinger.length === 0 ? (
          <div className="card text-center py-12">
            <Inbox className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 dark:text-gray-400">
              {visKunUleste ? 'Ingen uleste meldinger' : 'Ingen meldinger'}
            </p>
          </div>
        ) : (
          meldinger.map((melding) => (
            <div
              key={melding.id}
              className={`card hover:shadow-lg transition-shadow cursor-pointer ${
                !melding.lest ? 'border-l-4 border-primary bg-primary/5' : ''
              }`}
              onClick={() => visAnlegg(melding)}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  !melding.lest ? 'bg-primary/10' : 'bg-gray-100 dark:bg-dark-100'
                }`}>
                  <Inbox className={`w-5 h-5 ${!melding.lest ? 'text-primary' : 'text-gray-400'}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <p className="font-medium text-gray-900 dark:text-white">
                          {melding.anleggsnavn || 'Ukjent anlegg'}
                        </p>
                      </div>
                      {melding.kunde_navn && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <User className="w-3 h-3" />
                          {melding.kunde_navn}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!melding.lest && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            markerSomLest(melding.id)
                          }}
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Marker som lest"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-100 rounded-lg transition-colors"
                        title="Vis anlegg"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300 mb-2 whitespace-pre-wrap">
                    {melding.intern_kommentar}
                  </p>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                    <Calendar className="w-3 h-3" />
                    {formatDate(melding.created_at)}
                    {melding.lest && melding.lest_dato && (
                      <span className="ml-2">• Lest {formatDate(melding.lest_dato)}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
