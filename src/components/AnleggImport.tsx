import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Download, Upload, X, CheckCircle, AlertCircle, Loader2, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'
import { createDropboxFolder, buildAnleggDropboxPath } from '@/services/dropboxServiceV2'
import { ANLEGG_FOLDERS } from '@/services/dropboxFolderStructure'

interface Kunde {
  id: string
  navn: string
  kunde_nummer: string | null
  organisasjonsnummer: string | null
}

interface ImportRow {
  anleggsnavn: string
  adresse: string
  postnummer: string
  poststed: string
  kundenavn: string
  kontroll_maaned?: string
  // Kontrolltyper (Ja/Nei eller X)
  brannalarm?: boolean
  nodlys?: boolean
  slukkeutstyr?: boolean
  roykluker?: boolean
  forstehjelp?: boolean
  ekstern?: boolean
  // Priser
  pris_brannalarm?: number
  pris_nodlys?: number
  pris_slukkeutstyr?: number
  pris_roykluker?: number
  pris_forstehjelp?: number
  pris_ekstern?: number
}

interface ImportResult {
  row: number
  anleggsnavn: string
  status: 'success' | 'error' | 'pending'
  message?: string
}

interface AnleggImportProps {
  kunder: Kunde[]
  onClose: () => void
  onImportComplete: () => void
}

