/**
 * Kontrollrapport for røykventilasjon: henter dataene, lager PDF-en, viser den, og lagrer
 * til Storage og Dropbox. Etterpå spør vi om tjenesten skal settes som fullført på anlegget.
 */
import { useEffect, useState } from 'react'
import { ArrowLeft, Download, FileText, Loader2, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/Button'
import { TjenesteFullfortDialog } from '@/components/TjenesteFullfortDialog'
import { checkDropboxStatus, uploadKontrollrapportToDropbox } from '@/services/dropboxServiceV2'
import { useCurrentAnsatt } from '@/hooks/useCurrentAnsatt'
import { PdfForhandsvisning } from '@/components/PdfForhandsvisning'
import { lagRoyklukeRapport } from './rapport'
import type { Luke, Sentral } from './typer'

export function RapportView({ anleggId, kundeNavn, anleggNavn, onTilbake }: {
  anleggId: string
  kundeNavn: string
  anleggNavn: string
  onTilbake: () => void
}) {
  const { ansatt } = useCurrentAnsatt()
  const [pdf, setPdf] = useState<{ blob: Blob; fileName: string; url: string } | null>(null)
  const [lager, setLager] = useState(true)
  const [lagrer, setLagrer] = useState(false)
  const [visFullfort, setVisFullfort] = useState(false)
  const [feil, setFeil] = useState<string | null>(null)

  useEffect(() => {
    lagRapport()
    return () => { if (pdf?.url) URL.revokeObjectURL(pdf.url) }
  }, [anleggId, ansatt?.navn]) // eslint-disable-line react-hooks/exhaustive-deps

  async function lagRapport() {
    setLager(true)
    setFeil(null)
    try {
      const { data: anlegg, error } = await supabase.from('anlegg')
        .select('anleggsnavn, adresse, postnummer, poststed, kundenr, customer:kundenr(navn, kunde_nummer)')
        .eq('id', anleggId).single()
      if (error) throw error

      const { data: sentraler } = await supabase.from('roykluke_sentraler').select('*').eq('anlegg_id', anleggId).order('sentral_nr', { nullsFirst: false })
      const liste = (sentraler ?? []) as Sentral[]
      const { data: luker } = liste.length
        ? await supabase.from('roykluke_luker').select('*').in('sentral_id', liste.map(s => s.id))
        : { data: [] }
      const { data: kommentarer } = await supabase.from('kommentar_roykluker').select('kommentar').eq('anlegg_id', anleggId).order('created_at', { ascending: false })
      const { data: kontakt } = await supabase.from('anlegg_kontaktpersoner')
        .select('primar, kontaktpersoner!inner(navn, telefon, epost)')
        .eq('anlegg_id', anleggId).order('primar', { ascending: false }).limit(1).maybeSingle()
      const k = (kontakt as { kontaktpersoner?: { navn: string | null; telefon: string | null; epost: string | null } } | null)?.kontaktpersoner

      const kunde = (anlegg as unknown as { customer: { navn: string | null; kunde_nummer: string | null } | null }).customer
      const res = await lagRoyklukeRapport({
        kundeNavn: kunde?.navn ?? kundeNavn,
        kundeNummer: kunde?.kunde_nummer ?? null,
        anleggNavn: anlegg.anleggsnavn ?? anleggNavn,
        adresse: anlegg.adresse,
        postnummer: anlegg.postnummer,
        poststed: anlegg.poststed,
        kontaktNavn: k?.navn ?? null,
        kontaktTelefon: k?.telefon ?? null,
        kontaktEpost: k?.epost ?? null,
        tekniker: ansatt?.navn ?? null,
        teknikerTelefon: ansatt?.telefon ?? null,
        teknikerEpost: ansatt?.epost ?? null,
        kontrolldato: new Date(),
        sentraler: liste,
        luker: (luker ?? []) as Luke[],
        kommentarer: (kommentarer ?? []).map(x => x.kommentar).filter((x): x is string => Boolean(x?.trim())),
      })
      setPdf({ ...res, url: URL.createObjectURL(res.blob) })
    } catch (e) {
      console.error('Kunne ikke lage rapport:', e)
      setFeil(e instanceof Error ? e.message : 'Ukjent feil')
      toast.error('Kunne ikke lage rapporten', e)
    } finally {
      setLager(false)
    }
  }

  async function lagre() {
    if (!pdf) return
    setLagrer(true)
    try {
      const storagePath = `anlegg/${anleggId}/dokumenter/${pdf.fileName}`
      const { error } = await supabase.storage.from('anlegg.dokumenter').upload(storagePath, pdf.blob, { contentType: 'application/pdf', upsert: true })
      if (error) throw error
      const { data: url } = await supabase.storage.from('anlegg.dokumenter').createSignedUrl(storagePath, 60 * 60 * 24 * 365)
      await supabase.from('dokumenter').insert({
        anlegg_id: anleggId, filnavn: pdf.fileName, url: url?.signedUrl ?? null,
        type: 'Røykluker Rapport', opplastet_dato: new Date().toISOString(), storage_path: storagePath,
      })
      toast.success('Rapporten er lagret på anlegget')

      // Dropbox – statusen sjekkes her, ikke bare ved oppstart
      if ((await checkDropboxStatus()).connected) {
        const { data: a } = await supabase.from('anlegg').select('anleggsnavn, customer:kundenr(navn, kunde_nummer)').eq('id', anleggId).single()
        const kunde = (a as unknown as { customer: { navn: string | null; kunde_nummer: string | null } | null } | null)?.customer
        if (kunde?.kunde_nummer && kunde.navn && a?.anleggsnavn) {
          const res = await uploadKontrollrapportToDropbox(kunde.kunde_nummer, kunde.navn, a.anleggsnavn, pdf.fileName, pdf.blob)
          if (res.success) toast.success('Rapporten er lagret i Dropbox')
          else toast.warning('Rapporten er lagret, men ikke i Dropbox', res.error)
        } else {
          toast.warning('Rapporten er lagret, men ikke i Dropbox', 'Kunden mangler kundenummer eller navn')
        }
      }
      setVisFullfort(true)
    } catch (e) {
      console.error('Kunne ikke lagre rapporten:', e)
      toast.error('Kunne ikke lagre rapporten', e)
    } finally {
      setLagrer(false)
    }
  }

  async function settFullfort() {
    const { error } = await supabase.from('anlegg').update({ roykluker_fullfort: true, sist_oppdatert: new Date().toISOString() }).eq('id', anleggId)
    if (error) toast.error('Kunne ikke sette tjenesten som fullført', error)
    else toast.success('Røykluker er satt som fullført på anlegget')
    setVisFullfort(false)
    onTilbake()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <button type="button" onClick={onTilbake} className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white min-h-[44px] sm:min-h-0">
          <ArrowLeft className="w-4 h-4" />Alle sentraler
        </button>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white inline-flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-primary" />Kontrollrapport
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{kundeNavn} · {anleggNavn}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button icon={<Download />} disabled={!pdf} onClick={() => { if (pdf) { const a = document.createElement('a'); a.href = pdf.url; a.download = pdf.fileName; a.click() } }}>Last ned</Button>
          <Button variant="primary" icon={<Save />} loading={lagrer} disabled={!pdf} onClick={lagre}>Lagre på anlegget</Button>
        </div>
      </header>

      {lager && <div className="card py-12 text-center text-sm text-gray-500 inline-flex items-center justify-center gap-2 w-full"><Loader2 className="w-4 h-4 animate-spin" />Lager rapporten…</div>}
      {feil && <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-400">{feil}</div>}
      {pdf && (
        <div className="card !p-3 overflow-y-auto max-h-[75vh] bg-gray-200 dark:bg-dark-100">
          <PdfForhandsvisning blob={pdf.blob} />
        </div>
      )}

      <TjenesteFullfortDialog tjeneste="Røykluker" isOpen={visFullfort} onConfirm={settFullfort} onCancel={() => { setVisFullfort(false); onTilbake() }} />
    </div>
  )
}
