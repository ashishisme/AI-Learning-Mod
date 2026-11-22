// Settings shows version plus a real build identity (number, commit, build date).
import { test, expect } from '@playwright/test'

test('settings shows version, build number, commit and a build date that is not "now"', async ({ page }) => {
  await page.goto('/')
  await page.locator('#open-settings-btn').click()
  const info = page.locator('[data-testid="settings-version-info"]')
  await expect(info).toContainText(/v\d+\.\d+\.\d+/)
  await expect(page.locator('[data-testid="settings-build-info"]')).toHaveText(
    /^Build #\d+ · [0-9a-f]{7,}(\+dirty)? · \d{4}-\d{2}-\d{2}$/
  )
})
