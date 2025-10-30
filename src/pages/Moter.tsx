import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Calendar, Users, Plus, Clock, MapPin } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { nb } from 'date-fns/locale'
import { MoteDialog } from '../components/moter/MoteDialog'
import { MoteDetaljer } from '../components/moter/MoteDetaljer'

interface Mote {
  id: string
  tittel: string
  beskrivelse: string | null
  mote_dato: string
  varighet_minutter: number
  lokasjon: string | null
  status: 'planlagt' | 'pagaende' | 'avsluttet' | 'avlyst'
  opprettet_av: string | null
  opprettet_dato: string
  sist_oppdatert: string
}

export function Moter() {
  const [moter, setMoter] = useState<Mote[]>([])
  const [selectedMote, setSelectedMote] = useState<Mote | null>(null)
  const [loading, setLoading] = useState(true)
  const [showMoteDialog, setShowMoteDialog] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('alle')

  useEffect(() => {
    loadMoter()
  }, [])

  const loadMoter = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('moter')
        .select('*')
        .order('mote_dato', { ascending: false })

      if (error) throw error
      setMoter(data || [])
    } catch (error) {
      console.error('Feil ved lasting av møter:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateMoteStatus = async (moteId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('moter')
        .update({ status })
        .eq('id', moteId)

      if (error) throw error
      await loadMoter()
      if (selectedMote?.id === moteId) {
        setSelectedMote({ ...selectedMote, status: status as any })
      }
    } catch (error) {
      console.error('Feil ved oppdatering av møtestatus:', error)
    }
  }

  const handleDeleteMote = async (moteId: string) => {
    if (!confirm('Er du sikker på at du vil slette dette møtet?')) return

    try {
      const { error } = await supabase
        .from('moter')
        .delete()
        .eq('id', moteId)

      if (error) throw error
      await loadMoter()
      if (selectedMote?.id === moteId) {
        setSelectedMote(null)
      }
    } catch (error) {
      console.error('Feil ved sletting av møte:', error)
      alert('Kunne ikke slette møte')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planlagt': return 'bg-blue-500/20 text-blue-400'
      case 'pagaende': return 'bg-green-500/20 text-green-400'
      case 'avsluttet': return 'bg-gray-500/20 text-gray-400'
      case 'avlyst': return 'bg-red-500/20 text-red-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'planlagt': return 'Planlagt'
      case 'pagaende': return 'Pågående'
      case 'avsluttet': return 'Avsluttet'
      case 'avlyst': return 'Avlyst'
      default: return status
    }
  }

  const filteredMoter = moter.filter(mote => {
    if (filterStatus === 'alle') return true
    return mote.status === filterStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Møter</h1>
          <p className="text-gray-400 mt-1">Administrer møter, agendapunkter og referater</p>
        </div>
        <button
          onClick={() => setShowMoteDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nytt møte
        </button>
      </div>

      <div className="flex gap-2">
        {['alle', 'planlagt', 'pagaende', 'avsluttet'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filterStatus === status
                ? 'bg-primary text-white'
                : 'bg-dark-lighter text-gray-400 hover:bg-dark-lighter/80'
            }`}
          >
            {status === 'alle' ? 'Alle' : getStatusText(status)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xl font-semibold text-white">Møter</h2>
          <div className="space-y-3">
            {filteredMoter.map(mote => (
              <div
                key={mote.id}
                onClick={() => setSelectedMote(mote)}
                className={`p-4 rounded-lg cursor-pointer transition-all ${
                  selectedMote?.id === mote.id
                    ? 'bg-primary/20 border-2 border-primary'
                    : 'bg-dark-lighter hover:bg-dark-lighter/80 border-2 border-transparent'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-white">{mote.tittel}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${getStatusColor(mote.status)}`}>
                    {getStatusText(mote.status)}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {format(parseISO(mote.mote_dato), 'PPP', { locale: nb })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {format(parseISO(mote.mote_dato), 'HH:mm')} ({mote.varighet_minutter} min)
                  </div>
                  {mote.lokasjon && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {mote.lokasjon}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {filteredMoter.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                Ingen møter funnet
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedMote ? (
            <MoteDetaljer
              mote={selectedMote}
              onUpdateStatus={handleUpdateMoteStatus}
              onDelete={handleDeleteMote}
              onRefresh={loadMoter}
            />
          ) : (
            <div className="bg-dark-lighter rounded-lg p-12 text-center">
              <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Velg et møte for å se detaljer</p>
            </div>
          )}
        </div>
      </div>

      {showMoteDialog && (
        <MoteDialog
          onClose={() => setShowMoteDialog(false)}
          onSuccess={() => {
            loadMoter()
            setShowMoteDialog(false)
          }}
        />
      )}
    </div>
  )
}
