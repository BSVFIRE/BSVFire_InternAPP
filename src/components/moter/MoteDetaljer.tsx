import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Calendar, FileText, CheckCircle, PlayCircle, Trash2, Plus, Clock } from 'lucide-react'
import { AgendaDialog } from './AgendaDialog'
import { ReferatDialog } from './ReferatDialog'
import { OppgaveDialog } from './OppgaveDialog'

interface Mote {
  id: string
  tittel: string
  beskrivelse: string | null
  mote_dato: string
  varighet_minutter: number
  lokasjon: string | null
  status: 'planlagt' | 'pagaende' | 'avsluttet' | 'avlyst'
}

interface MoteDeltaker {
  id: string
  ansatte?: { navn: string; epost: string | null }
  rolle: string
}

interface Agendapunkt {
  id: string
  tittel: string
  beskrivelse: string | null
  rekkefolgje: number
  estimert_tid_minutter: number | null
  status: string
  ansatte?: { navn: string }
}

interface MoteReferat {
  id: string
  innhold: string
  type: string
  opprettet_dato: string
  agendapunkt_id: string | null
}

interface MoteOppgave {
  id: string
  tittel: string
  beskrivelse: string | null
  ansvarlig_id: string | null
  forfallsdato: string | null
  status: string
  prioritet: string
  ansatte?: { navn: string }
}

interface MoteDetaljerProps {
  mote: Mote
  onUpdateStatus: (moteId: string, status: string) => void
  onDelete: (moteId: string) => void
  onRefresh: () => void
}

