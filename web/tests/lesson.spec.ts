import { test, expect } from '@playwright/test'

// SPEC: AC-20 (FR-UI-03, FR-UI-08): /lesson/:id renders title, back link, rendered Markdown, Colab button, Mark complete, and tutor panel.
test.describe('AC-20 Lesson Detail Page', () => {
  test('AC-20: renders title, back link, rendered markdown, Colab button, Mark complete, and tutor panel', async ({ page }) => {
    await page.route('**/api/lessons/intro-lesson', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'intro-lesson',
          module: 'Basics',
          title: 'Deep Learning Basics',
          order: 0,
          path: 'lessons/01-Basics/README.md',
          commitSha: '1234567890123456789012345678901234567890',
          colabUrl: 'https://colab.research.google.com/github/microsoft/AI-For-Beginners/blob/main/lessons/01-Basics/lab.ipynb',
          blocks: [
            {
              type: 'markdown',
              content: '# Header 1\n\nThis is **bold** text and markdown explanation.',
            },
          ],
        }),
      })
    })

    await page.goto('/lesson/intro-lesson')

    // 1. Title
    const title = page.locator('[data-testid="lesson-title"]')
    await expect(title).toHaveText('Deep Learning Basics')

    // 2. Back link
    const backLink = page.locator('[data-testid="back-link"]')
    await expect(backLink).toBeVisible()
    await expect(backLink).toHaveAttribute('href', '/')

    // 3. Rendered Markdown
    const content = page.locator('[data-testid="lesson-content"]')
    await expect(content).toContainText('Header 1')
    await expect(content).toContainText('bold text')

    // 4. Colab button with rel="noreferrer"
    const colabBtn = page.locator('[data-testid="colab-button"]')
    await expect(colabBtn).toBeVisible()
    await expect(colabBtn).toHaveAttribute('href', /colab\.research\.google\.com/)
    await expect(colabBtn).toHaveAttribute('rel', 'noreferrer')

    // 5. Mark complete button
    const markCompleteBtn = page.locator('[data-testid="mark-complete-button"]')
    await expect(markCompleteBtn).toBeVisible()
    await expect(markCompleteBtn).toContainText('Mark Complete')

    // 6. Tutor panel
    const tutorPanel = page.locator('[data-testid="tutor-panel"]')
    await expect(tutorPanel).toBeVisible()
  })
})
