// SPEC: FR-PRG-01, FR-PRG-02, FR-PRG-03, FR-SET-01, FR-SET-02, FR-UI-15, NFR-PRV-01, DC-01
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ProgressState {
  completedLessons: Record<string, boolean>
  toggleLesson: (lessonId: string) => void
  setLessonCompleted: (lessonId: string, completed: boolean) => void
  isLessonCompleted: (lessonId: string) => boolean
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      completedLessons: {},
      toggleLesson: (lessonId: string) => {
        set((state) => ({
          completedLessons: {
            ...state.completedLessons,
            [lessonId]: !state.completedLessons[lessonId],
          },
        }))
      },
      setLessonCompleted: (lessonId: string, completed: boolean) => {
        set((state) => ({
          completedLessons: {
            ...state.completedLessons,
            [lessonId]: completed,
          },
        }))
      },
      isLessonCompleted: (lessonId: string) => {
        return !!get().completedLessons[lessonId]
      },
    }),
    {
      name: 'ai-foundations-progress', // FR-PRG-01 exact key
    }
  )
)

export interface AISettings {
  provider: 'local' | 'openai' | 'custom'
  baseUrl: string
  model: string
  apiKey: string
  githubToken: string
  maxBytes: number
}

export interface SettingsState {
  settings: AISettings
  isDrawerOpen: boolean
  setDrawerOpen: (open: boolean) => void
  updateSettings: (partial: Partial<AISettings>) => void
  resetDefaults: () => void
}

const defaultSettings: AISettings = {
  provider: 'local',
  baseUrl: 'http://localhost:11434/v1',
  model: 'llama3.2:1b',
  apiKey: '',
  githubToken: '',
  maxBytes: 1500,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      isDrawerOpen: false,
      setDrawerOpen: (open: boolean) => set({ isDrawerOpen: open }),
      updateSettings: (partial: Partial<AISettings>) =>
        set((state) => ({ settings: { ...state.settings, ...partial } })),
      resetDefaults: () => set({ settings: defaultSettings }),
    }),
    {
      name: 'ai-foundations-settings', // FR-SET-02 exact key
    }
  )
)

export type ThemeMode = 'light' | 'dark' | 'system'

export interface ThemeState {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
}

export function applyThemeClass(theme: ThemeMode) {
  if (typeof window === 'undefined') return
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  if (isDark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme: ThemeMode) => {
        applyThemeClass(theme)
        set({ theme })
      },
    }),
    {
      name: 'ai-foundations-theme', // FR-UI-15 exact key
      onRehydrateStorage: () => (state) => {
        if (state) applyThemeClass(state.theme)
      },
    }
  )
)

export type AudienceMode = "standard" | "junior" | "plain-english"

export interface AudienceModeState {
  mode: AudienceMode
  setMode: (mode: AudienceMode) => void
}

export const useAudienceModeStore = create<AudienceModeState>()(
  persist(
    (set) => ({
      mode: "standard",
      setMode: (mode: AudienceMode) => set({ mode }),
    }),
    {
      name: "ai-foundations-audience-mode",
    }
  )
)
