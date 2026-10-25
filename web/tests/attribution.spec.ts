import { test, expect } from '@playwright/test'

// SPEC: AC-26 (NFR-LIC-01, FR-ATT-01): The attribution footer appears on /, /lesson/:id, and /quiz/:id.
test.describe('AC-26 Mandatory Attribution Footer', () => {
  const expectedText =
    'Curriculum based on microsoft/AI-For-Beginners (MIT License). Not affiliated with Microsoft.'

  test('AC-26: appears on /', async ({ page }) => {
    await page.route('**/api/lessons', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ commitSha: '1234567890123456789012345678901234567890', lessons: [] }),
      })
    })

    await page.goto('/')
    const footer = page.locator('[data-testid="attribution-footer"]')
    await expect(footer).toBeVisible()
    await expect(footer).toContainText(expectedText)
  })

  test('AC-26: appears on /lesson/:id', async ({ page }) => {
    await page.route('**/api/lessons/test-lesson', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-lesson',
          module: 'Module',
          title: 'Test Lesson',
          order: 0,
          path: 'lessons/test/README.md',
          commitSha: '1234567890123456789012345678901234567890',
          blocks: [{ type: 'markdown', content: 'Sample content' }],
        }),
      })
    })

    await page.goto('/lesson/test-lesson')
    const footer = page.locator('[data-testid="attribution-footer"]')
    await expect(footer).toBeVisible()
    await expect(footer).toContainText(expectedText)
  })

  test('AC-26: appears on /quiz/:id', async ({ page }) => {
    await page.goto('/quiz/test-lesson')
    const footer = page.locator('[data-testid="attribution-footer"]')
    await expect(footer).toBeVisible()
    await expect(footer).toContainText(expectedText)
  })
})
