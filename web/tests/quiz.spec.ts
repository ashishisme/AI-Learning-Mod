import { test, expect } from '@playwright/test'

// SPEC: AC-25 (FR-UI-05): /quiz/:id renders the placeholder for unknown lessons.
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

// SPEC: AC-35 (FR-QZ-01, FR-QZ-02, FR-QZ-03, FR-QZ-04): Interactive Quiz Engine
test.describe('AC-35 Interactive Quiz Engine', () => {
  test('AC-35: interactive quiz question selection, rationale reveal, and hint request', async ({ page }) => {
    // Intercept tutor stream for hint test
    await page.route('/api/tutor', async (route) => {
      if (route.request().headers()['accept'] === 'text/event-stream') {
        const body = 'data: {"token":"Consider "}\n\ndata: {"token":"narrow vs general cognitive abilities."}\n\ndata: [DONE]\n\n'
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body,
        })
        return
      }
      await route.continue()
    })

    await page.goto('/quiz/1-intro')

    // 1. Verify interactive quiz loaded
    const interactive = page.locator('[data-testid="quiz-interactive"]')
    await expect(interactive).toBeVisible()

    const prompt = page.locator('[data-testid="question-prompt"]')
    await expect(prompt).toBeVisible()

    // 2. Test asking for hint
    const hintBtn = page.locator('[data-testid="ask-hint-btn"]')
    await expect(hintBtn).toBeVisible()
    await hintBtn.click()

    const hintBox = page.locator('[data-testid="tutor-hint-box"]')
    await expect(hintBox).toBeVisible()
    await expect(hintBox).toContainText('narrow vs general cognitive abilities')

    // 3. Select an option
    const opt0 = page.locator('[data-testid="option-1"]') // Option B is correct
    await opt0.click()

    // 4. Verify rationale appears
    const rationale = page.locator('[data-testid="answer-rationale"]')
    await expect(rationale).toBeVisible()
    await expect(rationale).toContainText('Correct')

    // 5. Next question button appears
    const nextBtn = page.locator('[data-testid="next-question-btn"]')
    await expect(nextBtn).toBeVisible()
  })
})
