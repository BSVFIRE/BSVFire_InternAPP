import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { createLogger } from '@/lib/logger'
import { Plus, Check, X, Edit2, Trash2, Calendar, AlertCircle, User, ChevronDown, ChevronUp } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const log = createLogger('AnleggTodoList')

interface Todo {
  id: string
  anlegg_id: string
  tittel: string
  beskrivelse: string | null
  fullfort: boolean
  prioritet: 'Lav' | 'Medium' | 'Høy'
  forfallsdato: string | null
  opprettet_av: string | null
  tildelt_til: string | null
  created_at: string
  updated_at: string
  tildelt_navn?: string
}

interface Ansatt {
  id: string
  navn: string
}

interface AnleggTodoListProps {
  anleggId: string
  onTodoChange?: () => void
}

export function AnleggTodoList({ anleggId, onTodoChange }: AnleggTodoListProps) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [ansatte, setAnsatte] = useState<Ansatt[]>([])
  const [loading, setLoading] = useState(true)
  const [visNyTodo, setVisNyTodo] = useState(false)
  const [redigerTodo, setRedigerTodo] = useState<Todo | null>(null)
  const [visFullforte, setVisFullforte] = useState(false)
  const [nyTodo, setNyTodo] = useState({
    tittel: '',
    beskrivelse: '',
    prioritet: 'Medium' as 'Lav' | 'Medium' | 'Høy',
    forfallsdato: '',
    tildelt_til: ''
  })

  useEffect(() => {
    loadTodos()
    loadAnsatte()
  }, [anleggId])

  async function loadTodos() {
    try {
      const { data, error } = await supabase
        .from('anlegg_todos')
        .select('*')
        .eq('anlegg_id', anleggId)
        .order('fullfort', { ascending: true })
        .order('prioritet', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error

      // Hent navn på tildelte ansatte
      const todosWithNames = await Promise.all(
        (data || []).map(async (todo) => {
          if (todo.tildelt_til) {
            const { data: ansatt } = await supabase
              .from('ansatte')
              .select('navn')
              .eq('id', todo.tildelt_til)
              .single()
            return { ...todo, tildelt_navn: ansatt?.navn || null }
          }
          return todo
        })
      )

      setTodos(todosWithNames)
    } catch (error) {
      log.error('Feil ved lasting av todos', { error, anleggId })
    } finally {
      setLoading(false)
    }
  }

  async function loadAnsatte() {
    try {
      const { data, error } = await supabase
        .from('ansatte')
        .select('id, navn')
        .order('navn')

      if (error) throw error
      setAnsatte(data || [])
    } catch (error) {
      log.error('Feil ved lasting av ansatte', { error })
    }
  }

  async function opprettTodo() {
    if (!nyTodo.tittel.trim()) {
      alert('Tittel er påkrevd')
      return
    }

    try {
      const { data: session } = await supabase.auth.getSession()
      
      const { error } = await supabase
        .from('anlegg_todos')
        .insert([{
          anlegg_id: anleggId,
          tittel: nyTodo.tittel,
          beskrivelse: nyTodo.beskrivelse || null,
          prioritet: nyTodo.prioritet,
          forfallsdato: nyTodo.forfallsdato || null,
          tildelt_til: nyTodo.tildelt_til || null,
          opprettet_av: session.session?.user?.id || null
        }])

      if (error) throw error

      setNyTodo({
        tittel: '',
        beskrivelse: '',
        prioritet: 'Medium',
        forfallsdato: '',
        tildelt_til: ''
      })
      setVisNyTodo(false)
      await loadTodos()
      onTodoChange?.()
    } catch (error) {
      log.error('Feil ved opprettelse av todo', { error, todo: nyTodo })
      alert('Kunne ikke opprette todo')
    }
  }

  async function oppdaterTodo(id: string, updates: Partial<Todo>) {
    try {
      const { error } = await supabase
        .from('anlegg_todos')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      await loadTodos()
      onTodoChange?.()
    } catch (error) {
      log.error('Feil ved oppdatering av todo', { error, todoId: id, updates })
      alert('Kunne ikke oppdatere todo')
    }
  }

  async function slettTodo(id: string) {
    if (!confirm('Er du sikker på at du vil slette denne oppgaven?')) return

    try {
      const { error } = await supabase
        .from('anlegg_todos')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadTodos()
      onTodoChange?.()
    } catch (error) {
      log.error('Feil ved sletting av todo', { error, todoId: id })
      alert('Kunne ikke slette todo')
    }
  }

  async function toggleFullfort(todo: Todo) {
    await oppdaterTodo(todo.id, { fullfort: !todo.fullfort })
  }

  const prioritetFarger = {
    'Høy': 'bg-red-500/10 text-red-500 border-red-500/30',
    'Medium': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
    'Lav': 'bg-blue-500/10 text-blue-500 border-blue-500/30'
  }

  const aktiveTodos = todos.filter(t => !t.fullfort)
  const fullforteTodos = todos.filter(t => t.fullfort)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            ToDo-liste
            {aktiveTodos.length > 0 && (
              <span className="ml-2 text-sm text-gray-400 dark:text-gray-400 font-normal">
                ({aktiveTodos.length} aktiv{aktiveTodos.length !== 1 ? 'e' : ''})
              </span>
            )}
          </h3>
        </div>
        <button
          onClick={() => setVisNyTodo(!visNyTodo)}
          className="btn-primary text-sm flex items-center gap-2"
        >
          {visNyTodo ? (
            <>
              <X className="w-4 h-4" />
              Avbryt
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Ny oppgave
            </>
          )}
        </button>
      </div>

      {/* Ny todo skjema */}
      {visNyTodo && (
        <div className="card p-4 space-y-3 bg-gray-50 dark:bg-dark-100">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tittel *
            </label>
            <input
              type="text"
              value={nyTodo.tittel}
              onChange={(e) => setNyTodo({ ...nyTodo, tittel: e.target.value })}
              placeholder="Hva skal gjøres?"
              className="input"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Beskrivelse
            </label>
            <textarea
              value={nyTodo.beskrivelse}
              onChange={(e) => setNyTodo({ ...nyTodo, beskrivelse: e.target.value })}
              placeholder="Detaljer om oppgaven..."
              className="input min-h-[80px]"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Prioritet
              </label>
              <select
                value={nyTodo.prioritet}
                onChange={(e) => setNyTodo({ ...nyTodo, prioritet: e.target.value as 'Lav' | 'Medium' | 'Høy' })}
                className="input"
              >
                <option value="Lav">Lav</option>
                <option value="Medium">Medium</option>
                <option value="Høy">Høy</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Forfallsdato
              </label>
              <input
                type="date"
                value={nyTodo.forfallsdato}
                onChange={(e) => setNyTodo({ ...nyTodo, forfallsdato: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tildel til
              </label>
              <select
                value={nyTodo.tildelt_til}
                onChange={(e) => setNyTodo({ ...nyTodo, tildelt_til: e.target.value })}
                className="input"
              >
                <option value="">Ingen</option>
                {ansatte.map((ansatt) => (
                  <option key={ansatt.id} value={ansatt.id}>
                    {ansatt.navn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={opprettTodo}
              className="btn-primary text-sm"
            >
              Opprett oppgave
            </button>
            <button
              onClick={() => {
                setVisNyTodo(false)
                setNyTodo({
                  tittel: '',
                  beskrivelse: '',
                  prioritet: 'Medium',
                  forfallsdato: '',
                  tildelt_til: ''
                })
              }}
              className="btn-secondary text-sm"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}

      {/* Aktive todos */}
      {aktiveTodos.length === 0 && !visNyTodo ? (
        <div className="text-center py-8 text-gray-400 dark:text-gray-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Ingen aktive oppgaver</p>
          <p className="text-sm mt-1">Klikk "Ny oppgave" for å legge til</p>
        </div>
      ) : (
        <div className="space-y-2">
          {aktiveTodos.map((todo) => (
            <div
              key={todo.id}
              className={`card p-4 border-l-4 ${
                todo.prioritet === 'Høy' ? 'border-l-red-500' :
                todo.prioritet === 'Medium' ? 'border-l-yellow-500' :
                'border-l-blue-500'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleFullfort(todo)}
                  className="mt-1 w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 hover:border-primary transition-colors flex items-center justify-center flex-shrink-0"
                >
                  {todo.fullfort && <Check className="w-4 h-4 text-primary" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {todo.tittel}
                    </h4>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => setRedigerTodo(todo)}
                        className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                        title="Rediger"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => slettTodo(todo.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Slett"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {todo.beskrivelse && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {todo.beskrivelse}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`px-2 py-1 rounded border ${prioritetFarger[todo.prioritet]}`}>
                      {todo.prioritet}
                    </span>

                    {todo.forfallsdato && (
                      <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                        <Calendar className="w-3 h-3" />
                        {formatDate(todo.forfallsdato)}
                      </span>
                    )}

                    {todo.tildelt_navn && (
                      <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                        <User className="w-3 h-3" />
                        {todo.tildelt_navn}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fullførte todos */}
      {fullforteTodos.length > 0 && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setVisFullforte(!visFullforte)}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mb-3"
          >
            {visFullforte ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Fullførte oppgaver ({fullforteTodos.length})
          </button>

          {visFullforte && (
            <div className="space-y-2">
              {fullforteTodos.map((todo) => (
                <div
                  key={todo.id}
                  className="card p-3 opacity-60 hover:opacity-100 transition-opacity"
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleFullfort(todo)}
                      className="mt-1 w-5 h-5 rounded border-2 border-green-500 bg-green-500/10 hover:bg-green-500/20 transition-colors flex items-center justify-center flex-shrink-0"
                    >
                      <Check className="w-4 h-4 text-green-500" />
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-gray-600 dark:text-gray-400 line-through">
                          {todo.tittel}
                        </h4>
                        <button
                          onClick={() => slettTodo(todo.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                          title="Slett"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {todo.beskrivelse && (
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                          {todo.beskrivelse}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rediger todo dialog */}
      {redigerTodo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-200 rounded-lg p-6 max-w-lg w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Rediger oppgave
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tittel *
                </label>
                <input
                  type="text"
                  value={redigerTodo.tittel}
                  onChange={(e) => setRedigerTodo({ ...redigerTodo, tittel: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Beskrivelse
                </label>
                <textarea
                  value={redigerTodo.beskrivelse || ''}
                  onChange={(e) => setRedigerTodo({ ...redigerTodo, beskrivelse: e.target.value })}
                  className="input min-h-[80px]"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Prioritet
                  </label>
                  <select
                    value={redigerTodo.prioritet}
                    onChange={(e) => setRedigerTodo({ ...redigerTodo, prioritet: e.target.value as 'Lav' | 'Medium' | 'Høy' })}
                    className="input"
                  >
                    <option value="Lav">Lav</option>
                    <option value="Medium">Medium</option>
                    <option value="Høy">Høy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Forfallsdato
                  </label>
                  <input
                    type="date"
                    value={redigerTodo.forfallsdato || ''}
                    onChange={(e) => setRedigerTodo({ ...redigerTodo, forfallsdato: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tildel til
                  </label>
                  <select
                    value={redigerTodo.tildelt_til || ''}
                    onChange={(e) => setRedigerTodo({ ...redigerTodo, tildelt_til: e.target.value })}
                    className="input"
                  >
                    <option value="">Ingen</option>
                    {ansatte.map((ansatt) => (
                      <option key={ansatt.id} value={ansatt.id}>
                        {ansatt.navn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={async () => {
                  await oppdaterTodo(redigerTodo.id, {
                    tittel: redigerTodo.tittel,
                    beskrivelse: redigerTodo.beskrivelse,
                    prioritet: redigerTodo.prioritet,
                    forfallsdato: redigerTodo.forfallsdato,
                    tildelt_til: redigerTodo.tildelt_til
                  })
                  setRedigerTodo(null)
                }}
                className="btn-primary"
              >
                Lagre endringer
              </button>
              <button
                onClick={() => setRedigerTodo(null)}
                className="btn-secondary"
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
