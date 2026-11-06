// SPEC: SPEC-011 FR-UI-16, FR-UI-18, AC-54, AC-56; kids-home-brief.md
import { test, expect, Page } from '@playwright/test'

const IDS = ['1-intro', '2-symbolic', '3-neuralnetworks', '4-computervision', '5-nlp', '7-ethics']

test.use({ storageState: { cookies: [], origins: [] } })

async function asKids(page: Page, done: string[] = []) {
  await page.addInitScript((done) => {
    if (sessionStorage.getItem('kids-seeded')) return // seed once per tab, so a reload keeps later progress
    sessionStorage.setItem('kids-seeded', '1')
    localStorage.setItem('ai-foundations-audience-mode', JSON.stringify({ state: { mode: 'junior', hasChosenJourney: true }, version: 1 }))
    localStorage.setItem('ai-foundations-progress', JSON.stringify({ state: { completedLessons: Object.fromEntries(done.map((id) => [id, true])) }, version: 0 }))
  }, done)
}

test.describe('Kids home: Chip\'s Trail (SPEC-011)', () => {
  test('a first visit shows the three-journey chooser, and choosing Kids opens the trail at stop 1', async ({ page }) => {
    await page.goto('/')
    const chooser = page.getByTestId('journey-chooser')
    await expect(chooser).toBeVisible()
    for (const id of ['junior', 'plain-english', 'standard']) await expect(page.getByTestId(`journey-choice-${id}`)).toBeVisible()
    await page.getByTestId('journey-choice-junior').click()
    await expect(page.getByTestId('kids-home')).toBeVisible()
    await expect(page.getByTestId('kids-continue-button')).toHaveAttribute('href', '/lesson/1-intro')
    await page.reload()
    await expect(page.getByTestId('journey-chooser')).toHaveCount(0) // chosen once, kept
  })

  test('choosing Standard keeps today\'s home, with search', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('journey-choice-standard').click()
    await expect(page.getByTestId('search-lessons-input')).toBeVisible()
    await expect(page.getByTestId('kids-home')).toHaveCount(0)
  })

  test('six always-open stops with text statuses, and no search or module filters', async ({ page }) => {
    await asKids(page, ['1-intro', '2-symbolic'])
    await page.goto('/')
    await expect(page.getByTestId('kids-continue-button')).toHaveAttribute('href', '/lesson/3-neuralnetworks')
    await expect(page.getByTestId('kids-trail').locator('li')).toHaveCount(6)
    const statuses = await Promise.all(IDS.map((id) => page.getByTestId(`kids-stop-${id}`).getAttribute('data-status')))
    expect(statuses).toEqual(['done', 'done', 'here', 'next', 'next', 'next'])
    await expect(page.getByTestId('kids-stop-1-intro')).toContainText('Done')
    await expect(page.getByTestId('kids-stop-3-neuralnetworks')).toContainText('You are here')
    // Every stop opens, including ones not reached yet.
    await expect(page.getByTestId('kids-stop-7-ethics').getByRole('link').first()).toHaveAttribute('href', '/lesson/7-ethics')
    await expect(page.getByTestId('kids-quiz-7-ethics')).toHaveAttribute('href', '/quiz/7-ethics')
    await expect(page.getByTestId('search-lessons-input')).toHaveCount(0)
  })

  test('with every stop done, the celebration offers replay and quizzes', async ({ page }) => {
    await asKids(page, IDS)
    await page.goto('/')
    await expect(page.getByTestId('kids-celebration')).toBeVisible()
    await expect(page.getByTestId('kids-continue')).toHaveCount(0)
    await expect(page.getByTestId('kids-celebration').getByRole('link')).toHaveCount(2)
  })

  test('a failed lesson list shows Chip\'s retry message, and retry recovers', async ({ page }) => {
    await asKids(page)
    let fail = true
    await page.route('**/api/lessons', (r) => (fail ? r.fulfill({ status: 500, json: { error: 'boom' } }) : r.continue()))
    await page.goto('/')
    await expect(page.getByTestId('kids-home-error')).toBeVisible()
    fail = false
    await page.getByTestId('kids-home-error').getByRole('button').click()
    await expect(page.getByTestId('kids-home')).toBeVisible()
  })

  test('Chip hops to the new stop after a lesson is finished in this tab', async ({ page }) => {
    await asKids(page)
    await page.goto('/')
    await expect(page.getByTestId('kids-stop-1-intro').getByTestId('kids-chip-marker')).toBeVisible()
    await page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('ai-foundations-progress')!)
      raw.state.completedLessons['1-intro'] = true
      localStorage.setItem('ai-foundations-progress', JSON.stringify(raw))
    })
    await page.reload()
    const marker = page.getByTestId('kids-stop-2-symbolic').getByTestId('kids-chip-marker')
    await expect(marker).toBeVisible()
    await expect(marker).toHaveClass(/kids-hop/)
  })

  test('completing a quiz in Kids mode shows the Kids celebration with Chip cheering', async ({ page }) => {
    await asKids(page)
    await page.goto('/quiz/1-intro')
    for (let i = 0; i < 4; i++) {
      await page.locator('[data-testid^="option-"]').first().click()
      await page.locator('[data-testid="next-question-btn"]').click()
    }
    const recap = page.getByTestId('quiz-recap-card')
    await expect(recap).toBeVisible()
    await expect(recap).toHaveClass(/kids-celebrate/)
    await expect(recap.locator('.kids-cheer')).toBeVisible()
    await expect(recap.getByRole('link', { name: 'Back to Trail' })).toHaveAttribute('href', '/')
  })
})

// SPEC-011 FR-013, T011: the Kids home in Hindi, on a 360 px phone.
test('the Kids home in Hindi has Hindi chooser and trail text and fits a 360 px phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  const HI = { code: 'hi', name: 'हिन्दी', speechLang: 'hi-IN' }
  const EN = { code: 'en', name: 'English', speechLang: 'en-US' }
  await page.route('**/api/runtime', (r) => r.fulfill({ json: { hosted: false, authRequired: false, tutorEnabled: false, feedbackEnabled: false, languages: [EN, HI] } }))
  await page.addInitScript(() => {
    if (sessionStorage.getItem('hi-seeded')) return
    sessionStorage.setItem('hi-seeded', '1')
    localStorage.setItem('ai-foundations-language', JSON.stringify({ state: { code: 'hi', chosenAt: '2026-11-04T00:00:00Z' }, version: 0 }))
  })
  await page.goto('/')
  await expect(page.getByTestId('journey-chooser')).toContainText('आप कैसे सीखना चाहेंगे?')
  await page.getByTestId('journey-choice-junior').click()
  await expect(page.getByTestId('kids-stop-1-intro')).toContainText('आप यहाँ हैं')
  await expect(page.getByTestId('kids-continue-button')).toContainText('सफ़र शुरू करें')
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false)
  const small = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('[data-testid="kids-home"] a, [data-testid="kids-home"] button'))
    .filter((el) => getComputedStyle(el).display !== 'inline')
    .map((el) => el.getBoundingClientRect()).filter((r) => r.width > 0 && (r.width < 44 || r.height < 44)).length)
  expect(small).toBe(0)
})
