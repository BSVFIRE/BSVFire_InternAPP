import { useState } from 'react'
import { Upload, FileText, CheckCircle, XCircle, Loader2, Info, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import * as pdfjsLib from 'pdfjs-dist'
import Tesseract from 'tesseract.js'

// Sett worker path for PDF.js - bruk lokal worker fra node_modules
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

interface KnowledgeArticle {
  id: string
  title: string
  content: string
  category: string
  source: string
  created_at: string
}

export function AdminAIKnowledge() {
  const [isUploading, setIsUploading] = useState(false)
  const [articles, setArticles] = useState<KnowledgeArticle[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const loadArticles = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setArticles(data || [])
    } catch (error: any) {
      console.error('Error loading articles:', error)
      setMessage({ type: 'error', text: 'Kunne ikke laste artikler' })
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setMessage({ type: 'error', text: 'Kun PDF-filer er støttet' })
      return
    }

    console.log(`Processing PDF: ${file.name}, size: ${(file.size / 1024 / 1024).toFixed(1)}MB`)

    setIsUploading(true)
    setMessage(null)

    try {
      // Steg 1: Les PDF-fil og ekstraher tekst i nettleseren
      setMessage({ type: 'success', text: 'Leser PDF...' })
      
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      
      console.log(`PDF loaded: ${pdf.numPages} pages`)
      setMessage({ type: 'success', text: `Ekstraherer tekst fra ${pdf.numPages} sider...` })

      let fullText = ''
      
      // Ekstraher tekst fra hver side
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
        fullText += pageText + '\n\n'
        
        // Oppdater progress
        if (i % 10 === 0 || i === pdf.numPages) {
          setMessage({ 
            type: 'success', 
            text: `Ekstraherer tekst: ${i}/${pdf.numPages} sider...` 
          })
        }
      }

      console.log(`Extracted ${fullText.length} characters from PDF`)
      console.log('First 500 chars:', fullText.substring(0, 500))

      // Sjekk om vi fikk nok tekst - hvis ikke, bruk OCR
      const trimmedLength = fullText.trim().length
      const uniqueWords = new Set(fullText.toLowerCase().split(/\s+/)).size
      console.log(`Trimmed text length: ${trimmedLength}`)
      console.log(`Unique words: ${uniqueWords}`)
      
      // Hvis teksten er repetitiv (få unike ord) eller for kort, bruk OCR
      if (trimmedLength < 500 || uniqueWords < 50) {
        console.log('Not enough text extracted, falling back to OCR...')
        console.log(`Threshold: 500, Got: ${trimmedLength}`)
        setMessage({ 
          type: 'success', 
          text: `PDF inneholder bilder - bruker OCR for å lese tekst. Dette kan ta ${Math.ceil(pdf.numPages / 2)} minutter...` 
        })

        fullText = ''
        
        // Bruk OCR på hver side
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const viewport = page.getViewport({ scale: 2.0 })
          
          // Render side til canvas
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')!
          canvas.width = viewport.width
          canvas.height = viewport.height
          
          await page.render({
            canvasContext: context,
            viewport: viewport,
            canvas: canvas
          } as any).promise
          
          // Kjør OCR på canvas
          setMessage({ 
            type: 'success', 
            text: `OCR: Leser side ${i}/${pdf.numPages} (${Math.round((i / pdf.numPages) * 100)}%)...` 
          })
          
          const { data: { text } } = await Tesseract.recognize(
            canvas.toDataURL(),
            'nor',
            {
              logger: (m) => {
                if (m.status === 'recognizing text') {
                  console.log(`OCR progress: ${Math.round(m.progress * 100)}%`)
                }
              }
            }
          )
          
          fullText += text + '\n\n'
          
          // Cleanup
          canvas.remove()
        }
        
        console.log(`OCR extracted ${fullText.length} characters`)
      }

      if (fullText.trim().length < 100) {
        throw new Error('Kunne ikke ekstrahere tekst fra PDF. PDF-en kan være korrupt eller inneholde kun bilder uten tekst.')
      }

      // Steg 2: Send tekst til Edge Function for prosessering
      setMessage({ type: 'success', text: 'Genererer embeddings...' })

      const { data, error } = await supabase.functions.invoke('process-text', {
        body: { 
          text: fullText,
          title: file.name.replace('.pdf', ''),
          source: file.name,
          category: 'PDF Import'
        },
      })

      console.log('Edge Function response:', { data, error })

      if (error) {
        console.error('Edge Function error details:', error)
        throw error
      }

      if (data?.error) {
        console.error('Edge Function returned error:', data)
        throw new Error(data.error + (data.details ? ': ' + data.details : ''))
      }

      setMessage({ 
        type: 'success', 
        text: `✅ Ferdig! ${data.chunks} tekstdeler ekstrahert og embeddings generert` 
      })

      // Refresh artikler
      await loadArticles()
      
    } catch (error: any) {
      console.error('Parse error:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      setMessage({ 
        type: 'error', 
        text: `❌ Feil: ${error.message || error.toString() || 'Ukjent feil'}. Sjekk konsollen for detaljer.` 
      })
    } finally {
      setIsUploading(false)
      // Reset file input
      e.target.value = ''
    }
  }

  const deleteArticle = async (id: string) => {
    if (!confirm('Er du sikker på at du vil slette denne artikkelen?')) return

    try {
      const { error } = await supabase
        .from('knowledge_base')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Slett også embeddings
      await supabase
        .from('ai_embeddings')
        .delete()
        .eq('table_name', 'knowledge_base')
        .eq('record_id', id)

      setMessage({ type: 'success', text: 'Artikkel slettet' })
      await loadArticles()
    } catch (error: any) {
      console.error('Delete error:', error)
      setMessage({ type: 'error', text: 'Kunne ikke slette artikkel' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-teal-400" />
            AI Kunnskapsbase
          </h1>
          <p className="text-gray-400 mt-2">
            Last opp PDF-er med standarder og prosedyrer
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 mt-0.5" />
          <div className="text-sm text-gray-300">
            <p className="font-semibold text-white mb-2">Hvordan det fungerer:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Last opp en PDF (f.eks. NS3960 standard)</li>
              <li>Systemet ekstraherer automatisk tekst fra PDF-en i nettleseren</li>
              <li>Teksten deles opp i mindre deler (chunks)</li>
              <li>Embeddings genereres for hver del</li>
              <li>AI-en kan nå svare på spørsmål basert på innholdet!</li>
            </ol>
            <p className="mt-3 text-green-400">
              ✅ PDF-parsing fungerer nå direkte i nettleseren - ingen størrelsesbegrensning!
            </p>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">📤 Last Opp PDF</h3>
        
        <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-300 mb-4">
            Velg en PDF-fil for å laste opp
          </p>
          <label className="inline-block">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
            <span className="bg-teal-500 hover:bg-teal-600 disabled:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg cursor-pointer inline-block transition-colors">
              {isUploading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Laster opp...
                </span>
              ) : (
                'Velg PDF-fil'
              )}
            </span>
          </label>
        </div>

        {message && (
          <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${
            message.type === 'error' 
              ? 'bg-red-500/10 border border-red-500/20' 
              : 'bg-green-500/10 border border-green-500/20'
          }`}>
            {message.type === 'error' ? (
              <XCircle className="w-5 h-5 text-red-400 mt-0.5" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
            )}
            <p className="text-sm text-gray-300">{message.text}</p>
          </div>
        )}
      </div>

      {/* Manual Upload Instructions */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">✍️ Manuell Opplasting</h3>
        <p className="text-sm text-gray-400 mb-4">
          Siden automatisk PDF-parsing ikke er satt opp ennå, kan du legge til innhold manuelt:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
          <li>Gå til Supabase Dashboard → Table Editor → <code className="bg-gray-900 px-2 py-1 rounded">knowledge_base</code></li>
          <li>Klikk "Insert row"</li>
          <li>Fyll ut:
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
              <li><strong>title:</strong> "NS3960 - Krav til manuell melder"</li>
              <li><strong>content:</strong> [Kopier tekst fra PDF]</li>
              <li><strong>category:</strong> "Standard"</li>
              <li><strong>source:</strong> "NS3960:2022"</li>
            </ul>
          </li>
          <li>Kjør embedding-script: <code className="bg-gray-900 px-2 py-1 rounded">npx tsx scripts/generate-embeddings.ts</code></li>
        </ol>
      </div>

      {/* Articles List */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">📚 Kunnskapsbase Artikler</h3>
          <button
            onClick={loadArticles}
            disabled={loading}
            className="text-sm text-teal-400 hover:text-teal-300 disabled:text-gray-500"
          >
            {loading ? 'Laster...' : 'Oppdater'}
          </button>
        </div>

        {articles.length === 0 ? (
          <p className="text-gray-400 text-center py-8">
            Ingen artikler ennå. Last opp en PDF eller legg til manuelt.
          </p>
        ) : (
          <div className="space-y-3">
            {articles.map((article) => (
              <div
                key={article.id}
                className="bg-gray-700/50 rounded-lg p-4 flex items-start justify-between"
              >
                <div className="flex-1">
                  <h4 className="font-semibold text-white mb-1">{article.title}</h4>
                  <p className="text-sm text-gray-400 mb-2 line-clamp-2">
                    {article.content.substring(0, 150)}...
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Kategori: {article.category}</span>
                    <span>Kilde: {article.source}</span>
                    <span>{new Date(article.created_at).toLocaleDateString('no-NO')}</span>
                  </div>
                </div>
                <button
                  onClick={() => deleteArticle(article.id)}
                  className="text-red-400 hover:text-red-300 p-2"
                  title="Slett artikkel"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
