import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @deno-types="npm:@types/pdf-parse"
import pdfParse from 'npm:pdf-parse@1.1.1'

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
  
  return chunks.filter(chunk => chunk.length > 50) // Filtrer ut for korte chunks
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
    console.log('=== Parse PDF Request Started ===')
    
    // Sjekk at nødvendige miljøvariabler er satt
    if (!AZURE_ENDPOINT || !AZURE_KEY) {
      console.error('Azure credentials missing')
      throw new Error('Azure OpenAI credentials not configured. Please set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_KEY secrets.')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase credentials missing')
      throw new Error('Supabase credentials not found in environment')
    }

    console.log('✓ Environment check passed')

    let body
    try {
      body = await req.json()
      console.log('✓ Request body parsed:', Object.keys(body))
    } catch (e) {
      console.error('Failed to parse request body:', e)
      throw new Error('Invalid request body')
    }

    const { storagePath, fileName } = body

    if (!storagePath || !fileName) {
      throw new Error('storagePath and fileName are required')
    }

    console.log(`Processing PDF: ${fileName} from storage: ${storagePath}`)

    // Opprett Supabase client for å hente PDF fra storage
    const storageClient = createClient(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Hent PDF fra storage
    console.log('Downloading PDF from storage...')
    const { data: pdfBlob, error: downloadError } = await storageClient.storage
      .from('knowledge-base-pdfs')
      .download(storagePath)

    if (downloadError || !pdfBlob) {
      console.error('Download error:', downloadError)
      throw new Error(`Kunne ikke hente PDF fra storage: ${downloadError?.message || 'Unknown error'}`)
    }

    console.log(`✓ Downloaded PDF, size: ${pdfBlob.size} bytes (${(pdfBlob.size / 1024 / 1024).toFixed(2)} MB)`)

    // Konverter Blob til ArrayBuffer og deretter til Uint8Array
    console.log('Converting PDF to buffer...')
    const arrayBuffer = await pdfBlob.arrayBuffer()
    const pdfBuffer = new Uint8Array(arrayBuffer)
    console.log(`✓ Buffer created, length: ${pdfBuffer.length}`)

    // Parse PDF
    console.log('Parsing PDF with pdf-parse...')
    let parsedPdf
    let fullText = ''
    
    try {
      parsedPdf = await pdfParse(pdfBuffer)
      fullText = parsedPdf.text || ''
      console.log(`✓ PDF parsed successfully. Text length: ${fullText.length} characters`)
    } catch (parseError: any) {
      console.error('PDF parse error:', parseError)
      console.error('Error stack:', parseError.stack)
      throw new Error(`Kunne ikke parse PDF: ${parseError.message}. Prøv å eksportere PDF-en på nytt eller bruk en annen PDF-fil.`)
    }

    if (!fullText || fullText.trim().length < 50) {
      throw new Error(`PDF inneholder for lite tekst (${fullText.length} tegn). Sørg for at PDF-en inneholder lesbar tekst og ikke bare bilder.`)
    }

    console.log(`Extracted ${fullText.length} characters from PDF`)

    // Del opp i chunks
    const chunks = chunkText(fullText, 1000)
    console.log(`Created ${chunks.length} chunks`)

    // Opprett Supabase client med service role key
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

    console.log('Supabase client created')

    // Lagre hver chunk i knowledge_base og generer embeddings
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < chunks.length; i++) {
      try {
        const chunk = chunks[i]
        const title = `${fileName.replace('.pdf', '')} - Del ${i + 1}/${chunks.length}`
        
        console.log(`Processing chunk ${i + 1}/${chunks.length}`)

        // Generer embedding
        const embedding = await generateEmbedding(chunk)

        // Lagre i knowledge_base
        const { data: article, error: insertError } = await supabaseClient
          .from('knowledge_base')
          .insert({
            title,
            content: chunk,
            category: 'PDF Import',
            source: fileName,
            metadata: {
              chunk_index: i,
              total_chunks: chunks.length,
              original_file: fileName,
            },
          })
          .select()
          .single()

        if (insertError) {
          console.error(`Error inserting chunk ${i + 1}:`, JSON.stringify(insertError))
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
              title,
              source: fileName,
              chunk_index: i,
            },
          })

        if (embeddingError) {
          console.error(`Error inserting embedding ${i + 1}:`, JSON.stringify(embeddingError))
          failCount++
        } else {
          successCount++
          console.log(`✓ Chunk ${i + 1} processed successfully`)
        }

        // Vent litt for å ikke overbelaste API
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
        message: `PDF parsed successfully`,
        chunks: successCount,
        failed: failCount,
        totalChunks: chunks.length,
        fileName,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error: any) {
    console.error('PDF parsing error:', error)
    console.error('Error stack:', error.stack)
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to parse PDF',
        details: error.toString(),
        stack: error.stack,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
