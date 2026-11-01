// SPEC-008 US1: sign-in gate, invite activation, sign-out, session expiry. All API calls are mocked.
import { test, expect, Page } from '@playwright/test'

const SESSION = {
  authenticated: true,
  betaId: 'BETA-7KQ3-M9XP',
  label: 'School A',
  expiresAt: '2027-01-01T08:30:00Z',
  daysLeft: 61,
  expiringSoon: false,
}
const LESSONS = {
  commitSha: '1234567890123456789012345678901234567890',
  lessons: [{ id: 'lesson-1', module: 'Introduction', title: 'Secret Lesson Title', order: 0, path: 'a.md', commitSha: '1234567890123456789012345678901234567890' }],
}
const PASSWORD = 'maple-tiger-river-cloud-482'

async function mock(page: Page, opts: { authRequired?: boolean; session?: object; lessonsStatus?: number; lessonsBody?: object } = {}) {
  const calls = { activate: 0 }
  await page.route('**/api/runtime', (r) => r.fulfill({ json: { hosted: true, authRequired: opts.authRequired ?? true, tutorEnabled: false, feedbackEnabled: false } }))
  await page.route('**/api/auth/session', (r) => r.fulfill({ json: opts.session ?? { authenticated: false } }))
  await page.route('**/api/lessons', (r) =>
    r.fulfill({ status: opts.lessonsStatus ?? 200, json: opts.lessonsBody ?? LESSONS }),
  )
  await page.route('**/api/auth/logout', (r) => r.fulfill({ status: 204 }))
  await page.route('**/api/auth/activate', (r) => {
    calls.activate++
    return r.fulfill({ json: { betaId: SESSION.betaId, password: PASSWORD, expiresAt: SESSION.expiresAt } })
  })
  return calls
}

test.describe('SPEC-008 US1 sign-in gate', () => {
  test('signed-out visitor sees SignIn and no lesson text; 401 lessons never shows content', async ({ page }) => {
    await mock(page, { lessonsStatus: 401, lessonsBody: { error: 'Sign in required', code: 'signin_required' } })
    await page.goto('/')
    await expect(page.getByTestId('signin-form')).toBeVisible()
    await expect(page.getByTestId('invite-only-notice')).toContainText('invite-only')
    await expect(page.getByText('Secret Lesson Title')).toHaveCount(0)
    await expect(page.getByLabel('Beta ID')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
  })

  test('wrong password and locked messages', async ({ page }) => {
    await mock(page)
    let n = 0
    await page.route('**/api/auth/login', (r) => {
      n++
      return n === 1
        ? r.fulfill({ status: 401, json: { error: 'Beta ID or password is incorrect.', code: 'bad_credentials' } })
        : r.fulfill({ status: 429, json: { error: 'x', code: 'locked' } })
    })
    await page.goto('/')
    await page.getByTestId('signin-betaid').fill('BETA-AAAA-BBBB')
    await page.getByTestId('signin-password').fill('nope')
    await page.getByTestId('signin-submit').click()
    await expect(page.getByTestId('signin-error')).toHaveText('Beta ID or password is incorrect.')
    await page.getByTestId('signin-submit').click()
    await expect(page.getByTestId('signin-error')).toHaveText('Too many attempts. Try again in 15 minutes.')
  })

  test('successful login shows the app with Sign out', async ({ page }) => {
    await mock(page)
    await page.route('**/api/auth/login', (r) => r.fulfill({ json: SESSION }))
    await page.goto('/')
    await page.getByTestId('signin-betaid').fill(SESSION.betaId)
    await page.getByTestId('signin-password').fill(PASSWORD)
    await page.getByTestId('signin-submit').click()
    await expect(page.getByText('Secret Lesson Title')).toBeVisible()
    await expect(page.getByTestId('signout-btn')).toBeVisible()
  })

  test('401 account_expired from any /api/ call returns to SignIn with the message', async ({ page }) => {
    await mock(page, { session: SESSION })
    await page.goto('/')
    await expect(page.getByText('Secret Lesson Title')).toBeVisible()
    await page.evaluate(() => fetch('/api/lessons/lesson-1'))
    await page.route('**/api/lessons/lesson-1', (r) =>
      r.fulfill({ status: 401, json: { error: 'Your beta access has expired. Ask your teacher or admin to extend it.', code: 'account_expired' } }),
    )
    await page.evaluate(() => fetch('/api/lessons/lesson-1'))
    await expect(page.getByTestId('signin-form')).toBeVisible()
    await expect(page.getByText('Your beta access has expired')).toBeVisible()
    await expect(page.getByText('Secret Lesson Title')).toHaveCount(0)
  })

  test('sign out dialog offers both options; the second clears progress', async ({ page }) => {
    await mock(page, { session: SESSION })
    await page.addInitScript(() => localStorage.setItem('ai-foundations-progress', '{"x":1}'))
    await page.goto('/')
    await page.getByTestId('signout-btn').click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign out', exact: true }).last()).toBeVisible()
    await page.getByTestId('signout-clear').click()
    await expect(page.getByTestId('signin-form')).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('ai-foundations-progress'))).toBeNull()
  })

  test('plain sign out keeps progress', async ({ page }) => {
    await mock(page, { session: SESSION })
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem('ai-foundations-progress', '{"x":1}')
        sessionStorage.setItem('seeded', '1')
      }
    })
    await page.goto('/')
    await page.getByTestId('signout-btn').click()
    await page.getByTestId('signout-confirm').click()
    await expect(page.getByTestId('signin-form')).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('ai-foundations-progress'))).not.toBeNull()
  })

  test('authRequired false: no sign-in and no Sign out', async ({ page }) => {
    await mock(page, { authRequired: false })
    await page.goto('/')
    await expect(page.getByText('Secret Lesson Title')).toBeVisible()
    await expect(page.getByTestId('signin-form')).toHaveCount(0)
    await expect(page.getByTestId('signout-btn')).toHaveCount(0)
  })
})

