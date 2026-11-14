// SPEC: FR-UI-26, AC-69 (spec 2.12.0), issue #3 — Read section buttons in Standard lessons.
import { test, expect } from '@playwright/test'

test.describe('Standard lessons can be listened to (AC-69)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/runtime', (r) =>
      r.fulfill({ json: { hosted: false, authRequired: false, tutorEnabled: false, feedbackEnabled: false } })
    )
    await page.route('**/api/auth/session', (r) => r.fulfill({ json: { authenticated: false } }))
    // SPEC-013: every lesson now has our Detailed version. These checks cover the Markdown view, which
    // the page shows when the server answers ?mode=detailed with the standard lesson (no Detailed file).
    await page.route(/\/api\/lessons\/[^/?]+\?mode=detailed/, (route) => {
      const url = new URL(route.request().url())
      url.searchParams.delete('mode')
      return route.continue({ url: url.toString() })
    })
    // A speech engine that records what it is asked to say and how often it is stopped.
    await page.addInitScript(() => {
      const w = window as any
      w.__said = [] as string[]
      w.__cancels = 0
      const mockSynth = {
        speaking: false,
        speak: (u: { text: string }) => { w.__said.push(u.text) },
        cancel: () => { w.__cancels++ },
        pause: () => {},
        resume: () => {},
        getVoices: () => [{ name: 'Google US English', lang: 'en-US', default: true }],
      }
      Object.defineProperty(window, 'speechSynthesis', { value: mockSynth, configurable: true, writable: true })
      // A plain utterance, so the fake voice object can be assigned to it.
      w.SpeechSynthesisUtterance = class { text: string; constructor(text: string) { this.text = text } }
    })
  })

  test('each heading has one Read section button that reads its own text without code', async ({ page }) => {
    await page.goto('/lesson/2-symbolic')
    const content = page.getByTestId('lesson-content')
    await expect(content.locator('h1, h2, h3').first()).toBeVisible()

    const headings = content.locator('h1, h2, h3')
    const buttons = content.getByTestId('standard-read-section').getByRole('button')
    await expect(buttons).toHaveCount(await headings.count())

    const code = (await content.locator('pre code').first().innerText()).split('\n').find((l) => l.trim().length > 8)!
    const heading = (await headings.nth(1).innerText()).trim()

    await buttons.nth(1).click()
    await expect(buttons.nth(1)).toHaveAttribute('aria-label', 'Stop reading section')
    await expect.poll(() => page.evaluate(() => (window as any).__said.join(' '))).toContain(heading)

    // Reading every section never reads code aloud.
    for (let i = 0; i < (await buttons.count()); i++) await buttons.nth(i).click()
    await page.waitForTimeout(500)
    const all = (await page.evaluate(() => (window as any).__said.join(' '))) as string
    expect(all).not.toContain(code.trim())
    expect(all).not.toContain('```')
  })

  test('starting a second section stops the first', async ({ page }) => {
    await page.goto('/lesson/1-intro')
    const buttons = page.getByTestId('lesson-content').getByTestId('standard-read-section').getByRole('button')
    await buttons.nth(0).click()
    await expect(buttons.nth(0)).toHaveAttribute('aria-label', 'Stop reading section')
    const cancels = (await page.evaluate(() => (window as any).__cancels)) as number

    await buttons.nth(1).click()
    await expect(buttons.nth(1)).toHaveAttribute('aria-label', 'Stop reading section')
    await expect(buttons.nth(0)).toHaveAttribute('aria-label', 'Read section')
    expect(await page.evaluate(() => (window as any).__cancels)).toBeGreaterThan(cancels)
  })
})
