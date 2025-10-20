import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Calculator, AlertCircle } from 'lucide-react'

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

interface ServicePricing {
  antall_enheter: number
  antall_sentralenheter: number
  inkluder_rapport: boolean
  // For Nødlys
  antall_ll?: number
  antall_ml?: number
  sentralisert_anlegg?: boolean
  // For Slukkeuttsyr
  antall_brannslukkere?: number
  antall_brannslanger?: number
  // For Eksternt
  eksternpris?: number
  paslag_prosent_override?: number
  // For manuell prissetting
  manuell_pris?: boolean
  manuelt_belop?: number
}

interface PricingSectionProps {
  formData: any
  setFormData: (data: any) => void
}

export function PricingSection({ formData, setFormData }: PricingSectionProps) {
  const [pricingConfigs, setPricingConfigs] = useState<Record<string, PricingConfig>>({})
  const [servicePricing, setServicePricing] = useState<Record<string, ServicePricing>>({
    brannalarm: { antall_enheter: 0, antall_sentralenheter: 0, inkluder_rapport: true },
    nodlys: { antall_enheter: 0, antall_sentralenheter: 0, inkluder_rapport: true, antall_ll: 0, antall_ml: 0, sentralisert_anlegg: false },
    slukkeutstyr: { antall_enheter: 0, antall_sentralenheter: 0, inkluder_rapport: true, antall_brannslukkere: 0, antall_brannslanger: 0 },
    rokluker: { antall_enheter: 0, antall_sentralenheter: 0, inkluder_rapport: true },
    eksternt: { antall_enheter: 0, antall_sentralenheter: 0, inkluder_rapport: true, eksternpris: 0, paslag_prosent_override: undefined }
  })
  const [loading, setLoading] = useState(true)
  const hasLoadedPricing = useRef(false)

  const tjenesteLabels: Record<string, string> = {
    brannalarm: 'Brannalarm',
    nodlys: 'Nødlys',
    slukkeutstyr: 'Slukkeuttsyr',
    rokluker: 'Røkluker',
    eksternt: 'Eksternt'
  }

  useEffect(() => {
    loadPricingConfigs()
  }, [])

  // Load existing pricing data when editing - only once
  useEffect(() => {
    if (!hasLoadedPricing.current && formData.pris_detaljer && Object.keys(formData.pris_detaljer).length > 0) {
      const loadedPricing: Record<string, ServicePricing> = {}
      
      Object.keys(tjenesteLabels).forEach(tjeneste => {
        const detaljer = formData.pris_detaljer[tjeneste]
        if (detaljer) {
          loadedPricing[tjeneste] = {
            antall_enheter: detaljer.antall_enheter || 0,
            antall_sentralenheter: detaljer.antall_sentralenheter || 0,
            inkluder_rapport: detaljer.inkluder_rapport !== false,
            // Nødlys
            antall_ll: detaljer.antall_ll || 0,
            antall_ml: detaljer.antall_ml || 0,
            sentralisert_anlegg: detaljer.sentralisert_anlegg || false,
            // Slukkeuttsyr
            antall_brannslukkere: detaljer.antall_brannslukkere || 0,
            antall_brannslanger: detaljer.antall_brannslanger || 0,
            // Eksternt
            eksternpris: detaljer.eksternpris || 0,
            paslag_prosent_override: detaljer.paslag_prosent_override,
            // Manuell prissetting
            manuell_pris: detaljer.manuell_pris || false,
            manuelt_belop: detaljer.manuelt_belop || 0
          }
        } else {
          // Default values for services without saved data
          loadedPricing[tjeneste] = {
            antall_enheter: 0,
            antall_sentralenheter: 0,
            inkluder_rapport: true,
            antall_ll: 0,
            antall_ml: 0,
            sentralisert_anlegg: false,
            antall_brannslukkere: 0,
            antall_brannslanger: 0,
            eksternpris: 0,
            paslag_prosent_override: undefined
          }
        }
      })
      
      setServicePricing(loadedPricing)
      hasLoadedPricing.current = true
    }
  }, [formData.pris_detaljer])

  useEffect(() => {
    if (Object.keys(pricingConfigs).length > 0) {
      calculateTotalPrice()
    }
  }, [servicePricing, pricingConfigs])

  async function loadPricingConfigs() {
    try {
      const { data, error } = await supabase
        .from('serviceavtale_priser')
        .select('*')

      if (error) throw error

      const configMap: Record<string, PricingConfig> = {}
      data?.forEach(config => {
        configMap[config.tjeneste_type] = config
      })
      setPricingConfigs(configMap)
    } catch (err) {
      console.error('Feil ved lasting av priser:', err)
    } finally {
      setLoading(false)
    }
  }

  function calculateServicePrice(tjeneste: string, pricing: ServicePricing): number {
    // If manual pricing is enabled, return the manual amount
    if (pricing.manuell_pris && pricing.manuelt_belop !== undefined) {
      return pricing.manuelt_belop
    }

    const config = pricingConfigs[tjeneste]
    if (!config) return 0

    let total = 0

    // Special handling for Nødlys
    if (tjeneste === 'nodlys') {
      // Calculate LL (Lokal Lys) price
      if (pricing.antall_ll && pricing.antall_ll > 0 && config.enhetspriser) {
        const tier = config.enhetspriser.find(t => 
          pricing.antall_ll! >= t.min && 
          (t.max === null || pricing.antall_ll! <= t.max)
        )
        if (tier) {
          total += pricing.antall_ll * tier.pris
        }
      }

      // Calculate ML (Midt Lys) price - same tier structure
      if (pricing.antall_ml && pricing.antall_ml > 0 && config.enhetspriser) {
        const tier = config.enhetspriser.find(t => 
          pricing.antall_ml! >= t.min && 
          (t.max === null || pricing.antall_ml! <= t.max)
        )
        if (tier) {
          total += pricing.antall_ml * tier.pris
        }
      }

      // Add centralized system price (1500 kr per system)
      if (pricing.sentralisert_anlegg && pricing.antall_sentralenheter > 0) {
        total += pricing.antall_sentralenheter * 1500
      }

      // Add report price
      if (pricing.inkluder_rapport) {
        total += config.rapport_pris
      }
    } else if (tjeneste === 'slukkeutstyr') {
      // Special handling for Slukkeuttsyr
      // Brannslukkere: use config price
      if (pricing.antall_brannslukkere && pricing.antall_brannslukkere > 0) {
        total += pricing.antall_brannslukkere * (config.brannslukker_pris || 110)
      }

      // Brannslanger: use config price
      if (pricing.antall_brannslanger && pricing.antall_brannslanger > 0) {
        total += pricing.antall_brannslanger * (config.brannslange_pris || 175)
      }

      // Add report price
      if (pricing.inkluder_rapport) {
        total += config.rapport_pris
      }
    } else if (tjeneste === 'eksternt') {
      // Special handling for Eksternt
      // Apply markup percentage to external price
      if (pricing.eksternpris && pricing.eksternpris > 0) {
        const paslag = pricing.paslag_prosent_override !== undefined 
          ? pricing.paslag_prosent_override 
          : (config.paslag_prosent || 10)
        total = pricing.eksternpris * (1 + paslag / 100)
      }
    } else {
      // Standard calculation for other services
      // Calculate unit price based on tiers
      if (pricing.antall_enheter > 0 && config.enhetspriser) {
        const tier = config.enhetspriser.find(t => 
          pricing.antall_enheter >= t.min && 
          (t.max === null || pricing.antall_enheter <= t.max)
        )
        if (tier) {
          total += pricing.antall_enheter * tier.pris
        }
      }

      // Add central unit prices
      if (pricing.antall_sentralenheter > 0) {
        total += config.sentralenhet_forste
        if (pricing.antall_sentralenheter > 1) {
          total += (pricing.antall_sentralenheter - 1) * config.sentralenhet_ekstra
        }
      }

      // Add report price
      if (pricing.inkluder_rapport) {
        total += config.rapport_pris
      }
    }

    // Apply minimum price
    if (total > 0 && total < config.minstepris) {
      total = config.minstepris
    }

    return total
  }

  function calculateTotalPrice() {
    const priceDetails: Record<string, any> = {}
    let totalPrice = 0

    Object.keys(servicePricing).forEach(tjeneste => {
      const tjenesteKey = `tjeneste_${tjeneste}`
      if (formData[tjenesteKey]) {
        const price = calculateServicePrice(tjeneste, servicePricing[tjeneste])
        priceDetails[tjeneste] = {
          ...servicePricing[tjeneste],
          pris: price
        }
        totalPrice += price
      }
    })

    setFormData({
      ...formData,
      pris_detaljer: priceDetails,
      total_pris: totalPrice
    })
  }

  function updateServicePricing(tjeneste: string, updates: Partial<ServicePricing>) {
    setServicePricing({
      ...servicePricing,
      [tjeneste]: { ...servicePricing[tjeneste], ...updates }
    })
  }

  const selectedServices = Object.keys(tjenesteLabels).filter(
    key => formData[`tjeneste_${key}`]
  )

  if (loading) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-400">Laster priser...</p>
      </div>
    )
  }

  if (selectedServices.length === 0) {
    return (
      <div className="card bg-blue-500/5 border-blue-500/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <h3 className="text-gray-900 dark:text-white font-medium mb-1">
              Ingen tjenester valgt
            </h3>
            <p className="text-gray-400 dark:text-gray-400 text-sm">
              Velg minst én tjeneste for å beregne pris
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Prisberegning
        </h3>
      </div>

      {/* Timespris input */}
      <div className="card bg-gray-500/5">
        <label className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">
          Timessats (ordinær arbeidstid 08.00 - 16.00)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={formData.timespris || 925}
            onChange={(e) => setFormData({ ...formData, timespris: parseInt(e.target.value) || 925 })}
            className="input w-32"
            min="0"
          />
          <span className="text-gray-500 dark:text-gray-400">kr</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Denne prisen vises i vilkår på side 2 i PDF-en
        </p>
      </div>

      {selectedServices.map(tjeneste => {
        const config = pricingConfigs[tjeneste]
        const pricing = servicePricing[tjeneste]
        const price = calculateServicePrice(tjeneste, pricing)

        return (
          <div key={tjeneste} className="card bg-gray-500/5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900 dark:text-white">
                {tjenesteLabels[tjeneste]}
              </h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pricing.manuell_pris || false}
                  onChange={(e) => updateServicePricing(tjeneste, { 
                    manuell_pris: e.target.checked,
                    manuelt_belop: e.target.checked ? 0 : undefined
                  })}
                  className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Manuell prissetting
                </span>
              </label>
            </div>

            {pricing.manuell_pris ? (
              // Manual pricing input
              <div className="mb-4">
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Beløp (kr)
                </label>
                <input
                  type="number"
                  value={pricing.manuelt_belop || 0}
                  onChange={(e) => updateServicePricing(tjeneste, { 
                    manuelt_belop: parseFloat(e.target.value) || 0 
                  })}
                  className="input"
                  min="0"
                  step="0.01"
                  placeholder="Skriv inn beløp..."
                />
              </div>
            ) : tjeneste === 'nodlys' ? (
              // Special layout for Nødlys
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Antall LL (Ledelys)
                    </label>
                    <input
                      type="number"
                      value={pricing.antall_ll || 0}
                      onChange={(e) => updateServicePricing(tjeneste, { 
                        antall_ll: parseInt(e.target.value) || 0 
                      })}
                      className="input"
                      min="0"
                    />
                    {config && (pricing.antall_ll || 0) > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {config.enhetspriser?.find(t => 
                          (pricing.antall_ll || 0) >= t.min && 
                          (t.max === null || (pricing.antall_ll || 0) <= t.max)
                        )?.pris || 0} kr per enhet
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Antall ML (Markeringslys)
                    </label>
                    <input
                      type="number"
                      value={pricing.antall_ml || 0}
                      onChange={(e) => updateServicePricing(tjeneste, { 
                        antall_ml: parseInt(e.target.value) || 0 
                      })}
                      className="input"
                      min="0"
                    />
                    {config && (pricing.antall_ml || 0) > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {config.enhetspriser?.find(t => 
                          (pricing.antall_ml || 0) >= t.min && 
                          (t.max === null || (pricing.antall_ml || 0) <= t.max)
                        )?.pris || 0} kr per enhet
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={pricing.sentralisert_anlegg || false}
                        onChange={(e) => updateServicePricing(tjeneste, { 
                          sentralisert_anlegg: e.target.checked 
                        })}
                        className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary dark:focus:ring-primary dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Sentralisert anlegg (1500 kr per anlegg)
                      </span>
                    </label>
                    
                    {pricing.sentralisert_anlegg && (
                      <div>
                        <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                          Antall sentraliserte anlegg
                        </label>
                        <input
                          type="number"
                          value={pricing.antall_sentralenheter}
                          onChange={(e) => updateServicePricing(tjeneste, { 
                            antall_sentralenheter: parseInt(e.target.value) || 0 
                          })}
                          className="input"
                          min="0"
                        />
                        {pricing.antall_sentralenheter > 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            {pricing.antall_sentralenheter} × 1500 kr = {pricing.antall_sentralenheter * 1500} kr
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : tjeneste === 'slukkeutstyr' ? (
              // Special layout for Slukkeuttsyr
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Antall Brannslukkere
                    </label>
                    <input
                      type="number"
                      value={pricing.antall_brannslukkere || 0}
                      onChange={(e) => updateServicePricing(tjeneste, { 
                        antall_brannslukkere: parseInt(e.target.value) || 0 
                      })}
                      className="input"
                      min="0"
                    />
                    {config && (pricing.antall_brannslukkere || 0) > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {pricing.antall_brannslukkere} × {config.brannslukker_pris || 110} kr = {(pricing.antall_brannslukkere || 0) * (config.brannslukker_pris || 110)} kr
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Antall Brannslanger
                    </label>
                    <input
                      type="number"
                      value={pricing.antall_brannslanger || 0}
                      onChange={(e) => updateServicePricing(tjeneste, { 
                        antall_brannslanger: parseInt(e.target.value) || 0 
                      })}
                      className="input"
                      min="0"
                    />
                    {config && (pricing.antall_brannslanger || 0) > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {pricing.antall_brannslanger} × {config.brannslange_pris || 175} kr = {(pricing.antall_brannslanger || 0) * (config.brannslange_pris || 175)} kr
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : tjeneste === 'eksternt' ? (
              // Special layout for Eksternt
              <>
                <div className="space-y-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Eksternpris (kr)
                      </label>
                      <input
                        type="number"
                        value={pricing.eksternpris || 0}
                        onChange={(e) => updateServicePricing(tjeneste, { 
                          eksternpris: parseFloat(e.target.value) || 0 
                        })}
                        className="input"
                        min="0"
                        step="0.01"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Pris fra ekstern leverandør
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Påslag (%)
                      </label>
                      <input
                        type="number"
                        value={pricing.paslag_prosent_override !== undefined 
                          ? pricing.paslag_prosent_override 
                          : (config?.paslag_prosent || 10)}
                        onChange={(e) => updateServicePricing(tjeneste, { 
                          paslag_prosent_override: Math.max(10, parseFloat(e.target.value) || 10)
                        })}
                        className="input"
                        min="10"
                        step="0.1"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Minimum 10% (Standard: {config?.paslag_prosent || 10}%)
                      </p>
                    </div>
                  </div>

                  {config && (pricing.eksternpris || 0) > 0 && (
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Eksternpris:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {(pricing.eksternpris || 0).toLocaleString('nb-NO', { minimumFractionDigits: 2 })} kr
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            Påslag ({pricing.paslag_prosent_override !== undefined 
                              ? pricing.paslag_prosent_override 
                              : (config.paslag_prosent || 10)}%):
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {((pricing.eksternpris || 0) * ((pricing.paslag_prosent_override !== undefined 
                              ? pricing.paslag_prosent_override 
                              : (config.paslag_prosent || 10)) / 100)).toLocaleString('nb-NO', { minimumFractionDigits: 2 })} kr
                          </span>
                        </div>
                        <div className="pt-2 border-t border-blue-500/20 flex justify-between">
                          <span className="font-semibold text-gray-900 dark:text-white">Total:</span>
                          <span className="font-bold text-primary">
                            {((pricing.eksternpris || 0) * (1 + (pricing.paslag_prosent_override !== undefined 
                              ? pricing.paslag_prosent_override 
                              : (config.paslag_prosent || 10)) / 100)).toLocaleString('nb-NO', { minimumFractionDigits: 2 })} kr
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              // Standard layout for other services
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                    {tjeneste === 'rokluker' ? 'Antall luker' : 'Antall enheter'}
                  </label>
                  <input
                    type="number"
                    value={pricing.antall_enheter}
                    onChange={(e) => updateServicePricing(tjeneste, { 
                      antall_enheter: parseInt(e.target.value) || 0 
                    })}
                    className="input"
                    min="0"
                  />
                  {config && pricing.antall_enheter > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      {config.enhetspriser?.find(t => 
                        pricing.antall_enheter >= t.min && 
                        (t.max === null || pricing.antall_enheter <= t.max)
                      )?.pris || 0} kr per {tjeneste === 'rokluker' ? 'luke' : 'enhet'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Antall sentralenheter
                  </label>
                  <input
                    type="number"
                    value={pricing.antall_sentralenheter}
                    onChange={(e) => updateServicePricing(tjeneste, { 
                      antall_sentralenheter: parseInt(e.target.value) || 0 
                    })}
                    className="input"
                    min="0"
                  />
                  {config && pricing.antall_sentralenheter > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      Første: {config.sentralenhet_forste} kr
                      {pricing.antall_sentralenheter > 1 && `, Ekstra: ${config.sentralenhet_ekstra} kr`}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pricing.inkluder_rapport}
                  onChange={(e) => updateServicePricing(tjeneste, { 
                    inkluder_rapport: e.target.checked 
                  })}
                  className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary dark:focus:ring-primary dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Inkluder rapport ({config?.rapport_pris || 0} kr)
                </span>
              </label>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Pris for {tjenesteLabels[tjeneste]}
              </span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {price.toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr
              </span>
            </div>

            {config && price === config.minstepris && price > 0 && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                Minstepris anvendt: {config.minstepris} kr
              </p>
            )}
          </div>
        )
      })}

      {/* Quantity Discount */}
      {selectedServices.length >= 2 && (
        <div className="card bg-blue-500/5 border-blue-500/20">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
            Kvantumsrabatt
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Du har valgt {selectedServices.length} tjenester. Velg rabatt:
          </p>
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, rabatt_prosent: 0 })}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                (formData.rabatt_prosent || 0) === 0
                  ? 'bg-primary text-white border-primary'
                  : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Ingen
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, rabatt_prosent: 10 })}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                formData.rabatt_prosent === 10
                  ? 'bg-primary text-white border-primary'
                  : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              10%
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, rabatt_prosent: 15 })}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                formData.rabatt_prosent === 15
                  ? 'bg-primary text-white border-primary'
                  : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              15%
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, rabatt_prosent: 20 })}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                formData.rabatt_prosent === 20
                  ? 'bg-primary text-white border-primary'
                  : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              20%
            </button>
          </div>
        </div>
      )}

      {/* Total Price */}
      <div className="card bg-primary/10 border-primary/20">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-base text-gray-600 dark:text-gray-400">
              Subtotal
            </span>
            <span className="text-lg font-medium text-gray-900 dark:text-white">
              {(formData.total_pris || 0).toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr
            </span>
          </div>

          {selectedServices.length >= 2 && (formData.rabatt_prosent || 0) > 0 && (
            <>
              <div className="flex items-center justify-between text-green-600 dark:text-green-400">
                <span className="text-base">
                  Kvantumsrabatt ({formData.rabatt_prosent}%)
                </span>
                <span className="text-lg font-medium">
                  -{((formData.total_pris || 0) * (formData.rabatt_prosent / 100)).toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr
                </span>
              </div>
              <div className="border-t border-primary/20 pt-3 flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  Total pris
                </span>
                <span className="text-2xl font-bold text-primary">
                  {((formData.total_pris || 0) * (1 - (formData.rabatt_prosent || 0) / 100)).toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr
                </span>
              </div>
            </>
          )}

          {(!formData.rabatt_prosent || formData.rabatt_prosent === 0 || selectedServices.length < 2) && (
            <div className="border-t border-primary/20 pt-3 flex items-center justify-between">
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                Total pris
              </span>
              <span className="text-2xl font-bold text-primary">
                {(formData.total_pris || 0).toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
