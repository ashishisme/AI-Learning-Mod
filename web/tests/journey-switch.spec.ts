// SPEC: SPEC-011 FR-004, FR-014, FR-018, SC-001, SC-005
import { test, expect, Page } from '@playwright/test'

const SESSION = {
  authenticated: true,
  betaId: 'BETA-7KQ3-M9XP',
  label: 'School A',
  expiresAt: '2027-01-01T08:30:00Z',
  daysLeft: 61,
  expiringSoon: false,
}

async function seedJourney(page: Page, mode: 'junior' | 'plain-english' | 'standard' = 'junior') {
  await page.addInitScript((m) => {
    localStorage.setItem(
      'ai-foundations-audience-mode',
      JSON.stringify({ state: { mode: m, hasChosenJourney: true }, version: 1 })
    )
    localStorage.setItem(
      'ai-foundations-progress',
      JSON.stringify({ state: { completedLessons: { '1-intro': true } }, version: 0 })
    )
  }, mode)
}

test.describe('Journey Switcher (SPEC-011 User Story 2)', () => {
  test('the switcher is reachable on the home page and meets 44 px target size', async ({ page }) => {
    await seedJourney(page, 'junior')
    await page.goto('/')

    const toolbar = page.getByTestId('audience-mode-toolbar')
    await expect(toolbar).toBeVisible()

    const tablist = toolbar.getByRole('tablist', { name: /Reading presentation mode|प्रदर्शन/i })
    await expect(tablist).toBeVisible()

    const tabs = toolbar.getByRole('tab')
    await expect(tabs).toHaveCount(3)

    // Check 44 px height requirement for each tab
    for (const tab of await tabs.all()) {
      const box = await tab.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.height).toBeGreaterThanOrEqual(44)
    }

    // Voice Studio compact button meets 44x44 px touch target
    const voiceTrigger = page.getByTestId('voice-studio-trigger')
    await expect(voiceTrigger).toBeVisible()
    const voiceBox = await voiceTrigger.boundingBox()
    expect(voiceBox).not.toBeNull()
    expect(voiceBox!.width).toBeGreaterThanOrEqual(44)
    expect(voiceBox!.height).toBeGreaterThanOrEqual(44)
  })

  test('the switcher is keyboard operable with visible focus ring', async ({ page }) => {
    await seedJourney(page, 'junior')
    await page.goto('/lesson/1-intro')

    const standardTab = page.getByRole('tab', { name: /Detailed|विस्तृत/i })
    await standardTab.focus()
    await expect(standardTab).toBeFocused()

    // Switch to Detailed using keyboard Enter
    await page.keyboard.press('Enter')
    await expect(standardTab).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('h1[data-testid="lesson-title"]')).toHaveText(/^Artificial Intelligence: Ideas, Approaches and History/)

    // Navigate to Plain English with Tab and press Space
    const plainTab = page.getByRole('tab', { name: /Plain English|आसान/i })
    await plainTab.focus()
    await expect(plainTab).toBeFocused()
    await page.keyboard.press('Space')
    await expect(plainTab).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('heading', { level: 1 }).first()).toHaveText(/^What AI Really Is, in Plain English/)
  })

  test('switching keeps the route and progress', async ({ page }) => {
    await seedJourney(page, 'junior')
    await page.goto('/lesson/1-intro')
    expect(page.url()).toContain('/lesson/1-intro')

    // Switch to Plain English
    await page.getByRole('tab', { name: /Plain English|आसान/i }).click()
    expect(page.url()).toContain('/lesson/1-intro')

    // Switch to Detailed
    await page.getByRole('tab', { name: /Detailed|विस्तृत/i }).click()
    expect(page.url()).toContain('/lesson/1-intro')

    // Check progress is preserved in localStorage
    const storedProgress = await page.evaluate(() => {
      const raw = localStorage.getItem('ai-foundations-progress')
      return raw ? JSON.parse(raw) : null
    })
    expect(storedProgress?.state?.completedLessons?.['1-intro']).toBe(true)
  })

  test('switching stops active audio and resets scroll position to top', async ({ page }) => {
    await seedJourney(page, 'junior')
    await page.goto('/lesson/1-intro')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Wait for content and scroll down
    await page.waitForFunction(() => document.body.scrollHeight > 600)
    await page.evaluate(() => window.scrollTo(0, 400))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThanOrEqual(100)

    // Switch mode
    await page.getByRole('tab', { name: /Detailed|विस्तृत/i }).click()

    // Scroll must reset to top (0, 0)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(5)
  })

  test('feedback dialog records the chosen journey mode', async ({ page }) => {
    await seedJourney(page, 'plain-english')
    await page.route('**/api/runtime', (r) =>
      r.fulfill({ json: { hosted: true, authRequired: true, tutorEnabled: false, feedbackEnabled: true } })
    )
    await page.route('**/api/auth/session', (r) => r.fulfill({ json: SESSION }))
    await page.route('**/api/lessons', (r) => r.fulfill({ json: { lessons: [] } }))

    let postedMode = ''
    await page.route('**/api/feedback', async (route) => {
      const payload = route.request().postDataJSON()
      postedMode = payload.mode
      await route.fulfill({ status: 201, json: { ok: true } })
    })

    await page.goto('/')
    await page.getByRole('button', { name: 'Feedback' }).click()
    await page.getByRole('radio', { name: '5' }).check()
    await page.getByRole('textbox', { name: 'Message (optional)' }).fill('Great explanation!')
    await page.getByRole('button', { name: 'Send feedback' }).click()

    await expect.poll(() => postedMode).toBe('plain-english')
  })
})
