// SPEC: FR-PRG-01, FR-PRG-02, FR-PRG-03, NFR-PRV-01, DC-01
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
