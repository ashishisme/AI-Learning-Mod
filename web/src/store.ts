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
  maxBytes: number
  insecureTls?: boolean // skip TLS verification for the AI endpoint (self-signed certs). Off by default.
  localLLMEnabled?: boolean // hosted only: the browser asks an AI on this computer (FR-021a). Off by default.
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
  maxBytes: 1500,
  insecureTls: false,
  localLLMEnabled: false,
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
      // Curriculum sync was removed: drop any GitHub token an older version saved.
      merge: (persisted, current) => {
        const { githubToken: _drop, ...saved } = ((persisted as { settings?: Record<string, unknown> })?.settings ?? {}) as Record<string, unknown>
        return { ...current, settings: { ...current.settings, ...(saved as Partial<AISettings>) } }
      },
    }
  )
)

export type ThemeMode = 'light' | 'dark' | 'system'

export interface ThemeState {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
}

// The theme the learner actually sees: "system" resolves to the operating system's setting.
export function resolveTheme(theme: ThemeMode): 'light' | 'dark' {
  if (theme === 'dark') return 'dark'
  if (
    theme === 'system' &&
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark'
  }
  return 'light'
}

export function applyThemeClass(theme: ThemeMode) {
  if (typeof window === 'undefined') return
  const isDark = resolveTheme(theme) === 'dark'
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

export type VoicePersonaId = 'chip' | 'nova' | 'alan'

export interface AudioState {
  activeTrackId: string | null
  isPlaying: boolean
  isMuted: boolean
  speechRate: number
  persona: VoicePersonaId
  currentSentence: string | null
  toggleMute: () => void
  setSpeechRate: (rate: number) => void
  setPersona: (persona: VoicePersonaId) => void
  setActiveTrack: (id: string | null, isPlaying: boolean) => void
  setCurrentSentence: (sentence: string | null) => void
  stopAudio: () => void
}

export const useAudioStore = create<AudioState>()(
  persist(
    (set) => ({
      activeTrackId: null,
      isPlaying: false,
      isMuted: false,
      speechRate: 1.0,
      persona: 'chip',
      currentSentence: null,
      toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
      setSpeechRate: (rate: number) => set({ speechRate: rate }),
      setPersona: (persona: VoicePersonaId) => set({ persona }),
      setActiveTrack: (id: string | null, isPlaying: boolean) =>
        set({ activeTrackId: id, isPlaying }),
      setCurrentSentence: (sentence: string | null) => set({ currentSentence: sentence }),
      stopAudio: () => set({ activeTrackId: null, isPlaying: false, currentSentence: null }),
    }),
    {
      name: 'ai-foundations-audio-settings',
    }
  )
)

export interface HelpState {
  isHelpOpen: boolean
  setHelpOpen: (open: boolean) => void
}

export const useHelpStore = create<HelpState>((set) => ({
  isHelpOpen: false,
  setHelpOpen: (open: boolean) => set({ isHelpOpen: open }),
}))


// Deployment facts reported by the server (GET /api/runtime). On a hosted deployment the AI
// endpoint, key, model and certificate options are controlled by the server only.
// The defaults keep today's behaviour until the server answers: no sign-in, tutor on, no feedback.
export interface RuntimeState {
  hosted: boolean
  authRequired: boolean
  tutorEnabled: boolean
  feedbackEnabled: boolean
  loaded: boolean
  load: () => Promise<void>
}

export const useRuntimeStore = create<RuntimeState>()((set) => ({
  hosted: false,
  authRequired: false,
  tutorEnabled: true,
  feedbackEnabled: false,
  loaded: false,
  load: async () => {
    try {
      const res = await fetch('/api/runtime')
      if (res.ok) {
        const data = await res.json()
        set({
          hosted: data?.hosted === true,
          authRequired: data?.authRequired === true,
          // Only an explicit false hides the tutor, so older servers keep working.
          tutorEnabled: data?.tutorEnabled !== false,
          feedbackEnabled: data?.feedbackEnabled === true,
          loaded: true,
        })
        return
      }
    } catch {
      /* the server stays the authority: it ignores overrides when hosted */
    }
    // Unreachable or not ok: keep today's defaults (no sign-in screen) so the app never hangs.
    set({ loaded: true })
  },
}))

// Learner session (SPEC-008). Never persisted: the server cookie is the source of truth.
export interface AuthSessionInfo {
  betaId: string
  label?: string
  expiresAt: string
  daysLeft: number
  expiringSoon: boolean
}

export interface AuthState {
  status: 'loading' | 'anonymous' | 'authenticated'
  betaId: string
  label: string
  expiresAt: string
  daysLeft: number
  expiringSoon: boolean
  message: string | null
  setSession: (info: AuthSessionInfo) => void
  clearSession: (message?: string) => void
  setLoading: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: 'loading',
  betaId: '',
  label: '',
  expiresAt: '',
  daysLeft: 0,
  expiringSoon: false,
  message: null,
  setSession: (info) =>
    set({
      status: 'authenticated',
      betaId: info.betaId,
      label: info.label ?? '',
      expiresAt: info.expiresAt,
      daysLeft: info.daysLeft,
      expiringSoon: info.expiringSoon,
      message: null,
    }),
  clearSession: (message) =>
    set({ status: 'anonymous', betaId: '', label: '', expiresAt: '', daysLeft: 0, expiringSoon: false, message: message ?? null }),
  setLoading: () => set({ status: 'loading' }),
}))
