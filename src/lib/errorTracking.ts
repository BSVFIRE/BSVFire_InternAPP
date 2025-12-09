/**
 * Global error tracking setup
 * Catches unhandled errors and promise rejections
 */

import { logger } from './logger'

export function setupErrorTracking() {
  // Catch unhandled errors
  window.addEventListener('error', (event) => {
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
    
    // Filter out empty/invalid errors (e.g., {}, undefined, null, empty strings)
    const filteredArgs = args.filter(arg => {
      if (arg === null || arg === undefined) return false
      if (typeof arg === 'string' && arg.trim() === '') return false
      if (typeof arg === 'object' && Object.keys(arg).length === 0) return false
      return true
    })
    
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
        logger.error(message, filteredArgs.length > 1 ? filteredArgs.slice(1) : undefined)
      } finally {
        isLogging = false
      }
    }
  }
}
