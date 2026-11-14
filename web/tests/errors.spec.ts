import { test, expect } from '@playwright/test'

// SPEC: AC-23 (FR-UI-06; amended 2.15.0): With /api/lessons returning 503, / shows the "lessons are missing" message.
test.describe('AC-23 Content Ingestion Error Handling', () => {
  test('AC-23: with /api/lessons returning 503, / shows the "lessons are missing" message', async ({ page }) => {
    await page.route('**/api/lessons', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'content not generated' }),
      })
    })

    await page.goto('/')

    const ingestMsg = page.locator('[data-testid="ingest-required-message"]')
    await expect(ingestMsg).toBeVisible()
    await expect(ingestMsg).toContainText('Lessons are missing')
    await expect(ingestMsg).toContainText('public-content')
    await expect(ingestMsg).not.toContainText(/ingest|GITHUB_TOKEN/)
  })
})
