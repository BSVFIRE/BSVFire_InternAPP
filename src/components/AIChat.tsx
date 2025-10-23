import React, { useState, useRef, useEffect } from 'react'
import { Send, X, Loader2, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function AIChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hei! 👋 Jeg er BSV Fire AI-assistent. Hva kan jeg hjelpe deg med?',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      console.log('Sending query to AI:', input)
      
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { query: input },
      })

      console.log('AI response:', { data, error })

      if (error) {
        console.error('Supabase function error:', error)
        throw error
      }

      if (!data || !data.answer) {
        throw new Error('Ingen svar fra AI')
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.answer },
      ])
    } catch (error: any) {
      console.error('AI Chat error:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '❌ Beklager, det oppstod en feil: ' + (error.message || JSON.stringify(error) || 'Ukjent feil'),
        },
      ])
    } finally {
      setIsLoading(false)
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

      {/* Messages */}
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

      {/* Input */}
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
    </div>
  )
}
