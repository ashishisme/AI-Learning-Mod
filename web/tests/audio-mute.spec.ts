// SPEC: FR-UI-19, AC-59 (spec 2.10.0) — muting keeps audio controls visible and silences all lesson audio.
import { test, expect } from '@playwright/test'

test.describe('Muted audio controls stay visible (AC-59)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/runtime', (r) =>
      r.fulfill({ json: { hosted: false, authRequired: false, tutorEnabled: true, feedbackEnabled: false } })
    )
    await page.route('**/api/auth/session', (r) => r.fulfill({ json: { authenticated: false } }))
    // A speech engine that counts what it is asked to say.
    await page.addInitScript(() => {
      const w = window as any
      w.__spoken = 0
      const mockSynth = {
        speaking: false,
        speak: () => { w.__spoken++ },
        cancel: () => {},
        pause: () => {},
        resume: () => {},
        getVoices: () => [{ name: 'Google US English', lang: 'en-US', default: true }],
      }
      Object.defineProperty(window, 'speechSynthesis', { value: mockSynth, configurable: true, writable: true })
    })
    await page.goto('/')
    // A learner who muted on an earlier visit.
    await page.evaluate(() => {
      localStorage.clear()
      localStorage.setItem('ai-foundations-audio-settings', JSON.stringify({
        state: { activeTrackId: null, isPlaying: false, isMuted: true, speechRate: 1, persona: 'chip', currentSentence: null },
        version: 0,
      }))
      localStorage.setItem('ai-foundations-audience-mode', JSON.stringify({
        state: { mode: 'junior', hasChosenJourney: true },
        version: 1,
      }))
    })
  })

  test('Junior lesson shows muted controls, stays silent, and one tap turns sound on', async ({ page }) => {
    await page.goto('/lesson/1-intro')

    const mutedControls = page.getByTestId('narration-muted')
    await expect(mutedControls.first()).toBeVisible()
    await expect(mutedControls.first()).toHaveText('🔇 Sound off: tap to turn on')
    // The Chip button plus at least one section button are all shown in their muted state.
    expect(await mutedControls.count()).toBeGreaterThan(1)

    // Glossary pronunciation obeys mute.
    await page.getByRole('button', { name: /^Pronounce / }).first().click()
    expect(await page.evaluate(() => (window as any).__spoken)).toBe(0)

    // One tap on the lesson page turns sound back on, without starting playback.
    await mutedControls.first().click()
    await expect(mutedControls).toHaveCount(0)
    await expect(page.locator('button', { hasText: 'Listen to Chip! 🔊' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'Read section' }).first()).toBeVisible()
    expect(await page.evaluate(() => (window as any).__spoken)).toBe(0)
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ai-foundations-audio-settings')!).state.isMuted)
    expect(saved).toBe(false)
  })

  test('Plain English lesson shows muted section controls', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('ai-foundations-audience-mode', JSON.stringify({
      state: { mode: 'plain-english', hasChosenJourney: true },
      version: 1,
    })))
    await page.goto('/lesson/1-intro')
    await expect(page.getByTestId('narration-muted').first()).toBeVisible()
    await expect(page.locator('button', { hasText: 'Read section' })).toHaveCount(0)
  })
})
