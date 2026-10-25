// SPEC: FR-ING-09, FR-SET-05, AC-37
import { test, expect } from '@playwright/test'

test.describe('AC-37: Curriculum Git Sync', () => {
  test('sync button triggers POST /api/ingest/sync and displays updated commit SHA and count', async ({ page }) => {
    // Mock the POST /api/ingest/sync endpoint
    await page.route('/api/ingest/sync', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          commitSha: 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678',
          count: 24,
          durationMs: 420,
        }),
      })
    })

    await page.goto('/')

    // Open settings drawer
    await page.locator('#open-settings-btn').click()
    await expect(page.locator('role=dialog')).toBeVisible()

    const syncBtn = page.locator('#sync-curriculum-btn')
    await expect(syncBtn).toBeVisible()
    await syncBtn.click()

    // Verify success banner and updated commit sha
    const successBanner = page.locator('[data-testid="sync-success-banner"]')
    await expect(successBanner).toBeVisible()
    await expect(successBanner).toContainText('Sync complete')
    await expect(successBanner).toContainText('a1b2c3d4e5f60718293a4b5c6d7e8f9012345678')
    await expect(successBanner).toContainText('24')
  })

  test('displays error message if sync fails', async ({ page }) => {
    // Mock sync failure
    await page.route('/api/ingest/sync', async (route) => {
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          error: 'GitHub API rate limit exceeded. Please configure GITHUB_TOKEN.',
        }),
      })
    })

    await page.goto('/')

    // Open settings drawer
    await page.locator('#open-settings-btn').click()
    await expect(page.locator('role=dialog')).toBeVisible()

    await page.locator('#sync-curriculum-btn').click()

    // Verify error banner
    const errorBanner = page.locator('[data-testid="sync-error-banner"]')
    await expect(errorBanner).toBeVisible()
    await expect(errorBanner).toContainText('rate limit exceeded')
  })
})
