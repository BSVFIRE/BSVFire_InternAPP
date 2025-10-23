import { createClient } from '@supabase/supabase-js'

// ⚠️ VIKTIG: Sett disse som miljøvariabler!
// Eksempel: export SUPABASE_URL=https://xxx.supabase.co
const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''
const AZURE_ENDPOINT = process.env.AZURE_ENDPOINT || ''
const AZURE_KEY = process.env.AZURE_KEY || ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !AZURE_ENDPOINT || !AZURE_KEY) {
  console.error('❌ Mangler påkrevde miljøvariabler:')
  console.error('   - SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_KEY')
  console.error('   - AZURE_ENDPOINT')
  console.error('   - AZURE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function generateEmbedding(text: string): Promise<number[]> {
  console.log(`  Genererer embedding for: "${text.substring(0, 50)}..."`)
  
  const response = await fetch(
    `${AZURE_ENDPOINT}/openai/deployments/text-embedding-ada-002/embeddings?api-version=2024-02-01`,
    {
      method: 'POST',
      headers: {
        'api-key': AZURE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Azure API error: ${error}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}

async function generateKunderEmbeddings() {
  console.log('\n📊 Genererer embeddings for kunder...\n')
  
  // Hent alle kunder
  const { data: kunder, error } = await supabase
    .from('customer')
    .select('id, navn, organisasjonsnummer')
    .order('navn')
  
  if (error) {
    console.error('❌ Feil ved henting av kunder:', error)
    return
  }

  if (!kunder || kunder.length === 0) {
    console.log('⚠️  Ingen kunder funnet')
    return
  }

  // Hent eksisterende embeddings
  const { data: existingEmbeddings } = await supabase
    .from('ai_embeddings')
    .select('record_id')
    .eq('table_name', 'customer')

  const existingIds = new Set(existingEmbeddings?.map(e => e.record_id) || [])

  // Filtrer ut kunder som allerede har embeddings
  const nyeKunder = kunder.filter(k => !existingIds.has(k.id))

  console.log(`Fant ${kunder.length} kunder totalt`)
  console.log(`${existingIds.size} har allerede embeddings`)
  console.log(`${nyeKunder.length} nye kunder å prosessere\n`)

  if (nyeKunder.length === 0) {
    console.log('✅ Alle kunder har allerede embeddings!')
    return
  }

  let success = 0
  let failed = 0

  for (const kunde of nyeKunder) {
    try {
      // Bygg innhold for embedding
      const content = `Kunde: ${kunde.navn}
Organisasjonsnummer: ${kunde.organisasjonsnummer || 'Ikke oppgitt'}`

      // Generer embedding
      const embedding = await generateEmbedding(content)

      // Lagre i database
      const { error: insertError } = await supabase
        .from('ai_embeddings')
        .insert({
          content,
          embedding,
          table_name: 'customer',
          record_id: kunde.id,
          metadata: {
            navn: kunde.navn,
          },
        })

      if (insertError) {
        console.error(`  ❌ Feil ved lagring av ${kunde.navn}:`, insertError.message)
        failed++
      } else {
        console.log(`  ✅ ${kunde.navn}`)
        success++
      }

      // Vent litt for å ikke overbelaste API
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error: any) {
      console.error(`  ❌ Feil for ${kunde.navn}:`, error.message)
      failed++
    }
  }

  console.log(`\n✅ Ferdig! ${success} suksess, ${failed} feil`)
}

async function generateAnleggEmbeddings() {
  console.log('\n🏢 Genererer embeddings for anlegg...\n')
  
  // Hent alle anlegg med kunde-info
  const { data: anlegg, error } = await supabase
    .from('anlegg')
    .select(`
      id,
      anleggsnavn,
      adresse,
      postnummer,
      poststed,
      kundenr,
      customer (navn)
    `)
    .order('anleggsnavn')
  
  if (error) {
    console.error('❌ Feil ved henting av anlegg:', error)
    return
  }

  if (!anlegg || anlegg.length === 0) {
    console.log('⚠️  Ingen anlegg funnet')
    return
  }

  // Hent eksisterende embeddings
  const { data: existingEmbeddings } = await supabase
    .from('ai_embeddings')
    .select('record_id')
    .eq('table_name', 'anlegg')

  const existingIds = new Set(existingEmbeddings?.map(e => e.record_id) || [])

  // Filtrer ut anlegg som allerede har embeddings
  const nyeAnlegg = anlegg.filter(a => !existingIds.has(a.id))

  console.log(`Fant ${anlegg.length} anlegg totalt`)
  console.log(`${existingIds.size} har allerede embeddings`)
  console.log(`${nyeAnlegg.length} nye anlegg å prosessere\n`)

  if (nyeAnlegg.length === 0) {
    console.log('✅ Alle anlegg har allerede embeddings!')
    return
  }

  let success = 0
  let failed = 0

  for (const a of nyeAnlegg) {
    try {
      const kundeNavn = (a.customer as any)?.navn || 'Ukjent kunde'
      
      const content = `Anlegg: ${a.anleggsnavn}
Kunde: ${kundeNavn}
Adresse: ${a.adresse || 'Ikke oppgitt'}
Postnummer: ${a.postnummer || 'Ikke oppgitt'}
Poststed: ${a.poststed || 'Ikke oppgitt'}`

      const embedding = await generateEmbedding(content)

      const { error: insertError } = await supabase
        .from('ai_embeddings')
        .insert({
          content,
          embedding,
          table_name: 'anlegg',
          record_id: a.id,
          metadata: {
            anleggsnavn: a.anleggsnavn,
            kunde: kundeNavn,
            poststed: a.poststed,
          },
        })

      if (insertError) {
        console.error(`  ❌ Feil ved lagring av ${a.anleggsnavn}:`, insertError.message)
        failed++
      } else {
        console.log(`  ✅ ${a.anleggsnavn}`)
        success++
      }

      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error: any) {
      console.error(`  ❌ Feil for ${a.anleggsnavn}:`, error.message)
      failed++
    }
  }

  console.log(`\n✅ Ferdig! ${success} suksess, ${failed} feil`)
}

async function generateDokumenterEmbeddings() {
  console.log('\n📄 Genererer embeddings for dokumenter...\n')
  
  // Hent alle dokumenter
  const { data: dokumenter, error } = await supabase
    .from('dokumenter')
    .select('id, filnavn, type, anlegg_id, opplastet_dato')
    .order('opplastet_dato', { ascending: false })
  
  if (error) {
    console.error('❌ Feil ved henting av dokumenter:', error)
    return
  }

  if (!dokumenter || dokumenter.length === 0) {
    console.log('⚠️  Ingen dokumenter funnet')
    return
  }

  // Hent eksisterende embeddings
  const { data: existingEmbeddings } = await supabase
    .from('ai_embeddings')
    .select('record_id')
    .eq('table_name', 'dokumenter')

  const existingIds = new Set(existingEmbeddings?.map(e => e.record_id) || [])

  // Filtrer ut dokumenter som allerede har embeddings
  const nyeDokumenter = dokumenter.filter(d => !existingIds.has(d.id))

  console.log(`Fant ${dokumenter.length} dokumenter totalt`)
  console.log(`${existingIds.size} har allerede embeddings`)
  console.log(`${nyeDokumenter.length} nye dokumenter å prosessere\n`)

  if (nyeDokumenter.length === 0) {
    console.log('✅ Alle dokumenter har allerede embeddings!')
    return
  }

  let success = 0
  let failed = 0

  for (const dok of nyeDokumenter) {
    try {
      const content = `Dokument: ${dok.filnavn}
Type: ${dok.type || 'Ikke oppgitt'}
Dato: ${new Date(dok.opplastet_dato).toLocaleDateString('no-NO')}`

      const embedding = await generateEmbedding(content)

      const { error: insertError } = await supabase
        .from('ai_embeddings')
        .insert({
          content,
          embedding,
          table_name: 'dokumenter',
          record_id: dok.id,
          metadata: {
            filnavn: dok.filnavn,
            type: dok.type,
          },
        })

      if (insertError) {
        console.error(`  ❌ Feil ved lagring av ${dok.filnavn}:`, insertError.message)
        failed++
      } else {
        console.log(`  ✅ ${dok.filnavn}`)
        success++
      }

      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error: any) {
      console.error(`  ❌ Feil for ${dok.filnavn}:`, error.message)
      failed++
    }
  }

  console.log(`\n✅ Ferdig! ${success} suksess, ${failed} feil`)
}

async function generateKnowledgeBaseEmbeddings() {
  console.log('\n📚 Genererer embeddings for kunnskapsbase...\n')
  
  // Hent alle kunnskapsbase-artikler
  const { data: articles, error } = await supabase
    .from('knowledge_base')
    .select('id, title, content, category, source')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('❌ Feil ved henting av kunnskapsbase:', error)
    return
  }

  if (!articles || articles.length === 0) {
    console.log('⚠️  Ingen artikler funnet i kunnskapsbase')
    return
  }

  // Hent eksisterende embeddings
  const { data: existingEmbeddings } = await supabase
    .from('ai_embeddings')
    .select('record_id')
    .eq('table_name', 'knowledge_base')

  const existingIds = new Set(existingEmbeddings?.map(e => e.record_id) || [])

  // Filtrer ut artikler som allerede har embeddings
  const nyeArticles = articles.filter(a => !existingIds.has(a.id))

  console.log(`Fant ${articles.length} artikler totalt`)
  console.log(`${existingIds.size} har allerede embeddings`)
  console.log(`${nyeArticles.length} nye artikler å prosessere\n`)

  if (nyeArticles.length === 0) {
    console.log('✅ Alle artikler har allerede embeddings!')
    return
  }

  let success = 0
  let failed = 0

  for (const article of nyeArticles) {
    try {
      const content = `${article.title}

${article.content}

Kilde: ${article.source || 'Ikke oppgitt'}
Kategori: ${article.category || 'Ikke oppgitt'}`

      const embedding = await generateEmbedding(content)

      const { error: insertError } = await supabase
        .from('ai_embeddings')
        .insert({
          content,
          embedding,
          table_name: 'knowledge_base',
          record_id: article.id,
          metadata: {
            title: article.title,
            category: article.category,
            source: article.source,
          },
        })

      if (insertError) {
        console.error(`  ❌ Feil ved lagring av ${article.title}:`, insertError.message)
        failed++
      } else {
        console.log(`  ✅ ${article.title}`)
        success++
      }

      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error: any) {
      console.error(`  ❌ Feil for ${article.title}:`, error.message)
      failed++
    }
  }

  console.log(`\n✅ Ferdig! ${success} suksess, ${failed} feil`)
}

async function main() {
  console.log('🚀 Starter embedding-generering...')
  console.log('═══════════════════════════════════════\n')

  try {
    // Generer embeddings for kunder
    await generateKunderEmbeddings()

    // Generer embeddings for anlegg
    await generateAnleggEmbeddings()

    // Generer embeddings for dokumenter
    await generateDokumenterEmbeddings()

    // Generer embeddings for kunnskapsbase
    await generateKnowledgeBaseEmbeddings()

    console.log('\n═══════════════════════════════════════')
    console.log('🎉 Alle embeddings generert!')
    console.log('\nDu kan nå teste AI-assistenten!')
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message)
    process.exit(1)
  }
}

main()
