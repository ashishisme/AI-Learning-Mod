// SPEC: FR-UI-15, AC-36, DC-11
import { test, expect } from '@playwright/test'

test.describe('AC-36: Color Theme System', () => {
  test('toggling header theme button toggles dark class on html and persists to localStorage', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('ai-foundations-theme'))
    await page.reload()

    const html = page.locator('html')
    const themeBtn = page.locator('[data-testid="theme-toggle-btn"]')
    await expect(themeBtn).toBeVisible()

    // Initially light mode by default in test environment
    const initialDark = await html.evaluate((el) => el.classList.contains('dark'))

    // Click toggle button
    await themeBtn.click()

    // Class should have inverted
    if (initialDark) {
      await expect(html).not.toHaveClass(/dark/)
      const raw = await page.evaluate(() => localStorage.getItem('ai-foundations-theme'))
      const saved = raw ? JSON.parse(raw)?.state?.theme : null
      expect(saved).toBe('light')
    } else {
      await expect(html).toHaveClass(/dark/)
      const raw = await page.evaluate(() => localStorage.getItem('ai-foundations-theme'))
      const saved = raw ? JSON.parse(raw)?.state?.theme : null
      expect(saved).toBe('dark')
    }

    // Toggle again
    await themeBtn.click()
    if (initialDark) {
      await expect(html).toHaveClass(/dark/)
    } else {
      await expect(html).not.toHaveClass(/dark/)
    }

    // Reload page and verify theme persists across reload
    await page.reload()
    const persistedRaw = await page.evaluate(() => localStorage.getItem('ai-foundations-theme'))
    expect(persistedRaw).toBeTruthy()
  })

  test('selecting themes from Settings Drawer updates DOM and localStorage', async ({ page }) => {
    await page.goto('/')

    // Open settings drawer
    await page.locator('#open-settings-btn').click()
    await expect(page.locator('role=dialog')).toBeVisible()

    // Click Dark theme button in settings
    await page.locator('#theme-dark-btn').click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    let raw = await page.evaluate(() => localStorage.getItem('ai-foundations-theme'))
    expect(JSON.parse(raw || '{}')?.state?.theme).toBe('dark')

    // Click Light theme button in settings
    await page.locator('#theme-light-btn').click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
    raw = await page.evaluate(() => localStorage.getItem('ai-foundations-theme'))
    expect(JSON.parse(raw || '{}')?.state?.theme).toBe('light')

    // Click System theme button
    await page.locator('#theme-system-btn').click()
    raw = await page.evaluate(() => localStorage.getItem('ai-foundations-theme'))
    expect(JSON.parse(raw || '{}')?.state?.theme).toBe('system')
  })
})
