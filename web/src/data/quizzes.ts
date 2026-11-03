// SPEC: FR-QZ-01, FR-QZ-02, FR-QZ-03, FR-QZ-04; SPEC-009 FR-007, contracts/content-files.md "quizzes"
// Quiz content lives in per-language JSON (quizzes/<code>.json). English is bundled; other languages
// are separate chunks, and any quiz a language lacks falls back to English (FR-009).
import en from './quizzes/en.json'

export interface QuizOption {
  text: string
}

export interface QuizQuestion {
  id: string
  prompt: string
  options: string[]
  correctIndex: number
  rationale: string
  hintKeyword: string
}

export interface LessonQuiz {
  lessonId: string
  title: string
  description: string
  questions: QuizQuestion[]
}

export type Quizzes = Record<string, LessonQuiz>

export const ENGLISH_QUIZZES: Quizzes = en as Quizzes

const loaders = import.meta.glob<{ default: Quizzes }>(['./quizzes/*.json', '!./quizzes/en.json'])

export async function loadQuizzes(code: string): Promise<Quizzes> {
  const load = loaders[`./quizzes/${code}.json`]
  if (!load) return ENGLISH_QUIZZES
  try {
    return { ...ENGLISH_QUIZZES, ...(await load()).default }
  } catch {
    return ENGLISH_QUIZZES
  }
}
