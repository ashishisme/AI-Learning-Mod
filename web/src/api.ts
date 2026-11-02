// SPEC: FR-CNT-01, FR-CNT-02, FR-TUT-01, FR-TUT-07, FR-TUT-08, FR-SET-03, FR-SET-04, NFR-REL-01, NFR-REL-02
import { useSettingsStore, useRuntimeStore, useAuthStore, AuthSessionInfo } from './store'

export interface LessonMeta {
  id: string
  module: string
  title: string
  order: number
  path: string
  commitSha: string
  colabUrl?: string
}

export interface LessonIndex {
  commitSha: string
  lessons: LessonMeta[]
}

export interface Block {
  type: string
  content?: string
  lang?: string
  src?: string
  alt?: string
  raw?: unknown
}

export interface Lesson extends LessonMeta {
  blocks: Block[]
}

export interface TutorResponse {
  answer: string
}

export class ApiError extends Error {
  status: number
  data?: unknown
  code?: string

  constructor(status: number, message: string, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
    const code = (data as { code?: unknown } | null | undefined)?.code
    if (typeof code === 'string') this.code = code
  }
}

export async function fetchLessons(): Promise<LessonIndex> {
  const res = await fetch('/api/lessons')
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(res.status, body?.error || `Failed to fetch lessons (${res.status})`, body)
  }
  return res.json()
}

