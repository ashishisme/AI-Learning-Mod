// SPEC: SPEC-006 (revise-cld-v1) FR-REV-03..14, FR-REV-08, FR-REV-22
import { test, expect } from '@playwright/test'

const kids = (page: import('@playwright/test').Page) =>
  page.locator('button[role="tab"]', { hasText: 'Kids (8–14)' }).click()
const plain = (page: import('@playwright/test').Page) =>
  page.locator('button[role="tab"]', { hasText: 'Plain English' }).click()

test.describe('SPEC-006 revise-cld-v1', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  test('stepper diagram reveals one step at a time and is keyboard operable', async ({ page }) => {
    await page.goto('/lesson/1-intro')
    await kids(page)

    const stepper = page.locator('[data-testid="stepper-diagram"]').first()
    await expect(stepper).toBeVisible()
    await expect(stepper).toHaveAttribute('aria-label', /computer is shown one dog photo/i)
    await expect(stepper.locator('[data-testid="stepper-step"]')).toHaveCount(1)

    await stepper.locator('[data-testid="stepper-next"]').focus()
    await page.keyboard.press('Enter')
    await expect(stepper.locator('[data-testid="stepper-step"]')).toHaveCount(2)

    await stepper.getByRole('button', { name: 'Show all' }).click()
    await expect(stepper.locator('[data-testid="stepper-step"]')).toHaveCount(4)
  })

  test('every rendered diagram exposes alt text (FR-REV-03)', async ({ page }) => {
    for (const lesson of ['1-intro', '2-symbolic', '3-neuralnetworks', '4-computervision', '5-nlp', '7-ethics']) {
      for (const tab of [kids, plain]) {
        await page.goto(`/lesson/${lesson}`)
        await tab(page)
        await expect(page.locator('article').first()).toBeVisible()
        // The Detailed version (with its clips) stays on screen until the chosen journey has loaded.
        await expect(page.getByTestId('clip')).toHaveCount(0)
        const figures = page.locator('article figure')
        const n = await figures.count()
        expect(n, `${lesson} should have diagrams`).toBeGreaterThan(0)
        for (let i = 0; i < n; i++) {
          const label = await figures.nth(i).getAttribute('aria-label')
          expect(label, `${lesson} figure ${i} needs alt text`).toBeTruthy()
        }
      }
    }
  })

  test('widget runs predict -> act -> compare with hints (FR-REV-10)', async ({ page }) => {
    await page.goto('/lesson/3-neuralnetworks')
    await kids(page)

    await expect(page.locator('[data-testid="widget-goal"]')).toContainText('apple')
    // Controls are locked until the learner guesses or skips
    await expect(page.locator('text=The Single Neuron Fruit Sorter')).toHaveCount(0)

    const lock = page.locator('[data-testid="widget-lock-prediction"]')
    await expect(lock).toBeDisabled()
    await page.locator('#widget-prediction').fill('sweetness matters more')
    await lock.click()

    await expect(page.locator('text=The Single Neuron Fruit Sorter')).toBeVisible()
    await page.locator('[data-testid="widget-hint-btn"]').click()
    await expect(page.locator('[data-testid="widget-hint"]')).toHaveCount(1)

    await page.locator('[data-testid="widget-check"]').click()
    const result = page.locator('[data-testid="widget-result"]')
    await expect(result).toContainText('sweetness matters more')
    await expect(result).toContainText('You trained a neuron')
  })

  test('free play skips scoring and hides the check step', async ({ page }) => {
    await page.goto('/lesson/3-neuralnetworks')
    await kids(page)
    await page.locator('[data-testid="widget-skip-predict"]').click()
    await expect(page.locator('text=The Single Neuron Fruit Sorter')).toBeVisible()
    await expect(page.locator('[data-testid="widget-check"]')).toHaveCount(0)
  })

  test('guided scaffold hides the math until asked; plain-english shows it (FR-REV: two layers)', async ({ page }) => {
    await page.goto('/lesson/3-neuralnetworks')
    await kids(page)
    await page.locator('[data-testid="widget-skip-predict"]').click()
    await expect(page.locator('text=Formula:')).toBeHidden()
    await page.locator('[data-testid="widget-show-math"]').click()
    await expect(page.locator('text=Formula:')).toBeVisible()

    await page.goto('/lesson/3-neuralnetworks')
    await plain(page)
    await page.locator('[data-testid="widget-skip-predict"]').click()
    await expect(page.locator('text=Formula:')).toBeVisible()
    await expect(page.locator('[data-testid="widget-show-math"]')).toHaveCount(0)
  })

  test('teach-it-back gives feedback (FR-REV-12)', async ({ page }) => {
    await page.goto('/lesson/2-symbolic')
    await kids(page)
    const card = page.locator('[data-testid="teach-back"]')
    await card.scrollIntoViewIfNeeded()
    await expect(card).toBeVisible()
    await card.getByRole('button').nth(1).click() // a wrong answer
    await expect(card.locator('[role="status"]')).toContainText('Good try')
  })

  test('recall warm-up appears only after the earlier lesson is completed (FR-REV-13)', async ({ page }) => {
    await page.goto('/lesson/2-symbolic')
    await kids(page)
    await expect(page.locator('[data-testid="recall-card"]')).toHaveCount(0)

    await page.evaluate(() => {
      localStorage.setItem(
        'ai-foundations-progress',
        JSON.stringify({ state: { completedLessons: { '1-intro': true } }, version: 0 })
      )
    })
    await page.reload()
    await expect(page.locator('[data-testid="recall-card"]')).toBeVisible()
    await expect(page.locator('[data-testid="recall-card"]')).toContainText('How does most AI today learn?')
  })

  test('plain-english sections show "Where you\'ll see this" (FR-REV-14)', async ({ page }) => {
    await page.goto('/lesson/1-intro')
    await plain(page)
    await expect(page.locator('[data-testid="real-world"]').first()).toContainText("Where you'll see this")
  })

  test('reduced-motion preference disables animation durations (FR-REV-08)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/lesson/1-intro')
    await kids(page)
    const duration = await page.evaluate(() => {
      const el = document.querySelector('.animate-fadeIn, .animate-pulse, .animate-bounce') || document.body
      return getComputedStyle(el).animationDuration
    })
    expect(['0.001ms', '1e-06s', '0s']).toContain(duration)
  })

  test('microphone needs an adult confirmation before it starts (FR-REV-22)', async ({ page }) => {
    await page.addInitScript(() => {
      ;(window as unknown as Record<string, unknown>).webkitSpeechRecognition = function () {
        return { start() {}, stop() {} }
      }
    })
    await page.goto('/lesson/1-intro')
    const mic = page.locator('[data-testid="tutor-mic-btn"]')
    await expect(mic).toBeVisible()
    await mic.click()
    await expect(page.locator('[data-testid="mic-consent"]')).toBeVisible()
    await expect(page.locator('[data-testid="mic-consent"]')).toContainText('may be sent')
    await page.locator('[data-testid="mic-consent-accept"]').click()
    await expect(page.locator('[data-testid="mic-consent"]')).toHaveCount(0)
  })
})
