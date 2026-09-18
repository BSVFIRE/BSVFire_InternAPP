import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Plus, Trash2, Edit2, Save, 
  CheckCircle2, Clock, PlayCircle, PauseCircle,
  Calendar, User, Loader2, Building2, Phone, Mail,
  Upload, FileText, X
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { GanttChart } from './GanttChart'

interface Milepel {
  id: string
  prosjekt_id: string
  tittel: string
  beskrivelse: string | null
  ansvarlig_id: string | null
  er_ekstern: boolean
  ekstern_firma: string | null
  ekstern_kontakt: string | null
  ekstern_telefon: string | null
  ekstern_epost: string | null
  planlagt_dato: string | null
  estimert_ferdig: string | null
  utfort_dato: string | null
  status: 'planlagt' | 'pagaende' | 'utfort' | 'utsatt'
  rekkefølge: number
  created_at: string
  ansvarlig?: { id: string; navn: string } | null
}

interface MilepelDokument {
  id: string
  milepel_id: string
  filnavn: string
  fil_url: string
  fil_type: string | null
  created_at: string
}

interface MilepelOppgave {
  id: string
  milepel_id: string
  tittel: string
  fullfort: boolean
  fullfort_dato: string | null
  rekkefølge: number
}

interface TeamMedlem {
  id: string
  navn: string
}

interface ProsjektFramdriftProps {
  prosjektId: string
  teamMedlemmer: TeamMedlem[]
  onUpdate?: () => void
}

const STATUS_CONFIG = {
  planlagt: { label: 'Planlagt', color: 'bg-gray-500/20 text-gray-400', icon: Clock },
  pagaende: { label: 'Pågående', color: 'bg-blue-500/20 text-blue-400', icon: PlayCircle },
  utfort: { label: 'Utført', color: 'bg-green-500/20 text-green-400', icon: CheckCircle2 },
  utsatt: { label: 'Utsatt', color: 'bg-yellow-500/20 text-yellow-400', icon: PauseCircle },
}