export async function fetchLesson(id: string): Promise<Lesson> {
  const res = await fetch(`/api/lessons/${encodeURIComponent(id)}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(res.status, body?.error || `Failed to fetch lesson (${res.status})`, body)
  }
  return res.json()
}

function getAIHeaders(): Record<string, string> {
  // Hosted deployments ignore these on the server; do not send credentials that would be discarded.
  if (useRuntimeStore.getState().hosted) return {}
  const settings = useSettingsStore.getState().settings
  const headers: Record<string, string> = {}
  if (settings.baseUrl) headers['X-AI-Base-URL'] = settings.baseUrl
  if (settings.model) headers['X-AI-Model'] = settings.model
  if (settings.apiKey) headers['X-AI-Key'] = settings.apiKey
  if (settings.maxBytes) headers['X-AI-Max-Bytes'] = String(settings.maxBytes)
  if (settings.insecureTls) headers['X-AI-Insecure-TLS'] = 'true'
  return headers
}

export async function askTutor(lessonId: string, question: string): Promise<TutorResponse> {
  const res = await fetch('/api/tutor', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAIHeaders(),
    },
    body: JSON.stringify({ lessonId, question }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(res.status, body?.error || `Tutor error (${res.status})`, body)
  }
  return res.json()
}

export interface TutorStreamEvent {
  token?: string
  done?: boolean
  cited?: boolean
  fallback?: string
  error?: string
}

export async function askTutorStream(
  lessonId: string,
  question: string,
  onToken: (token: string) => void,
  onComplete: (fallback?: string) => void,
  onError: (error: ApiError | Error) => void,
  mode?: string
): Promise<() => void> {
  const controller = new AbortController()

  if (usesLocalLLM()) {
    void askLocalLLMStream(lessonId, question, mode, controller.signal, onToken, onComplete, onError)
    return () => controller.abort()
  }

  fetch('/api/tutor', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      ...getAIHeaders(),
    },
    // The audience mode is sent separately so the server applies the tone; it is not part of the question.
    body: JSON.stringify(mode && mode !== 'standard' ? { lessonId, question, mode } : { lessonId, question }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new ApiError(res.status, body?.error || `Tutor error (${res.status})`, body)
      }

      if (!res.body) {
        throw new Error('Streaming response body not supported')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith(':')) continue

          if (trimmed === 'data: [DONE]') {
            onComplete()
            return
          }

          if (trimmed.startsWith('data: ')) {
            try {
              const data: TutorStreamEvent = JSON.parse(trimmed.slice(6))
              if (data.token) {
                onToken(data.token)
              }
              if (data.done) {
                if (!data.cited && data.fallback) {
                  onComplete(data.fallback)
                } else {
                  onComplete()
                }
                return
              }
            } catch {
              // Ignore partial JSON
            }
          }
        }
      }
      onComplete()
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError(err)
      }
    })

  return () => controller.abort()
}

// SPEC-008 FR-021a: on a hosted site the server cannot reach the learner's computer, so the
// browser asks the learner's own AI directly. Only localhost addresses are allowed (and the
// page's security policy blocks anything else).
export function isLocalLLMUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    return (u.protocol === 'http:' || u.protocol === 'https:') && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')
  } catch {
    return false
  }
}

export function usesLocalLLM(): boolean {
  const s = useSettingsStore.getState().settings
  return useRuntimeStore.getState().hosted && !!s.localLLMEnabled && isLocalLLMUrl(s.baseUrl)
}

const CITATION = /\[[^\]\n]+?\s*§\s*[^\]\n]+?\]/

function localHeaders(apiKey: string): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey) h.Authorization = `Bearer ${apiKey}`
  return h
}

const trimSlash = (u: string) => u.replace(/\/+$/, '')

async function askLocalLLMStream(
  lessonId: string,
  question: string,
  mode: string | undefined,
  signal: AbortSignal,
  onToken: (token: string) => void,
  onComplete: (fallback?: string) => void,
  onError: (error: ApiError | Error) => void
): Promise<void> {
  try {
    const prep = await fetch('/api/tutor/prepare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mode && mode !== 'standard' ? { lessonId, question, mode } : { lessonId, question }),
      signal,
    })
    const plan = await prep.json().catch(() => null)
    if (!prep.ok || !plan) throw new ApiError(prep.status, plan?.error || `Tutor error (${prep.status})`, plan)
    if (plan.safetyReply) {
      onToken(plan.safetyReply)
      onComplete()
      return
    }

    const { baseUrl, model, apiKey } = useSettingsStore.getState().settings
    let res: Response
    try {
      res = await fetch(`${trimSlash(baseUrl)}/chat/completions`, {
        method: 'POST',
        headers: localHeaders(apiKey),
        body: JSON.stringify({ model, messages: plan.messages, max_tokens: plan.maxTokens, stream: true }),
        signal,
      })
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err
      throw new Error(`Cannot reach your AI at ${baseUrl}. Is it running, and does it allow this site? See Settings.`)
    }
    if (!res.ok || !res.body) throw new Error(`Your AI answered ${res.status}. Check the model name in Settings.`)

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let full = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        const t = line.trim()
        if (!t.startsWith('data:')) continue
        const data = t.slice(5).trim()
        if (data === '[DONE]') continue
        try {
          const token = JSON.parse(data)?.choices?.[0]?.delta?.content
          if (token) {
            full += token
            onToken(token)
          }
        } catch {
          // ignore keep-alives and partial lines
        }
      }
    }
    // Same rule as the server's local-model path (FR-TUT-06): cite a real answer, else fall back.
    if (CITATION.test(full)) onComplete()
    else if (full.trim().length > 20) {
      onToken(' ' + plan.citation)
      onComplete()
    } else onComplete(plan.fallback)
  } catch (err) {
    if ((err as Error).name !== 'AbortError') onError(err as Error)
  }
}

// Lists the models on the learner's own AI, straight from the browser (FR-021a).
export async function testLocalLLM(baseUrl: string, apiKey: string): Promise<ConfigTestResult> {
  if (!isLocalLLMUrl(baseUrl)) {
    return { ok: false, latencyMs: 0, error: 'Use an address on this computer, such as http://localhost:11434/v1' }
  }
  const t0 = performance.now()
  try {
    const res = await fetch(`${trimSlash(baseUrl)}/models`, { headers: localHeaders(apiKey) })
    const latencyMs = Math.round(performance.now() - t0)
    if (!res.ok) return { ok: false, latencyMs, error: `Your AI answered ${res.status}` }
    const body = await res.json()
    const models: string[] = (body?.data ?? []).map((m: { id: string }) => m.id).filter(Boolean)
    return { ok: true, latencyMs, models, activeModel: models[0] }
  } catch {
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - t0),
      error: 'Cannot reach it. Check it is running and allows this site (see the steps above).',
    }
  }
}

export interface ConfigTestResult {
  ok: boolean
  latencyMs: number
  error?: string
  models?: string[]
  activeModel?: string
}

export async function testAIConfig(config: { baseUrl: string; model: string; apiKey?: string; insecureTls?: boolean }): Promise<ConfigTestResult> {
  const res = await fetch('/api/config/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(res.status, body?.error || `Config test error (${res.status})`, body)
  }
  return res.json()
}

export async function fetchHealth(): Promise<{ ok: boolean }> {
  const res = await fetch('/api/health')
  if (!res.ok) {
    throw new ApiError(res.status, 'Health check failed')
  }
  return res.json()
}


export interface AdaptiveSection {
  id: string
  heading: string
  chipQuote?: string
  analogy?: {
    metaphorName: string
    description: string
  }
  bodyMarkdown: string
  diagram?: {
    type: string // "mermaid" | "stepper" | "svg" | "scene-card"
    caption: string
    content: string
    alt?: string // SPEC-006 FR-REV-03: required in content, describes what the picture teaches
    steps?: string[] // for type "stepper"
  }
  realWorld?: string // SPEC-006 FR-REV-14: "Where you'll see this" (plain-english)
  interactiveWidget?: {
    type: string
    title: string
    instruction: string
    // SPEC-006 FR-REV-04, FR-REV-10, FR-REV-11
    goal?: string
    scaffold?: 'guided' | 'standard'
    predictionPrompt?: string
    hints?: string[]
    successMessage?: string
    allowFreePlay?: boolean
    scenario: {
      userPrompt: string
      terminalA: string
      terminalB: string
      correctAnswer: string
      explanation: string
    }
  }
  jargonBuster?: Array<{
    term: string
    simpleExplanation: string
  }>
}

export interface ChoiceQuestion {
  question?: string
  prompt?: string
  options: string[]
  correctIndex: number
  explanation?: string
  fromLesson?: string
}

export interface AdaptiveLessonPayload {
  lessonId: string
  mode: "junior" | "plain-english"
  title: string
  readingTimeMinutes?: number
  mascot?: {
    name: string
    avatar: string
    greeting: string
  }
  intro?: string
  sections: AdaptiveSection[]
  teachBack?: ChoiceQuestion // SPEC-006 FR-REV-12
  recall?: ChoiceQuestion[] // SPEC-006 FR-REV-13
  miniQuiz?: Array<{
    question: string
    options: string[]
    correctIndex: number
    praise?: string
    explanation?: string
  }>
}

// Returns null when the lesson has no adaptive version: the server then answers 200 with the
// standard lesson, which has blocks instead of sections.
export async function fetchAdaptiveLesson(id: string, mode: "junior" | "plain-english"): Promise<AdaptiveLessonPayload | null> {
  const res = await fetch(`/api/lessons/${encodeURIComponent(id)}?mode=${encodeURIComponent(mode)}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(res.status, body?.error || `Failed to fetch adaptive lesson (${res.status})`, body)
  }
  const payload = await res.json()
  return Array.isArray(payload?.sections) ? payload : null
}


