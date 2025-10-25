import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, MessageSquare, Sparkles, Save, Trash2, Volume2, X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Note {
  id: string
  content: string
  timestamp: Date
  is_voice: boolean
  audio_url?: string
}

interface InspectionNotesProps {
  kontrollId: string
  anleggId: string
  onClose?: () => void
}

export function InspectionNotes({ kontrollId, anleggId, onClose }: InspectionNotesProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [currentNote, setCurrentNote] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState('')
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    loadNotes()
    setupSpeechRecognition()
  }, [kontrollId])

  async function loadNotes() {
    try {
      setLoading(true)
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
          audio_url: n.audio_url
        })))
      }
    } catch (error) {
      console.error('Feil ved lasting av notater:', error)
    } finally {
      setLoading(false)
    }
  }

  function setupSpeechRecognition() {
    // Check if browser supports Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'nb-NO' // Norwegian

      recognition.onresult = (event: any) => {
        let interimTranscript = ''
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' '
          } else {
            interimTranscript += transcript
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
      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start()
      }

      // Start audio recording for Whisper fallback
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
    
    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }

    // Stop audio recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        
        // If speech recognition didn't work, try Whisper API
        if (!currentNote.trim()) {
          await transcribeWithWhisper(audioBlob)
        }
        
        // Stop all tracks
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop())
      }
    }
  }

  async function transcribeWithWhisper(audioBlob: Blob) {
    setIsProcessing(true)
    try {
      // Convert to proper audio format for Whisper
      const formData = new FormData()
      formData.append('file', audioBlob, 'audio.webm')
      formData.append('model', 'whisper-1')
      formData.append('language', 'no')

      // Call Azure OpenAI Whisper API via Supabase Edge Function
      // Change to 'transcribe-audio' if using OpenAI directly
      const { data, error } = await supabase.functions.invoke('transcribe-audio-azure', {
        body: formData
      })

      if (error) throw error

      if (data?.text) {
        setCurrentNote(prev => prev + ' ' + data.text)
      }
    } catch (error) {
      console.error('Whisper transcription error:', error)
      alert('Kunne ikke transkribere lyd. Prøv å skrive manuelt.')
    } finally {
      setIsProcessing(false)
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
      // Call Azure OpenAI GPT-4 to improve/expand the note
      // Change to 'ai-improve-note' if using OpenAI directly
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
      // Fallback to simple formatting
      setAiSuggestion(formatNoteLocally(currentNote))
    } finally {
      setIsProcessing(false)
    }
  }

  function formatNoteLocally(text: string): string {
    // Simple local formatting as fallback
    const lines = text.split(/[.!?]+/).filter(s => s.trim())
    return lines.map(line => '• ' + line.trim()).join('\n')
  }

  function applyAiSuggestion() {
    setCurrentNote(aiSuggestion)
    setShowAiPanel(false)
    setAiSuggestion('')
  }

  async function saveNote() {
    if (!currentNote.trim()) return

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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg border border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-white">Kontrollnotater</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        )}
      </div>

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
              className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 text-xs text-gray-400">
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
              <p className="text-white whitespace-pre-wrap">{note.content}</p>
            </div>
          ))
        )}
      </div>

      {/* AI Suggestion Panel */}
      {showAiPanel && (
        <div className="border-t border-gray-800 p-4 bg-blue-500/5">
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
              <div className="bg-gray-800 rounded-lg p-3 mb-3 text-sm text-gray-300 whitespace-pre-wrap">
                {aiSuggestion}
              </div>
              <button
                onClick={applyAiSuggestion}
                className="btn-primary w-full text-sm"
              >
                Bruk dette forslaget
              </button>
            </>
          )}
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-800 p-4 space-y-3">
        <textarea
          value={currentNote}
          onChange={(e) => setCurrentNote(e.target.value)}
          placeholder="Skriv notat her, eller bruk taleinndata..."
          className="input w-full min-h-[100px] resize-none"
          disabled={isRecording}
        />

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Voice Recording */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
            }`}
          >
            {isRecording ? (
              <>
                <MicOff className="w-4 h-4" />
                <span>Stopp opptak</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Tale</span>
              </>
            )}
          </button>

          {/* AI Suggestion */}
          <button
            onClick={getAiSuggestion}
            disabled={isProcessing || !currentNote.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI-hjelp</span>
          </button>

          {/* Save Note */}
          <button
            onClick={saveNote}
            disabled={!currentNote.trim() || isProcessing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            <span>Lagre</span>
          </button>
        </div>

        {isProcessing && (
          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Behandler...</span>
          </div>
        )}

        {isRecording && (
          <div className="flex items-center justify-center gap-2 text-red-400 text-sm animate-pulse">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <span>Tar opp...</span>
          </div>
        )}
      </div>
    </div>
  )
}
