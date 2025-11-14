import { useEffect, useRef, useState } from 'react'
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps'
import { MapPin } from 'lucide-react'

interface AddressComponents {
  adresse: string
  postnummer: string
  poststed: string
}

interface GoogleMapsAddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onAddressSelect: (components: AddressComponents) => void
  placeholder?: string
  className?: string
  required?: boolean
}

function AutocompleteInput({
  value,
  onChange,
  onAddressSelect,
  placeholder,
  className,
  required
}: GoogleMapsAddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const places = useMapsLibrary('places')
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!places || !inputRef.current) return

    try {
      const options: google.maps.places.AutocompleteOptions = {
        componentRestrictions: { country: 'no' }, // Begrens til Norge
        fields: ['address_components', 'formatted_address', 'geometry'],
        types: ['address']
      }

      const autocompleteInstance = new places.Autocomplete(inputRef.current, options)
      setAutocomplete(autocompleteInstance)
      setError(null)

      return () => {
        if (autocompleteInstance) {
          google.maps.event.clearInstanceListeners(autocompleteInstance)
        }
      }
    } catch (err) {
      console.error('Google Maps Autocomplete error:', err)
      setError('Kunne ikke laste Google Maps. Sjekk API-nøkkel.')
    }
  }, [places])

  useEffect(() => {
    if (!autocomplete) return

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()

      if (!place.address_components) {
        return
      }

      // Ekstraher adressekomponenter
      let streetNumber = ''
      let route = ''
      let postnummer = ''
      let poststed = ''

      place.address_components.forEach((component) => {
        const types = component.types

        if (types.includes('street_number')) {
          streetNumber = component.long_name
        }
        if (types.includes('route')) {
          route = component.long_name
        }
        if (types.includes('postal_code')) {
          postnummer = component.long_name
        }
        if (types.includes('postal_town') || types.includes('locality')) {
          poststed = component.long_name
        }
      })

      const adresse = `${route} ${streetNumber}`.trim()

      // Oppdater input-feltet med formatert adresse
      onChange(adresse)

      // Send adressekomponenter tilbake til parent
      onAddressSelect({
        adresse,
        postnummer,
        poststed
      })
    })

    return () => {
      google.maps.event.removeListener(listener)
    }
  }, [autocomplete, onChange, onAddressSelect])

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-400 z-10" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className || 'input pl-10'}
        placeholder={placeholder || 'Søk adresse...'}
        required={required}
      />
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
      {!places && !error && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Laster Google Maps...</p>
      )}
    </div>
  )
}

export function GoogleMapsAddressAutocomplete(props: GoogleMapsAddressAutocompleteProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    return (
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-400" />
        <input
          type="text"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          className={props.className || 'input pl-10'}
          placeholder={props.placeholder || 'Adresse'}
          required={props.required}
        />
        <p className="text-xs text-yellow-500 mt-1">
          Google Maps API-nøkkel mangler. Autofullføring er deaktivert.
        </p>
      </div>
    )
  }

  return (
    <APIProvider apiKey={apiKey} libraries={['places']}>
      <AutocompleteInput {...props} />
    </APIProvider>
  )
}
