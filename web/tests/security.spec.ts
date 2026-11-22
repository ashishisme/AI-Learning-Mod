import { test, expect } from '@playwright/test'

// SPEC: AC-21 (FR-UI-04, NFR-SEC-05; amended 2.15.0): a lesson containing <script>alert(1)</script> and
// <img src=x onerror=alert(1)> shows them as text; no such element is created and no alert fires.
test.describe('AC-21 Lesson text is never run as HTML', () => {
  test('AC-21: script, onerror and javascript: links in lesson text do nothing', async ({ page }) => {
    let alertFired = false
    page.on('dialog', async (dialog) => {
      alertFired = true
      await dialog.dismiss()
    })

    const hostile = 'Safe paragraph.\n\n<script>alert(1)</script>\n\n<img src="x" onerror="alert(1)">\n\n<a href="javascript:alert(1)">Malicious Link</a>\n\n[Sneaky](javascript:alert(1))'
    await page.route('**/api/lessons/xss-test?*', (route) =>
      route.fulfill({
        json: {
          lessonId: 'xss-test',
          mode: 'detailed',
          origin: 'own',
          title: 'XSS Test',
          intro: hostile,
          sections: [{ id: 's1', heading: 'One', bodyMarkdown: hostile, more: { bodyMarkdown: hostile } }],
        },
      })
    )

    await page.goto('/lesson/xss-test')
    await expect(page.getByTestId('lesson-title')).toHaveText('XSS Test')
    await expect(page.getByText('Safe paragraph.').first()).toBeVisible()

    // Nothing in the lesson became a script, an image with a handler, or a javascript: link
    const lesson = page.locator('main')
    await expect(lesson.locator('script')).toHaveCount(0)
    await expect(lesson.locator('[onerror]')).toHaveCount(0)
    await expect(page.locator('a[href^="javascript:" i]')).toHaveCount(0)

    // Give browser a short tick to ensure no async onerror alert triggered
    await page.waitForTimeout(300)
    expect(alertFired).toBe(false)
  })
})
