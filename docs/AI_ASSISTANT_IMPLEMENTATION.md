# AI-assistent - Detaljert Implementering

## 📦 Installasjon

### 1. Installer Dependencies

```bash
npm install openai
npm install -D tsx  # For å kjøre TypeScript-scripts
```

### 2. Sett Miljøvariabler

Opprett `.env.local`:

```bash
VITE_SUPABASE_URL=din-supabase-url
VITE_SUPABASE_ANON_KEY=din-anon-key
SUPABASE_SERVICE_KEY=din-service-key  # For scripts
OPENAI_API_KEY=sk-...  # Din OpenAI API-nøkkel
```

---

## 🗄️ Database Setup

### SQL Migration: `create_ai_embeddings.sql`

```sql
-- Aktiver pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabell for embeddings
CREATE TABLE ai_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(1536),  -- OpenAI ada-002 dimensjon
  metadata JSONB,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeks for rask vektorsøk
CREATE INDEX ai_embeddings_embedding_idx 
ON ai_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Indeks for tabell-lookup
CREATE INDEX ai_embeddings_table_record_idx 
ON ai_embeddings (table_name, record_id);

-- RLS policies
ALTER TABLE ai_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read embeddings"
  ON ai_embeddings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage embeddings"
  ON ai_embeddings FOR ALL
  TO service_role
  USING (true);

-- Funksjon for å matche embeddings
CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  table_name TEXT,
  record_id UUID,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ai_embeddings.id,
    ai_embeddings.content,
    ai_embeddings.metadata,
    ai_embeddings.table_name,
    ai_embeddings.record_id,
    1 - (ai_embeddings.embedding <=> query_embedding) AS similarity
  FROM ai_embeddings
  WHERE 1 - (ai_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY ai_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Kø for embedding-generering
CREATE TABLE embedding_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  operation TEXT NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX embedding_queue_processed_idx 
ON embedding_queue (processed, created_at);

-- Trigger-funksjon
CREATE OR REPLACE FUNCTION queue_embedding_generation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO embedding_queue (table_name, record_id, operation)
  VALUES (TG_TABLE_NAME, NEW.id, TG_OP);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Legg til triggers på relevante tabeller
CREATE TRIGGER kunder_embedding_trigger
AFTER INSERT OR UPDATE ON kunder
FOR EACH ROW
EXECUTE FUNCTION queue_embedding_generation();

CREATE TRIGGER anlegg_embedding_trigger
AFTER INSERT OR UPDATE ON anlegg
FOR EACH ROW
EXECUTE FUNCTION queue_embedding_generation();

CREATE TRIGGER kontaktpersoner_embedding_trigger
AFTER INSERT OR UPDATE ON kontaktpersoner
FOR EACH ROW
EXECUTE FUNCTION queue_embedding_generation();

CREATE TRIGGER dokumenter_embedding_trigger
AFTER INSERT OR UPDATE ON dokumenter
FOR EACH ROW
EXECUTE FUNCTION queue_embedding_generation();
```

---

## 🔧 Supabase Edge Function

### Opprett Edge Function

```bash
# Installer Supabase CLI
npm install -g supabase

# Login
supabase login

# Link til prosjekt
supabase link --project-ref din-project-ref

# Opprett function
supabase functions new ai-chat
```

