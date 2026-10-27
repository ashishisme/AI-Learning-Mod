// SPEC: FR-CNT-01, FR-CNT-02, FR-TUT-01, FR-TUT-07, FR-TUT-08, FR-SET-03, FR-SET-04, NFR-REL-01, NFR-REL-02
import { useSettingsStore } from './store'

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

  constructor(status: number, message: string, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
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
  const settings = useSettingsStore.getState().settings
  const headers: Record<string, string> = {}
  if (settings.baseUrl) headers['X-AI-Base-URL'] = settings.baseUrl
  if (settings.model) headers['X-AI-Model'] = settings.model
  if (settings.apiKey) headers['X-AI-Key'] = settings.apiKey
  if (settings.maxBytes) headers['X-AI-Max-Bytes'] = String(settings.maxBytes)
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
  onError: (error: ApiError | Error) => void
): Promise<() => void> {
  const controller = new AbortController()

  fetch('/api/tutor', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      ...getAIHeaders(),
    },
    body: JSON.stringify({ lessonId, question }),
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

export interface ConfigTestResult {
  ok: boolean
  latencyMs: number
  error?: string
  models?: string[]
  activeModel?: string
}

export async function testAIConfig(config: { baseUrl: string; model: string; apiKey?: string }): Promise<ConfigTestResult> {
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

export interface IngestSyncResult {
  ok: boolean
  commitSha?: string
  lessonsCount?: number
  durationMs: number
  error?: string
}

export async function syncCurriculum(githubToken?: string): Promise<IngestSyncResult> {
  const token = githubToken || useSettingsStore.getState().settings.githubToken
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) {
    headers['X-GitHub-Token'] = token
  }

  const res = await fetch('/api/ingest/sync', {
    method: 'POST',
    headers,
    body: JSON.stringify({ githubToken: token }),
  })
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
    type: string
    caption: string
    content: string
  }
  interactiveWidget?: {
    type: string
    title: string
    instruction: string
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
  miniQuiz?: Array<{
    question: string
    options: string[]
    correctIndex: number
    praise?: string
    explanation?: string
  }>
}

export async function fetchAdaptiveLesson(id: string, mode: "junior" | "plain-english"): Promise<AdaptiveLessonPayload> {
  const res = await fetch(`/api/lessons/${encodeURIComponent(id)}?mode=${encodeURIComponent(mode)}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(res.status, body?.error || `Failed to fetch adaptive lesson (${res.status})`, body)
  }
  return res.json()
}
