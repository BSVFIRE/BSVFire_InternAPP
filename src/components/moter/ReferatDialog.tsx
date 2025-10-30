import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { X } from 'lucide-react'

interface Agendapunkt {
  id: string
  tittel: string
}

interface ReferatDialogProps {
  moteId: string
  agendapunkter: Agendapunkt[]
  onClose: () => void
  onSuccess: () => void
}

export function ReferatDialog({ moteId, agendapunkter, onClose, onSuccess }: ReferatDialogProps) {
  const user = useAuthStore((state) => state.user)
  const [form, setForm] = useState({
    innhold: '',
    type: 'notat' as const,
    agendapunkt_id: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase
        .from('mote_referater')
        .insert([{
          ...form,
          mote_id: moteId,
          skrevet_av: user?.id,
          agendapunkt_id: form.agendapunkt_id || null
        }])

      if (error) throw error
      onSuccess()
    } catch (error) {
      console.error('Feil ved opprettelse av referat:', error)
      alert('Kunne ikke opprette referat')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
      <div className="bg-[#1a1d29] rounded-lg max-w-2xl w-full shadow-2xl border border-gray-800">
        <div className="border-b border-gray-800 p-6 flex items-center justify-between bg-[#1a1d29]">
          <h2 className="text-xl font-bold text-white">Nytt referat</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Type *
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                className="w-full px-4 py-2 bg-dark border border-dark rounded-lg text-white focus:outline-none focus:border-primary"
              >
                <option value="notat">Notat</option>
                <option value="beslutning">Beslutning</option>
                <option value="oppgave">Oppgave</option>
                <option value="informasjon">Informasjon</option>
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

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Innhold *
            </label>
            <textarea
              required
              value={form.innhold}
              onChange={(e) => setForm({ ...form, innhold: e.target.value })}
              rows={8}
              className="w-full px-4 py-2 bg-dark border border-dark rounded-lg text-white focus:outline-none focus:border-primary"
              placeholder="Skriv referat her..."
            />
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
              Lagre referat
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
