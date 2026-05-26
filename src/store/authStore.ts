import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  
  signIn: async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) {
      logger.error('Sign in failed', { email, error: error.message })
      throw error
    }
  },
  
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      logger.error('Sign out failed', { error: error.message })
    }
    set({ user: null })
  },
  
  initialize: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        logger.error('Failed to get session', { error: error.message })
      }
      set({ user: session?.user ?? null, loading: false })
      
      supabase.auth.onAuthStateChange((_event, session) => {
        set({ user: session?.user ?? null })
      })
    } catch (error) {
      logger.error('Auth initialization failed', { error })
      set({ loading: false })
    }
  },

  resetPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      logger.error('Password reset failed', { email, error: error.message })
      throw error
    }
  },

  updatePassword: async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })
    if (error) {
      logger.error('Password update failed', { error: error.message })
      throw error
    }
  },
}))
