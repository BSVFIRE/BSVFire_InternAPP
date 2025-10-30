import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { X } from 'lucide-react'

interface Ansatt {
  id: string
  navn: string
}

interface AgendaDialogProps {
  moteId: string
  onClose: () => void
  onSuccess: () => void
}

export function AgendaDialog({ moteId, onClose, onSuccess }: AgendaDialogProps) {
  const user = useAuthStore((state) => state.user)
  const [ansatte, setAnsatte] = useState<Ansatt[]>([])
  const [form, setForm] = useState({
    tittel: '',
    beskrivelse: '',
    estimert_tid_minutter: 10,
    ansvarlig_id: ''
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
      const { data: agendapunkter } = await supabase
        .from('mote_agendapunkter')
        .select('rekkefolgje')
        .eq('mote_id', moteId)
        .order('rekkefolgje', { ascending: false })
        .limit(1)

      const maxRekkefolgje = agendapunkter && agendapunkter.length > 0 
        ? agendapunkter[0].rekkefolgje 
        : 0

      const { error } = await supabase
        .from('mote_agendapunkter')
        .insert([{
          ...form,
          mote_id: moteId,
          rekkefolgje: maxRekkefolgje + 1,
          opprettet_av: user?.id,
          ansvarlig_id: form.ansvarlig_id || null
        }])

      if (error) throw error
      onSuccess()
    } catch (error) {
      console.error('Feil ved opprettelse av agendapunkt:', error)
      alert('Kunne ikke opprette agendapunkt')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
      <div className="bg-[#1a1d29] rounded-lg max-w-lg w-full shadow-2xl border border-gray-800">
        <div className="border-b border-gray-800 p-6 flex items-center justify-between bg-[#1a1d29]">
          <h2 className="text-xl font-bold text-white">Nytt agendapunkt</h2>
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
              placeholder="F.eks. Gjennomgang av forrige uke"
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
              placeholder="Beskriv agendapunktet..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Estimert tid (min)
              </label>
              <input
                type="number"
                value={form.estimert_tid_minutter}
                onChange={(e) => setForm({ ...form, estimert_tid_minutter: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-dark border border-dark rounded-lg text-white focus:outline-none focus:border-primary"
                min="5"
                step="5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ansvarlig
              </label>
              <select
                value={form.ansvarlig_id}
                onChange={(e) => setForm({ ...form, ansvarlig_id: e.target.value })}
                className="w-full px-4 py-2 bg-dark border border-dark rounded-lg text-white focus:outline-none focus:border-primary"
              >
                <option value="">Ingen</option>
                {ansatte.map(ansatt => (
                  <option key={ansatt.id} value={ansatt.id}>
                    {ansatt.navn}
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
              Legg til
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
