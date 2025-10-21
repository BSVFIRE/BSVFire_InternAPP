import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X, Download } from 'lucide-react'
import * as XLSX from 'xlsx'

interface ImportData {
  internnummer?: string
  amatur_id?: string
  fordeling?: string
  kurs?: string
  etasje?: string
  type?: string
  produsent?: string
  plassering?: string
  status?: string
  kontrollert?: boolean
}

interface NodlysImportProps {
  anleggId: string
  onClose: () => void
  onImportComplete: () => void
}

export function NodlysImport({ anleggId, onClose, onImportComplete }: NodlysImportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState<ImportData[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [success, setSuccess] = useState(false)
  const [importStats, setImportStats] = useState({ total: 0, success: 0, failed: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Kolonne-mapping for å håndtere forskjellige kolonnenavn
  const columnMapping: Record<string, string> = {
    // Internnummer
    'internnummer': 'internnummer',
    'intern nummer': 'internnummer',
    'intern': 'internnummer',
    'nr': 'internnummer',
    
    // Armatur ID
    'amatur_id': 'amatur_id',
    'armatur id': 'amatur_id',
    'armatur': 'amatur_id',
    'armatur-id': 'amatur_id',
    'id': 'amatur_id',
    
    // Fordeling
    'fordeling': 'fordeling',
    'fordelingsnummer': 'fordeling',
    'fordeling nr': 'fordeling',
    
    // Kurs
    'kurs': 'kurs',
    'kursnummer': 'kurs',
    'kurs nr': 'kurs',
    
    // Etasje
    'etasje': 'etasje',
    'etg': 'etasje',
    'plan': 'etasje',
    
    // Type
    'type': 'type',
    'lystype': 'type',
    'armaturtype': 'type',
    
    // Produsent
    'produsent': 'produsent',
    'fabrikant': 'produsent',
    'merke': 'produsent',
    'leverandør': 'produsent',
    
    // Plassering
    'plassering': 'plassering',
    'lokasjon': 'plassering',
    'rom': 'plassering',
    'område': 'plassering',
    'sted': 'plassering',
    
    // Status
    'status': 'status',
    'tilstand': 'status',
    
    // Kontrollert
    'kontrollert': 'kontrollert',
    'sjekket': 'kontrollert',
    'ok': 'kontrollert',
  }

  function normalizeColumnName(name: string): string {
    const normalized = name.toLowerCase().trim()
    return columnMapping[normalized] || normalized
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setErrors([])
    setSuccess(false)

    try {
      const data = await parseFile(selectedFile)
      setPreview(data)
      
      if (data.length === 0) {
        setErrors(['Ingen data funnet i filen. Sjekk at filen har riktig format.'])
      }
    } catch (error) {
      console.error('Feil ved parsing av fil:', error)
      setErrors([`Kunne ikke lese filen: ${error instanceof Error ? error.message : 'Ukjent feil'}`])
    }
  }

  async function parseFile(file: File): Promise<ImportData[]> {
    const fileExtension = file.name.split('.').pop()?.toLowerCase()

    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      return parseExcel(file)
    } else if (fileExtension === 'csv') {
      return parseCSV(file)
    } else {
      throw new Error('Ugyldig filformat. Støttede formater: .xlsx, .xls, .csv')
    }
  }

  async function parseExcel(file: File): Promise<ImportData[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          
          // Les første ark
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][]
          
          if (jsonData.length < 2) {
            reject(new Error('Filen må inneholde minst en header-rad og en data-rad'))
            return
          }

          // Første rad er headers
          const headers = jsonData[0].map((h: any) => normalizeColumnName(String(h || '')))
          
          // Parse data-rader
          const parsedData: ImportData[] = []
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i]
            if (!row || row.length === 0) continue

            const item: ImportData = {}
            headers.forEach((header: string, index: number) => {
              const value = row[index]
              if (value !== undefined && value !== null && value !== '') {
                const strValue = String(value).trim()
                
                switch (header) {
                  case 'internnummer':
                  case 'amatur_id':
                  case 'fordeling':
                  case 'kurs':
                  case 'etasje':
                  case 'type':
                  case 'produsent':
                  case 'plassering':
                  case 'status':
                    (item as any)[header] = strValue
                    break
                  case 'kontrollert':
                    // Håndter boolean verdier
                    const lowerValue = strValue.toLowerCase()
                    item.kontrollert = lowerValue === 'ja' || lowerValue === 'yes' || 
                                      lowerValue === 'true' || lowerValue === '1' || 
                                      lowerValue === 'x'
                    break
                }
              }
            })

            // Legg til kun hvis det er noe data
            if (Object.keys(item).length > 0) {
              parsedData.push(item)
            }
          }

          resolve(parsedData)
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => reject(new Error('Kunne ikke lese filen'))
      reader.readAsArrayBuffer(file)
    })
  }

  async function parseCSV(file: File): Promise<ImportData[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const lines = text.split('\n').filter(line => line.trim())
          
          if (lines.length < 2) {
            reject(new Error('CSV-filen må inneholde minst en header-rad og en data-rad'))
            return
          }

          // Parse header
          const headers = lines[0].split(/[,;]/).map(h => normalizeColumnName(h.trim()))
          
          // Parse data
          const parsedData: ImportData[] = []
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(/[,;]/).map(v => v.trim())
            const item: ImportData = {}

            headers.forEach((header, index) => {
              const value = values[index]
              if (value && value !== '') {
                switch (header) {
                  case 'internnummer':
                  case 'amatur_id':
                  case 'fordeling':
                  case 'kurs':
                  case 'etasje':
                  case 'type':
                  case 'produsent':
                  case 'plassering':
                  case 'status':
                    (item as any)[header] = value
                    break
                  case 'kontrollert':
                    const lowerValue = value.toLowerCase()
                    item.kontrollert = lowerValue === 'ja' || lowerValue === 'yes' || 
                                      lowerValue === 'true' || lowerValue === '1' || 
                                      lowerValue === 'x'
                    break
                }
              }
            })

            if (Object.keys(item).length > 0) {
              parsedData.push(item)
            }
          }

          resolve(parsedData)
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => reject(new Error('Kunne ikke lese CSV-filen'))
      reader.readAsText(file)
    })
  }

  async function handleImport() {
    if (preview.length === 0) {
      setErrors(['Ingen data å importere'])
      return
    }

    setImporting(true)
    setErrors([])
    
    let successCount = 0
    let failCount = 0
    const importErrors: string[] = []

    try {
      for (let i = 0; i < preview.length; i++) {
        const item = preview[i]
        
        try {
          const { error } = await supabase
            .from('anleggsdata_nodlys')
            .insert({
              anlegg_id: anleggId,
              internnummer: item.internnummer || null,
              amatur_id: item.amatur_id || null,
              fordeling: item.fordeling || null,
              kurs: item.kurs || null,
              etasje: item.etasje || null,
              type: item.type || null,
              produsent: item.produsent || null,
              plassering: item.plassering || null,
              status: item.status || 'OK',
              kontrollert: item.kontrollert || false,
            })

          if (error) {
            failCount++
            importErrors.push(`Rad ${i + 1}: ${error.message}`)
          } else {
            successCount++
          }
        } catch (error) {
          failCount++
          importErrors.push(`Rad ${i + 1}: ${error instanceof Error ? error.message : 'Ukjent feil'}`)
        }
      }

      setImportStats({
        total: preview.length,
        success: successCount,
        failed: failCount
      })

      if (importErrors.length > 0) {
        setErrors(importErrors)
      }

      if (successCount > 0) {
        setSuccess(true)
        setTimeout(() => {
          onImportComplete()
          if (failCount === 0) {
            onClose()
          }
        }, 2000)
      }
    } catch (error) {
      console.error('Import feil:', error)
      setErrors([`Generell feil ved import: ${error instanceof Error ? error.message : 'Ukjent feil'}`])
    } finally {
      setImporting(false)
    }
  }

  function downloadTemplate() {
    // Lag en mal-fil med eksempeldata
    const templateData = [
      {
        'Armatur ID': '1',
        'Fordeling': 'F1',
        'Kurs': 'K1',
        'Etasje': '1.Etg',
        'Plassering': 'Gang ved inngang',
        'Produsent': 'Glamox',
        'Type': 'ML',
        'Status': 'OK',
        'Kontrollert': 'Ja'
      },
      {
        'Armatur ID': '2',
        'Fordeling': 'F1',
        'Kurs': 'K2',
        'Etasje': '1.Etg',
        'Plassering': 'Trapp',
        'Produsent': 'Glamox',
        'Type': 'LL',
        'Status': 'OK',
        'Kontrollert': 'Nei'
      }
    ]

    const ws = XLSX.utils.json_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Nødlys')
    XLSX.writeFile(wb, 'nodlys_mal.xlsx')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-100 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Upload className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Importer Nødlys</h2>
              <p className="text-sm text-gray-400">Last opp Excel eller CSV-fil med nødlysdata</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Template Download */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="w-5 h-5 text-blue-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-white mb-1">Trenger du en mal?</h3>
                <p className="text-sm text-gray-400 mb-3">
                  Last ned en Excel-mal med riktig format og eksempeldata
                </p>
                <button
                  onClick={downloadTemplate}
                  className="btn-secondary text-sm flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Last ned mal
                </button>
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Velg fil
            </label>
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-300 mb-2">
                {file ? file.name : 'Dra og slipp fil her, eller klikk for å velge'}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Støttede formater: .xlsx, .xls, .csv
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-primary"
              >
                Velg fil
              </button>
            </div>
          </div>

          {/* Supported Columns Info */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="font-medium text-white mb-2">Støttede kolonner:</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-400">
              <div>• Armatur ID</div>
              <div>• Fordeling</div>
              <div>• Kurs</div>
              <div>• Etasje</div>
              <div>• Plassering</div>
              <div>• Produsent</div>
              <div>• Type</div>
              <div>• Status</div>
              <div>• Kontrollert</div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Kolonnenavn er ikke case-sensitive og kan variere (f.eks. "Armatur ID", "armatur-id", "id")
            </p>
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <h3 className="font-medium text-white mb-3">
                Forhåndsvisning ({preview.length} rader)
              </h3>
              <div className="border border-gray-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-800 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-300">#</th>
                        <th className="px-3 py-2 text-left text-gray-300">Armatur ID</th>
                        <th className="px-3 py-2 text-left text-gray-300">Fordeling</th>
                        <th className="px-3 py-2 text-left text-gray-300">Kurs</th>
                        <th className="px-3 py-2 text-left text-gray-300">Etasje</th>
                        <th className="px-3 py-2 text-left text-gray-300">Plassering</th>
                        <th className="px-3 py-2 text-left text-gray-300">Type</th>
                        <th className="px-3 py-2 text-left text-gray-300">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {preview.slice(0, 10).map((item, index) => (
                        <tr key={index} className="hover:bg-gray-800/50">
                          <td className="px-3 py-2 text-gray-400">{index + 1}</td>
                          <td className="px-3 py-2 text-gray-300">{item.amatur_id || '-'}</td>
                          <td className="px-3 py-2 text-gray-300">{item.fordeling || '-'}</td>
                          <td className="px-3 py-2 text-gray-300">{item.kurs || '-'}</td>
                          <td className="px-3 py-2 text-gray-300">{item.etasje || '-'}</td>
                          <td className="px-3 py-2 text-gray-300">{item.plassering || '-'}</td>
                          <td className="px-3 py-2 text-gray-300">{item.type || '-'}</td>
                          <td className="px-3 py-2 text-gray-300">{item.status || 'OK'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.length > 10 && (
                  <div className="bg-gray-800 px-3 py-2 text-sm text-gray-400 text-center">
                    ... og {preview.length - 10} rader til
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-medium text-red-400 mb-2">Feil ved import</h3>
                  <ul className="text-sm text-red-300 space-y-1 max-h-40 overflow-y-auto">
                    {errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                <div>
                  <h3 className="font-medium text-green-400 mb-1">Import fullført!</h3>
                  <p className="text-sm text-green-300">
                    {importStats.success} av {importStats.total} rader importert
                    {importStats.failed > 0 && ` (${importStats.failed} feilet)`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="btn-secondary"
            disabled={importing}
          >
            Avbryt
          </button>
          <button
            onClick={handleImport}
            disabled={preview.length === 0 || importing}
            className="btn-primary flex items-center gap-2"
          >
            {importing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Importerer...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Importer {preview.length > 0 && `(${preview.length} rader)`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
