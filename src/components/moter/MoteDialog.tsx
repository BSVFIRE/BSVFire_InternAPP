import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { X } from 'lucide-react'

interface Ansatt {
  id: string
  navn: string
  epost: string | null
}

interface MoteDialogProps {
  onClose: () => void
  onSuccess: () => void
}

export function MoteDialog({ onClose, onSuccess }: MoteDialogProps) {
  const user = useAuthStore((state) => state.user)
  const [ansatte, setAnsatte] = useState<Ansatt[]>([])
  const [form, setForm] = useState({
    tittel: '',
    beskrivelse: '',
    mote_dato: '',
    varighet_minutter: 60,
    lokasjon: '',
    status: 'planlagt' as const
  })
  const [selectedDeltakere, setSelectedDeltakere] = useState<string[]>([])
  const [deltakereRoller, setDeltakereRoller] = useState<Record<string, string>>({})

  useEffect(() => {
    loadAnsatte()
  }, [])

  const loadAnsatte = async () => {
    try {
      const { data, error } = await supabase
        .from('ansatte')
        .select('id, navn, epost')
        .order('navn')

      if (error) throw error
      setAnsatte(data || [])
    } catch (error) {
      console.error('Feil ved lasting av ansatte:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data: mote, error: moteError } = await supabase
        .from('moter')
        .insert([{ ...form, opprettet_av: user?.id }])
        .select()
        .single()

      if (moteError) throw moteError

      if (selectedDeltakere.length > 0) {
        const deltakereData = selectedDeltakere.map(ansattId => ({
          mote_id: mote.id,
          ansatt_id: ansattId,
          rolle: deltakereRoller[ansattId] || 'deltaker'
        }))

        const { error: deltakereError } = await supabase
          .from('mote_deltakere')
          .insert(deltakereData)

        if (deltakereError) throw deltakereError
      }

      onSuccess()
    } catch (error) {
      console.error('Feil ved opprettelse av møte:', error)
      alert('Kunne ikke opprette møte')
    }
  }

  const toggleDeltaker = (ansattId: string) => {
    if (selectedDeltakere.includes(ansattId)) {
      setSelectedDeltakere(selectedDeltakere.filter(id => id !== ansattId))
      const newRoller = { ...deltakereRoller }
      delete newRoller[ansattId]
      setDeltakereRoller(newRoller)
    } else {
      setSelectedDeltakere([...selectedDeltakere, ansattId])
      setDeltakereRoller({ ...deltakereRoller, [ansattId]: 'deltaker' })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
      <div className="bg-[#1a1d29] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-800">
        <div className="sticky top-0 bg-[#1a1d29] border-b border-gray-800 p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Nytt møte</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
              placeholder="F.eks. Tirsdagsmøte"
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
              placeholder="Beskriv møtet..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Dato og tid *
              </label>
              <input
                type="datetime-local"
                required
                value={form.mote_dato}
                onChange={(e) => setForm({ ...form, mote_dato: e.target.value })}
                className="w-full px-4 py-2 bg-dark border border-dark rounded-lg text-white focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Varighet (minutter)
              </label>
              <input
                type="number"
                value={form.varighet_minutter}
                onChange={(e) => setForm({ ...form, varighet_minutter: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-dark border border-dark rounded-lg text-white focus:outline-none focus:border-primary"
                min="15"
                step="15"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Lokasjon
            </label>
            <input
              type="text"
              value={form.lokasjon}
              onChange={(e) => setForm({ ...form, lokasjon: e.target.value })}
              className="w-full px-4 py-2 bg-dark border border-dark rounded-lg text-white focus:outline-none focus:border-primary"
              placeholder="F.eks. Møterom 1 eller Teams"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Deltakere
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto bg-dark rounded-lg p-3">
              {ansatte.map(ansatt => (
                <div key={ansatt.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedDeltakere.includes(ansatt.id)}
                    onChange={() => toggleDeltaker(ansatt.id)}
                    className="w-4 h-4"
                  />
                  <span className="text-white flex-1">{ansatt.navn}</span>
                  {selectedDeltakere.includes(ansatt.id) && (
                    <select
                      value={deltakereRoller[ansatt.id] || 'deltaker'}
                      onChange={(e) => setDeltakereRoller({ ...deltakereRoller, [ansatt.id]: e.target.value })}
                      className="px-2 py-1 bg-[#1a1d29] border border-gray-700 rounded text-sm text-white focus:outline-none focus:border-primary"
                      style={{ colorScheme: 'dark' }}
                    >
                      <option value="deltaker" className="bg-[#1a1d29] text-white">Deltaker</option>
                      <option value="moteleder" className="bg-[#1a1d29] text-white">Møteleder</option>
                      <option value="referent" className="bg-[#1a1d29] text-white">Referent</option>
                    </select>
                  )}
                </div>
              ))}
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
              Opprett møte
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
