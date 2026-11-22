// Answer options are shown in a shuffled order, so the right answer's position is never a clue (bug 2026-11-18:
// most in-lesson right answers were written first). Only the display order changes: every answer is still checked
// against its index in the lesson file, so approved content, scoring and saved results are unaffected.
import { useRef } from 'react'

// shuffledOrder returns 0..n-1 in a random order (Fisher–Yates).
export function shuffledOrder(n: number, random: () => number = Math.random): number[] {
  const order = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

// useShuffledOrder gives each question one order for as long as the page shows it, so the options never move
// while the learner is answering. A different question (or the same one in another language) gets its own order.
export function useShuffledOrder(): (key: string, n: number) => number[] {
  const orders = useRef(new Map<string, number[]>())
  return (key, n) => {
    let order = orders.current.get(key)
    if (!order || order.length !== n) {
      order = shuffledOrder(n)
      orders.current.set(key, order)
    }
    return order
  }
}
