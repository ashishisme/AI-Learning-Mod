// SPEC: FR-UI-28 (SPEC-014 FR-010). Muting clips lasts for the visit: this store is never persisted.
import { create } from 'zustand'

interface ClipState {
  clipsMuted: boolean
  toggleClipsMuted: () => void
}

export const useClipStore = create<ClipState>((set) => ({
  clipsMuted: false,
  toggleClipsMuted: () => set((s) => ({ clipsMuted: !s.clipsMuted })),
}))
