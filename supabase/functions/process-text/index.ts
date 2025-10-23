import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const AZURE_ENDPOINT = Deno.env.get('AZURE_OPENAI_ENDPOINT')
const AZURE_KEY = Deno.env.get('AZURE_OPENAI_KEY')

// Del opp tekst i chunks
function chunkText(text: string, maxLength: number = 1000): string[] {
  const chunks: string[] = []
  const paragraphs = text.split('\n\n')
  
  let currentChunk = ''
  
  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length > maxLength && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      currentChunk = paragraph
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks.filter(chunk => chunk.length > 50)
}

// Generer embedding
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(
    `${AZURE_ENDPOINT}/openai/deployments/text-embedding-ada-002/embeddings?api-version=2024-02-01`,
    {
      method: 'POST',
      headers: {
        'api-key': AZURE_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Azure API error: ${await response.text()}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== Process Text Request Started ===')
    
    if (!AZURE_ENDPOINT || !AZURE_KEY) {
      throw new Error('Azure OpenAI credentials not configured')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not found')
    }

    const { text, title, source, category } = await req.json()

    if (!text || !title) {
      throw new Error('text and title are required')
    }

    console.log(`Processing text: ${title}, length: ${text.length} characters`)

    // Del opp i chunks
    const chunks = chunkText(text, 1000)
    console.log(`Created ${chunks.length} chunks`)

    // Opprett Supabase client
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Lagre hver chunk
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < chunks.length; i++) {
      try {
        const chunk = chunks[i]
        const chunkTitle = chunks.length > 1 
          ? `${title} - Del ${i + 1}/${chunks.length}`
          : title
        
        console.log(`Processing chunk ${i + 1}/${chunks.length}`)

        // Generer embedding
        const embedding = await generateEmbedding(chunk)

        // Lagre i knowledge_base
        const { data: article, error: insertError } = await supabaseClient
          .from('knowledge_base')
          .insert({
            title: chunkTitle,
            content: chunk,
            category: category || 'Import',
            source: source || 'Manual',
            metadata: {
              chunk_index: i,
              total_chunks: chunks.length,
            },
          })
          .select()
          .single()

        if (insertError) {
          console.error(`Error inserting chunk ${i + 1}:`, insertError)
          failCount++
          continue
        }

        if (!article) {
          console.error(`No article returned for chunk ${i + 1}`)
          failCount++
          continue
        }

        // Lagre embedding
        const { error: embeddingError } = await supabaseClient
          .from('ai_embeddings')
          .insert({
            content: chunk,
            embedding,
            table_name: 'knowledge_base',
            record_id: article.id,
            metadata: {
              title: chunkTitle,
              source: source || 'Manual',
              chunk_index: i,
            },
          })

        if (embeddingError) {
          console.error(`Error inserting embedding ${i + 1}:`, embeddingError)
          failCount++
        } else {
          successCount++
          console.log(`✓ Chunk ${i + 1} processed successfully`)
        }

        // Vent litt
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`Error processing chunk ${i + 1}:`, error)
        failCount++
      }
    }

    console.log(`Finished: ${successCount} success, ${failCount} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Text processed successfully`,
        chunks: successCount,
        failed: failCount,
        totalChunks: chunks.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error: any) {
    console.error('Processing error:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to process text',
        details: error.toString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
