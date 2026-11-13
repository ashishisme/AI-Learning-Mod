// SPEC: FR-UI-16 (amended 2.11.0), FR-UI-20; AC-62, AC-63 (SPEC-012 US2)
import { test, expect, Page } from '@playwright/test'
import banded from './fixtures/kids-banded-lesson.json' with { type: 'json' }

const STORE = 'ai-foundations-audience-mode'

async function stubApp(page: Page, lesson: object = banded) {
  await page.route('**/api/runtime', (r) =>
    r.fulfill({ json: { hosted: false, authRequired: false, tutorEnabled: true, feedbackEnabled: true } })
  )
  await page.route('**/api/auth/session', (r) => r.fulfill({ json: { authenticated: false } }))
  await page.route(
    (url) => url.pathname === '/api/lessons/3-neuralnetworks' && url.searchParams.get('mode') === 'junior',
    (r) => r.fulfill({ json: lesson })
  )
}

async function seed(page: Page, state: object, version = 2) {
  await page.goto('/')
  await page.evaluate(([key, s, v]) => {
    localStorage.clear()
    localStorage.setItem(key as string, JSON.stringify({ state: s, version: v }))
  }, [STORE, state, version] as const)
}

test.describe('Kids age bands (AC-62, AC-63)', () => {
  test('choosing Kids asks for a band; skipping keeps 8-11', async ({ page }) => {
    await stubApp(page)
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.getByTestId('journey-choice-junior').click()
    await expect(page.getByTestId('age-band-8-11')).toBeVisible()
    await expect(page.getByTestId('age-band-12-14')).toBeVisible()
    for (const id of ['age-band-8-11', 'age-band-12-14', 'age-band-skip']) {
      const box = await page.getByTestId(id).boundingBox()
      expect(box!.height).toBeGreaterThanOrEqual(44)
    }
    // Back returns to the three journeys without choosing one.
    await page.getByTestId('age-band-back').click()
    await expect(page.getByTestId('journey-choice-plain-english')).toBeVisible()
    await page.getByTestId('journey-choice-junior').click()
    await page.getByTestId('age-band-skip').click()
    await expect(page.getByTestId('age-band-step')).toHaveCount(0)
    const saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), STORE)
    expect(saved.state).toMatchObject({ mode: 'junior', hasChosenJourney: true, ageBand: '8-11' })
    expect(saved.version).toBe(2)
  })

  test('picking 12-14 in the chooser saves it', async ({ page }) => {
    await stubApp(page)
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.getByTestId('journey-choice-junior').click()
    await page.getByTestId('age-band-12-14').click()
    const saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).state, STORE)
    expect(saved).toMatchObject({ mode: 'junior', ageBand: '12-14' })
  })

  test('a version 1 saved choice migrates to 8-11 and keeps its mode', async ({ page }) => {
    await stubApp(page)
    await seed(page, { mode: 'junior', hasChosenJourney: true }, 1)
    await page.reload()
    await expect(page.getByTestId('journey-chooser')).toHaveCount(0)
    const saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), STORE)
    expect(saved.state).toMatchObject({ mode: 'junior', hasChosenJourney: true, ageBand: '8-11' })
  })

  test('8-11 sees the core only; 12-14 sees the 12+ layer; switching keeps the page', async ({ page }) => {
    await stubApp(page)
    await seed(page, { mode: 'junior', hasChosenJourney: true, ageBand: '8-11' })
    await page.goto('/lesson/3-neuralnetworks')

    await expect(page.getByText('If enough clues say yes, it turns on.')).toBeVisible()
    await expect(page.getByText('how much the switch cares about it')).toHaveCount(0)
    await expect(page.getByText(/TEEN-ONLY/)).toHaveCount(0)
    await expect(page.getByText(/TEEN-QUESTION/)).toHaveCount(0)
    await expect(page.getByTestId('want-to-know-more')).not.toHaveAttribute('open', '')

    // Change the band from the Voice Studio while the lesson is open.
    await page.getByTestId('voice-studio-trigger').first().click()
    await page.getByTestId('voice-studio-age-band').getByTestId('age-band-12-14').click()

    await expect(page.getByText('how much the switch cares about it')).toBeVisible()
    await expect(page.getByText(/TEEN-ONLY/)).toBeVisible()
    await expect(page.getByText('A big team of switches can spot ears')).toHaveCount(0)
    await expect(page.getByText(/TEEN-QUESTION/)).toBeVisible()
    await expect(page.getByTestId('want-to-know-more')).toHaveAttribute('open', '')
    await expect(page).toHaveURL(/\/lesson\/3-neuralnetworks/)
  })

  test('the band is never sent anywhere, including feedback', async ({ page }) => {
    // A signed-in hosted learner, so the feedback form is on (as in feedback.spec.ts).
    const session = { authenticated: true, betaId: 'BETA-7KQ3-M9XP', label: 'School A', expiresAt: '2027-01-01T08:30:00Z', daysLeft: 61, expiringSoon: false }
    await stubApp(page)
    await page.route('**/api/runtime', (r) => r.fulfill({ json: { hosted: true, authRequired: true, tutorEnabled: false, feedbackEnabled: true } }))
    await page.route('**/api/auth/session', (r) => r.fulfill({ json: session }))
    let feedbackBody = ''
    await page.route('**/api/feedback', (r) => {
      feedbackBody = r.request().postData() ?? ''
      return r.fulfill({ status: 201, json: { ok: true } })
    })
    await seed(page, { mode: 'junior', hasChosenJourney: true, ageBand: '12-14' })
    const leaks: string[] = []
    page.on('request', (req) => {
      const text = [req.url(), JSON.stringify(req.headers()), req.postData() ?? ''].join(' ')
      if (/ageBand|8-11|12-14/.test(text)) leaks.push(req.url())
    })
    await page.goto('/lesson/3-neuralnetworks')
    await expect(page.getByText(/TEEN-ONLY/)).toBeVisible()
    await page.getByRole('button', { name: 'Feedback' }).click()
    await page.getByRole('radio', { name: '4' }).check()
    await page.getByRole('textbox', { name: 'Message (optional)' }).fill('Too hard for me')
    await page.getByRole('button', { name: 'Send feedback' }).click()
    await expect.poll(() => feedbackBody).toContain('Too hard for me')
    expect(feedbackBody).not.toMatch(/ageBand|8-11|12-14/)
    expect(leaks).toEqual([])
  })

  test('an unbanded lesson looks the same in both bands', async ({ page }) => {
    const { bands: _b, ...plain } = banded as Record<string, unknown>
    await stubApp(page, plain)
    const texts: string[] = []
    for (const band of ['8-11', '12-14']) {
      await seed(page, { mode: 'junior', hasChosenJourney: true, ageBand: band })
      await page.goto('/lesson/3-neuralnetworks')
      await expect(page.getByText('Brain Switches').first()).toBeVisible()
      texts.push(await page.locator('main').innerText())
    }
    expect(texts[1]).toBe(texts[0])
    expect(texts[0]).not.toMatch(/TEEN-ONLY/)
  })
})
