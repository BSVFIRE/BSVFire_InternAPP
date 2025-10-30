import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { X } from 'lucide-react'

interface Ansatt {
  id: string
  navn: string
}

interface Agendapunkt {
  id: string
  tittel: string
}

interface OppgaveDialogProps {
  moteId: string
  agendapunkter: Agendapunkt[]
  onClose: () => void
  onSuccess: () => void
}

export function OppgaveDialog({ moteId, agendapunkter, onClose, onSuccess }: OppgaveDialogProps) {
  const user = useAuthStore((state) => state.user)
  const [ansatte, setAnsatte] = useState<Ansatt[]>([])
  const [form, setForm] = useState({
    tittel: '',
    beskrivelse: '',
    ansvarlig_id: '',
    forfallsdato: '',
    prioritet: 'medium' as const,
    agendapunkt_id: ''
  })

  useEffect(() => {
    loadAnsatte()
  }, [])

  const loadAnsatte = async () => {
    const { data } = await supabase
      .from('ansatte')
      .select('id, navn')
      .order('navn')
    setAnsatte(data || [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Generer oppgavenummer
      const { data: lastOppgave } = await supabase
        .from('oppgaver')
        .select('oppgave_nummer')
        .order('opprettet_dato', { ascending: false })
        .limit(1)
        .single()

      let nextNumber = 1
      if (lastOppgave?.oppgave_nummer) {
        const match = lastOppgave.oppgave_nummer.match(/OPP-(\d+)-(\d+)/)
        if (match) {
          nextNumber = parseInt(match[2]) + 1
        }
      }
      const year = new Date().getFullYear()
      const oppgaveNummer = `OPP-${year}-${String(nextNumber).padStart(4, '0')}`

      // Konverter prioritet fra møte-format til oppgave-format
      const prioritetMap: Record<string, string> = {
        'lav': 'Lav',
        'medium': 'Medium',
        'hoy': 'Høy',
        'kritisk': 'Kritisk'
      }

      // Opprett oppgave i hovedtabellen
      const { error: oppgaveError } = await supabase
        .from('oppgaver')
        .insert([{
          oppgave_nummer: oppgaveNummer,
          tittel: form.tittel,
          beskrivelse: form.beskrivelse || null,
          tekniker_id: form.ansvarlig_id || null,
          forfallsdato: form.forfallsdato ? form.forfallsdato : null,
          prioritet: prioritetMap[form.prioritet] || 'Medium',
          status: 'Ikke påbegynt',
          type: 'Møteoppgave',
          mote_id: moteId,
          kunde_id: null,
          anlegg_id: null,
          ordre_id: null,
          prosjekt_id: null,
          kontaktperson: null,
          opprettet_dato: new Date().toISOString()
        }])
        .select()
        .single()

      if (oppgaveError) throw oppgaveError

      // Opprett også i mote_oppgaver for møteoversikten
      const { error: moteOppgaveError } = await supabase
        .from('mote_oppgaver')
        .insert([{
          tittel: form.tittel,
          beskrivelse: form.beskrivelse || null,
          forfallsdato: form.forfallsdato ? form.forfallsdato : null,
          prioritet: form.prioritet,
          mote_id: moteId,
          opprettet_av: user?.id,
          ansvarlig_id: form.ansvarlig_id || null,
          agendapunkt_id: form.agendapunkt_id || null
        }])

      if (moteOppgaveError) throw moteOppgaveError

      onSuccess()
    } catch (error) {
      console.error('Feil ved opprettelse av oppgave:', error)
      alert('Kunne ikke opprette oppgave')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
      <div className="bg-[#1a1d29] rounded-lg max-w-2xl w-full shadow-2xl border border-gray-800">
        <div className="border-b border-gray-800 p-6 flex items-center justify-between bg-[#1a1d29]">
          <h2 className="text-xl font-bold text-white">Ny oppgave</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tittel *
            </label>
            <input
              type="text"
              required
              value={form.tittel}
              onChange={(e) => setForm({ ...form, tittel: e.target.value })}
              className="w-full px-4 py-2 bg-dark border border-dark rounded-lg text-white focus:outline-none focus:border-primary"
              placeholder="F.eks. Følg opp med kunde"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Beskrivelse
            </label>
            <textarea
              value={form.beskrivelse}
              onChange={(e) => setForm({ ...form, beskrivelse: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-dark border border-dark rounded-lg text-white focus:outline-none focus:border-primary"
              placeholder="Beskriv oppgaven..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ansvarlig
              </label>
              <select
                value={form.ansvarlig_id}
                onChange={(e) => setForm({ ...form, ansvarlig_id: e.target.value })}
                className="w-full px-4 py-2 bg-dark border border-dark rounded-lg text-white focus:outline-none focus:border-primary"
              >
                <option value="">Velg ansvarlig</option>
                {ansatte.map(ansatt => (
                  <option key={ansatt.id} value={ansatt.id}>
                    {ansatt.navn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Forfallsdato
              </label>
              <input
                type="date"
                value={form.forfallsdato}
                onChange={(e) => setForm({ ...form, forfallsdato: e.target.value })}
                className="w-full px-4 py-2 bg-dark border border-dark rounded-lg text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Prioritet
              </label>
              <select
                value={form.prioritet}
                onChange={(e) => setForm({ ...form, prioritet: e.target.value as any })}
                className="w-full px-4 py-2 bg-dark border border-dark rounded-lg text-white focus:outline-none focus:border-primary"
              >
                <option value="lav">Lav</option>
                <option value="medium">Medium</option>
                <option value="hoy">Høy</option>
                <option value="kritisk">Kritisk</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Agendapunkt
              </label>
              <select
                value={form.agendapunkt_id}
                onChange={(e) => setForm({ ...form, agendapunkt_id: e.target.value })}
                className="w-full px-4 py-2 bg-dark border border-dark rounded-lg text-white focus:outline-none focus:border-primary"
              >
                <option value="">Generelt</option>
                {agendapunkter.map((punkt, index) => (
                  <option key={punkt.id} value={punkt.id}>
                    #{index + 1} - {punkt.tittel}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-dark hover:bg-dark/80 text-white rounded-lg transition-colors"
            >
              Avbryt
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
            >
              Opprett oppgave
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
