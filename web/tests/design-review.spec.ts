import { expect, test } from '@playwright/test'
import { mockAdmin } from './helpers/admin-mock'

const session = { authenticated: true, betaId: 'BETA-7KQ3-M9XP', label: 'School A', expiresAt: '2027-01-01T08:30:00Z', daysLeft: 61, expiringSoon: false }
const runtime = (feedbackEnabled = false) => ({ hosted: true, authRequired: true, tutorEnabled: false, feedbackEnabled })

async function checkSurface(page: import('@playwright/test').Page, buttonName: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  expect(overflow).toBe(false)
  const button = page.getByRole('button', { name: buttonName, exact: true })
  const box = await button.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.height).toBeGreaterThanOrEqual(44)
  const colors = await button.evaluate((el) => {
    const foreground = getComputedStyle(el).color
    let current: Element | null = el
    let background = 'rgb(255, 255, 255)'
    while (current) {
      const color = getComputedStyle(current).backgroundColor
      if (color !== 'transparent' && !/rgba?\([^)]*,\s*0\)$/.test(color)) { background = color; break }
      current = current.parentElement
    }
    return { foreground, background }
  })
  const luminance = (css: string) => {
    const rgb = css.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [0, 0, 0]
    const v = rgb.map((c) => { const n = c / 255; return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4 })
    return v[0] * 0.2126 + v[1] * 0.7152 + v[2] * 0.0722
  }
  const a = luminance(colors.foreground), b = luminance(colors.background)
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  expect(ratio).toBeGreaterThanOrEqual(4.5)
}

for (const theme of ['light', 'dark'] as const) {
  test(`new learner and admin surfaces meet mobile basics in ${theme} mode`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.route('**/api/runtime', (r) => r.fulfill({ json: runtime(true) }))
    await page.route('**/api/auth/session', (r) => r.fulfill({ json: { authenticated: false } }))
    await page.goto('/')
    if (theme === 'dark') await page.evaluate(() => document.documentElement.classList.add('dark'))
    await checkSurface(page, 'Sign in')
    await page.goto('/invite/example-token')
    if (theme === 'dark') await page.evaluate(() => document.documentElement.classList.add('dark'))
    await checkSurface(page, 'Activate my account')

    await page.route('**/api/auth/session', (r) => r.fulfill({ json: session }))
    await page.goto('/')
    if (theme === 'dark') await page.evaluate(() => document.documentElement.classList.add('dark'))
    await page.getByRole('button', { name: 'Sign out' }).click()
    await checkSurface(page, 'Sign out and clear my progress on this device')
    await page.getByRole('button', { name: 'Cancel' }).click()
    await page.getByRole('button', { name: 'Feedback' }).click()
    await checkSurface(page, 'Close feedback')
    await expect(page.getByRole('dialog')).toContainText('Please do not include names')
  })

  test(`admin tabs fit mobile viewport in ${theme} mode`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await mockAdmin(page)
    await page.goto('/admin')
    if (theme === 'dark') await page.evaluate(() => document.documentElement.classList.add('dark'))
    await expect(page.getByText('312 / 1000')).toBeVisible()
    await checkSurface(page, 'Sign out')
    for (const tab of ['Users and Invites', 'Usage', 'Costs', 'Feedback', 'Audit']) {
      await page.getByRole('navigation', { name: 'Admin sections' }).getByRole('link', { name: tab }).click()
      await expect(page.getByRole('heading', { name: tab === 'Users and Invites' ? 'Seats and accounts' : tab }).first()).toBeVisible()
      if (tab === 'Users and Invites') {
        await expect(page.locator('#dashboard-group-label')).toHaveCount(1)
        await expect(page.locator('#accounts-group-label')).toHaveCount(1)
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
    }
  })
}
