import { create } from 'zustand'

type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

// Hent tema fra localStorage eller bruk 'dark' som standard
const getInitialTheme = (): Theme => {
  const savedTheme = localStorage.getItem('bsv-theme')
  return (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'dark'
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getInitialTheme(),
  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark'
      document.documentElement.classList.toggle('dark', newTheme === 'dark')
      localStorage.setItem('bsv-theme', newTheme)
      return { theme: newTheme }
    }),
  setTheme: (theme) => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('bsv-theme', theme)
    set({ theme })
  },
}))
