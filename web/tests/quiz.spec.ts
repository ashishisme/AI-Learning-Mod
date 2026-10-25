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

  test('AC-35.1: full multi-question progression, 100% score calculation, and completion badge', async ({ page }) => {
    await page.goto('/quiz/1-intro')

    const interactive = page.locator('[data-testid="quiz-interactive"]')
    await expect(interactive).toBeVisible()

    // Q1: Option B is correct (index 1)
    await expect(page.locator('text=Question 1 of 4')).toBeVisible()
    await page.locator('[data-testid="option-1"]').click()
    await expect(page.locator('[data-testid="answer-rationale"]')).toContainText('Correct')
    await page.locator('[data-testid="next-question-btn"]').click()

    // Q2: Option B is correct (index 1)
    await expect(page.locator('text=Question 2 of 4')).toBeVisible()
    await page.locator('[data-testid="option-1"]').click()
    await expect(page.locator('[data-testid="answer-rationale"]')).toContainText('Correct')
    await page.locator('[data-testid="next-question-btn"]').click()

    // Q3: Option A is correct (index 0)
    await expect(page.locator('text=Question 3 of 4')).toBeVisible()
    await page.locator('[data-testid="option-0"]').click()
    await expect(page.locator('[data-testid="answer-rationale"]')).toContainText('Correct')
    await page.locator('[data-testid="next-question-btn"]').click()

    // Q4: Option A is correct (index 0)
    await expect(page.locator('text=Question 4 of 4')).toBeVisible()
    await page.locator('[data-testid="option-0"]').click()
    await expect(page.locator('[data-testid="answer-rationale"]')).toContainText('Correct')

    // Final action button transitions to "See Results 🏆"
    const resultsBtn = page.locator('[data-testid="next-question-btn"]')
    await expect(resultsBtn).toContainText('See Results')
    await resultsBtn.click()

    // Verify Recap card renders with 4 / 4 and 100%
    const recapCard = page.locator('[data-testid="quiz-recap-card"]')
    await expect(recapCard).toBeVisible()
    const finalScore = page.locator('[data-testid="quiz-final-score"]')
    await expect(finalScore).toContainText('4 / 4')
    await expect(recapCard).toContainText('100% Accuracy')

    // Mark lesson complete
    const markCompleteBtn = recapCard.locator('button:has-text("Mark Lesson Complete")')
    await expect(markCompleteBtn).toBeVisible()
    await markCompleteBtn.click()
    await expect(recapCard.locator('text=Marked Complete ✅')).toBeVisible()
  })

  test('AC-35.2: wrong answer rationale feedback and partial score calculation', async ({ page }) => {
    await page.goto('/quiz/2-symbolic')

    // Q1: Option A is wrong (Option B is correct)
    await expect(page.locator('text=Question 1 of 4')).toBeVisible()
    await page.locator('[data-testid="option-0"]').click()
    const rationale = page.locator('[data-testid="answer-rationale"]')
    await expect(rationale).toContainText('Incorrect')
    await page.locator('[data-testid="next-question-btn"]').click()

    // Q2: Option B is correct (index 1)
    await expect(page.locator('text=Question 2 of 4')).toBeVisible()
    await page.locator('[data-testid="option-1"]').click()
    await expect(page.locator('[data-testid="answer-rationale"]')).toContainText('Correct')
    await page.locator('[data-testid="next-question-btn"]').click()

    // Q3: Option B is wrong (Option A is correct)
    await expect(page.locator('text=Question 3 of 4')).toBeVisible()
    await page.locator('[data-testid="option-1"]').click()
    await expect(page.locator('[data-testid="answer-rationale"]')).toContainText('Incorrect')
    await page.locator('[data-testid="next-question-btn"]').click()

    // Q4: Option B is correct (index 1)
    await expect(page.locator('text=Question 4 of 4')).toBeVisible()
    await page.locator('[data-testid="option-1"]').click()
    await expect(page.locator('[data-testid="answer-rationale"]')).toContainText('Correct')
    await page.locator('[data-testid="next-question-btn"]').click()

    // Verify partial score: 2 / 4 (50%)
    await expect(page.locator('[data-testid="quiz-recap-card"]')).toBeVisible()
    await expect(page.locator('[data-testid="quiz-final-score"]')).toContainText('2 / 4')
    await expect(page.locator('[data-testid="quiz-recap-card"]')).toContainText('50% Accuracy')
  })

  test('AC-35.3: retake quiz resets question index, selections, and scores', async ({ page }) => {
    await page.goto('/quiz/3-neuralnetworks')

    // Answer Q1..Q4 rapidly
    for (let i = 0; i < 4; i++) {
      await page.locator('[data-testid="option-0"]').click()
      await page.locator('[data-testid="next-question-btn"]').click()
    }

    // On recap card, click Retake Quiz
    const recapCard = page.locator('[data-testid="quiz-recap-card"]')
    await expect(recapCard).toBeVisible()
    const retakeBtn = recapCard.locator('button:has-text("Retake Quiz")')
    await retakeBtn.click()

    // Verify reset to Question 1 of 4 with no selected state
    await expect(page.locator('text=Question 1 of 4')).toBeVisible()
    await expect(page.locator('[data-testid="answer-rationale"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="next-question-btn"]')).not.toBeVisible()
    await expect(page.locator('text=Select an option to continue')).toBeVisible()
  })

  test('AC-35.4: extended tests for computer vision, nlp, and ethics curriculum modules', async ({ page }) => {
    // 1. Verify 4-computervision has multi-question quiz
    await page.goto('/quiz/4-computervision')
    await expect(page.locator('text=Question 1 of 4')).toBeVisible()
    await expect(page.locator('[data-testid="question-prompt"]')).toContainText('Convolutional Neural Networks')
    await page.locator('[data-testid="option-1"]').click()
    await page.locator('[data-testid="next-question-btn"]').click()
    await expect(page.locator('text=Question 2 of 4')).toBeVisible()
    await expect(page.locator('[data-testid="question-prompt"]')).toContainText('Max Pooling')

    // 2. Verify 5-nlp has multi-question quiz
    await page.goto('/quiz/5-nlp')
    await expect(page.locator('text=Question 1 of 4')).toBeVisible()
    await expect(page.locator('[data-testid="question-prompt"]')).toContainText('Transformer')
    await page.locator('[data-testid="option-1"]').click()
    await page.locator('[data-testid="next-question-btn"]').click()
    await expect(page.locator('text=Question 2 of 4')).toBeVisible()
    await expect(page.locator('[data-testid="question-prompt"]')).toContainText('Word Embeddings')

    // 3. Verify 7-ethics has dedicated multi-question quiz
    await page.goto('/quiz/7-ethics')
    await expect(page.locator('text=Question 1 of 4')).toBeVisible()
    await expect(page.locator('[data-testid="question-prompt"]')).toContainText('algorithmic bias')
    await page.locator('[data-testid="option-1"]').click()
    await expect(page.locator('[data-testid="answer-rationale"]')).toContainText('Correct')
    await page.locator('[data-testid="next-question-btn"]').click()
    await expect(page.locator('text=Question 2 of 4')).toBeVisible()
    await expect(page.locator('[data-testid="question-prompt"]')).toContainText('Explainability')
  })
})
