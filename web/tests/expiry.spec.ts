// SPEC-008 US3: learner reminder and admin extend controls. All API calls are mocked.
import { test, expect, Page } from '@playwright/test'
import { mockAdmin } from './helpers/admin-mock'

const LESSONS = { lessons: [{ id: 'lesson-1', module: 'Intro', title: 'First Lesson', order: 0 }] }

async function learner(page: Page, session: object) {
  await page.route('**/api/runtime', (r) => r.fulfill({ json: { hosted: true, authRequired: true, tutorEnabled: false, feedbackEnabled: false } }))
  await page.route('**/api/auth/session', (r) => r.fulfill({ json: { authenticated: true, betaId: 'BETA-7KQ3-M9XP', label: 'A', ...session } }))
  await page.route('**/api/lessons', (r) => r.fulfill({ json: LESSONS }))
}

test.describe('SPEC-008 US3 learner banner', () => {
  test('not shown when not expiring soon', async ({ page }) => {
    await learner(page, { expiresAt: '2027-01-01T08:30:00Z', daysLeft: 61, expiringSoon: false })
    await page.goto('/')
    await expect(page.getByText('First Lesson')).toBeVisible()
    await expect(page.getByTestId('expiry-banner')).toHaveCount(0)
  })

  test('plural days, IST date, dismiss stays dismissed in the session', async ({ page }) => {
    // 20:00 UTC on 6 Nov is 1:30 am IST on 7 Nov
    await learner(page, { expiresAt: '2026-11-06T20:00:00Z', daysLeft: 4, expiringSoon: true })
    await page.goto('/')
    const b = page.getByTestId('expiry-banner')
    await expect(b).toHaveAttribute('role', 'status')
    await expect(b).toContainText('Your beta access ends on 7 Nov 2026 (4 days left). Ask your teacher or admin if you need more time.')
    await page.getByRole('button', { name: 'Dismiss' }).click()
    await expect(b).toHaveCount(0)
    await page.reload()
    await expect(page.getByText('First Lesson')).toBeVisible()
    await expect(page.getByTestId('expiry-banner')).toHaveCount(0)
  })

  test('singular day', async ({ page }) => {
    await learner(page, { expiresAt: '2026-11-03T10:00:00Z', daysLeft: 1, expiringSoon: true })
    await page.goto('/')
    await expect(page.getByTestId('expiry-banner')).toContainText('(1 day left)')
  })
})

test.describe('SPEC-008 US3 admin extend', () => {
  test('extend one account: body, CSRF, new expiry shown and list refetched', async ({ page }) => {
    const m = await mockAdmin(page, { post: () => ({ status: 200, json: { expiresAt: '2027-03-02T10:00:00Z' } }) })
    await page.goto('/admin/users')
    await page.getByRole('button', { name: 'Extend BETA-AAAA-1111' }).click()
    await expect(page.locator('#dlg-months')).toHaveValue('2')
    await page.locator('#dlg-months').selectOption('3')
    await page.getByTestId('action-confirm').click()
    await expect(page.getByTestId('action-result')).toHaveText('New expiry: 2 Mar 2027, 3:30 pm')
    const p = m.posts()[0]
    expect(p.path).toBe('/api/admin/accounts/BETA-AAAA-1111/extend')
    expect(p.body).toEqual({ months: 3 })
    expect(p.headers['x-csrf-token']).toBe(m.token())
    expect(p.headers['content-type']).toContain('application/json')
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(page.getByTestId('action-dialog')).toHaveCount(0)
  })

  test('revoked 409 is handled gracefully', async ({ page }) => {
    await mockAdmin(page, { post: () => ({ status: 409, json: { code: 'revoked', error: 'revoked' } }) })
    await page.goto('/admin/users')
    await page.getByRole('button', { name: 'Extend BETA-AAAA-1111' }).click()
    await page.getByTestId('action-confirm').click()
    await expect(page.getByTestId('action-error')).toHaveText('This account was revoked and cannot be extended.')
  })

  test('group extend appears only with a label and shows Extended N accounts', async ({ page }) => {
    const m = await mockAdmin(page, { post: () => ({ status: 200, json: { extended: 12 } }) })
    await page.goto('/admin/users')
    await expect(page.getByTestId('group-extend')).toHaveCount(0)
    await page.getByTestId('f-label').nth(1).selectOption('School B')
    await page.getByTestId('group-extend-btn').click()
    await page.locator('#dlg-months').selectOption('6')
    await page.getByTestId('action-confirm').click()
    await expect(page.getByTestId('action-result')).toHaveText('Extended 12 accounts')
    const p = m.posts()[0]
    expect(p.path).toBe('/api/admin/accounts/extend-label')
    expect(p.body).toEqual({ label: 'School B', months: 6 })
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(page.getByTestId('note')).toHaveText('Extended 12 accounts')
  })
})
