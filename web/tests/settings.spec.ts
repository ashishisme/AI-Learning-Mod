import { test, expect } from '@playwright/test'

// SPEC: AC-34 (FR-SET-01, FR-SET-02, FR-SET-03, FR-SET-04, FR-UI-14)
test.describe('AC-34 Settings Drawer & AI Configuration', () => {
  test('AC-34: opens settings drawer, toggles presets, and persists to localStorage', async ({ page }) => {
    await page.goto('/')

    // 1. Verify global settings button exists and opens drawer
    const openBtn = page.locator('#open-settings-btn')
    await expect(openBtn).toBeVisible()
    await openBtn.click()

    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()
    await expect(modal).toContainText('AI & Learning Settings')

    // 2. Verify form inputs exist
    const baseUrlInput = page.locator('#settings-base-url')
    const modelInput = page.locator('#settings-model')
    await expect(baseUrlInput).toBeVisible()
    await expect(modelInput).toBeVisible()

    // 3. Test changing values
    await baseUrlInput.fill('http://localhost:11434/v1')
    await modelInput.fill('llama3.2:1b')

    // 4. Save settings
    const saveBtn = page.locator('#save-settings-btn')
    await saveBtn.click()

    // 5. Verify persistence in localStorage["ai-foundations-settings"]
    const stored = await page.evaluate(() => localStorage.getItem('ai-foundations-settings'))
    expect(stored).not.toBeNull()
    const parsed = JSON.parse(stored!)
    expect(parsed.state.settings.baseUrl).toBe('http://localhost:11434/v1')
    expect(parsed.state.settings.model).toBe('llama3.2:1b')
  })

  test('AC-34: triggers connection diagnostic test', async ({ page }) => {
    await page.goto('/')

    const openBtn = page.locator('#open-settings-btn')
    await openBtn.click()

    // Intercept /api/config/test to verify diagnostic flow
    await page.route('/api/config/test', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          latencyMs: 38,
          activeModel: 'llama3.2:1b',
          models: ['llama3.2:1b', 'mistral:latest'],
        }),
      })
    })

    const testBtn = page.locator('#test-connection-btn')
    await testBtn.click()

    await expect(page.locator('text=Connection Verified')).toBeVisible()
    await expect(page.locator('text=38ms roundtrip')).toBeVisible()
  })
})
