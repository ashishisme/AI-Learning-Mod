// SPEC: FR-UI-21; AC-64 (SPEC-012 US3)
import { test, expect } from '@playwright/test'
import { bandedLesson, openKidsLesson, stubKidsLesson } from './helpers/kids-lesson'

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 140"><rect width="240" height="140" fill="#fde68a"/></svg>'

test.describe('Kids word cards (AC-64)', () => {
  test.beforeEach(async ({ page }) => {
    await stubKidsLesson(page)
    await page.route('**/brand/words/neuron-switch.svg', (r) => r.fulfill({ contentType: 'image/svg+xml', body: SVG }))
    await page.addInitScript(() => {
      const w = window as any
      w.__spoken = 0
      Object.defineProperty(window, 'speechSynthesis', {
        value: { speaking: false, speak: () => { w.__spoken++ }, cancel() {}, pause() {}, resume() {}, getVoices: () => [{ name: 'Test', lang: 'en-US', default: true }] },
        configurable: true,
      })
    })
  })

  test('a bold word opens its card, closes on Escape and returns focus', async ({ page }) => {
    await openKidsLesson(page)
    const word = page.getByTestId('word-neuron')
    await expect(word).toHaveAttribute('aria-haspopup', 'dialog')
    await expect(word).toHaveAttribute('aria-expanded', 'false')
    const box = await word.boundingBox()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)

    await word.focus()
    await page.keyboard.press('Enter')
    const card = page.getByRole('dialog', { name: 'neuron' })
    await expect(card).toBeVisible()
    await expect(card).toContainText('A tiny switch that says yes or no.')
    await expect(card.getByRole('img', { name: 'Picture: neuron' })).toBeVisible()
    await expect(card.getByRole('button', { name: /Read aloud|Listen|🔊/ }).first()).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(card).toHaveCount(0)
    await expect(word).toBeFocused()
  })

  test('close button and an outside tap close it; only one card is open', async ({ page }) => {
    await openKidsLesson(page)
    await page.getByTestId('word-neuron').click()
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(page.getByRole('dialog', { name: 'neuron' })).toHaveCount(0)
    await expect(page.getByTestId('word-neuron')).toBeFocused()

    await page.getByTestId('word-neuron').click()
    await page.mouse.click(5, 5)
    await expect(page.getByRole('dialog', { name: 'neuron' })).toHaveCount(0)

    await page.getByTestId('word-neuron').click()
    await page.getByTestId('word-team').click()
    await expect(page.getByRole('dialog')).toHaveCount(1)
    await expect(page.getByRole('dialog', { name: 'team' })).toBeVisible()
  })

  test('fits a 320 px screen and survives a missing picture', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await page.unroute('**/brand/words/neuron-switch.svg')
    await page.route('**/brand/words/neuron-switch.svg', (r) => r.fulfill({ status: 404, body: '' }))
    await openKidsLesson(page)
    await page.getByTestId('word-neuron').click()
    const card = page.getByRole('dialog', { name: 'neuron' })
    await expect(card).toContainText('A tiny switch that says yes or no.')
    await expect(card.getByRole('img')).toHaveCount(0)
    const box = await card.boundingBox()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(320)
  })

  test('muted, the card shows the muted control and speaks nothing', async ({ page }) => {
    await openKidsLesson(page, { muted: true })
    await page.getByTestId('word-neuron').click()
    const card = page.getByRole('dialog', { name: 'neuron' })
    await expect(card.getByTestId('narration-muted')).toBeVisible()
    expect(await page.evaluate(() => (window as any).__spoken)).toBe(0)
  })

  test('12+ terms become word cards only in 12-14', async ({ page }) => {
    await openKidsLesson(page, { band: '12-14' })
    await expect(page.getByTestId('word-weight')).toBeVisible()
    await openKidsLesson(page, { band: '8-11' })
    await expect(page.getByTestId('word-weight')).toHaveCount(0)
  })

  test('the same word bold twice opens only the tapped card; an outside tap returns focus', async ({ page }) => {
    const lesson = structuredClone(bandedLesson)
    lesson.sections[0].bodyMarkdown = 'A **neuron** is a switch. Each **neuron** listens to clues.'
    await stubKidsLesson(page, lesson)
    await openKidsLesson(page)
    const words = page.getByTestId('word-neuron')
    await expect(words).toHaveCount(2)
    await words.nth(1).click()
    await expect(page.getByRole('dialog')).toHaveCount(1)
    await expect(words.nth(0)).toHaveAttribute('aria-expanded', 'false')
    await page.getByTestId('big-idea').first().click({ position: { x: 2, y: 2 } })
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(words.nth(1)).toBeFocused()
  })

  test('Hindi words get their own card ids', async ({ page }) => {
    const lesson = structuredClone(bandedLesson)
    lesson.sections[0].bodyMarkdown = 'एक **न्यूरॉन** और एक **भार**।'
    lesson.sections[0].jargonBuster = [
      { term: 'न्यूरॉन', simpleExplanation: 'एक स्विच।' },
      { term: 'भार', simpleExplanation: 'कितना मायने रखता है।' },
    ]
    await stubKidsLesson(page, lesson)
    await openKidsLesson(page)
    await page.getByTestId('word-न्यूरॉन').click()
    const first = await page.getByRole('dialog').getAttribute('id')
    await page.keyboard.press('Escape')
    await page.getByTestId('word-भार').click()
    const second = await page.getByRole('dialog').getAttribute('id')
    expect(first).toMatch(/^word-card-./)
    expect(second).not.toBe(first)
  })
})
