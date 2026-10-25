import { test, expect } from '@playwright/test'

// SPEC: AC-24 (FR-UI-07): With /api/tutor returning 503, the tutor panel shows "Tutor offline" and the input is disabled.
test.describe('AC-24 Tutor Offline Handling', () => {
  test('AC-24: with /api/tutor returning 503, tutor panel shows "Tutor offline" and input is disabled', async ({ page }) => {
    await page.route('**/api/lessons/tutor-test', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'tutor-test',
          module: 'Test',
          title: 'Tutor Test Lesson',
          order: 0,
          path: 'lessons/test/README.md',
          commitSha: '1234567890123456789012345678901234567890',
          blocks: [{ type: 'markdown', content: 'Lesson content here.' }],
        }),
      })
    })

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
})
