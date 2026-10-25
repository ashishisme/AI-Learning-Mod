import { test, expect } from '@playwright/test'

// SPEC: AC-25 (FR-UI-05): /quiz/:id renders the placeholder.
test.describe('AC-25 Quiz Placeholder', () => {
  test('AC-25: /quiz/:id renders the placeholder linking to /', async ({ page }) => {
    await page.goto('/quiz/lesson-1')

    const placeholder = page.locator('[data-testid="quiz-placeholder"]')
    await expect(placeholder).toBeVisible()
    await expect(placeholder).toContainText('Quiz: lesson-1')
    await expect(placeholder).toContainText('not yet available')

    const homeLink = page.locator('[data-testid="quiz-home-link"]')
    await expect(homeLink).toBeVisible()
    await expect(homeLink).toHaveAttribute('href', '/')
  })
})