test.describe('SPEC-008 US1 invite activation', () => {
  test('no activation call until click; saved gated on copy password; nothing stored', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const calls = await mock(page)
    await page.goto('/invite/tok123')
    await expect(page.getByTestId('invite-activate')).toBeVisible()
    await page.waitForTimeout(300)
    expect(calls.activate).toBe(0)
    await expect(page.getByText(PASSWORD)).toHaveCount(0)

    await page.getByTestId('invite-activate').click()
    await expect(page.getByTestId('invite-password')).toHaveText(PASSWORD)
    expect(calls.activate).toBe(1)
    await expect(page.getByText(/shown only once/)).toBeVisible()
    await expect(page.getByText(/1 January 2027 \(IST\)|January 2027/)).toBeVisible()
    await expect(page.getByTestId('invite-saved')).toBeDisabled()

    await page.getByRole('button', { name: 'Copy Beta ID' }).click()
    await expect(page.getByTestId('invite-saved')).toBeDisabled()
    await page.getByRole('button', { name: 'Copy password' }).click()
    await expect(page.getByTestId('invite-saved')).toBeEnabled()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(PASSWORD)

    await page.route('**/api/auth/session', (r) => r.fulfill({ json: SESSION }))
    await page.getByTestId('invite-saved').click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText('Secret Lesson Title')).toBeVisible()
    const stored = await page.evaluate(() => JSON.stringify([{ ...localStorage }, { ...sessionStorage }]))
    expect(stored).not.toContain(PASSWORD)
  })

  test('download also enables saved', async ({ page }) => {
    await mock(page)
    await page.goto('/invite/tok123')
    await page.getByTestId('invite-activate').click()
    await expect(page.getByTestId('invite-saved')).toBeDisabled()
    const dl = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download as text file' }).click()
    expect((await dl).suggestedFilename()).toBe('beta-login.txt')
    await expect(page.getByTestId('invite-saved')).toBeEnabled()
  })

  test('used invite message', async ({ page }) => {
    await mock(page)
    await page.route('**/api/auth/activate', (r) =>
      r.fulfill({ status: 409, json: { error: 'This invite has already been used. Please sign in.', code: 'invite_used' } }),
    )
    await page.goto('/invite/tok123')
    await page.getByTestId('invite-activate').click()
    await expect(page.getByTestId('invite-error')).toContainText('This invite has already been used. Please sign in.')
  })
})
