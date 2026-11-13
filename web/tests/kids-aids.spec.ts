// SPEC: FR-UI-22, FR-UI-23, FR-UI-24, FR-UI-25; AC-65..AC-68 (SPEC-012 US1, US4)
import { test, expect, Page } from '@playwright/test'
import { bandedLesson, openKidsLesson, stubKidsLesson } from './helpers/kids-lesson'

test.describe('Kids lesson aids', () => {
  test.beforeEach(async ({ page }) => {
    await stubKidsLesson(page)
  })

  test('each card opens with its big idea and picture; more is closed; recap comes before the quiz (AC-66)', async ({ page }) => {
    await openKidsLesson(page)
    const first = page.locator('article').first()
    const order = await first.evaluate((el) => {
      const pos = (sel: string) => {
        const n = el.querySelector(sel)
        return n ? Array.from(el.querySelectorAll('*')).indexOf(n) : -1
      }
      return { idea: pos('[data-testid="big-idea"]'), picture: pos('[data-testid="stepper-diagram"]'), body: pos('.prose') }
    })
    expect(order.idea).toBeGreaterThanOrEqual(0)
    expect(order.idea).toBeLessThan(order.picture)
    expect(order.picture).toBeLessThan(order.body)

    const more = page.getByTestId('want-to-know-more')
    await expect(more).not.toHaveAttribute('open', '')
    await more.locator('summary').click()
    await expect(more).toHaveAttribute('open', '')
    await expect(more).toContainText('1950s')

    const recap = page.getByTestId('lesson-recap')
    await expect(recap.locator('li')).toHaveCount(3)
    const recapY = (await recap.boundingBox())!.y
    const quizY = (await page.getByText('A neuron is like a…').boundingBox())!.y
    const lastCardY = (await page.locator('article').last().boundingBox())!.y
    expect(recapY).toBeGreaterThan(lastCardY)
    expect(recapY).toBeLessThan(quizY)
  })

  test('check-ins react and leave saved progress unchanged; teach-back is tap-only (AC-66)', async ({ page }) => {
    await openKidsLesson(page)
    const saved = () => page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage).sort())))
    const before = await saved()
    const checkIn = page.getByTestId('check-in-switch')
    await checkIn.getByRole('button', { name: 'A whole story' }).click()
    await expect(checkIn.getByRole('status')).toContainText('Just yes or no!')
    await expect(checkIn.getByRole('status')).not.toContainText('Nice one!')
    expect(await saved()).toBe(before)

    const teach = page.getByTestId('teach-back')
    const options = await teach.getByRole('button').count()
    expect(options).toBeGreaterThanOrEqual(2)
    expect(options).toBeLessThanOrEqual(3)
    await expect(teach.getByRole('textbox')).toHaveCount(0)
  })

  test("a right check-in answer shows Chip's praise (FR-UI-23)", async ({ page }) => {
    await openKidsLesson(page)
    const checkIn = page.getByTestId('check-in-switch')
    await checkIn.getByRole('button', { name: 'Yes or no' }).click()
    await expect(checkIn.getByRole('status')).toContainText('Nice one!')
  })

  test('8-11 widgets are guided with a hint; 12-14 keeps the written scaffold (AC-67)', async ({ page }) => {
    await openKidsLesson(page)
    const body = page.locator('article').nth(1).getByTestId('widget-body')
    await expect(body).toHaveClass(/scaffold-guided/)
    await expect(page.locator('article').nth(1).getByTestId('widget-hint-btn')).toBeVisible()
    await openKidsLesson(page, { band: '12-14' })
    await expect(page.locator('article').nth(1).getByTestId('widget-body')).toHaveClass(/scaffold-standard/)
  })

  test('stepper Play advances and Pause stops (AC-65)', async ({ page }) => {
    await page.clock.install()
    await openKidsLesson(page)
    const stepper = page.getByTestId('stepper-diagram').first()
    await expect(stepper.getByTestId('stepper-step')).toHaveCount(1)
    await stepper.getByTestId('stepper-play').click()
    await page.clock.runFor(3100)
    await expect(stepper.getByTestId('stepper-step')).toHaveCount(2)
    await stepper.getByTestId('stepper-pause').click()
    await page.clock.runFor(6500)
    await expect(stepper.getByTestId('stepper-step')).toHaveCount(2)
    const box = await stepper.getByTestId('stepper-play').boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)
  })

  test('under reduced motion there is no Play, and Next still works (AC-65)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openKidsLesson(page)
    const stepper = page.getByTestId('stepper-diagram').first()
    await expect(stepper.getByTestId('stepper-play')).toHaveCount(0)
    await stepper.getByTestId('stepper-next').click()
    await expect(stepper.getByTestId('stepper-step')).toHaveCount(2)
  })
})

