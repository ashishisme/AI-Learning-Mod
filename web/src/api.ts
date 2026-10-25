// SPEC: FR-CNT-01, FR-CNT-02, FR-TUT-01, FR-TUT-07, FR-TUT-08, NFR-REL-01, NFR-REL-02
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

export async function askTutor(lessonId: string, question: string): Promise<TutorResponse> {
  const res = await fetch('/api/tutor', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ lessonId, question }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(res.status, body?.error || `Tutor error (${res.status})`, body)
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