export function MoteDetaljer({ mote, onUpdateStatus, onDelete }: MoteDetaljerProps) {
  const [deltakere, setDeltakere] = useState<MoteDeltaker[]>([])
  const [agendapunkter, setAgendapunkter] = useState<Agendapunkt[]>([])
  const [referater, setReferater] = useState<MoteReferat[]>([])
  const [oppgaver, setOppgaver] = useState<MoteOppgave[]>([])
  const [activeTab, setActiveTab] = useState<'oversikt' | 'agenda' | 'referat' | 'oppgaver'>('oversikt')
  const [showAgendaDialog, setShowAgendaDialog] = useState(false)
  const [showReferatDialog, setShowReferatDialog] = useState(false)
  const [showOppgaveDialog, setShowOppgaveDialog] = useState(false)

  useEffect(() => {
    loadData()
  }, [mote.id])

  const loadData = async () => {
    await Promise.all([
      loadDeltakere(),
      loadAgendapunkter(),
      loadReferater(),
      loadOppgaver()
    ])
  }

  const loadDeltakere = async () => {
    const { data } = await supabase
      .from('mote_deltakere')
      .select('*, ansatte(navn, epost)')
      .eq('mote_id', mote.id)
    setDeltakere(data || [])
  }

  const loadAgendapunkter = async () => {
    const { data } = await supabase
      .from('mote_agendapunkter')
      .select('*, ansatte(navn)')
      .eq('mote_id', mote.id)
      .order('rekkefolgje')
    setAgendapunkter(data || [])
  }

  const loadReferater = async () => {
    const { data } = await supabase
      .from('mote_referater')
      .select('*')
      .eq('mote_id', mote.id)
      .order('opprettet_dato', { ascending: false })
    setReferater(data || [])
  }

  const loadOppgaver = async () => {
    const { data } = await supabase
      .from('mote_oppgaver')
      .select('*, ansatte(navn)')
      .eq('mote_id', mote.id)
      .order('forfallsdato')
    setOppgaver(data || [])
  }

  const handleUpdateAgendapunktStatus = async (id: string, status: string) => {
    await supabase
      .from('mote_agendapunkter')
      .update({ status })
      .eq('id', id)
    await loadAgendapunkter()
  }

  const handleUpdateOppgaveStatus = async (id: string, status: string) => {
    await supabase
      .from('mote_oppgaver')
      .update({ status })
      .eq('id', id)
    await loadOppgaver()
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planlagt: 'bg-blue-500/20 text-blue-400',
      pagaende: 'bg-green-500/20 text-green-400',
      avsluttet: 'bg-gray-500/20 text-gray-400',
      ikke_startet: 'bg-gray-500/20 text-gray-400',
      ferdig: 'bg-green-500/20 text-green-400',
      kritisk: 'bg-red-500/20 text-red-400',
      hoy: 'bg-orange-500/20 text-orange-400',
      medium: 'bg-yellow-500/20 text-yellow-400',
      lav: 'bg-green-500/20 text-green-400'
    }
    return colors[status] || 'bg-gray-500/20 text-gray-400'
  }

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      planlagt: 'Planlagt',
      pagaende: 'Pågående',
      avsluttet: 'Avsluttet',
      ikke_startet: 'Ikke startet',
      ferdig: 'Ferdig',
      utsatt: 'Utsatt',
      notat: 'Notat',
      beslutning: 'Beslutning',
      oppgave: 'Oppgave',
      informasjon: 'Informasjon',
      kritisk: 'Kritisk',
      hoy: 'Høy',
      medium: 'Medium',
      lav: 'Lav'
    }
    return texts[status] || status
  }

  return (
    <div className="space-y-6">
      <div className="bg-dark-lighter rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">{mote.tittel}</h2>
            {mote.beskrivelse && (
              <p className="text-gray-400">{mote.beskrivelse}</p>
            )}
          </div>
          <div className="flex gap-2">
            {mote.status === 'planlagt' && (
              <button
                onClick={() => onUpdateStatus(mote.id, 'pagaende')}
                className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30"
                title="Start møte"
              >
                <PlayCircle className="w-5 h-5" />
              </button>
            )}
            {mote.status === 'pagaende' && (
              <button
                onClick={() => onUpdateStatus(mote.id, 'avsluttet')}
                className="p-2 bg-gray-500/20 text-gray-400 rounded-lg hover:bg-gray-500/30"
                title="Avslutt møte"
              >
                <CheckCircle className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => onDelete(mote.id)}
              className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
              title="Slett møte"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Deltakere</h3>
          <div className="flex flex-wrap gap-2">
            {deltakere.map(deltaker => (
              <div key={deltaker.id} className="px-3 py-1 bg-dark rounded-lg text-sm">
                <span className="text-white">{deltaker.ansatte?.navn}</span>
                <span className="text-gray-400 ml-2">({deltaker.rolle})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-dark-lighter">
        {[
          { id: 'oversikt', label: 'Oversikt', icon: Calendar },
          { id: 'agenda', label: 'Agenda', icon: FileText },
          { id: 'referat', label: 'Referat', icon: FileText },
          { id: 'oppgaver', label: 'Oppgaver', icon: CheckCircle }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-dark-lighter rounded-lg p-6">
        {activeTab === 'oversikt' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Møteoversikt</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs ${getStatusColor(mote.status)}`}>
                  {getStatusText(mote.status)}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Varighet:</span>
                <span className="text-white ml-2">{mote.varighet_minutter} minutter</span>
              </div>
              <div>
                <span className="text-gray-400">Agendapunkter:</span>
                <span className="text-white ml-2">{agendapunkter.length}</span>
              </div>
              <div>
                <span className="text-gray-400">Referater:</span>
                <span className="text-white ml-2">{referater.length}</span>
              </div>
              <div>
                <span className="text-gray-400">Oppgaver:</span>
                <span className="text-white ml-2">{oppgaver.length}</span>
              </div>
              <div>
                <span className="text-gray-400">Deltakere:</span>
                <span className="text-white ml-2">{deltakere.length}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'agenda' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Agendapunkter</h3>
              <button
                onClick={() => setShowAgendaDialog(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm"
              >
                <Plus className="w-4 h-4" />
                Nytt punkt
              </button>
            </div>
            <div className="space-y-3">
              {agendapunkter.map((punkt, index) => (
                <div key={punkt.id} className="p-4 bg-dark rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-gray-400 text-sm">#{index + 1}</span>
                        <h4 className="font-semibold text-white">{punkt.tittel}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(punkt.status)}`}>
                          {getStatusText(punkt.status)}
                        </span>
                      </div>
                      {punkt.beskrivelse && (
                        <p className="text-sm text-gray-400 mb-2">{punkt.beskrivelse}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        {punkt.estimert_tid_minutter && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {punkt.estimert_tid_minutter} min
                          </span>
                        )}
                        {punkt.ansatte && <span>Ansvarlig: {punkt.ansatte.navn}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {punkt.status === 'ikke_startet' && (
                        <button
                          onClick={() => handleUpdateAgendapunktStatus(punkt.id, 'pagaende')}
                          className="p-1.5 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30"
                        >
                          <PlayCircle className="w-4 h-4" />
                        </button>
                      )}
                      {punkt.status === 'pagaende' && (
                        <button
                          onClick={() => handleUpdateAgendapunktStatus(punkt.id, 'ferdig')}
                          className="p-1.5 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {agendapunkter.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  Ingen agendapunkter lagt til ennå
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'referat' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Referat</h3>
              <button
                onClick={() => setShowReferatDialog(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm"
              >
                <Plus className="w-4 h-4" />
                Nytt notat
              </button>
            </div>
            <div className="space-y-3">
              {referater.map(referat => (
                <div key={referat.id} className="p-4 bg-dark rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <span className={`text-xs px-2 py-1 rounded ${getStatusColor(referat.type)}`}>
                      {getStatusText(referat.type)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(referat.opprettet_dato).toLocaleString('nb-NO')}
                    </span>
                  </div>
                  <p className="text-white whitespace-pre-wrap">{referat.innhold}</p>
                </div>
              ))}
              {referater.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  Ingen referat skrevet ennå
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'oppgaver' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Oppgaver</h3>
              <button
                onClick={() => setShowOppgaveDialog(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm"
              >
                <Plus className="w-4 h-4" />
                Ny oppgave
              </button>
            </div>
            <div className="space-y-3">
              {oppgaver.map(oppgave => (
                <div key={oppgave.id} className="p-4 bg-dark rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-white">{oppgave.tittel}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(oppgave.prioritet)}`}>
                          {getStatusText(oppgave.prioritet)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(oppgave.status)}`}>
                          {getStatusText(oppgave.status)}
                        </span>
                      </div>
                      {oppgave.beskrivelse && (
                        <p className="text-sm text-gray-400 mb-2">{oppgave.beskrivelse}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        {oppgave.ansatte && <span>Ansvarlig: {oppgave.ansatte.navn}</span>}
                        {oppgave.forfallsdato && (
                          <span>Frist: {new Date(oppgave.forfallsdato).toLocaleDateString('nb-NO')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {oppgave.status !== 'ferdig' && (
                        <button
                          onClick={() => handleUpdateOppgaveStatus(oppgave.id, 'ferdig')}
                          className="p-1.5 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {oppgaver.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  Ingen oppgaver opprettet ennå
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showAgendaDialog && (
        <AgendaDialog
          moteId={mote.id}
          onClose={() => setShowAgendaDialog(false)}
          onSuccess={() => {
            loadAgendapunkter()
            setShowAgendaDialog(false)
          }}
        />
      )}

      {showReferatDialog && (
        <ReferatDialog
          moteId={mote.id}
          agendapunkter={agendapunkter}
          onClose={() => setShowReferatDialog(false)}
          onSuccess={() => {
            loadReferater()
            setShowReferatDialog(false)
          }}
        />
      )}

      {showOppgaveDialog && (
        <OppgaveDialog
          moteId={mote.id}
          agendapunkter={agendapunkter}
          onClose={() => setShowOppgaveDialog(false)}
          onSuccess={() => {
            loadOppgaver()
            setShowOppgaveDialog(false)
          }}
        />
      )}
    </div>
  )
}
