/**
 * Global error tracking setup
 * Catches unhandled errors and promise rejections
 */

import { logger } from './logger'

/**
 * Feil som ikke sier noe om appen og bare fyller loggen:
 * - «Script error.» uten fil: cross-origin (nettleserutvidelser)
 * - ResizeObserver-advarsel fra nettleseren ved layout-endringer
 * - «Load failed» / NetworkError / avbrutt modul-import: mobil uten dekning eller dev-server som restartes
 */
export function erStoy(melding: unknown, filnavn?: string): boolean {
  if (typeof melding !== 'string') return false
  if (melding.includes('ResizeObserver loop')) return true
  if (melding.trim() === 'Script error.' && !filnavn) return true
  return /TypeError: (Load failed|NetworkError when attempting to fetch resource|Failed to fetch|Importing a module script failed)|^Load failed$|^Failed to fetch$/.test(melding)
}

export function setupErrorTracking() {
  // Catch unhandled errors
  window.addEventListener('error', (event) => {
    if (erStoy(event.message, event.filename)) return
    logger.error('Unhandled error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error?.stack || event.error
    })
  })

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    if (erStoy(typeof reason === 'string' ? reason : reason?.message)) return
    logger.error('Unhandled promise rejection', {
      reason: event.reason,
      promise: String(event.promise)
    })
  })

  // Override console.error to also log to database
  const originalConsoleError = console.error
  let isLogging = false // Prevent infinite loops
  
  console.error = (...args: any[]) => {
    // Call original console.error
    originalConsoleError(...args)
    
    // Prevent infinite loops - don't log if we're already logging
    if (isLogging) return
    
    // Filter out empty/invalid errors (e.g., {}, undefined, null, empty strings).
    // Error-objekter har ingen egne nøkler og må gjøres om til {name, message, stack} – ellers forsvinner
    // selve feilteksten og loggen viser bare «Feil ved …: undefined».
    const filteredArgs = args
      .map(arg => arg instanceof Error ? { name: arg.name, message: arg.message, stack: arg.stack?.split('\n').slice(0, 6).join('\n') } : arg)
      .filter(arg => {
        if (arg === null || arg === undefined) return false
        if (typeof arg === 'string' && arg.trim() === '') return false
        if (typeof arg === 'object' && Object.keys(arg).length === 0) return false
        return true
      })
    if (filteredArgs.some(arg => erStoy(typeof arg === 'string' ? arg : (arg as { message?: string })?.message))) return
    
    // Don't log if all args were filtered out
    if (filteredArgs.length === 0) return
    
    // Also log to database
    const message = filteredArgs.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ')
    
    // Skip logging if message is empty or just whitespace
    if (!message || message.trim() === '' || message === '{}' || message === 'undefined') return
    
    // Only log to database if it's not already a logger call
    const stack = new Error().stack || ''
    if (!stack.includes('logger.ts') && !stack.includes('errorTracking.ts')) {
      isLogging = true
      try {
        if (filteredArgs.length > 1) logger.error(message, filteredArgs.slice(1))
        else logger.error(message)
      } finally {
        isLogging = false
      }
    }
  }
}
