// SPEC-008 US2: admin console. All API calls are mocked with Playwright routes.
import { test, expect } from '@playwright/test'
import { mockAdmin } from './helpers/admin-mock'
import { readFileSync } from 'fs'

const auditRow = (id: number) => ({ id, at: '2026-11-02T10:00:00Z', actor: 'owner@example.org', action: 'invite.create', target: `t${id}`, detail: 'n=1' })

test.describe('SPEC-008 US2 admin shell', () => {
  test('an expired admin cookie during a list request returns to organisation sign-in', async ({ page }) => {
    await mockAdmin(page)
    await page.goto('/admin')
    await page.route('**/api/admin/dashboard**', (r) => r.fulfill({ status: 401, json: { code: 'admin_required', error: 'Admin sign-in required' } }))
    await page.getByRole('link', { name: 'Users and Invites' }).click()
    await expect(page.getByTestId('admin-signin-link')).toBeVisible()
  })
  test('signed-out admin sees the sign-in link', async ({ page }) => {
    await mockAdmin(page, { signedIn: false })
    await page.goto('/admin')
    const link = page.getByTestId('admin-signin-link')
    await expect(link).toHaveAttribute('href', '/api/auth/admin/login')
    await expect(page.getByTestId('admin-signin-error')).toHaveCount(0)
  })

  for (const [key, text] of [
    ['state', 'The sign-in link expired. Please try again.'],
    ['token', 'Sign-in could not be completed. Please try again.'],
    ['not_allowed', 'This account is not on the admin list.'],
    ['mfa_required', 'Your organisation requires multi-factor sign-in for admins.'],
  ]) {
    test(`?error=${key} message`, async ({ page }) => {
      await mockAdmin(page, { signedIn: false })
      await page.goto(`/admin?error=${key}`)
      await expect(page.getByTestId('admin-signin-error')).toHaveText(text)
    })
  }

  test('tabs render in order, active tab has aria-current, Audit loads, sign out returns to sign-in with CSRF', async ({ page }) => {
    const m = await mockAdmin(page, { audit: () => [auditRow(5)] })
    await page.goto('/admin')
    await expect(page.getByTestId('admin-email')).toHaveText('owner@example.org')
    const tabs = page.getByRole('navigation', { name: 'Admin sections' }).getByRole('link')
    await expect(tabs).toHaveText(['Overview', 'Users and Invites', 'Usage', 'Costs', 'Feedback', 'Audit'])
    await expect(page.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await page.getByRole('link', { name: 'Audit' }).click()
    await expect(page).toHaveURL(/\/admin\/audit$/)
    await expect(page.getByRole('link', { name: 'Audit' })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('table')).toContainText('invite.create')
    await expect(page.getByRole('table')).toContainText('2 Nov 2026, 3:30 pm')
    await page.getByTestId('admin-signout').click()
    await expect(page.getByTestId('admin-signin-link')).toBeVisible()
    const out = m.reqs.find((r) => r.path === '/api/auth/admin/logout')!
    expect(out.method).toBe('POST')
    expect(out.headers['x-csrf-token']).toBe(m.token())
  })

  test('Audit Load more passes the last id as before=', async ({ page }) => {
    const m = await mockAdmin(page, {
      audit: (r) => (r.query.get('before') ? [auditRow(1)] : Array.from({ length: 100 }, (_, i) => auditRow(200 - i))),
    })
    await page.goto('/admin/audit')
    await expect(page.getByRole('row')).toHaveCount(101)
    await page.getByRole('button', { name: 'Load more' }).click()
    await expect(page.getByRole('row')).toHaveCount(102)
    const paged = m.reqs.filter((r) => r.path === '/api/admin/audit' && r.query.get('before'))
    expect(paged).toHaveLength(1)
    expect(paged[0].query.get('before')).toBe('101')
    await expect(page.getByRole('button', { name: 'Load more' })).toHaveCount(0)
  })
})

test.describe('SPEC-008 US2 users and invites', () => {
  test('gauge, tiles, tables and IST dates', async ({ page }) => {
    await mockAdmin(page)
    await page.goto('/admin/users')
    await expect(page.getByTestId('seat-gauge')).toHaveText('Seats used: 312 of 1000')
    await expect(page.getByTestId('tile-active')).toHaveText('290')
    await expect(page.getByTestId('tile-expiring')).toHaveText('9')
    await expect(page.getByTestId('tile-pending')).toHaveText('22')
    const acc = page.getByTestId('accounts-table')
    await expect(acc.getByRole('columnheader')).toHaveCount(9)
    await expect(acc).toContainText('2 Nov 2026, 3:30 pm')
    await expect(acc).toContainText('Never')
    // revoked accounts: no extend / revoke controls
    await expect(page.getByRole('button', { name: 'Extend BETA-BBBB-2222' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Revoke invite inv-2' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Revoke invite inv-1' })).toBeVisible()
  })

  test('guidance text, validation, links shown once, Copy all, CSV with formula protection', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const links = ['https://x.example/invite/aaa', 'https://x.example/invite/bbb']
    const m = await mockAdmin(page, { post: () => ({ status: 201, json: { links } }) })
    await page.goto('/admin/users')
    await expect(page.getByTestId('gen-help')).toHaveText('Use a group label such as "School A - Grade 7". Do not enter personal names.')
    await page.getByTestId('gen-count').fill('0')
    await page.getByTestId('gen-submit').click()
    await expect(page.getByTestId('gen-error')).toContainText('1 to 100')
    await page.getByTestId('gen-count').fill('2')
    await page.getByTestId('gen-label').fill('Ravi <b>')
    await page.getByTestId('gen-submit').click()
    await expect(page.getByTestId('gen-error')).toContainText('letters, digits')
    expect(m.posts()).toHaveLength(0)
    await page.getByTestId('gen-label').fill('-School "A"'.replace('"A"', 'A'))
    await page.getByTestId('gen-submit').click()
    await expect(page.getByTestId('links-panel')).toContainText('cannot be shown again')
    await expect(page.getByTestId('links-text')).toHaveValue(links.join('\n'))
    const post = m.posts()[0]
    expect(post.path).toBe('/api/admin/invites')
    expect(post.body).toEqual({ count: 2, label: '-School A' })
    expect(post.headers['content-type']).toContain('application/json')
    expect(post.headers['x-csrf-token']).toBe(m.token())
    await page.getByTestId('links-copy').click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(links.join('\n'))
    const dl = page.waitForEvent('download')
    await page.getByTestId('links-csv').click()
    const file = await dl
    const text = readFileSync((await file.path())!, 'utf8')
    expect(text).toBe('link,label\r\n"https://x.example/invite/aaa","\'-School A"\r\n"https://x.example/invite/bbb","\'-School A"\r\n')
    await page.getByRole('button', { name: 'Done, hide links' }).click()
    await expect(page.getByTestId('links-panel')).toHaveCount(0)
  })

  test('seat_cap message is shown verbatim', async ({ page }) => {
    await mockAdmin(page, { post: () => ({ status: 409, json: { code: 'seat_cap', error: 'Seat cap reached (1,000)' } }) })
    await page.goto('/admin/users')
    await page.getByTestId('gen-submit').click()
    await expect(page.getByTestId('gen-error')).toHaveText('Seat cap reached (1,000)')
    await expect(page.getByTestId('links-panel')).toHaveCount(0)
  })

  test('revoke invite and revoke account: confirm, endpoint, CSRF and JSON content type, lists refetched', async ({ page }) => {
    const m = await mockAdmin(page)
    await page.goto('/admin/users')
    await page.getByRole('button', { name: 'Revoke invite inv-1' }).click()
    await page.getByTestId('action-dialog').getByRole('button', { name: 'Cancel' }).click()
    expect(m.posts()).toHaveLength(0)
    await page.getByRole('button', { name: 'Revoke invite inv-1' }).click()
    await page.getByTestId('action-confirm').click()
    await expect(page.getByTestId('action-dialog')).toHaveCount(0)
    await page.getByRole('button', { name: 'Revoke account BETA-AAAA-1111' }).click()
    await page.getByTestId('action-confirm').click()
    await expect(page.getByTestId('action-dialog')).toHaveCount(0)
    const posts = m.posts()
    expect(posts.map((p) => p.path)).toEqual(['/api/admin/invites/inv-1/revoke', '/api/admin/accounts/BETA-AAAA-1111/revoke'])
    for (const p of posts) {
      expect(p.headers['x-csrf-token']).toBe(m.token())
      expect(p.headers['content-type']).toContain('application/json')
    }
    await expect.poll(() => m.reqs.filter((r) => r.path === '/api/admin/accounts').length).toBeGreaterThanOrEqual(3)
  })

  test('reissue shows the password once; gone after closing', async ({ page }) => {
    const m = await mockAdmin(page, { post: () => ({ status: 200, json: { password: 'maple-tiger-river-cloud-482' } }) })
    await page.goto('/admin/users')
    await page.getByRole('button', { name: 'Reissue password for BETA-AAAA-1111' }).click()
    await page.getByTestId('action-confirm').click()
    await expect(page.getByTestId('new-password')).toHaveText('maple-tiger-river-cloud-482')
    await expect(page.getByTestId('password-dialog')).toContainText('not shown again')
    await expect(page.getByTestId('password-dialog')).toContainText('old password stopped working')
    await expect(page.getByTestId('password-dialog')).toContainText('signed out')
    expect(m.posts()[0].path).toBe('/api/admin/accounts/BETA-AAAA-1111/reissue')
    await page.getByTestId('password-close').click()
    await expect(page.getByText('maple-tiger-river-cloud-482')).toHaveCount(0)
  })

  test('filters and sort send the right query strings; export link follows filters', async ({ page }) => {
    const m = await mockAdmin(page)
    await page.goto('/admin/users')
    const last = () => m.reqs.filter((r) => r.path === '/api/admin/accounts').at(-1)!
    await expect(page.getByTestId('accounts-table')).toBeVisible()
    expect(last().query.get('sort')).toBe('lastSeen')
    expect(last().query.get('order')).toBe('desc')
    expect(last().query.has('label')).toBe(false)
    await page.getByTestId('f-label').nth(1).selectOption('School B')
    await page.getByTestId('f-status').selectOption('expired')
    await page.getByTestId('f-sort').selectOption('expiry')
    await page.getByTestId('f-order').selectOption('asc')
    await expect.poll(() => last().query.get('order')).toBe('asc')
    expect(last().query.get('label')).toBe('School B')
    expect(last().query.get('status')).toBe('expired')
    expect(last().query.get('sort')).toBe('expiry')
    expect(m.reqs.filter((r) => r.path === '/api/admin/dashboard').at(-1)!.query.get('label')).toBe('School B')
    const href = new URL((await page.getByTestId('export-csv').getAttribute('href'))!, 'http://x')
    expect(href.pathname).toBe('/api/admin/accounts.csv')
    expect(href.searchParams.get('label')).toBe('School B')
    expect(href.searchParams.get('status')).toBe('expired')
  })

  test('403 csrf refetches the token once and retries once', async ({ page }) => {
    let n = 0
    const m = await mockAdmin(page, { post: () => (++n === 1 ? { status: 403, json: { code: 'csrf', error: 'bad' } } : undefined) })
    await page.goto('/admin/users')
    await expect(page.getByRole('button', { name: 'Revoke invite inv-1' })).toBeVisible()
    const before = m.me()
    const oldTok = m.token()
    await page.getByRole('button', { name: 'Revoke invite inv-1' }).click()
    await page.getByTestId('action-confirm').click()
    await expect(page.getByTestId('action-dialog')).toHaveCount(0)
    expect(m.me()).toBe(before + 1)
    const posts = m.posts()
    expect(posts).toHaveLength(2)
    expect(posts[0].headers['x-csrf-token']).toBe(oldTok)
    expect(posts[1].headers['x-csrf-token']).toBe(m.token())
    expect(m.token()).not.toBe(oldTok)
  })
})
