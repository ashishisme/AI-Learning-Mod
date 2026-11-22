import { test, expect } from '@playwright/test'

// SPEC: AC-24 (FR-UI-07): With /api/tutor returning 503, the tutor panel shows "Tutor offline" and the input is disabled.
test.describe('Tutor Panel Acceptance', () => {
  test('AC-24: with /api/tutor returning 503, tutor panel shows "Tutor offline" and input is disabled', async ({ page }) => {
    await page.route('**/api/lessons/tutor-test?*', (route) =>
      route.fulfill({
        json: {
          lessonId: 'tutor-test',
          mode: 'detailed',
          origin: 'own',
          title: 'Tutor Test Lesson',
          sections: [{ id: 's1', heading: 'One', bodyMarkdown: 'Lesson content here.' }],
        },
      })
    )

    // Mock /api/tutor to return 503
    await page.route('**/api/tutor', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'tutor disabled' }),
      })
    })

    await page.goto('/lesson/tutor-test')

    const input = page.locator('[data-testid="tutor-input"]')
    const submitBtn = page.locator('[data-testid="tutor-submit"]')

    await input.fill('What is machine learning?')
    await submitBtn.click()

    // Expect "Tutor offline" to be shown
    const offlineMsg = page.locator('[data-testid="tutor-offline-message"]')
    await expect(offlineMsg).toBeVisible()
    await expect(offlineMsg).toContainText('Tutor offline')

    // Expect input to be disabled
    await expect(input).toBeDisabled()
  })

  // SPEC: FR-UI-12, FR-TUT-11: Progressive SSE token streaming in UI
  test('FR-UI-12: progressively renders streaming SSE tokens with cursor', async ({ page }) => {
    await page.route('**/api/lessons/streaming-test?*', (route) =>
      route.fulfill({
        json: {
          lessonId: 'streaming-test',
          mode: 'detailed',
          origin: 'own',
          title: 'Perceptrons',
          sections: [{ id: 's1', heading: 'One', bodyMarkdown: 'Sample perceptron content.' }],
        },
      })
    )

    // Mock streaming SSE response
    await page.route('**/api/tutor', async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
        body: 'data: {"token":"According "}\n\ndata: {"token":"to "}\n\ndata: {"token":"[Lesson § Perceptrons], "}\n\ndata: {"token":"weights are learned."}\n\ndata: {"done":true,"cited":true}\n\ndata: [DONE]\n\n',
      })
    })

    await page.goto('/lesson/streaming-test')

    const input = page.locator('[data-testid="tutor-input"]')
    const submitBtn = page.locator('[data-testid="tutor-submit"]')

    await input.fill('How do weights work?')
    await submitBtn.click()

    // Verify answer renders streaming tokens
    const answer = page.locator('[data-testid="tutor-answer"]')
    await expect(answer).toBeVisible()
    await expect(answer).toContainText('According to [Lesson § Perceptrons], weights are learned.')
  })

  test('FR-UI-07: handles non-fatal inline errors and keeps input enabled for retries', async ({ page }) => {
    await page.route('**/api/lessons/retry-test?*', (route) =>
      route.fulfill({
        json: {
          lessonId: 'retry-test',
          mode: 'detailed',
          origin: 'own',
          title: 'Retry Test Lesson',
          sections: [{ id: 's1', heading: 'One', bodyMarkdown: 'Lesson content here.' }],
        },
      })
    )

    // 1. First request returns 504 Gateway Timeout
    let requestCount = 0
    await page.route('**/api/tutor', async (route) => {
      requestCount++
      if (requestCount === 1) {
        await route.fulfill({
          status: 504,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'tutor timeout' }),
        })
        return
      }
      // 2. Second request succeeds
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        body: 'data: {"token":"[Lesson § Retry] Recovered successfully."}\n\ndata: {"done":true,"cited":true}\n\ndata: [DONE]\n\n',
      })
    })

    await page.goto('/lesson/retry-test')

    const input = page.locator('[data-testid="tutor-input"]')
    const submitBtn = page.locator('[data-testid="tutor-submit"]')

    // Submit first question -> Expect inline error
    await input.fill('First attempt')
    await submitBtn.click()

    const errorBox = page.locator('[data-testid="tutor-error"]')
    await expect(errorBox).toBeVisible()
    await expect(errorBox).toContainText('tutor timeout')

    // Input remains enabled for retry per FR-UI-07
    await expect(input).toBeEnabled()

    // Submit second question -> Expect recovery
    await input.fill('Second attempt')
    await submitBtn.click()

    const answer = page.locator('[data-testid="tutor-answer"]')
    await expect(answer).toBeVisible()
    await expect(answer).toContainText('Recovered successfully')
  })

  // SPEC-013 US3 scenario 4 (T046): on our Detailed lesson the tutor is asked about the Detailed version,
  // and its answer cites a Detailed section heading.
  test('a Detailed lesson asks the tutor to ground on the Detailed version', async ({ page }) => {
    let sent: { mode?: string; lessonId?: string } = {}
    await page.route('**/api/tutor', async (route) => {
      sent = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: 'data: {"token":"[Artificial Intelligence § Testing for Intelligence: The Imitation Game] A judge chats with both."}\n\ndata: {"done":true,"cited":true}\n\ndata: [DONE]\n\n',
      })
    })

    await page.goto('/lesson/1-intro')
    await expect(page.locator('[data-testid="lesson-title"]')).toContainText('Artificial Intelligence: Ideas, Approaches and History')

    await page.locator('[data-testid="tutor-input"]').fill('What does the Turing test measure?')
    await page.locator('[data-testid="tutor-submit"]').click()

    await expect(page.locator('[data-testid="tutor-answer"]')).toContainText('§ Testing for Intelligence: The Imitation Game')
    expect(sent.lessonId).toBe('1-intro')
    expect(sent.mode).toBe('detailed')
  })
})
