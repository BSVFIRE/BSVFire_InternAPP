import React, { useState, useRef, useEffect } from 'react'
import { Send, X, Loader2, Sparkles, MessageSquare, Mic, MicOff, Save, Trash2, Volume2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Note {
  id: string
  content: string
  timestamp: Date
  is_voice: boolean
}

interface AIAssistantProps {
  kontrollId?: string
  anleggId?: string
}

export function AIAssistant({ kontrollId: propKontrollId, anleggId: propAnleggId }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'notes'>('chat')
  const [detectedKontrollId, setDetectedKontrollId] = useState<string | undefined>(propKontrollId)
  const [detectedAnleggId, setDetectedAnleggId] = useState<string | undefined>(propAnleggId)
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hei! 👋 Jeg er BSV Fire AI-assistent. Hva kan jeg hjelpe deg med?',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Notes state
  const [notes, setNotes] = useState<Note[]>([])
  const [currentNote, setCurrentNote] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState('')
  const [showAiPanel, setShowAiPanel] = useState(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-detect kontroll and anlegg from URL or localStorage
  useEffect(() => {
    const detectIds = () => {
      // Check if we're in a kontroll view
      const path = window.location.pathname
      if (path.includes('/rapporter')) {
        // Try to get from localStorage (set by kontroll views)
        const storedKontrollId = localStorage.getItem('current_kontroll_id')
        const storedAnleggId = localStorage.getItem('current_anlegg_id')
        
        if (storedKontrollId && storedAnleggId) {
          setDetectedKontrollId(storedKontrollId)
          setDetectedAnleggId(storedAnleggId)
        }
      }
    }

    detectIds()
    
    // Listen for storage changes
    window.addEventListener('storage', detectIds)
    
    // Also check periodically in case localStorage changes in same tab
    const interval = setInterval(detectIds, 1000)
    
    return () => {
      window.removeEventListener('storage', detectIds)
      clearInterval(interval)
    }
  }, [])

  const kontrollId = propKontrollId || detectedKontrollId
  const anleggId = propAnleggId || detectedAnleggId

  useEffect(() => {
    if (kontrollId && anleggId) {
      loadNotes()
      setupSpeechRecognition()
    }
  }, [kontrollId, anleggId])

  // Chat functions
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { query: input },
      })

      if (error) throw error
      if (!data || !data.answer) throw new Error('Ingen svar fra AI')

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.answer },
      ])
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '❌ Beklager, det oppstod en feil: ' + (error.message || 'Ukjent feil'),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // Notes functions
  async function loadNotes() {
    if (!kontrollId) return
    
    try {
      const { data, error } = await supabase
        .from('kontroll_notater')
        .select('*')
        .eq('kontroll_id', kontrollId)
        .order('created_at', { ascending: true })

      if (error) throw error

      if (data) {
        setNotes(data.map(n => ({
          id: n.id,
          content: n.content,
          timestamp: new Date(n.created_at),
          is_voice: n.is_voice || false,
        })))
      }
    } catch (error) {
      console.error('Feil ved lasting av notater:', error)
    }
  }

  function setupSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'nb-NO'

      recognition.onresult = (event: any) => {
        let finalTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' '
          }
        }
        if (finalTranscript) {
          setCurrentNote(prev => prev + finalTranscript)
        }
      }

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setIsRecording(false)
      }

      recognitionRef.current = recognition
    }
  }

  async function startRecording() {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.start()
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Feil ved oppstart av opptak:', error)
      alert('Kunne ikke starte opptak. Sjekk mikrofontillatelser.')
    }
  }

  async function stopRecording() {
    setIsRecording(false)
    
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
    }
  }

  async function getAiSuggestion() {
    if (!currentNote.trim()) {
      alert('Skriv noe først for å få AI-forslag')
      return
    }

    setIsProcessing(true)
    setShowAiPanel(true)
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-improve-note-azure', {
        body: { 
          note: currentNote,
          context: 'brannalarm kontroll'
        }
      })

      if (error) throw error

      if (data?.suggestion) {
        setAiSuggestion(data.suggestion)
      }
    } catch (error) {
      console.error('AI suggestion error:', error)
      const lines = currentNote.split(/[.!?]+/).filter(s => s.trim())
      setAiSuggestion(lines.map(line => '• ' + line.trim()).join('\n'))
    } finally {
      setIsProcessing(false)
    }
  }

  function applyAiSuggestion() {
    setCurrentNote(aiSuggestion)
    setShowAiPanel(false)
    setAiSuggestion('')
  }

  async function saveNote() {
    if (!currentNote.trim() || !kontrollId || !anleggId) return

    try {
      const { data, error } = await supabase
        .from('kontroll_notater')
        .insert({
          kontroll_id: kontrollId,
          anlegg_id: anleggId,
          content: currentNote.trim(),
          is_voice: isRecording,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        setNotes(prev => [...prev, {
          id: data.id,
          content: data.content,
          timestamp: new Date(data.created_at),
          is_voice: data.is_voice || false
        }])
        setCurrentNote('')
        setAiSuggestion('')
        setShowAiPanel(false)
      }
    } catch (error) {
      console.error('Feil ved lagring av notat:', error)
      alert('Kunne ikke lagre notat')
    }
  }

  async function deleteNote(noteId: string) {
    if (!confirm('Slett dette notatet?')) return

    try {
      const { error } = await supabase
        .from('kontroll_notater')
        .delete()
        .eq('id', noteId)

      if (error) throw error

      setNotes(prev => prev.filter(n => n.id !== noteId))
    } catch (error) {
      console.error('Feil ved sletting av notat:', error)
      alert('Kunne ikke slette notat')
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-teal-500 text-white p-4 rounded-full shadow-lg hover:bg-teal-600 transition-all z-50 flex items-center gap-2"
        title="Åpne AI-assistent"
      >
        <Sparkles className="w-6 h-6" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 bg-teal-500 text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          <h3 className="font-semibold">AI-assistent</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="hover:bg-teal-600 p-1 rounded transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b dark:border-gray-700">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            activeTab === 'chat'
              ? 'bg-teal-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>AI Chat</span>
          </div>
        </button>
        {kontrollId && anleggId && (
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
              activeTab === 'notes'
                ? 'bg-teal-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span>Notater</span>
            </div>
          </button>
        )}
      </div>

      {/* Content */}
      {activeTab === 'chat' ? (
        <>
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-teal-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-100'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                  <Loader2 className="w-5 h-5 animate-spin text-teal-500" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t dark:border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Skriv ditt spørsmål..."
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-teal-500 text-white p-2 rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </>
      ) : (
        <>
          {/* Notes List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Ingen notater ennå</p>
                <p className="text-sm mt-1">Start med å skrive eller bruk taleinndata</p>
              </div>
            ) : (
              notes.map(note => (
                <div
                  key={note.id}
                  className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      {note.is_voice && <Volume2 className="w-3 h-3" />}
                      <span>{note.timestamp.toLocaleString('nb-NO')}</span>
                    </div>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="p-1 hover:bg-red-500/20 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                  <p className="text-sm dark:text-gray-100 whitespace-pre-wrap">{note.content}</p>
                </div>
              ))
            )}
          </div>

          {/* AI Suggestion Panel */}
          {showAiPanel && (
            <div className="border-t dark:border-gray-700 p-4 bg-blue-500/5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-blue-400">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-semibold">AI-forslag</span>
                </div>
                <button
                  onClick={() => setShowAiPanel(false)}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Lukk
                </button>
              </div>
              {isProcessing ? (
                <div className="flex items-center gap-2 text-gray-400 py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Genererer forslag...</span>
                </div>
              ) : (
                <>
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mb-3 text-sm dark:text-gray-100 whitespace-pre-wrap">
                    {aiSuggestion}
                  </div>
                  <button
                    onClick={applyAiSuggestion}
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white py-2 rounded-lg text-sm transition-colors"
                  >
                    Bruk dette forslaget
                  </button>
                </>
              )}
            </div>
          )}

          {/* Notes Input */}
          <div className="border-t dark:border-gray-700 p-4 space-y-3">
            <textarea
              value={currentNote}
              onChange={(e) => setCurrentNote(e.target.value)}
              placeholder="Skriv notat her, eller bruk taleinndata..."
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
              rows={3}
              disabled={isRecording}
            />

            <div className="flex items-center gap-2">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{isRecording ? 'Stopp' : 'Tale'}</span>
              </button>

              <button
                onClick={getAiSuggestion}
                disabled={isProcessing || !currentNote.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <Sparkles className="w-4 h-4" />
                <span>AI-hjelp</span>
              </button>

              <button
                onClick={saveNote}
                disabled={!currentNote.trim() || isProcessing}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <Save className="w-4 h-4" />
                <span>Lagre</span>
              </button>
            </div>

            {isRecording && (
              <div className="flex items-center justify-center gap-2 text-red-400 text-sm animate-pulse">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span>Tar opp...</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
