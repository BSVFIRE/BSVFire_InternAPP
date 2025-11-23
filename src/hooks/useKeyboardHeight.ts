import { useEffect, useState } from 'react'

/**
 * Hook for å håndtere keyboard-høyde på mobil
 * Returnerer høyden på keyboard når det er åpent
 */
export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    // Kun relevant for mobile devices
    if (typeof window === 'undefined' || !('visualViewport' in window)) {
      return
    }

    const handleResize = () => {
      if (window.visualViewport) {
        const viewportHeight = window.visualViewport.height
        const windowHeight = window.innerHeight
        const keyboardHeight = windowHeight - viewportHeight
        
        setKeyboardHeight(keyboardHeight > 0 ? keyboardHeight : 0)
        
        // Oppdater CSS variabel for keyboard-høyde
        document.documentElement.style.setProperty(
          '--keyboard-height',
          `${keyboardHeight}px`
        )
      }
    }

    // Lytt til viewport endringer
    window.visualViewport?.addEventListener('resize', handleResize)
    window.visualViewport?.addEventListener('scroll', handleResize)

    // Initial sjekk
    handleResize()

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize)
      window.visualViewport?.removeEventListener('scroll', handleResize)
      document.documentElement.style.removeProperty('--keyboard-height')
    }
  }, [])

  return keyboardHeight
}

/**
 * Hook for å scrolle til et element når keyboard åpnes
 */
export function useScrollToInput() {
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        // Vent litt for at keyboard skal åpne seg
        setTimeout(() => {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          })
        }, 300)
      }
    }

    document.addEventListener('focusin', handleFocus)

    return () => {
      document.removeEventListener('focusin', handleFocus)
    }
  }, [])
}
