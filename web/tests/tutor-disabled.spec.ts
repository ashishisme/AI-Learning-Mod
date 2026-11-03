// SPEC: SPEC-008 FR-024, FR-025
import { test, expect, Page } from '@playwright/test'

const lesson = {
  id: 'tutor-test',
  module: 'Test',
  title: 'Tutor Test Lesson',
  order: 1,
  path: 'tutor-test/README.md',
  commitSha: '1234567890123456789012345678901234567890',
  blocks: [{ type: 'markdown', content: 'Sample lesson content.' }],
}

async function setup(page: Page, tutorEnabled: boolean) {
  await page.route('**/api/runtime', (route) =>
    route.fulfill({ json: { hosted: true, authRequired: false, tutorEnabled, feedbackEnabled: false } }),
  )
  await page.route('**/api/lessons/tutor-test*', (route) => route.fulfill({ json: lesson }))
}

test.describe('Tutor switched off or resting', () => {
  // FR-024 as amended 2026-11-03: the panel stays visible but greyed out, pointing to Settings.
  test('tutorEnabled false shows a greyed-out panel with no microphone, read-aloud or tutor calls', async ({ page }) => {
    let tutorCalls = 0
    await setup(page, false)
    await page.route('**/api/tutor', (route) => {
      tutorCalls++
      return route.abort()
    })
    await page.goto('/lesson/tutor-test')
    await expect(page.locator('[data-testid="lesson-title"]')).toHaveText(lesson.title)
    await expect(page.locator('[data-testid="tutor-panel"]')).toBeVisible()
    await expect(page.locator('[data-testid="tutor-setup-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="tutor-input"]')).toBeDisabled()
    await expect(page.locator('[data-testid="tutor-submit"]')).toBeDisabled()
    await expect(page.locator('[data-testid="tutor-mic-btn"]')).toHaveCount(0)
    await expect(page.locator('[data-testid="tutor-read-answer-btn"]')).toHaveCount(0)
    expect(tutorCalls).toBe(0)
    // The button goes straight to the AI settings.
    await page.locator('[data-testid="tutor-setup-btn"]').click()
    await expect(page.locator('#local-llm-enabled')).toBeVisible()
  })

  test('the resting reply appears in the answer area when the tutor is on', async ({ page }) => {
    await setup(page, true)
    await page.route('**/api/tutor', (route) =>
      route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: `data: ${JSON.stringify({ token: 'The tutor is resting until tomorrow.' })}\n\ndata: {"done":true,"cited":true}\n\ndata: [DONE]\n\n`,
      }),
    )
    await page.goto('/lesson/tutor-test')
    await page.locator('[data-testid="tutor-input"]').fill('What is a perceptron?')
    await page.locator('[data-testid="tutor-submit"]').click()
    await expect(page.locator('[data-testid="tutor-answer"]')).toContainText('The tutor is resting until tomorrow.')
  })
})