export function ProsjektFramdrift({ prosjektId, teamMedlemmer, onUpdate }: ProsjektFramdriftProps) {
  const [milepeler, setMilepeler] = useState<Milepel[]>([])
  const [dokumenter, setDokumenter] = useState<Record<string, MilepelDokument[]>>({})
  const [oppgaver, setOppgaver] = useState<Record<string, MilepelOppgave[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newOppgave, setNewOppgave] = useState<Record<string, string>>({})
  
  const [formData, setFormData] = useState({
    tittel: '',
    beskrivelse: '',
    ansvarlig_id: '',
    er_ekstern: false,
    ekstern_firma: '',
    ekstern_kontakt: '',
    ekstern_telefon: '',
    ekstern_epost: '',
    planlagt_dato: '',
    estimert_ferdig: '',
    status: 'planlagt' as 'planlagt' | 'pagaende' | 'utfort' | 'utsatt'
  })

  useEffect(() => {
    loadMilepeler()
  }, [prosjektId])

  async function loadMilepeler() {
    try {
      const { data, error } = await supabase
        .from('prosjekt_milepeler')
        .select(`
          *,
          ansvarlig:ansatte(id, navn)
        `)
        .eq('prosjekt_id', prosjektId)
        .order('rekkefølge')
        .order('planlagt_dato')

      if (error) throw error
      setMilepeler(data || [])
      
      // Last dokumenter for alle milepæler
      if (data && data.length > 0) {
        const { data: docs } = await supabase
          .from('prosjekt_milepel_dokumenter')
          .select('*')
          .in('milepel_id', data.map(m => m.id))
          .order('created_at', { ascending: false })
        
        if (docs) {
          const grouped = docs.reduce((acc, doc) => {
            if (!acc[doc.milepel_id]) acc[doc.milepel_id] = []
            acc[doc.milepel_id].push(doc)
            return acc
          }, {} as Record<string, MilepelDokument[]>)
          setDokumenter(grouped)
        }
        
        // Last oppgaver
        const { data: tasks } = await supabase
          .from('prosjekt_milepel_oppgaver')
          .select('*')
          .in('milepel_id', data.map(m => m.id))
          .order('rekkefølge')
        
        if (tasks) {
          const groupedTasks = tasks.reduce((acc, task) => {
            if (!acc[task.milepel_id]) acc[task.milepel_id] = []
            acc[task.milepel_id].push(task)
            return acc
          }, {} as Record<string, MilepelOppgave[]>)
          setOppgaver(groupedTasks)
        }
      }
    } catch (error) {
      console.error('Feil ved lasting av milepæler:', error)
    } finally {
      setLoading(false)
    }
  }

  // Legg til oppgave
  async function addOppgave(milepelId: string) {
    const tittel = newOppgave[milepelId]?.trim()
    if (!tittel) return
    
    try {
      const currentOppgaver = oppgaver[milepelId] || []
      const maxRekkefølge = currentOppgaver.length > 0 
        ? Math.max(...currentOppgaver.map(o => o.rekkefølge)) + 1 
        : 0
      
      const { error } = await supabase
        .from('prosjekt_milepel_oppgaver')
        .insert({
          milepel_id: milepelId,
          tittel,
          rekkefølge: maxRekkefølge
        })
      
      if (error) throw error
      
      setNewOppgave(prev => ({ ...prev, [milepelId]: '' }))
      loadMilepeler()
    } catch (error) {
      console.error('Feil ved opprettelse av oppgave:', error)
    }
  }

  // Toggle oppgave fullført
  async function toggleOppgave(oppgaveId: string, fullfort: boolean) {
    try {
      const { error } = await supabase
        .from('prosjekt_milepel_oppgaver')
        .update({
          fullfort: !fullfort,
          fullfort_dato: !fullfort ? new Date().toISOString() : null
        })
        .eq('id', oppgaveId)
      
      if (error) throw error
      loadMilepeler()
    } catch (error) {
      console.error('Feil ved oppdatering av oppgave:', error)
    }
  }

  // Slett oppgave
  async function deleteOppgave(oppgaveId: string) {
    try {
      const { error } = await supabase
        .from('prosjekt_milepel_oppgaver')
        .delete()
        .eq('id', oppgaveId)
      
      if (error) throw error
      loadMilepeler()
    } catch (error) {
      console.error('Feil ved sletting av oppgave:', error)
    }
  }

  // Last opp fil til milepæl
  async function uploadFile(milepelId: string, file: File) {
    setUploading(milepelId)
    try {
      // Last opp til Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${prosjektId}/${milepelId}/${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('prosjekt-dokumenter')
        .upload(fileName, file)
      
      if (uploadError) throw uploadError
      
      // Hent public URL
      const { data: urlData } = supabase.storage
        .from('prosjekt-dokumenter')
        .getPublicUrl(fileName)
      
      // Lagre i database
      const { error: dbError } = await supabase
        .from('prosjekt_milepel_dokumenter')
        .insert({
          milepel_id: milepelId,
          filnavn: file.name,
          fil_url: urlData.publicUrl,
          fil_type: file.type,
          fil_storrelse: file.size
        })
      
      if (dbError) throw dbError
      
      loadMilepeler()
    } catch (error) {
      console.error('Feil ved opplasting:', error)
      alert('Kunne ikke laste opp fil')
    } finally {
      setUploading(null)
    }
  }

  // Slett dokument
  async function deleteDocument(docId: string, filUrl: string) {
    if (!confirm('Er du sikker på at du vil slette dette dokumentet?')) return
    
    try {
      // Slett fra database
      const { error } = await supabase
        .from('prosjekt_milepel_dokumenter')
        .delete()
        .eq('id', docId)
      
      if (error) throw error
      
      // Prøv å slette fra storage (ignorer feil)
      const path = filUrl.split('/prosjekt-dokumenter/')[1]
      if (path) {
        await supabase.storage.from('prosjekt-dokumenter').remove([path])
      }
      
      loadMilepeler()
    } catch (error) {
      console.error('Feil ved sletting:', error)
    }
  }

  async function addMilepel() {
    if (!formData.tittel.trim()) return
    
    setSaving(true)
    try {
      const maxRekkefølge = milepeler.length > 0 
        ? Math.max(...milepeler.map(m => m.rekkefølge)) + 1 
        : 0

      const { error } = await supabase
        .from('prosjekt_milepeler')
        .insert({
          prosjekt_id: prosjektId,
          tittel: formData.tittel,
          beskrivelse: formData.beskrivelse || null,
          ansvarlig_id: formData.er_ekstern ? null : (formData.ansvarlig_id || null),
          er_ekstern: formData.er_ekstern,
          ekstern_firma: formData.er_ekstern ? formData.ekstern_firma || null : null,
          ekstern_kontakt: formData.er_ekstern ? formData.ekstern_kontakt || null : null,
          ekstern_telefon: formData.er_ekstern ? formData.ekstern_telefon || null : null,
          ekstern_epost: formData.er_ekstern ? formData.ekstern_epost || null : null,
          planlagt_dato: formData.planlagt_dato || null,
          estimert_ferdig: formData.estimert_ferdig || null,
          status: formData.status,
          rekkefølge: maxRekkefølge
        })

      if (error) throw error
      
      resetForm()
      setShowAddForm(false)
      loadMilepeler()
      onUpdate?.()
    } catch (error) {
      console.error('Feil ved opprettelse av milepæl:', error)
    } finally {
      setSaving(false)
    }
  }

  async function updateMilepel(id: string) {
    setSaving(true)
    try {
      const updateData: any = {
        tittel: formData.tittel,
        beskrivelse: formData.beskrivelse || null,
        ansvarlig_id: formData.er_ekstern ? null : (formData.ansvarlig_id || null),
        er_ekstern: formData.er_ekstern,
        ekstern_firma: formData.er_ekstern ? formData.ekstern_firma || null : null,
        ekstern_kontakt: formData.er_ekstern ? formData.ekstern_kontakt || null : null,
        ekstern_telefon: formData.er_ekstern ? formData.ekstern_telefon || null : null,
        ekstern_epost: formData.er_ekstern ? formData.ekstern_epost || null : null,
        planlagt_dato: formData.planlagt_dato || null,
        estimert_ferdig: formData.estimert_ferdig || null,
        status: formData.status
      }

      // Sett utført dato hvis status endres til utført
      if (formData.status === 'utfort') {
        updateData.utfort_dato = new Date().toISOString().split('T')[0]
      }

      const { error } = await supabase
        .from('prosjekt_milepeler')
        .update(updateData)
        .eq('id', id)

      if (error) throw error
      
      setEditingId(null)
      resetForm()
      loadMilepeler()
      onUpdate?.()
    } catch (error) {
      console.error('Feil ved oppdatering av milepæl:', error)
    } finally {
      setSaving(false)
    }
  }

  async function deleteMilepel(id: string) {
    if (!confirm('Er du sikker på at du vil slette denne milepælen?')) return
    
    try {
      const { error } = await supabase
        .from('prosjekt_milepeler')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadMilepeler()
      onUpdate?.()
    } catch (error) {
      console.error('Feil ved sletting av milepæl:', error)
    }
  }

  async function quickUpdateStatus(id: string, newStatus: 'planlagt' | 'pagaende' | 'utfort' | 'utsatt') {
    try {
      const updateData: any = { status: newStatus }
      if (newStatus === 'utfort') {
        updateData.utfort_dato = new Date().toISOString().split('T')[0]
      }

      const { error } = await supabase
        .from('prosjekt_milepeler')
        .update(updateData)
        .eq('id', id)

      if (error) throw error
      loadMilepeler()
      onUpdate?.()
    } catch (error) {
      console.error('Feil ved oppdatering av status:', error)
    }
  }

  function startEdit(milepel: Milepel) {
    setFormData({
      tittel: milepel.tittel,
      beskrivelse: milepel.beskrivelse || '',
      ansvarlig_id: milepel.ansvarlig_id || '',
      er_ekstern: milepel.er_ekstern || false,
      ekstern_firma: milepel.ekstern_firma || '',
      ekstern_kontakt: milepel.ekstern_kontakt || '',
      ekstern_telefon: milepel.ekstern_telefon || '',
      ekstern_epost: milepel.ekstern_epost || '',
      planlagt_dato: milepel.planlagt_dato || '',
      estimert_ferdig: milepel.estimert_ferdig || '',
      status: milepel.status
    })
    setEditingId(milepel.id)
    setShowAddForm(false)
  }

  function resetForm() {
    setFormData({
      tittel: '',
      beskrivelse: '',
      ansvarlig_id: '',
      er_ekstern: false,
      ekstern_firma: '',
      ekstern_kontakt: '',
      ekstern_telefon: '',
      ekstern_epost: '',
      planlagt_dato: '',
      estimert_ferdig: '',
      status: 'planlagt'
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setShowAddForm(false)
    resetForm()
  }

  // Beregn fremdrift
  const totalMilepeler = milepeler.length
  const utforteMilepeler = milepeler.filter(m => m.status === 'utfort').length
  const fremdriftProsent = totalMilepeler > 0 ? Math.round((utforteMilepeler / totalMilepeler) * 100) : 0

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          Framdriftsplan
        </h3>
        
        {!showAddForm && !editingId && (
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary text-sm flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Legg til
          </button>
        )}
      </div>

      {/* Fremdriftsindikator */}
      {totalMilepeler > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-400">Fremdrift</span>
            <span className="text-white font-medium">{utforteMilepeler} av {totalMilepeler} ({fremdriftProsent}%)</span>
          </div>
          <div className="h-2 bg-dark-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${fremdriftProsent}%` }}
            />
          </div>
        </div>
      )}

      {/* Gantt-diagram */}
      {milepeler.length > 0 && milepeler.some(m => m.planlagt_dato) && (
        <div className="mb-4">
          <GanttChart milepeler={milepeler} />
        </div>
      )}

      {/* Legg til ny milepæl */}
      {showAddForm && (
        <div className="bg-dark-100 rounded-lg p-4 mb-4 border border-primary/30">
          <h4 className="text-white font-medium mb-3">Ny milepæl</h4>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Tittel (f.eks. Utstyr bestilt)"
              value={formData.tittel}
              onChange={(e) => setFormData(prev => ({ ...prev, tittel: e.target.value }))}
              className="input w-full"
              autoFocus
            />
            <textarea
              placeholder="Beskrivelse (valgfritt)"
              value={formData.beskrivelse}
              onChange={(e) => setFormData(prev => ({ ...prev, beskrivelse: e.target.value }))}
              className="input w-full min-h-[60px] resize-y"
            />
            {/* Intern/Ekstern toggle */}
            <div className="flex items-center gap-4 p-3 bg-dark-200 rounded-lg">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="ansvarlig_type"
                  checked={!formData.er_ekstern}
                  onChange={() => setFormData(prev => ({ ...prev, er_ekstern: false }))}
                  className="text-primary"
                />
                <span className="text-sm text-gray-300">Intern ansvarlig</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="ansvarlig_type"
                  checked={formData.er_ekstern}
                  onChange={() => setFormData(prev => ({ ...prev, er_ekstern: true }))}
                  className="text-primary"
                />
                <span className="text-sm text-gray-300 flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  Ekstern leverandør
                </span>
              </label>
            </div>

            {/* Intern ansvarlig */}
            {!formData.er_ekstern && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Ansvarlig</label>
                  <select
                    value={formData.ansvarlig_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, ansvarlig_id: e.target.value }))}
                    className="input w-full"
                  >
                    <option value="">Velg ansvarlig...</option>
                    {teamMedlemmer.map(medlem => (
                      <option key={medlem.id} value={medlem.id}>{medlem.navn}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Planlagt start</label>
                  <input
                    type="date"
                    value={formData.planlagt_dato}
                    onChange={(e) => setFormData(prev => ({ ...prev, planlagt_dato: e.target.value }))}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Estimert ferdig</label>
                  <input
                    type="date"
                    value={formData.estimert_ferdig}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimert_ferdig: e.target.value }))}
                    className="input w-full"
                  />
                </div>
              </div>
            )}

            {/* Ekstern leverandør */}
            {formData.er_ekstern && (
              <div className="space-y-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      Firma
                    </label>
                    <input
                      type="text"
                      placeholder="Firmanavn"
                      value={formData.ekstern_firma}
                      onChange={(e) => setFormData(prev => ({ ...prev, ekstern_firma: e.target.value }))}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Kontaktperson
                    </label>
                    <input
                      type="text"
                      placeholder="Navn"
                      value={formData.ekstern_kontakt}
                      onChange={(e) => setFormData(prev => ({ ...prev, ekstern_kontakt: e.target.value }))}
                      className="input w-full"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      Telefon
                    </label>
                    <input
                      type="tel"
                      placeholder="Telefonnummer"
                      value={formData.ekstern_telefon}
                      onChange={(e) => setFormData(prev => ({ ...prev, ekstern_telefon: e.target.value }))}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      E-post
                    </label>
                    <input
                      type="email"
                      placeholder="E-postadresse"
                      value={formData.ekstern_epost}
                      onChange={(e) => setFormData(prev => ({ ...prev, ekstern_epost: e.target.value }))}
                      className="input w-full"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Planlagt start</label>
                    <input
                      type="date"
                      value={formData.planlagt_dato}
                      onChange={(e) => setFormData(prev => ({ ...prev, planlagt_dato: e.target.value }))}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Estimert ferdig</label>
                    <input
                      type="date"
                      value={formData.estimert_ferdig}
                      onChange={(e) => setFormData(prev => ({ ...prev, estimert_ferdig: e.target.value }))}
                      className="input w-full"
                    />
                  </div>
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <div className="flex gap-2">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, status: key as any }))}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      formData.status === key
                        ? config.color + ' ring-2 ring-offset-2 ring-offset-dark-200'
                        : 'bg-dark-200 text-gray-400 hover:bg-dark-100'
                    }`}
                  >
                    {config.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={cancelEdit} className="btn-secondary text-sm">
                Avbryt
              </button>
              <button
                onClick={addMilepel}
                disabled={!formData.tittel.trim() || saving}
                className="btn-primary text-sm flex items-center gap-1"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Lagre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste over milepæler */}
      {milepeler.length === 0 && !showAddForm ? (
        <div className="text-center py-8 text-gray-500">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Ingen milepæler lagt til ennå</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="text-primary hover:underline mt-2 text-sm"
          >
            Legg til første milepæl
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {milepeler.map((milepel) => {
            const statusConfig = STATUS_CONFIG[milepel.status]
            const StatusIcon = statusConfig.icon
            const isEditing = editingId === milepel.id

            if (isEditing) {
              return (
                <div key={milepel.id} className="bg-dark-100 rounded-lg p-4 border border-primary/30">
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={formData.tittel}
                      onChange={(e) => setFormData(prev => ({ ...prev, tittel: e.target.value }))}
                      className="input w-full"
                    />
                    <textarea
                      placeholder="Beskrivelse"
                      value={formData.beskrivelse}
                      onChange={(e) => setFormData(prev => ({ ...prev, beskrivelse: e.target.value }))}
                      className="input w-full min-h-[60px] resize-y"
                    />
                    
                    {/* Intern/Ekstern toggle */}
                    <div className="flex items-center gap-4 p-3 bg-dark-200 rounded-lg">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="edit_ansvarlig_type"
                          checked={!formData.er_ekstern}
                          onChange={() => setFormData(prev => ({ ...prev, er_ekstern: false }))}
                          className="text-primary"
                        />
                        <span className="text-sm text-gray-300">Intern ansvarlig</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="edit_ansvarlig_type"
                          checked={formData.er_ekstern}
                          onChange={() => setFormData(prev => ({ ...prev, er_ekstern: true }))}
                          className="text-primary"
                        />
                        <span className="text-sm text-gray-300 flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          Ekstern leverandør
                        </span>
                      </label>
                    </div>

                    {/* Intern ansvarlig */}
                    {!formData.er_ekstern && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Ansvarlig</label>
                          <select
                            value={formData.ansvarlig_id}
                            onChange={(e) => setFormData(prev => ({ ...prev, ansvarlig_id: e.target.value }))}
                            className="input w-full"
                          >
                            <option value="">Velg ansvarlig...</option>
                            {teamMedlemmer.map(medlem => (
                              <option key={medlem.id} value={medlem.id}>{medlem.navn}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Planlagt start</label>
                          <input
                            type="date"
                            value={formData.planlagt_dato}
                            onChange={(e) => setFormData(prev => ({ ...prev, planlagt_dato: e.target.value }))}
                            className="input w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Estimert ferdig</label>
                          <input
                            type="date"
                            value={formData.estimert_ferdig}
                            onChange={(e) => setFormData(prev => ({ ...prev, estimert_ferdig: e.target.value }))}
                            className="input w-full"
                          />
                        </div>
                      </div>
                    )}

                    {/* Ekstern leverandør */}
                    {formData.er_ekstern && (
                      <div className="space-y-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              Firma
                            </label>
                            <input
                              type="text"
                              placeholder="Firmanavn"
                              value={formData.ekstern_firma}
                              onChange={(e) => setFormData(prev => ({ ...prev, ekstern_firma: e.target.value }))}
                              className="input w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              Kontaktperson
                            </label>
                            <input
                              type="text"
                              placeholder="Navn"
                              value={formData.ekstern_kontakt}
                              onChange={(e) => setFormData(prev => ({ ...prev, ekstern_kontakt: e.target.value }))}
                              className="input w-full"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              Telefon
                            </label>
                            <input
                              type="tel"
                              placeholder="Telefonnummer"
                              value={formData.ekstern_telefon}
                              onChange={(e) => setFormData(prev => ({ ...prev, ekstern_telefon: e.target.value }))}
                              className="input w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              E-post
                            </label>
                            <input
                              type="email"
                              placeholder="E-postadresse"
                              value={formData.ekstern_epost}
                              onChange={(e) => setFormData(prev => ({ ...prev, ekstern_epost: e.target.value }))}
                              className="input w-full"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Planlagt start</label>
                            <input
                              type="date"
                              value={formData.planlagt_dato}
                              onChange={(e) => setFormData(prev => ({ ...prev, planlagt_dato: e.target.value }))}
                              className="input w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Estimert ferdig</label>
                            <input
                              type="date"
                              value={formData.estimert_ferdig}
                              onChange={(e) => setFormData(prev => ({ ...prev, estimert_ferdig: e.target.value }))}
                              className="input w-full"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Status</label>
                      <div className="flex gap-2 flex-wrap">
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, status: key as any }))}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              formData.status === key
                                ? config.color + ' ring-2 ring-offset-2 ring-offset-dark-100'
                                : 'bg-dark-200 text-gray-400 hover:bg-dark-100'
                            }`}
                          >
                            {config.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button onClick={cancelEdit} className="btn-secondary text-sm">
                        Avbryt
                      </button>
                      <button
                        onClick={() => updateMilepel(milepel.id)}
                        disabled={!formData.tittel.trim() || saving}
                        className="btn-primary text-sm flex items-center gap-1"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Lagre
                      </button>
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <div 
                key={milepel.id} 
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  milepel.status === 'utfort' 
                    ? 'bg-green-500/5 border-green-500/20' 
                    : milepel.status === 'pagaende'
                    ? 'bg-blue-500/5 border-blue-500/20'
                    : 'bg-dark-100 border-gray-700'
                }`}
              >
                {/* Status-knapp */}
                <button
                  onClick={() => {
                    const nextStatus = milepel.status === 'planlagt' ? 'pagaende' 
                      : milepel.status === 'pagaende' ? 'utfort' 
                      : milepel.status === 'utfort' ? 'planlagt'
                      : 'planlagt'
                    quickUpdateStatus(milepel.id, nextStatus)
                  }}
                  className={`mt-0.5 p-1 rounded-full transition-colors ${statusConfig.color} hover:opacity-80`}
                  title={`Klikk for å endre status (nå: ${statusConfig.label})`}
                >
                  <StatusIcon className="w-5 h-5" />
                </button>

                {/* Innhold */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`font-medium ${milepel.status === 'utfort' ? 'text-gray-400 line-through' : 'text-white'}`}>
                        {milepel.tittel}
                      </p>
                      {milepel.beskrivelse && (
                        <p className="text-sm text-gray-500 mt-0.5">{milepel.beskrivelse}</p>
                      )}
                    </div>
                    
                    {/* Handlinger */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(milepel)}
                        className="p-1.5 text-gray-500 hover:text-white hover:bg-dark-200 rounded transition-colors"
                        title="Rediger"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteMilepel(milepel.id)}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-dark-200 rounded transition-colors"
                        title="Slett"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center flex-wrap gap-4 mt-2 text-xs text-gray-500">
                    {/* Intern ansvarlig */}
                    {milepel.ansvarlig && !milepel.er_ekstern && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {milepel.ansvarlig.navn}
                      </span>
                    )}
                    
                    {/* Ekstern leverandør */}
                    {milepel.er_ekstern && milepel.ekstern_firma && (
                      <span className="flex items-center gap-1 text-orange-400">
                        <Building2 className="w-3 h-3" />
                        {milepel.ekstern_firma}
                        {milepel.ekstern_kontakt && ` (${milepel.ekstern_kontakt})`}
                      </span>
                    )}
                    {milepel.er_ekstern && milepel.ekstern_telefon && (
                      <a 
                        href={`tel:${milepel.ekstern_telefon}`}
                        className="flex items-center gap-1 text-orange-400 hover:text-orange-300"
                      >
                        <Phone className="w-3 h-3" />
                        {milepel.ekstern_telefon}
                      </a>
                    )}
                    
                    {milepel.planlagt_dato && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(milepel.planlagt_dato)}
                      </span>
                    )}
                    {milepel.status === 'utfort' && milepel.utfort_dato && (
                      <span className="flex items-center gap-1 text-green-500">
                        <CheckCircle2 className="w-3 h-3" />
                        Utført {formatDate(milepel.utfort_dato)}
                      </span>
                    )}
                  </div>

                  {/* Dokumenter */}
                  <div className="mt-3 pt-3 border-t border-gray-700/50">
                    {/* Eksisterende dokumenter */}
                    {dokumenter[milepel.id] && dokumenter[milepel.id].length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {dokumenter[milepel.id].map(doc => (
                          <div 
                            key={doc.id}
                            className="flex items-center gap-2 bg-dark-200 rounded-lg px-2 py-1 text-xs group"
                          >
                            <FileText className="w-3 h-3 text-primary" />
                            <a 
                              href={doc.fil_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-gray-300 hover:text-white truncate max-w-[150px]"
                              title={doc.filnavn}
                            >
                              {doc.filnavn}
                            </a>
                            <button
                              onClick={() => deleteDocument(doc.id, doc.fil_url)}
                              className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Slett dokument"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Last opp knapp */}
                    <label className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-primary cursor-pointer transition-colors">
                      {uploading === milepel.id ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Laster opp...
                        </>
                      ) : (
                        <>
                          <Upload className="w-3 h-3" />
                          Last opp dokument
                        </>
                      )}
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) uploadFile(milepel.id, file)
                          e.target.value = ''
                        }}
                        disabled={uploading === milepel.id}
                      />
                    </label>
                  </div>

                  {/* Sjekkliste */}
                  <div className="mt-3 pt-3 border-t border-gray-700/50">
                    <p className="text-xs text-gray-500 mb-2">Sjekkliste</p>
                    
                    {/* Eksisterende oppgaver */}
                    {oppgaver[milepel.id] && oppgaver[milepel.id].length > 0 && (
                      <div className="space-y-1 mb-2">
                        {oppgaver[milepel.id].map(oppgave => (
                          <div 
                            key={oppgave.id}
                            className="flex items-center gap-2 group"
                          >
                            <button
                              onClick={() => toggleOppgave(oppgave.id, oppgave.fullfort)}
                              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                oppgave.fullfort 
                                  ? 'bg-green-500 border-green-500' 
                                  : 'border-gray-500 hover:border-primary'
                              }`}
                            >
                              {oppgave.fullfort && <CheckCircle2 className="w-3 h-3 text-white" />}
                            </button>
                            <span className={`text-sm flex-1 ${oppgave.fullfort ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                              {oppgave.tittel}
                            </span>
                            <button
                              onClick={() => deleteOppgave(oppgave.id)}
                              className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Legg til ny oppgave */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Legg til oppgave..."
                        value={newOppgave[milepel.id] || ''}
                        onChange={(e) => setNewOppgave(prev => ({ ...prev, [milepel.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addOppgave(milepel.id)
                          }
                        }}
                        className="flex-1 bg-transparent border-b border-gray-700 text-sm text-gray-300 placeholder-gray-600 focus:border-primary focus:outline-none py-1"
                      />
                      <button
                        onClick={() => addOppgave(milepel.id)}
                        disabled={!newOppgave[milepel.id]?.trim()}
                        className="text-gray-500 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