// ---- SPEC-008 learner auth (same-origin cookies) ----
async function authCall<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(res.status, body?.error || `Request failed (${res.status})`, body)
  }
  return (res.status === 204 ? undefined : await res.json()) as T
}

const postJSON = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export interface AuthSessionResponse extends Partial<AuthSessionInfo> {
  authenticated: boolean
}

export const fetchAuthSession = () => authCall<AuthSessionResponse>('/api/auth/session')
export const activateInvite = (token: string) =>
  authCall<{ betaId: string; password: string; expiresAt: string }>('/api/auth/activate', postJSON({ token }))
export const login = (betaId: string, password: string) =>
  authCall<AuthSessionResponse>('/api/auth/login', postJSON({ betaId, password }))
export const logout = () => authCall<void>('/api/auth/logout', { method: 'POST' })

/** Fills the auth store from the server; anonymous when the probe fails or says so. */
export async function refreshAuthSession(): Promise<void> {
  try {
    const s = await fetchAuthSession()
    if (s.authenticated && s.betaId) {
      useAuthStore.getState().setSession(s as AuthSessionInfo)
    } else {
      useAuthStore.setState({ status: 'anonymous' })
    }
  } catch {
    useAuthStore.setState({ status: 'anonymous' })
  }
}

let guardInstalled = false
/** Any 401 from a protected /api/ call returns the learner to sign-in with the server's message. */
export function installAuthFetchGuard(): void {
  if (guardInstalled || typeof window === 'undefined') return
  guardInstalled = true
  const orig = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    const res = await orig(input, init)
    if (res.status === 401 && useRuntimeStore.getState().authRequired) {
      const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      let path = raw
      try {
        path = new URL(raw, window.location.origin).pathname
      } catch {
        /* keep raw */
      }
      if (path.startsWith('/api/') && !path.startsWith('/api/auth/') && !path.startsWith('/api/admin/')) {
        const body = await res.clone().json().catch(() => null)
        useAuthStore.getState().clearSession(body?.error || 'Please sign in.')
      }
    }
    return res
  }
}
