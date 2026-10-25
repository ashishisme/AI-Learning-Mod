import { test, expect } from '@playwright/test'

// SPEC: AC-19 (FR-UI-02, FR-PRG-03): / lists lessons with progress done / total; marking one complete updates the summary.
test.describe('AC-19 Home Page', () => {
  test('AC-19: lists lessons with done / total summary and marking complete updates it', async ({ page }) => {
    // Clear localStorage
    await page.addInitScript(() => {
      window.localStorage.clear()
    })

    // Mock /api/lessons
    await page.route('**/api/lessons', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          commitSha: '1234567890123456789012345678901234567890',
          lessons: [
            {
              id: 'lesson-1',
              module: 'Introduction',
              title: 'Introduction to AI',
              order: 0,
              path: 'lessons/01-Intro/README.md',
              commitSha: '1234567890123456789012345678901234567890',
            },
            {
              id: 'lesson-2',
              module: 'Neural Networks',
              title: 'Perceptrons',
              order: 1,
              path: 'lessons/02-Perceptrons/README.md',
              commitSha: '1234567890123456789012345678901234567890',
            },
          ],
        }),
      })
    })

    await page.goto('/')

    // Check summary shows 0 / 2
    const summary = page.locator('[data-testid="progress-summary"]')
    await expect(summary).toContainText('0 / 2')

    // Both lessons are listed
    const item1 = page.locator('[data-testid="lesson-item-lesson-1"]')
    const item2 = page.locator('[data-testid="lesson-item-lesson-2"]')
    await expect(item1).toBeVisible()
    await expect(item2).toBeVisible()

    // Initially both show incomplete indicator ⬜
    const toggle1 = page.locator('[data-testid="toggle-complete-lesson-1"]')
    await expect(toggle1).toHaveText('⬜')

    // Mark lesson 1 complete
    await toggle1.click()

    // Indicator changes to ✅
    await expect(toggle1).toHaveText('✅')

    // Summary updates to 1 / 2
    await expect(summary).toContainText('1 / 2')
  })

  // SPEC: AC-35 (FR-UI-13): / provides instant client-side search filtering
  test('AC-35: search input filters lesson items', async ({ page }) => {
    await page.route('**/api/lessons', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          commitSha: '1234567890123456789012345678901234567890',
          lessons: [
            { id: 'lesson-1', module: 'Intro', title: 'Introduction to AI', order: 0, path: '', commitSha: '' },
            { id: 'lesson-2', module: 'CV', title: 'Convolutional Networks', order: 1, path: '', commitSha: '' },
          ],
        }),
      })
    })

    await page.goto('/')

    const searchInput = page.locator('[data-testid="search-lessons-input"]')
    await expect(searchInput).toBeVisible()

    // Filter for "Convolutional"
    await searchInput.fill('Convolutional')

    await expect(page.locator('[data-testid="lesson-item-lesson-2"]')).toBeVisible()
    await expect(page.locator('[data-testid="lesson-item-lesson-1"]')).not.toBeVisible()
  })
})

