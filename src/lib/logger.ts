/**
 * Logger utility for BSV Fire App
 * 
 * Provides environment-aware logging that:
 * - Only logs debug messages in development
 * - Always logs errors (for production monitoring)
 * - Saves important logs to database for admin review
 * - Can be extended to send logs to external services (Sentry, LogRocket, etc.)
 */

import { supabase } from './supabase'

const isDev = import.meta.env.DEV
const isTest = import.meta.env.MODE === 'test'

// Log levels that should be saved to database
const DB_LOG_LEVELS = ['warn', 'error'] as const
type DbLogLevel = typeof DB_LOG_LEVELS[number]

/**
 * Save log to database for admin review
 * Only saves warnings and errors to avoid cluttering the database
 */
async function saveLogToDatabase(
  level: DbLogLevel,
  namespace: string | undefined,
  message: string,
  data?: any
) {
  try {
    // Don't save logs in test mode
    if (isTest) return

    // Get current user info
    const { data: { user } } = await supabase.auth.getUser()
    
    // Prepare log entry
    const logEntry = {
      level,
      message,
      data: data ? JSON.stringify(data) : null,
      namespace: namespace || 'unknown',
      page_url: window.location.href,
      user_id: user?.id || null,
      user_email: user?.email || null,
      user_agent: navigator.userAgent,
      browser_info: {
        language: navigator.language,
        platform: navigator.platform,
        online: navigator.onLine,
        screen: {
          width: window.screen.width,
          height: window.screen.height
        }
      },
      timestamp: new Date().toISOString()
    }

    // Save to database (fire and forget - don't wait for response)
    supabase.from('system_logs').insert([logEntry]).then(({ error }) => {
      if (error && isDev) {
        console.error('Failed to save log to database:', error)
      }
    })
  } catch (error) {
    // Silently fail - we don't want logging to break the app
    if (isDev) {
      console.error('Error in saveLogToDatabase:', error)
    }
  }
}

export const logger = {
  /**
   * Log debug information (only in development)
   * Use for general debugging, data inspection, etc.
   */
  log: (...args: any[]) => {
    if (isDev && !isTest) {
      console.log(...args)
    }
  },

  /**
   * Log debug information (only in development)
   * Alias for log()
   */
  debug: (...args: any[]) => {
    if (isDev && !isTest) {
      console.debug(...args)
    }
  },

  /**
   * Log informational messages (only in development)
   * Use for important state changes, successful operations, etc.
   */
  info: (...args: any[]) => {
    if (isDev && !isTest) {
      console.info(...args)
    }
  },

  /**
   * Log warnings (only in development)
   * Use for deprecated features, potential issues, etc.
   * Warnings are saved to database for admin review
   */
  warn: (...args: any[]) => {
    if (isDev && !isTest) {
      console.warn(...args)
    }
    
    // Save to database for admin review
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ')
    saveLogToDatabase('warn', undefined, message, args.length > 1 ? args.slice(1) : undefined)
  },

  /**
   * Log errors (always logged, even in production)
   * Use for exceptions, failed operations, etc.
   * Errors are saved to database for admin review
   */
  error: (...args: any[]) => {
    console.error(...args)
    
    // Save to database for admin review
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ')
    saveLogToDatabase('error', undefined, message, args.length > 1 ? args.slice(1) : undefined)
  },

  /**
   * Log a group of related messages (only in development)
   * Useful for organizing complex debugging output
   */
  group: (label: string, fn: () => void) => {
    if (isDev && !isTest) {
      console.group(label)
      fn()
      console.groupEnd()
    }
  },

  /**
   * Log a collapsed group (only in development)
   */
  groupCollapsed: (label: string, fn: () => void) => {
    if (isDev && !isTest) {
      console.groupCollapsed(label)
      fn()
      console.groupEnd()
    }
  },

  /**
   * Log a table (only in development)
   * Useful for displaying arrays of objects
   */
  table: (data: any) => {
    if (isDev && !isTest) {
      console.table(data)
    }
  },

  /**
   * Start a timer (only in development)
   */
  time: (label: string) => {
    if (isDev && !isTest) {
      console.time(label)
    }
  },

  /**
   * End a timer and log the elapsed time (only in development)
   */
  timeEnd: (label: string) => {
    if (isDev && !isTest) {
      console.timeEnd(label)
    }
  }
}

/**
 * Create a namespaced logger for a specific module
 * Example: const log = createLogger('Anlegg')
 */
export function createLogger(namespace: string) {
  return {
    log: (...args: any[]) => logger.log(`[${namespace}]`, ...args),
    debug: (...args: any[]) => logger.debug(`[${namespace}]`, ...args),
    info: (...args: any[]) => logger.info(`[${namespace}]`, ...args),
    warn: (...args: any[]) => {
      if (isDev && !isTest) {
        console.warn(`[${namespace}]`, ...args)
      }
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ')
      saveLogToDatabase('warn', namespace, message, args.length > 1 ? args.slice(1) : undefined)
    },
    error: (...args: any[]) => {
      console.error(`[${namespace}]`, ...args)
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ')
      saveLogToDatabase('error', namespace, message, args.length > 1 ? args.slice(1) : undefined)
    },
    group: (label: string, fn: () => void) => logger.group(`[${namespace}] ${label}`, fn),
    groupCollapsed: (label: string, fn: () => void) => logger.groupCollapsed(`[${namespace}] ${label}`, fn),
    table: (data: any) => logger.table(data),
    time: (label: string) => logger.time(`[${namespace}] ${label}`),
    timeEnd: (label: string) => logger.timeEnd(`[${namespace}] ${label}`)
  }
}
