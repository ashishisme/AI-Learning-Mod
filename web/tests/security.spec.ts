import { test, expect } from '@playwright/test'

// SPEC: AC-21 (FR-UI-04, NFR-SEC-05): A lesson containing <script>alert(1)</script> and <img src=x onerror=alert(1)> renders with the script stripped; no alert fires.
test.describe('AC-21 Security & HTML Sanitization', () => {
  test('AC-21: scripts and onerror handlers are stripped, no alert fires', async ({ page }) => {
    let alertFired = false
    page.on('dialog', async (dialog) => {
      alertFired = true
      await dialog.dismiss()
    })

    await page.route('**/api/lessons/xss-test', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'xss-test',
          module: 'Security',
          title: 'XSS Sanitization Test',
          order: 0,
          path: 'lessons/xss/README.md',
          commitSha: '1234567890123456789012345678901234567890',
          blocks: [
            {
              type: 'markdown',
              content: 'Safe paragraph.\n\n<script>alert(1)</script>\n\n<img src="x" onerror="alert(1)">\n\n<a href="javascript:alert(1)">Malicious Link</a>',
            },
          ],
        }),
      })
    })

    await page.goto('/lesson/xss-test')

    // Wait for content to render
    const content = page.locator('[data-testid="lesson-content"]')
    await expect(content).toBeVisible()
    await expect(content).toContainText('Safe paragraph.')

    // Script tag must not exist
    const scripts = await page.locator('[data-testid="lesson-content"] script').count()
    expect(scripts).toBe(0)

    // Verify onerror attribute is not present on any img
    const imgs = page.locator('[data-testid="lesson-content"] img')
    const imgCount = await imgs.count()
    for (let i = 0; i < imgCount; i++) {
      const onerrorAttr = await imgs.nth(i).getAttribute('onerror')
      expect(onerrorAttr).toBeNull()
    }

    // Verify javascript: href was stripped or removed
    const links = page.locator('[data-testid="lesson-content"] a')
    const linkCount = await links.count()
    for (let i = 0; i < linkCount; i++) {
      const href = await links.nth(i).getAttribute('href')
      if (href) {
        expect(href).not.toContain('javascript:')
      }
    }

    // Give browser a short tick to ensure no async onerror alert triggered
    await page.waitForTimeout(300)
    expect(alertFired).toBe(false)
  })
})
