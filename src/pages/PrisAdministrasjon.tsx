import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Save, AlertCircle, DollarSign } from 'lucide-react'

interface PriceTier {
  min: number
  max: number | null
  pris: number
}

interface PricingConfig {
  id: string
  tjeneste_type: string
  minstepris: number
  enhetspriser: PriceTier[]
  rapport_pris: number
  sentralenhet_forste: number
  sentralenhet_ekstra: number
  brannslukker_pris?: number
  brannslange_pris?: number
  paslag_prosent?: number
}

export function PrisAdministrasjon() {
  const [configs, setConfigs] = useState<PricingConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const tjenesteLabels: Record<string, string> = {
    brannalarm: 'Brannalarm',
    nodlys: 'Nødlys',
    slukkeutstyr: 'Slukkeuttsyr',
    rokluker: 'Røkluker',
    eksternt: 'Eksternt'
  }

  useEffect(() => {
    loadPricing()
  }, [])

  async function loadPricing() {
    try {
      setError(null)
      const { data, error } = await supabase
        .from('serviceavtale_priser')
        .select('*')
        .order('tjeneste_type')

      if (error) throw error
      setConfigs(data || [])
    } catch (err) {
      console.error('Feil ved lasting av priser:', err)
      setError('Kunne ikke laste priser')
    } finally {
      setLoading(false)
    }
  }

  async function savePricing(config: PricingConfig) {
    setSaving(config.id)
    try {
      const { error } = await supabase
        .from('serviceavtale_priser')
        .update({
          minstepris: config.minstepris,
          enhetspriser: config.enhetspriser,
          rapport_pris: config.rapport_pris,
          sentralenhet_forste: config.sentralenhet_forste,
          sentralenhet_ekstra: config.sentralenhet_ekstra
        })
        .eq('id', config.id)

      if (error) throw error
      await loadPricing()
    } catch (err) {
      console.error('Feil ved lagring:', err)
      alert('Kunne ikke lagre priser')
    } finally {
      setSaving(null)
    }
  }

  function updateConfig(id: string, updates: Partial<PricingConfig>) {
    setConfigs(configs.map(c => c.id === id ? { ...c, ...updates } : c))
  }

  function updateTier(configId: string, tierIndex: number, updates: Partial<PriceTier>) {
    setConfigs(configs.map(c => {
      if (c.id === configId) {
        const newTiers = [...c.enhetspriser]
        newTiers[tierIndex] = { ...newTiers[tierIndex], ...updates }
        return { ...c, enhetspriser: newTiers }
      }
      return c
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Laster priser...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Prisadministrasjon
        </h1>
        <p className="text-gray-400">Administrer priser for serviceavtaler</p>
      </div>

      {error && (
        <div className="card bg-red-500/10 border-red-500/20">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {configs.map((config) => (
          <div key={config.id} className="card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {tjenesteLabels[config.tjeneste_type] || config.tjeneste_type}
                </h2>
              </div>
              <button
                onClick={() => savePricing(config)}
                disabled={saving === config.id}
                className="btn-primary flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving === config.id ? 'Lagrer...' : 'Lagre'}
              </button>
            </div>

            {config.tjeneste_type === 'nodlys' ? (
              // Special layout for Nødlys
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Minstepris (kr)
                  </label>
                  <input
                    type="number"
                    value={config.minstepris}
                    onChange={(e) => updateConfig(config.id, { minstepris: parseFloat(e.target.value) || 0 })}
                    className="input"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Rapport (kr)
                  </label>
                  <input
                    type="number"
                    value={config.rapport_pris}
                    onChange={(e) => updateConfig(config.id, { rapport_pris: parseFloat(e.target.value) || 0 })}
                    className="input"
                    step="0.01"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      <strong>Nødlys bruker:</strong> LL (Ledelys) og ML (Markeringslys) med samme enhetspriser. 
                      Sentralisert anlegg har fast pris på 1500 kr per anlegg.
                    </p>
                  </div>
                </div>
              </div>
            ) : config.tjeneste_type === 'slukkeutstyr' ? (
              // Special layout for Slukkeuttsyr
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Minstepris (kr)
                  </label>
                  <input
                    type="number"
                    value={config.minstepris}
                    onChange={(e) => updateConfig(config.id, { minstepris: parseFloat(e.target.value) || 0 })}
                    className="input"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Rapport (kr)
                  </label>
                  <input
                    type="number"
                    value={config.rapport_pris}
                    onChange={(e) => updateConfig(config.id, { rapport_pris: parseFloat(e.target.value) || 0 })}
                    className="input"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Brannslukker (kr)
                  </label>
                  <input
                    type="number"
                    value={config.brannslukker_pris || 110}
                    onChange={(e) => updateConfig(config.id, { brannslukker_pris: parseFloat(e.target.value) || 0 })}
                    className="input"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Brannslange (kr)
                  </label>
                  <input
                    type="number"
                    value={config.brannslange_pris || 175}
                    onChange={(e) => updateConfig(config.id, { brannslange_pris: parseFloat(e.target.value) || 0 })}
                    className="input"
                    step="0.01"
                  />
                </div>
              </div>
            ) : config.tjeneste_type === 'eksternt' ? (
              // Special layout for Eksternt
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Påslag (%)
                  </label>
                  <input
                    type="number"
                    value={config.paslag_prosent || 10}
                    onChange={(e) => updateConfig(config.id, { paslag_prosent: Math.max(10, parseFloat(e.target.value) || 10) })}
                    className="input"
                    min="10"
                    step="0.1"
                  />
                  <p className="text-xs text-gray-400 mt-1">Minimum 10%</p>
                </div>

                <div className="md:col-span-2">
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      <strong>Eksternt:</strong> Legg inn eksternpris fra leverandør, og systemet legger automatisk til påslaget. 
                      Minimum påslag er 10%.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              // Standard layout for other services
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Minstepris (kr)
                  </label>
                  <input
                    type="number"
                    value={config.minstepris}
                    onChange={(e) => updateConfig(config.id, { minstepris: parseFloat(e.target.value) || 0 })}
                    className="input"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Rapport (kr)
                  </label>
                  <input
                    type="number"
                    value={config.rapport_pris}
                    onChange={(e) => updateConfig(config.id, { rapport_pris: parseFloat(e.target.value) || 0 })}
                    className="input"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Sentralenhet - Første (kr)
                  </label>
                  <input
                    type="number"
                    value={config.sentralenhet_forste}
                    onChange={(e) => updateConfig(config.id, { sentralenhet_forste: parseFloat(e.target.value) || 0 })}
                    className="input"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Sentralenhet - Ekstra (kr)
                  </label>
                  <input
                    type="number"
                    value={config.sentralenhet_ekstra}
                    onChange={(e) => updateConfig(config.id, { sentralenhet_ekstra: parseFloat(e.target.value) || 0 })}
                    className="input"
                    step="0.01"
                  />
                </div>
              </div>
            )}

            {config.enhetspriser && config.enhetspriser.length > 0 && config.tjeneste_type !== 'slukkeutstyr' && config.tjeneste_type !== 'eksternt' && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                  {config.tjeneste_type === 'nodlys' 
                    ? 'Enhetspriser for LL og ML (samme priser for begge)' 
                    : 'Enhetspriser (pris per enhet basert på antall)'}
                </h3>
                <div className="space-y-3">
                  {config.enhetspriser.map((tier, index) => (
                    <div key={index} className="grid grid-cols-3 gap-3 p-3 bg-gray-500/5 rounded-lg">
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Fra (enheter)
                        </label>
                        <input
                          type="number"
                          value={tier.min}
                          onChange={(e) => updateTier(config.id, index, { min: parseInt(e.target.value) || 0 })}
                          className="input text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Til (enheter)
                        </label>
                        <input
                          type="number"
                          value={tier.max || ''}
                          onChange={(e) => updateTier(config.id, index, { max: e.target.value ? parseInt(e.target.value) : null })}
                          className="input text-sm"
                          placeholder="Ubegrenset"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Pris per enhet (kr)
                        </label>
                        <input
                          type="number"
                          value={tier.pris}
                          onChange={(e) => updateTier(config.id, index, { pris: parseFloat(e.target.value) || 0 })}
                          className="input text-sm"
                          step="0.01"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
