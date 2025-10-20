import { Building, Mail, Phone, Edit, X, FileText, User, DollarSign } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { StatusBadge } from './StatusBadge'
import type { ServiceavtaleTilbud } from '../TilbudServiceavtale'

interface TilbudDetailsProps {
  tilbud: ServiceavtaleTilbud
  onEdit: () => void
  onClose: () => void
}

export function TilbudDetails({ tilbud, onEdit, onClose }: TilbudDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Tilbudsdetaljer</h1>
          <p className="text-gray-500 dark:text-gray-400">Vis informasjon om serviceavtaletilbud</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onEdit} className="btn-primary flex items-center gap-2">
            <Edit className="w-4 h-4" />
            Rediger
          </button>
          <button onClick={onClose} className="btn-secondary flex items-center gap-2">
            <X className="w-4 h-4" />
            Lukk
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Status</p>
            <StatusBadge status={tilbud.status} />
          </div>
          {tilbud.tilbud_nummer && (
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Tilbudsnummer</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{tilbud.tilbud_nummer}</p>
            </div>
          )}
        </div>
      </div>

      {/* Kundeinformasjon */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Building className="w-5 h-5 text-primary" />
          Kundeinformasjon
        </h2>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Kundenavn</p>
            <p className="text-gray-900 dark:text-white font-medium">{tilbud.kunde_navn}</p>
          </div>
          {tilbud.kunde_organisasjonsnummer && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Organisasjonsnummer</p>
              <p className="text-gray-900 dark:text-white">{tilbud.kunde_organisasjonsnummer}</p>
            </div>
          )}
          {tilbud.lokasjon && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Lokasjon</p>
              <p className="text-gray-900 dark:text-white">{tilbud.lokasjon}</p>
            </div>
          )}
          {tilbud.anlegg_navn && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Anlegg</p>
              <p className="text-gray-900 dark:text-white">{tilbud.anlegg_navn}</p>
            </div>
          )}
        </div>
      </div>

      {/* Kontaktperson */}
      {tilbud.kontaktperson_navn && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Kontaktperson
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Navn</p>
              <p className="text-gray-900 dark:text-white font-medium">{tilbud.kontaktperson_navn}</p>
            </div>
            {tilbud.kontaktperson_epost && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <a href={`mailto:${tilbud.kontaktperson_epost}`} className="text-primary hover:underline">
                  {tilbud.kontaktperson_epost}
                </a>
              </div>
            )}
            {tilbud.kontaktperson_telefon && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <a href={`tel:${tilbud.kontaktperson_telefon}`} className="text-primary hover:underline">
                  {tilbud.kontaktperson_telefon}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tjenester */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Inkluderte tjenester
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className={`p-3 rounded-lg border ${tilbud.tjeneste_brannalarm ? 'bg-red-500/10 border-red-500/20' : 'bg-gray-500/5 border-gray-500/10'}`}>
            <p className={`font-medium ${tilbud.tjeneste_brannalarm ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
              Brannalarm {tilbud.tjeneste_brannalarm ? '✓' : '✗'}
            </p>
          </div>
          <div className={`p-3 rounded-lg border ${tilbud.tjeneste_nodlys ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-gray-500/5 border-gray-500/10'}`}>
            <p className={`font-medium ${tilbud.tjeneste_nodlys ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-500 dark:text-gray-400'}`}>
              Nødlys {tilbud.tjeneste_nodlys ? '✓' : '✗'}
            </p>
          </div>
          <div className={`p-3 rounded-lg border ${tilbud.tjeneste_slukkeutstyr ? 'bg-blue-500/10 border-blue-500/20' : 'bg-gray-500/5 border-gray-500/10'}`}>
            <p className={`font-medium ${tilbud.tjeneste_slukkeutstyr ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
              Slukkeuttsyr {tilbud.tjeneste_slukkeutstyr ? '✓' : '✗'}
            </p>
          </div>
          <div className={`p-3 rounded-lg border ${tilbud.tjeneste_rokluker ? 'bg-purple-500/10 border-purple-500/20' : 'bg-gray-500/5 border-gray-500/10'}`}>
            <p className={`font-medium ${tilbud.tjeneste_rokluker ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'}`}>
              Røkluker {tilbud.tjeneste_rokluker ? '✓' : '✗'}
            </p>
          </div>
          <div className={`p-3 rounded-lg border ${tilbud.tjeneste_eksternt ? 'bg-green-500/10 border-green-500/20' : 'bg-gray-500/5 border-gray-500/10'}`}>
            <p className={`font-medium ${tilbud.tjeneste_eksternt ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
              Eksternt {tilbud.tjeneste_eksternt ? '✓' : '✗'}
            </p>
          </div>
        </div>
      </div>

      {/* Prisoppsummering */}
      {tilbud.total_pris > 0 && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Prisoppsummering
          </h2>
          
          {tilbud.pris_detaljer && Object.keys(tilbud.pris_detaljer).length > 0 && (
            <div className="space-y-3 mb-4">
              {Object.entries(tilbud.pris_detaljer).map(([tjeneste, detaljer]: [string, any]) => (
                <div key={tjeneste} className="p-3 bg-gray-500/5 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 dark:text-white capitalize">
                      {tjeneste.charAt(0).toUpperCase() + tjeneste.slice(1)}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {detaljer.pris?.toLocaleString('nb-NO', { minimumFractionDigits: 2 })} kr
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                    {detaljer.antall_enheter > 0 && (
                      <p>• {detaljer.antall_enheter} enheter</p>
                    )}
                    {detaljer.antall_sentralenheter > 0 && (
                      <p>• {detaljer.antall_sentralenheter} sentralenhet(er)</p>
                    )}
                    {detaljer.inkluder_rapport && (
                      <p>• Rapport inkludert</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-gray-900 dark:text-white">Total pris</span>
              <span className="text-2xl font-bold text-primary">
                {tilbud.total_pris.toLocaleString('nb-NO', { minimumFractionDigits: 2 })} kr
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Beskrivelse og notater */}
      {(tilbud.beskrivelse || tilbud.notater) && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Detaljer</h2>
          {tilbud.beskrivelse && (
            <div className="mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Beskrivelse</p>
              <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{tilbud.beskrivelse}</p>
            </div>
          )}
          {tilbud.notater && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Notater</p>
              <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{tilbud.notater}</p>
            </div>
          )}
        </div>
      )}

      {/* Metadata */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Metadata</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Opprettet</p>
            <p className="text-gray-900 dark:text-white">{formatDate(tilbud.opprettet)}</p>
          </div>
          {tilbud.sist_oppdatert && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Sist oppdatert</p>
              <p className="text-gray-900 dark:text-white">{formatDate(tilbud.sist_oppdatert)}</p>
            </div>
          )}
          {tilbud.sendt_dato && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Sendt dato</p>
              <p className="text-gray-900 dark:text-white">{formatDate(tilbud.sendt_dato)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
