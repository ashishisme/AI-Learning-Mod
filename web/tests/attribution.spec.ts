import { test, expect, Page } from '@playwright/test'

// SPEC: AC-26 (NFR-LIC-01, FR-ATT-01; amended 2.15.0, SPEC-013 FR-012): the footer appears on /,
// /lesson/:id and /quiz/:id, names the maker, and names and links to no other course.
test.describe('AC-26 Site footer', () => {
  async function expectOurFooter(page: Page) {
    const footer = page.getByTestId('site-footer')
    await expect(footer).toBeVisible()
    await expect(footer).toContainText('Qunisphere')
    await expect(footer.getByRole('button', { name: /help/i })).toBeVisible()
    await expect(footer).not.toContainText(/microsoft|AI-For-Beginners/i)
    await expect(page.locator('a[href*="microsoft" i]')).toHaveCount(0)
  }

  test('AC-26: appears on /', async ({ page }) => {
    await page.route('**/api/lessons', (route) => route.fulfill({ json: { lessons: [] } }))
    await page.goto('/')
    await expectOurFooter(page)
  })

  test('AC-26: appears on /lesson/:id', async ({ page }) => {
    await page.route('**/api/lessons/test-lesson?*', (route) =>
      route.fulfill({
        json: {
          lessonId: 'test-lesson',
          mode: 'detailed',
          origin: 'own',
          title: 'Test Lesson',
          sections: [{ id: 's1', heading: 'One', bodyMarkdown: 'Sample content' }],
        },
      })
    )
    await page.goto('/lesson/test-lesson')
    await expect(page.getByTestId('lesson-title')).toHaveText('Test Lesson')
    await expectOurFooter(page)
  })

  test('AC-26: appears on /quiz/:id', async ({ page }) => {
    await page.goto('/quiz/test-lesson')
    await expectOurFooter(page)
  })
})
