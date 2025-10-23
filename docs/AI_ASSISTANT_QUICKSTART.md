# AI-assistent - Rask Oppstart (30 minutter)

## 🚀 Kom i Gang på 30 Minutter

Denne guiden tar deg gjennom det raskeste oppsettet for å få en fungerende AI-assistent.

---

## ✅ Forutsetninger

- [ ] Supabase-prosjekt er satt opp
- [ ] OpenAI API-nøkkel (få fra [platform.openai.com](https://platform.openai.com))
- [ ] Supabase CLI installert (`npm install -g supabase`)

---

## 📝 Steg-for-Steg

### 1. Aktiver pgvector (2 min)

Gå til Supabase SQL Editor og kjør:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE ai_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ai_embeddings_embedding_idx 
ON ai_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

ALTER TABLE ai_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read embeddings"
  ON ai_embeddings FOR SELECT
  TO authenticated
  USING (true);

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
```

---

### 2. Opprett Edge Function (5 min)

```bash
# I terminalen
cd /Users/eriksebastianskille/Documents/Firebase_BSVFire

# Opprett functions-mappe hvis den ikke finnes
mkdir -p supabase/functions/ai-chat

# Opprett function-fil
cat > supabase/functions/ai-chat/index.ts << 'EOF'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query } = await req.json()
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // 1. Generer embedding
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

    const embeddingData = await embeddingResponse.json()
    const queryEmbedding = embeddingData.data[0].embedding

    // 2. Søk i database
    const { data: matches } = await supabaseClient.rpc('match_embeddings', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: 5,
    })

    const context = matches && matches.length > 0
      ? matches.map((m: any) => `[${m.table_name}] ${m.content}`).join('\n\n')
      : 'Ingen relevante dokumenter funnet.'

    // 3. Send til OpenAI
    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `Du er en AI-assistent for BSV Fire AS. Svar alltid på norsk.
            
Relevant informasjon:
${context}`,
          },
          { role: 'user', content: query },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    })

    const completionData = await completion.json()
    const answer = completionData.choices[0].message.content

    return new Response(
      JSON.stringify({ answer, sources: matches || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
EOF
```

---

### 3. Deploy Edge Function (3 min)

```bash
# Login til Supabase
supabase login

# Link til prosjekt
supabase link --project-ref DIN_PROJECT_REF

# Sett OpenAI API-nøkkel
supabase secrets set OPENAI_API_KEY=sk-...

# Deploy
supabase functions deploy ai-chat
```

---

### 4. Legg til React Component (5 min)

Kopier denne filen til `src/components/AIChat.tsx`:

```typescript
import React, { useState, useRef, useEffect } from 'react'
import { MessageSquare, Send, X, Loader2 } from 'lucide-react'
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
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { query: input },
      })

      if (error) throw error

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.answer },
      ])
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '❌ Beklager, det oppstod en feil: ' + error.message,
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
        className="fixed bottom-6 right-6 bg-teal-500 text-white p-4 rounded-full shadow-lg hover:bg-teal-600 transition-all z-50"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col z-50">
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 bg-teal-500 text-white">
        <h3 className="font-semibold">AI-assistent</h3>
        <button onClick={() => setIsOpen(false)}>
          <X className="w-5 h-5" />
        </button>
      </div>

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
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t dark:border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Skriv ditt spørsmål..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-teal-500 text-white p-2 rounded-lg hover:bg-teal-600 disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  )
}
```

---

### 5. Legg til i App.tsx (1 min)

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

### 6. Generer Test-embeddings (10 min)

Opprett `scripts/quick-embeddings.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'DIN_SUPABASE_URL',
  'DIN_SERVICE_KEY'
)

async function generateEmbedding(text: string) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer DIN_OPENAI_KEY',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: text,
    }),
  })
  const data = await response.json()
  return data.data[0].embedding
}

async function main() {
  console.log('Genererer test-embeddings...')
  
  // Hent 10 kunder
  const { data: kunder } = await supabase
    .from('kunder')
    .select('*')
    .limit(10)
  
  for (const kunde of kunder || []) {
    const content = `Kunde: ${kunde.navn}\nAdresse: ${kunde.adresse}`
    const embedding = await generateEmbedding(content)
    
    await supabase.from('ai_embeddings').insert({
      content,
      embedding,
      table_name: 'kunder',
      record_id: kunde.id,
      metadata: { navn: kunde.navn },
    })
    
    console.log(`✓ ${kunde.navn}`)
  }
  
  console.log('Ferdig!')
}

main()
```

Kjør:
```bash
npx tsx scripts/quick-embeddings.ts
```

---

### 7. Test! (2 min)

1. Start dev-server: `npm run dev`
2. Åpne appen i nettleseren
3. Klikk på AI-chat-knappen (nederst til høyre)
4. Test med: "Finn alle kunder"

---

## ✅ Ferdig!

Du har nå en fungerende AI-assistent! 🎉

### Neste Steg

1. **Generer flere embeddings** - Kjør for alle tabeller
2. **Forbedre prompts** - Tilpass systemprompten
3. **Legg til funksjoner** - Søkehistorikk, favoritter, etc.
4. **Optimaliser kostnader** - Bruk caching, billigere modeller

---

## 🐛 Feilsøking

### "Function not found"
→ Sjekk at Edge Function er deployet: `supabase functions list`

### "OpenAI API error"
→ Verifiser API-nøkkel: `supabase secrets list`

### "No matches found"
→ Sjekk at embeddings er generert: Kjør SQL `SELECT COUNT(*) FROM ai_embeddings`

### "CORS error"
→ Sjekk at CORS headers er satt i Edge Function

---

## 📚 Videre Lesning

- `AI_ASSISTANT_IMPLEMENTATION.md` - Fullstendig implementering
- `AI_ASSISTANT_EXAMPLES.md` - Eksempler på bruk
- `AI_ASSISTANT_ALTERNATIVES.md` - Alternative løsninger

---

## 💬 Spørsmål?

Kontakt erik.skille@bsvfire.no