### `supabase/functions/ai-chat/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatRequest {
  query: string
  conversationHistory?: Array<{ role: string; content: string }>
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, conversationHistory = [] }: ChatRequest = await req.json()
    
    // Opprett Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // 1. Generer embedding for brukerens spørsmål
    console.log('Genererer embedding for:', query)
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: query,
      }),
    })

    if (!embeddingResponse.ok) {
      throw new Error(`OpenAI embedding error: ${embeddingResponse.statusText}`)
    }

    const embeddingData = await embeddingResponse.json()
    const queryEmbedding = embeddingData.data[0].embedding

    // 2. Søk etter relevante dokumenter
    console.log('Søker etter relevante dokumenter...')
    const { data: matches, error: matchError } = await supabaseClient.rpc('match_embeddings', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: 5,
    })

    if (matchError) {
      console.error('Match error:', matchError)
      throw matchError
    }

    console.log(`Fant ${matches?.length || 0} matches`)

    // 3. Bygg kontekst fra matchende dokumenter
    const context = matches && matches.length > 0
      ? matches
          .map((match: any) => {
            const metadata = match.metadata ? JSON.stringify(match.metadata) : ''
            return `[${match.table_name}] ${match.content}\nMetadata: ${metadata}\nRelevans: ${(match.similarity * 100).toFixed(1)}%`
          })
          .join('\n\n---\n\n')
      : 'Ingen relevante dokumenter funnet.'

    // 4. Send til OpenAI for svar
    console.log('Sender til OpenAI...')
    const messages = [
      {
        role: 'system',
        content: `Du er en AI-assistent for BSV Fire AS, et brannvernsselskap.
        
Du hjelper ansatte med å finne informasjon om:
- Kunder (navn, adresse, kontaktinfo, organisasjonsnummer)
- Anlegg (navn, adresse, type, status)
- Kontaktpersoner (navn, telefon, e-post, rolle)
- Dokumenter (rapporter, serviceavtaler, etc.)

VIKTIG:
- Svar alltid på norsk
- Vær presis og profesjonell
- Hvis du ikke finner relevant informasjon, si det tydelig
- Referer til kilder når du svarer
- Bruk tabellformat når det passer

Relevant informasjon fra databasen:

${context}`,
      },
      ...conversationHistory,
      {
        role: 'user',
        content: query,
      },
    ]

    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages,
        temperature: 0.7,
        max_tokens: 800,
      }),
    })

    if (!completion.ok) {
      throw new Error(`OpenAI completion error: ${completion.statusText}`)
    }

    const completionData = await completion.json()
    const answer = completionData.choices[0].message.content

    // 5. Returner svar med kilder
    return new Response(
      JSON.stringify({
        answer,
        sources: matches?.map((m: any) => ({
          table: m.table_name,
          id: m.record_id,
          similarity: m.similarity,
          metadata: m.metadata,
        })) || [],
        usage: completionData.usage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('AI Chat error:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'En ukjent feil oppstod',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
```

### Deploy Edge Function

```bash
# Sett secrets
supabase secrets set OPENAI_API_KEY=sk-...

# Deploy
supabase functions deploy ai-chat
```

---

## 🎨 React Component

### `src/components/AIChat.tsx`

```typescript
import React, { useState, useRef, useEffect } from 'react'
import { MessageSquare, Send, X, Loader2, Database } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: Array<{
    table: string
    id: string
    similarity: number
    metadata?: any
  }>
}

export function AIChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hei! 👋 Jeg er BSV Fire AI-assistent. Jeg kan hjelpe deg med å finne:\n\n• Kunder og kontaktpersoner\n• Anlegg og installasjoner\n• Dokumenter og rapporter\n\nHva lurer du på?',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Kall Edge Function
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          query: input,
          conversationHistory: messages.slice(-4), // Siste 4 meldinger for kontekst
        },
      })

      if (error) throw error

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error: any) {
      console.error('AI Chat error:', error)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '❌ Beklager, det oppstod en feil. Prøv igjen senere.\n\nFeilmelding: ' + (error.message || 'Ukjent feil'),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickQuestion = (question: string) => {
    setInput(question)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-teal-500 text-white p-4 rounded-full shadow-lg hover:bg-teal-600 transition-all hover:scale-110 z-50 group"
        title="Åpne AI-assistent"
      >
        <MessageSquare className="w-6 h-6" />
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
          AI
        </span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-[420px] h-[650px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold">AI-assistent</h3>
            <p className="text-xs opacity-90">BSV Fire</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Questions */}
      {messages.length === 1 && (
        <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Forslag:</p>
          <div className="flex flex-wrap gap-2">
            {[
              'Finn kunder i Oslo',
              'Vis alle anlegg',
              'Hvem er kontaktperson hos...',
            ].map((q) => (
              <button
                key={q}
                onClick={() => handleQuickQuestion(q)}
                className="text-xs px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:border-teal-500 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

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
              className={`max-w-[85%] ${
                message.role === 'user'
                  ? 'bg-teal-500 text-white rounded-2xl rounded-br-sm'
                  : 'bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-sm'
              } p-3 shadow-sm`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {message.content}
              </p>
              
              {message.sources && message.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                  <div className="flex items-center gap-1 text-xs opacity-75 mb-2">
                    <Database className="w-3 h-3" />
                    <span>Kilder:</span>
                  </div>
                  <div className="space-y-1">
                    {message.sources.map((source, i) => (
                      <div
                        key={i}
                        className="text-xs bg-white/50 dark:bg-gray-800/50 px-2 py-1 rounded"
                      >
                        <span className="font-medium">{source.table}</span>
                        <span className="opacity-75 ml-2">
                          {(source.similarity * 100).toFixed(0)}% match
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-2xl rounded-bl-sm shadow-sm">
              <Loader2 className="w-5 h-5 animate-spin text-teal-500" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Skriv ditt spørsmål..."
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-800 text-sm"
            disabled={isLoading}
            autoFocus
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-teal-500 text-white px-4 py-3 rounded-xl hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
          AI kan gjøre feil. Verifiser viktig informasjon.
        </p>
      </form>
    </div>
  )
}
```

### Legg til i `App.tsx`

```typescript
import { AIChat } from './components/AIChat'

function App() {
  return (
    <>
      {/* Eksisterende kode */}
      <AIChat />
    </>
  )
}
```

---

## 🔄 Generer Embeddings

### `scripts/generate-embeddings.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text,
  })
  return response.data[0].embedding
}

async function generateKunderEmbeddings() {
  console.log('\n📊 Genererer embeddings for kunder...')
  
  const { data: kunder, error } = await supabase
    .from('kunder')
    .select('*')
  
  if (error) throw error

  let count = 0
  for (const kunde of kunder || []) {
    const content = `
Kunde: ${kunde.navn}
Organisasjonsnummer: ${kunde.organisasjonsnummer || 'Ikke oppgitt'}
Adresse: ${kunde.adresse || 'Ikke oppgitt'}
Telefon: ${kunde.telefon || 'Ikke oppgitt'}
E-post: ${kunde.epost || 'Ikke oppgitt'}
Status: ${kunde.status || 'Aktiv'}
    `.trim()

    const embedding = await generateEmbedding(content)

    // Slett gammel embedding
    await supabase
      .from('ai_embeddings')
      .delete()
      .eq('table_name', 'kunder')
      .eq('record_id', kunde.id)

    // Lagre ny embedding
    await supabase.from('ai_embeddings').insert({
      content,
      embedding,
      metadata: { navn: kunde.navn, org_nr: kunde.organisasjonsnummer },
      table_name: 'kunder',
      record_id: kunde.id,
    })

    count++
    console.log(`  ✓ ${count}/${kunder.length} - ${kunde.navn}`)
  }

  console.log(`✅ Ferdig med kunder: ${count} embeddings generert`)
}

async function generateAnleggEmbeddings() {
  console.log('\n🏢 Genererer embeddings for anlegg...')
  
  const { data: anlegg } = await supabase
    .from('anlegg')
    .select('*, kunder(navn)')
  
  let count = 0
  for (const a of anlegg || []) {
    const content = `
Anlegg: ${a.navn}
Kunde: ${a.kunder?.navn || 'Ukjent'}
Adresse: ${a.adresse || 'Ikke oppgitt'}
Type: ${a.type || 'Ikke oppgitt'}
Status: ${a.status || 'Aktiv'}
    `.trim()

    const embedding = await generateEmbedding(content)

    await supabase
      .from('ai_embeddings')
      .delete()
      .eq('table_name', 'anlegg')
      .eq('record_id', a.id)

    await supabase.from('ai_embeddings').insert({
      content,
      embedding,
      metadata: { navn: a.navn, kunde: a.kunder?.navn },
      table_name: 'anlegg',
      record_id: a.id,
    })

    count++
    console.log(`  ✓ ${count}/${anlegg.length} - ${a.navn}`)
  }

  console.log(`✅ Ferdig med anlegg: ${count} embeddings generert`)
}

async function generateKontaktpersonerEmbeddings() {
  console.log('\n👤 Genererer embeddings for kontaktpersoner...')
  
  const { data: kontakter } = await supabase
    .from('kontaktpersoner')
    .select('*, kunder(navn)')
  
  let count = 0
  for (const k of kontakter || []) {
    const content = `
Kontaktperson: ${k.navn}
Kunde: ${k.kunder?.navn || 'Ukjent'}
Telefon: ${k.telefon || 'Ikke oppgitt'}
E-post: ${k.epost || 'Ikke oppgitt'}
Rolle: ${k.rolle || 'Ikke oppgitt'}
    `.trim()

    const embedding = await generateEmbedding(content)

    await supabase
      .from('ai_embeddings')
      .delete()
      .eq('table_name', 'kontaktpersoner')
      .eq('record_id', k.id)

    await supabase.from('ai_embeddings').insert({
      content,
      embedding,
      metadata: { navn: k.navn, kunde: k.kunder?.navn },
      table_name: 'kontaktpersoner',
      record_id: k.id,
    })

    count++
    console.log(`  ✓ ${count}/${kontakter.length} - ${k.navn}`)
  }

  console.log(`✅ Ferdig med kontaktpersoner: ${count} embeddings generert`)
}

async function main() {
  console.log('🚀 Starter embedding-generering...\n')
  
  try {
    await generateKunderEmbeddings()
    await generateAnleggEmbeddings()
    await generateKontaktpersonerEmbeddings()
    
    console.log('\n✨ Alle embeddings er generert!')
  } catch (error) {
    console.error('\n❌ Feil:', error)
    process.exit(1)
  }
}

main()
```

### Kjør Script

```bash
# Installer dependencies
npm install openai dotenv

# Kjør
npx tsx scripts/generate-embeddings.ts
```

---

## 📊 Overvåking og Logging

### Logg AI-interaksjoner

```sql
CREATE TABLE ai_chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  query TEXT NOT NULL,
  answer TEXT,
  sources JSONB,
  tokens_used INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ai_chat_logs_user_idx ON ai_chat_logs (user_id, created_at DESC);
```

Legg til logging i Edge Function:

```typescript
// Etter svar er generert
await supabaseClient.from('ai_chat_logs').insert({
  user_id: (await supabaseClient.auth.getUser()).data.user?.id,
  query,
  answer,
  sources: matches,
  tokens_used: completionData.usage.total_tokens,
  response_time_ms: Date.now() - startTime,
})
```

---

## 🎯 Neste Steg

1. ✅ Sett opp database (kjør SQL-migrasjoner)
2. ✅ Deploy Edge Function
3. ✅ Generer embeddings for eksisterende data
4. ✅ Legg til AIChat-komponenten
5. ✅ Test og iterer

Se `AI_ASSISTANT_EXAMPLES.md` for eksempler på bruk!