export function AnleggImport({ kunder, onClose, onImportComplete }: AnleggImportProps) {
  const [importData, setImportData] = useState<ImportRow[]>([])
  const [results, setResults] = useState<ImportResult[]>([])
  const [importing, setImporting] = useState(false)
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Last ned Excel-mal
  const downloadTemplate = () => {
    const templateData = [
      {
        'Anleggsnavn': 'Eksempel Skole',
        'Adresse': 'Skolegata 1',
        'Postnummer': '5000',
        'Poststed': 'Bergen',
        'Kundenavn': 'Bergen Kommune',
        'Kontrollmåned': 'Januar',
        'Brannalarm': 'Ja',
        'Nødlys': 'Ja',
        'Slukkeutstyr': '',
        'Røykluker': '',
        'Førstehjelp': '',
        'Ekstern': '',
        'Pris Brannalarm': 4250,
        'Pris Nødlys': 2500,
        'Pris Slukkeutstyr': '',
        'Pris Røykluker': '',
        'Pris Førstehjelp': '',
        'Pris Ekstern': ''
      }
    ]

    const ws = XLSX.utils.json_to_sheet(templateData)
    
    // Sett kolonnebredder
    ws['!cols'] = [
      { wch: 25 }, // Anleggsnavn
      { wch: 20 }, // Adresse
      { wch: 10 }, // Postnummer
      { wch: 12 }, // Poststed
      { wch: 20 }, // Kundenavn
      { wch: 12 }, // Kontrollmåned
      { wch: 10 }, // Brannalarm
      { wch: 8 },  // Nødlys
      { wch: 10 }, // Slukkeutstyr
      { wch: 10 }, // Røykluker
      { wch: 10 }, // Førstehjelp
      { wch: 8 },  // Ekstern
      { wch: 14 }, // Pris Brannalarm
      { wch: 10 }, // Pris Nødlys
      { wch: 14 }, // Pris Slukkeutstyr
      { wch: 12 }, // Pris Røykluker
      { wch: 14 }, // Pris Førstehjelp
      { wch: 10 }, // Pris Ekstern
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Anlegg')
    
    XLSX.writeFile(wb, 'anlegg_import_mal.xlsx')
  }

  // Les Excel-fil
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[]

        // Hjelpefunksjon for å konvertere til streng
        const toStr = (val: any) => val != null ? String(val).trim() : ''
        
        // Hjelpefunksjon for å konvertere måned (håndterer både tekst og Excel-datoer)
        const toMonth = (val: any): string => {
          if (val == null || val === '') return ''
          
          // Månedsnavn-mapping
          const monthNames: Record<string, string> = {
            'januar': 'Januar', 'january': 'Januar', 'jan': 'Januar', '1': 'Januar',
            'februar': 'Februar', 'february': 'Februar', 'feb': 'Februar', '2': 'Februar',
            'mars': 'Mars', 'march': 'Mars', 'mar': 'Mars', '3': 'Mars',
            'april': 'April', 'apr': 'April', '4': 'April',
            'mai': 'Mai', 'may': 'Mai', '5': 'Mai',
            'juni': 'Juni', 'june': 'Juni', 'jun': 'Juni', '6': 'Juni',
            'juli': 'Juli', 'july': 'Juli', 'jul': 'Juli', '7': 'Juli',
            'august': 'August', 'aug': 'August', '8': 'August',
            'september': 'September', 'sep': 'September', '9': 'September',
            'oktober': 'Oktober', 'october': 'Oktober', 'okt': 'Oktober', 'oct': 'Oktober', '10': 'Oktober',
            'november': 'November', 'nov': 'November', '11': 'November',
            'desember': 'Desember', 'december': 'Desember', 'des': 'Desember', 'dec': 'Desember', '12': 'Desember'
          }
          
          const fraMaanedsnr = (n: number) => monthNames[String(n)] || ''

          // Excel-celler kan komme som ekte Date-objekt. Uten dette havnet hele datostrengen
          // («Sun Nov 01 2026 …») i kontroll_maaned.
          if (val instanceof Date && !isNaN(val.getTime())) return fraMaanedsnr(val.getMonth() + 1)

          // Hvis det er et tall (Excel serial date), konverter til måned
          if (typeof val === 'number') {
            // Excel serial date - konverter til JS Date
            const excelEpoch = new Date(1899, 11, 30)
            const date = new Date(excelEpoch.getTime() + val * 24 * 60 * 60 * 1000)
            const monthNum = date.getMonth() + 1
            return monthNames[String(monthNum)] || ''
          }
          
          const str = String(val).toLowerCase().trim()
          if (monthNames[str]) return monthNames[str]

          // Tekst som er en dato (fra regneark eller kopiert inn) – ta måneden ut av den
          const dato = new Date(String(val))
          if (!isNaN(dato.getTime())) return fraMaanedsnr(dato.getMonth() + 1)

          return toStr(val)
        }
        
        // Hjelpefunksjon for å sjekke Ja/Nei/X
        const toBool = (val: any) => {
          if (val == null) return false
          const str = String(val).toLowerCase().trim()
          return str === 'ja' || str === 'x' || str === 'yes' || str === '1' || str === 'true'
        }
        
        // Hjelpefunksjon for å parse pris
        const toPrice = (val: any): number | undefined => {
          if (val == null || val === '') return undefined
          const num = parseFloat(String(val).replace(/[^\d.,]/g, '').replace(',', '.'))
          return isNaN(num) ? undefined : num
        }

        const rows: ImportRow[] = jsonData.map(row => ({
          anleggsnavn: toStr(row['Anleggsnavn'] || row['anleggsnavn']),
          adresse: toStr(row['Adresse'] || row['adresse']),
          postnummer: toStr(row['Postnummer'] || row['postnummer']),
          poststed: toStr(row['Poststed'] || row['poststed']),
          kundenavn: toStr(row['Kundenavn'] || row['kundenavn'] || row['Kunde'] || row['kunde']),
          kontroll_maaned: toMonth(row['Kontrollmåned'] || row['kontroll_maaned'] || row['Måned']),
          // Kontrolltyper
          brannalarm: toBool(row['Brannalarm'] || row['brannalarm']),
          nodlys: toBool(row['Nødlys'] || row['nodlys'] || row['Nødlys']),
          slukkeutstyr: toBool(row['Slukkeutstyr'] || row['slukkeutstyr']),
          roykluker: toBool(row['Røykluker'] || row['roykluker'] || row['Røykluker']),
          forstehjelp: toBool(row['Førstehjelp'] || row['forstehjelp'] || row['Førstehjelp']),
          ekstern: toBool(row['Ekstern'] || row['ekstern']),
          // Priser
          pris_brannalarm: toPrice(row['Pris Brannalarm'] || row['pris_brannalarm']),
          pris_nodlys: toPrice(row['Pris Nødlys'] || row['pris_nodlys']),
          pris_slukkeutstyr: toPrice(row['Pris Slukkeutstyr'] || row['pris_slukkeutstyr']),
          pris_roykluker: toPrice(row['Pris Røykluker'] || row['pris_roykluker']),
          pris_forstehjelp: toPrice(row['Pris Førstehjelp'] || row['pris_forstehjelp']),
          pris_ekstern: toPrice(row['Pris Ekstern'] || row['pris_ekstern'])
        })).filter(row => row.anleggsnavn !== '')

        setImportData(rows)
        setResults(rows.map((row, idx) => ({
          row: idx + 1,
          anleggsnavn: row.anleggsnavn,
          status: 'pending' as const
        })))
        setStep('preview')
      } catch (error) {
        console.error('Feil ved lesing av fil:', error)
        alert('Kunne ikke lese filen. Sjekk at det er en gyldig Excel-fil.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  // Finn kunde basert på navn
  const findKunde = (kundenavn: string): Kunde | undefined => {
    const normalizedSearch = kundenavn.toLowerCase().trim()
    return kunder.find(k => 
      k.navn.toLowerCase().includes(normalizedSearch) ||
      normalizedSearch.includes(k.navn.toLowerCase())
    )
  }

  // Importer alle anlegg via Edge Function (kjører på server)
  const startImport = async () => {
    setImporting(true)
    setStep('importing')

    try {
      // Kall Edge Function for å kjøre import på server
      const { data, error } = await supabase.functions.invoke('import-anlegg', {
        body: {
          rows: importData,
          kunder: kunder
        }
      })

      if (error) {
        throw error
      }

      if (data.error) {
        throw new Error(data.error)
      }

      // Sett resultater fra server
      setResults(data.results || [])
      
      // Opprett Dropbox-mapper i bakgrunnen for vellykkede importer
      const successfulImports = (data.results || []).filter((r: ImportResult) => r.status === 'success')
      
      for (const result of successfulImports) {
        const row = importData.find(r => r.anleggsnavn === result.anleggsnavn)
        if (!row) continue
        
        const kunde = findKunde(row.kundenavn)
        if (!kunde?.kunde_nummer) continue
        
        try {
          const anleggBasePath = buildAnleggDropboxPath(
            kunde.kunde_nummer,
            kunde.navn,
            row.anleggsnavn
          )
          
          // Opprett hovedmappe
          await createDropboxFolder(anleggBasePath)
          
          // Opprett undermapper
          for (const folder of ANLEGG_FOLDERS) {
            await createDropboxFolder(`${anleggBasePath}/${folder}`)
          }
        } catch (dropboxError) {
          console.warn('Kunne ikke opprette Dropbox-mapper:', dropboxError)
        }
      }

    } catch (error: any) {
      console.error('Import feilet:', error)
      setResults([{
        row: 0,
        anleggsnavn: 'Import',
        status: 'error',
        message: error.message || 'Import feilet - prøv igjen'
      }])
    }

    setImporting(false)
    setStep('done')
  }

  const successCount = results.filter(r => r.status === 'success').length
  const errorCount = results.filter(r => r.status === 'error').length

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-200 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Importer anlegg fra Excel
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <FileSpreadsheet className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Last opp Excel-fil med anlegg
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Last ned malen, fyll inn anleggene dine, og last opp filen her
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button
                    onClick={downloadTemplate}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Last ned mal
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.numbers,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    Last opp fil
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
                  Slik fungerer det:
                </h4>
                <ol className="list-decimal list-inside text-sm text-blue-800 dark:text-blue-400 space-y-1">
                  <li>Last ned Excel-malen (eller bruk Numbers/CSV)</li>
                  <li>Fyll inn anleggsnavn, adresse og kundenavn</li>
                  <li>Kundenavn må matche en eksisterende kunde i systemet</li>
                  <li>Org.nr og kundenummer hentes automatisk fra kunden</li>
                  <li>Kontrollmåned: Skriv månedsnavn (Januar, Februar, osv.)</li>
                  <li>Last opp filen og importer</li>
                </ol>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Forhåndsvisning ({importData.length} anlegg)
                </h3>
                <button
                  onClick={() => {
                    setStep('upload')
                    setImportData([])
                    setResults([])
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Last opp ny fil
                </button>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-dark-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400">#</th>
                        <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400">Anleggsnavn</th>
                        <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400">Adresse</th>
                        <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400">Kunde</th>
                        <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {importData.map((row, idx) => {
                        const kunde = findKunde(row.kundenavn)
                        return (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-dark-100">
                            <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                            <td className="px-3 py-2 text-gray-900 dark:text-white">{row.anleggsnavn}</td>
                            <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                              {row.adresse && `${row.adresse}, ${row.postnummer} ${row.poststed}`}
                            </td>
                            <td className="px-3 py-2">
                              {kunde ? (
                                <span className="text-green-600 dark:text-green-400">{kunde.navn}</span>
                              ) : (
                                <span className="text-red-500">{row.kundenavn} (ikke funnet)</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {kunde ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-red-500" />
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {importData.some(row => !findKunde(row.kundenavn)) && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-400">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    Noen kunder ble ikke funnet. Disse anleggene vil bli hoppet over.
                  </p>
                </div>
              )}
            </div>
          )}

          {(step === 'importing' || step === 'done') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {step === 'importing' ? 'Importerer...' : 'Import fullført'}
                </h3>
                {step === 'done' && (
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-green-600 dark:text-green-400">
                      <CheckCircle className="w-4 h-4 inline mr-1" />
                      {successCount} vellykket
                    </span>
                    {errorCount > 0 && (
                      <span className="text-red-500">
                        <AlertCircle className="w-4 h-4 inline mr-1" />
                        {errorCount} feilet
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-dark-100 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400">#</th>
                      <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400">Anleggsnavn</th>
                      <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400">Status</th>
                      <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400">Melding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {results.map((result, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-dark-100">
                        <td className="px-3 py-2 text-gray-500">{result.row}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-white">{result.anleggsnavn}</td>
                        <td className="px-3 py-2">
                          {result.status === 'pending' && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
                          {result.status === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                          {result.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                        </td>
                        <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{result.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          {step === 'preview' && (
            <>
              <button
                onClick={onClose}
                className="btn-secondary"
              >
                Avbryt
              </button>
              <button
                onClick={startImport}
                disabled={importing || importData.length === 0}
                className="btn-primary flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Importer {importData.filter(row => findKunde(row.kundenavn)).length} anlegg
              </button>
            </>
          )}

          {step === 'done' && (
            <button
              onClick={() => {
                onImportComplete()
                onClose()
              }}
              className="btn-primary"
            >
              Ferdig
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