// FR-UI-25: a recording has no sentence events, so the sentence is estimated from playback progress.
test.describe('Read-along for recordings (AC-68)', () => {
  const EN = { code: 'en', name: 'English', speechLang: 'en-US', status: 'approved' }
  const HI = { code: 'hi', name: 'हिन्दी', speechLang: 'hi-IN', status: 'approved' }

  async function hindiRecordedLesson(page: Page) {
    await page.route('**/api/runtime', (r) => r.fulfill({ json: { hosted: false, authRequired: false, tutorEnabled: false, feedbackEnabled: false, languages: [EN, HI] } }))
    await page.route('**/api/auth/session', (r) => r.fulfill({ json: { authenticated: false } }))
    const lesson = { ...bandedLesson, sections: [{ ...bandedLesson.sections[0], bigIdea: undefined, chipQuote: undefined, bodyMarkdown: 'पहला वाक्य है। दूसरा वाक्य है। तीसरा वाक्य है।' }] }
    await page.route((url) => url.pathname === '/api/lessons/3-neuralnetworks' && url.searchParams.get('mode') === 'junior', (r) =>
      r.fulfill({ json: lesson, headers: { 'Content-Language': 'hi' } })
    )
    const key = '3-neuralnetworks/junior/section-switch'
    await page.route('**/api/audio/hi/manifest.json', (r) => r.fulfill({ json: { language: 'hi', tracks: { [key]: { chip: { file: 'a.mp3', hash: 'h', bytes: 1 } } } } }))
    await page.route('**/api/audio/hi/**/*.mp3', () => {})
    await page.addInitScript(() => {
      localStorage.setItem('ai-foundations-language', JSON.stringify({ state: { code: 'hi', chosenAt: '2026-11-03T00:00:00Z' }, version: 0 }))
      localStorage.setItem('ai-foundations-audience-mode', JSON.stringify({ state: { mode: 'junior', hasChosenJourney: true, ageBand: '8-11' }, version: 2 }))
      localStorage.setItem('ai-foundations-audio-settings', JSON.stringify({ state: { isMuted: false, speechRate: 1, persona: 'chip' }, version: 0 }))
      const w = window as any
      // A fake player whose position the test moves.
      HTMLMediaElement.prototype.play = function () { w.__player = this; return Promise.resolve() }
      HTMLMediaElement.prototype.pause = function () {}
      Object.defineProperty(HTMLMediaElement.prototype, 'duration', { get() { return 30 }, configurable: true })
      Object.defineProperty(window, 'speechSynthesis', { value: { speaking: false, speak() {}, cancel() {}, pause() {}, resume() {}, getVoices: () => [{ name: 'Lekha', lang: 'hi-IN' }] }, configurable: true })
    })
    await page.goto('/lesson/3-neuralnetworks')
  }

  const moveTo = (page: Page, seconds: number) =>
    page.evaluate((s) => {
      const p = (window as any).__player as HTMLMediaElement
      Object.defineProperty(p, 'currentTime', { value: s, configurable: true })
      p.dispatchEvent(new Event('timeupdate'))
    }, seconds)

  test('the marked sentence follows the recording', async ({ page }) => {
    await hindiRecordedLesson(page)
    await page.locator('article').first().getByRole('button', { name: 'यह भाग पढ़ें' }).first().click()
    await expect.poll(() => page.evaluate(() => !!(window as any).__player)).toBe(true)
    await moveTo(page, 1)
    const reading = page.locator('[data-reading="true"]')
    await expect(reading).toHaveCount(1)
    const first = await reading.innerText()
    await moveTo(page, 29)
    await expect(reading).not.toHaveText(first)
    await expect(reading).toContainText('तीसरा')
  })
})
