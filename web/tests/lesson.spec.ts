import { test, expect } from '@playwright/test'

// SPEC: AC-20 (FR-UI-03, FR-UI-08): /lesson/:id renders title, back link, the lesson's sections, Colab button, Mark complete, and tutor panel.
test.describe('AC-20 Lesson Detail Page', () => {
  test('AC-20: renders title, back link, sections, Colab button, Mark complete, and tutor panel', async ({ page }) => {
    await page.route('**/api/lessons/intro-lesson?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          lessonId: 'intro-lesson',
          mode: 'detailed',
          origin: 'own',
          title: 'Deep Learning Basics',
          colabUrl: 'https://colab.research.google.com/github/ashishisme/AI-Learning-Mod/blob/cloud-beta/notebooks/intro-lesson.ipynb',
          sections: [{ id: 's1', heading: 'Header 1', bodyMarkdown: 'This is **bold** text and markdown explanation.' }],
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

    // 3. The section, with its Markdown rendered
    await expect(page.getByRole('heading', { name: 'Header 1' })).toBeVisible()
    await expect(page.locator('strong', { hasText: 'bold' })).toBeVisible()

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
