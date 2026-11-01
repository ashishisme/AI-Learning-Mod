// Opt-in "skip TLS verification" for the AI endpoint (off by default).
import { test, expect } from '@playwright/test'

test.describe('Settings: self-signed certificate option', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('is off by default, shows a warning when enabled, and is sent with tutor requests', async ({ page }) => {
    await page.goto('/lesson/3-neuralnetworks')
    await page.locator('#open-settings-btn').click()

    const box = page.locator('#settings-insecure-tls')
    await expect(box).not.toBeChecked()
    await expect(page.locator('[data-testid="insecure-tls-warning"]')).toHaveCount(0)

    await box.check()
    await expect(page.locator('[data-testid="insecure-tls-warning"]')).toBeVisible()
    await page.locator('#save-settings-btn').click()

    let header: string | undefined
    await page.route('**/api/tutor', async (route) => {
      header = route.request().headers()['x-ai-insecure-tls']
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ answer: 'ok [L § S]' }) })
    })
    await page.locator('[data-testid="tutor-input"]').fill('hello')
    await page.locator('[data-testid="tutor-submit"]').click()
    await expect.poll(() => header).toBe('true')
  })

  test('header is not sent when the option is off', async ({ page }) => {
    let header: string | undefined = 'unset'
    await page.route('**/api/tutor', async (route) => {
      header = route.request().headers()['x-ai-insecure-tls']
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ answer: 'ok [L § S]' }) })
    })
    await page.goto('/lesson/3-neuralnetworks')
    await page.locator('[data-testid="tutor-input"]').fill('hello')
    await page.locator('[data-testid="tutor-submit"]').click()
    await expect.poll(() => header).toBeUndefined()
  })
})
