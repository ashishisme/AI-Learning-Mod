import { expect, test } from '@playwright/test'
import { mockAdmin } from './helpers/admin-mock'

test('overview, usage chart and table, and costs show honest values', async ({ page }) => {
  await mockAdmin(page)
  await page.goto('/admin')
  await expect(page.getByText('312 / 1000')).toBeVisible()
  await expect(page.getByText('Unread feedback')).toBeVisible()
  await page.getByRole('link', { name: 'Usage' }).click()
  await expect(page.getByRole('img', { name: 'Daily active accounts' })).toBeVisible()
  await page.getByRole('button', { name: 'Show table' }).click()
  await expect(page.getByRole('table', { name: 'Daily active accounts' })).toContainText('40')
  await expect(page.getByRole('table', { name: 'Lesson views' })).toContainText('1-intro')
  await page.getByRole('link', { name: 'Costs' }).click()
  await expect(page.getByText('Not connected. Cloud billing source is not connected')).toBeVisible()
  await expect(page.getByText('Month to date: $1.90 of $30.00 budget (6.3%)')).toBeVisible()
})

test('users show activity and overview refreshes every 30 seconds while visible', async ({ page }) => {
  await page.clock.install()
  const mock = await mockAdmin(page)
  await page.goto('/admin')
  await expect(page.getByText('312 / 1000')).toBeVisible()
  const before = mock.reqs.filter((r) => r.path === '/api/admin/overview').length
  await page.clock.runFor(30_100)
  await expect.poll(() => mock.reqs.filter((r) => r.path === '/api/admin/overview').length).toBeGreaterThan(before)
  await page.getByRole('link', { name: 'Users and Invites' }).click()
  const accounts = page.getByTestId('accounts-table')
  await expect(accounts).toContainText('Last seen')
  await expect(accounts).toContainText('Devices')
  await expect(accounts).toContainText('Active now')
  await page.getByTestId('f-sort').selectOption('lastSeen')
})

test('the budget switch shows on Costs and only a confirmed reset clears it', async ({ page }) => {
  await mockAdmin(page)
  let off = true
  const resets: string[] = []
  await page.route('**/api/admin/costs', (route) => route.fulfill({
    json: { generatedAt: '2026-11-02T06:00:00Z', tutorOff: off, hosting: { connected: false, reason: 'Not set up', items: [] },
      ai: { estimated: true, todayUSD: 0, ceilingUSD: 1, ceilingReached: false, monthToDateUSD: 30, budgetUSD: 30, budgetUsedPct: 100,
        projectedMonthUSD: null, thresholds: { 50: true, 90: true, 100: true } } },
  }))
  await page.route('**/api/admin/tutor/reset', (route) => {
    resets.push(route.request().headers()['x-csrf-token'] ?? '')
    off = false
    return route.fulfill({ json: { ok: true } })
  })
  await page.goto('/admin/costs')
  await expect(page.getByRole('heading', { name: 'The tutor is off' })).toBeVisible()

  await page.getByRole('button', { name: 'Turn the tutor back on' }).click()
  await expect(page.getByTestId('tutor-reset-dialog')).toContainText('audit trail')
  await page.getByRole('button', { name: 'Keep it off' }).click()
  expect(resets).toHaveLength(0)
  await expect(page.getByTestId('tutor-off')).toBeVisible()

  const button = page.getByRole('button', { name: 'Turn the tutor back on' })
  const box = await button.boundingBox()
  expect(box!.height).toBeGreaterThanOrEqual(44) // DC-11
  await button.click()
  await page.getByRole('button', { name: 'Turn it back on', exact: true }).click()
  await expect(page.getByTestId('tutor-off')).toHaveCount(0)
  expect(resets).toHaveLength(1)
  expect(resets[0]).not.toBe('')
})
