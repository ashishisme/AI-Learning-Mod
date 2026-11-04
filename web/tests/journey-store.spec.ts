// SPEC: SPEC-011 FR-UI-16, FR-005, SC-002, AC-54
import { test, expect, Page } from '@playwright/test'

const MODE_KEY = 'ai-foundations-audience-mode'
const OTHER = {
  'ai-foundations-progress': JSON.stringify({ state: { completedLessons: { '1-intro': true } }, version: 0 }),
  'ai-foundations-theme': JSON.stringify({ state: { theme: 'dark' }, version: 0 }),
  'ai-foundations-language': JSON.stringify({ state: { code: 'en', chosenAt: '2026-11-04T00:00:00Z' }, version: 0 }),
}

async function seed(page: Page, mode: unknown) {
  await page.addInitScript(({ key, mode, other }) => {
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    for (const [k, v] of Object.entries(other)) localStorage.setItem(k, v as string)
    if (mode !== undefined) localStorage.setItem(key, JSON.stringify({ state: { mode }, version: 0 }))
  }, { key: MODE_KEY, mode, other: OTHER })
}

const stored = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), MODE_KEY)

test.describe('Journey preference (SPEC-011)', () => {
  for (const mode of ['standard', 'junior', 'plain-english']) {
    test(`a saved "${mode}" mode from an earlier release is kept and counts as chosen`, async ({ page }) => {
      await seed(page, mode)
      await page.goto('/')
      await expect(page.locator('[data-journey]')).toHaveAttribute('data-journey', mode)
      await expect.poll(async () => (await stored(page))?.version).toBe(1)
      expect((await stored(page)).state).toMatchObject({ mode, hasChosenJourney: true })
      // Nothing else is touched.
      for (const [k, v] of Object.entries(OTHER)) expect(await page.evaluate((k) => localStorage.getItem(k), k)).toBe(v)
      // A second load leaves it as it is.
      await page.reload()
      expect((await stored(page)).state).toMatchObject({ mode, hasChosenJourney: true })
    })
  }

  test('a malformed saved mode falls back to Standard and is treated as not chosen', async ({ page }) => {
    await seed(page, 'grown-up')
    await page.goto('/')
    await expect(page.locator('[data-journey]')).toHaveAttribute('data-journey', 'standard')
    await expect.poll(async () => (await stored(page))?.state?.hasChosenJourney).toBe(false)
  })

  test('with nothing saved the app starts on Standard, not yet chosen', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-journey]')).toHaveAttribute('data-journey', 'standard')
    const s = await stored(page)
    expect(s === null || s.state.hasChosenJourney === false).toBe(true)
  })
})
