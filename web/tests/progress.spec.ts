import { test, expect } from '@playwright/test'

// SPEC: AC-22 (FR-PRG-01, FR-PRG-02, NFR-PRV-01): Completion persists across reload via localStorage["ai-foundations-progress"]; no network request carries progress data.
test.describe('AC-22 Local Progress Persistence & Privacy', () => {
  test('AC-22: progress persists across reload via localStorage and zero network requests carry progress', async ({ page }) => {
    const networkRequests: { url: string; method: string; postData?: string | null }[] = []

    page.on('request', (req) => {
      networkRequests.push({
        url: req.url(),
        method: req.method(),
        postData: req.postData(),
      })
    })

    const mockLessons = {
      commitSha: '1234567890123456789012345678901234567890',
      lessons: [
        {
          id: 'lesson-a',
          module: 'Module 1',
          title: 'Lesson A',
          order: 0,
          path: 'lessons/01-A/README.md',
          commitSha: '1234567890123456789012345678901234567890',
        },
      ],
    }

    await page.route('**/api/lessons', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockLessons),
      })
    })

    await page.goto('/')

    // Initially incomplete
    const toggle = page.locator('[data-testid="toggle-complete-lesson-a"]')
    await expect(toggle).toHaveText('⬜')

    // Mark complete
    await toggle.click()
    await expect(toggle).toHaveText('✅')

    // Check localStorage contains the key 'ai-foundations-progress'
    const stored = await page.evaluate(() => {
      return window.localStorage.getItem('ai-foundations-progress')
    })
    expect(stored).not.toBeNull()
    expect(stored).toContain('lesson-a')

    // Reload the page
    await page.reload()

    // Progress persists
    const toggleAfterReload = page.locator('[data-testid="toggle-complete-lesson-a"]')
    await expect(toggleAfterReload).toHaveText('✅')
    const summary = page.locator('[data-testid="progress-summary"]')
    await expect(summary).toContainText('1 / 1')

    // Check no network requests transmitted progress data or targeted a progress endpoint
    for (const req of networkRequests) {
      expect(req.url).not.toContain('/progress')
      if (req.postData) {
        expect(req.postData).not.toContain('lesson-a')
        expect(req.postData).not.toContain('ai-foundations-progress')
      }
    }
  })
})
