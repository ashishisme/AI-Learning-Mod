import { Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// SPEC-012: a banded Kids lesson served as lesson 3, for the Kids lesson tests.
export const bandedLesson = JSON.parse(readFileSync(new URL('../fixtures/kids-banded-lesson.json', import.meta.url), 'utf8'))

export const AUDIENCE_STORE = 'ai-foundations-audience-mode'

export async function stubKidsLesson(page: Page, lesson: object = bandedLesson) {
  await page.route('**/api/runtime', (r) =>
    r.fulfill({ json: { hosted: false, authRequired: false, tutorEnabled: true, feedbackEnabled: false } })
  )
  await page.route('**/api/auth/session', (r) => r.fulfill({ json: { authenticated: false } }))
  await page.route(
    (url) => url.pathname === '/api/lessons/3-neuralnetworks' && url.searchParams.get('mode') === 'junior',
    (r) => r.fulfill({ json: lesson })
  )
}

export async function openKidsLesson(page: Page, opts: { band?: '8-11' | '12-14'; muted?: boolean } = {}) {
  await page.goto('/')
  await page.evaluate(([key, band, muted]) => {
    localStorage.clear()
    localStorage.setItem(key as string, JSON.stringify({ state: { mode: 'junior', hasChosenJourney: true, ageBand: band }, version: 2 }))
    if (muted) {
      localStorage.setItem('ai-foundations-audio-settings', JSON.stringify({
        state: { activeTrackId: null, isPlaying: false, isMuted: true, speechRate: 1, persona: 'chip', currentSentence: null },
        version: 0,
      }))
    }
  }, [AUDIENCE_STORE, opts.band ?? '8-11', !!opts.muted] as const)
  await page.goto('/lesson/3-neuralnetworks')
}
