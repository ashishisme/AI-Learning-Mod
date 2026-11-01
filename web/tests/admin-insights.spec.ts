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
