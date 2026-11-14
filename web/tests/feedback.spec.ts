import { expect, test } from '@playwright/test'
import { mockAdmin } from './helpers/admin-mock'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const session = { authenticated: true, betaId: 'BETA-7KQ3-M9XP', label: 'School A', expiresAt: '2027-01-01T08:30:00Z', daysLeft: 61, expiringSoon: false }

test('learner feedback is gated, warns about personal details, and does not echo a rejected message', async ({ page }) => {
  await page.route('**/api/runtime', (r) => r.fulfill({ json: { hosted: true, authRequired: true, tutorEnabled: false, feedbackEnabled: true } }))
  await page.route('**/api/auth/session', (r) => r.fulfill({ json: session }))
  await page.route('**/api/lessons', (r) => r.fulfill({ json: { lessons: [] } }))
  let calls = 0
  await page.route('**/api/feedback', (r) => {
    calls++
    return calls === 1 ? r.fulfill({ status: 422, json: { code: 'pii_detected', kind: 'phone', error: 'Please remove personal details' } }) : r.fulfill({ status: 201, json: { ok: true } })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Feedback' }).click()
  await expect(page.getByRole('dialog')).toContainText('Please do not include names, phone numbers, emails or addresses.')
  await page.getByRole('radio', { name: '4' }).check()
  await page.getByRole('textbox', { name: 'Message (optional)' }).fill('call 9876543210')
  await expect(page.getByText('15 / 500 characters')).toBeVisible()
  await page.getByRole('button', { name: 'Send feedback' }).click()
  await expect(page.getByRole('status')).toContainText('Please remove personal details (phone)')
  await expect(page.getByRole('textbox', { name: 'Message (optional)' })).toHaveValue('call 9876543210')
  await page.getByRole('textbox', { name: 'Message (optional)' }).fill('The quiz was clear')
  await page.getByRole('button', { name: 'Send feedback' }).click()
  await expect(page.getByRole('status')).toContainText('sent for review')
})

test('admin sees only passed items, held counts, status controls and CSV export', async ({ page }) => {
  const mock = await mockAdmin(page, { feedback: () => ({ items: [{ id: 'f1', at: '2026-11-02T10:00:00Z', rating: 4, category: 'content', message: 'The quiz was clear', label: 'School A', lessonId: '1-intro', mode: 'junior', status: 'new' }], total: 1, unread: 1, held: { waiting: 2, withheld: 1, byReason: { personal_details: 1 } } }) })
  await page.goto('/admin/feedback')
  await expect(page.getByRole('navigation', { name: 'Admin sections' }).getByRole('link', { name: 'Feedback (1)' })).toBeVisible()
  await expect(page.getByText('Waiting: 2; withheld: 1')).toBeVisible()
  await expect(page.getByRole('table', { name: 'Reviewed feedback' })).toContainText('The quiz was clear')
  await expect(page.getByRole('link', { name: 'Export CSV' })).toHaveAttribute('href', /\/api\/admin\/feedback.csv/)
  await page.getByRole('button', { name: 'Mark read' }).click()
  await expect.poll(() => mock.posts().some((r) => r.path === '/api/admin/feedback/f1/status' && (r.body as { status: string }).status === 'read')).toBe(true)
})

test('admin console hides Feedback and shows no error when the auditor is not configured', async ({ page }) => {
  await mockAdmin(page)
  await page.goto('/admin/feedback')
  await expect(page.getByTestId('feedback-off')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Admin sections' }).getByRole('link', { name: /Feedback/ })).toHaveCount(0)
  await expect(page.getByText('is not valid JSON')).toHaveCount(0)
})

test('learner sees the hourly feedback limit without losing the draft', async ({ page }) => {
  await page.route('**/api/runtime', (r) => r.fulfill({ json: { hosted: true, authRequired: true, tutorEnabled: false, feedbackEnabled: true } }))
  await page.route('**/api/auth/session', (r) => r.fulfill({ json: session }))
  await page.route('**/api/lessons', (r) => r.fulfill({ json: { lessons: [] } }))
  await page.route('**/api/feedback', (r) => r.fulfill({ status: 429, json: { code: 'feedback_limit', error: 'limit' } }))
  await page.goto('/')
  await page.getByRole('button', { name: 'Feedback' }).click()
  await page.getByRole('radio', { name: '3' }).check()
  await page.getByRole('textbox', { name: 'Message (optional)' }).fill('Please add more quizzes')
  await page.getByRole('button', { name: 'Send feedback' }).click()
  await expect(page.getByRole('status')).toContainText('try again later')
  await expect(page.getByRole('textbox', { name: 'Message (optional)' })).toHaveValue('Please add more quizzes')
})

// SPEC-009 FR-022: the learner's language goes with the feedback, and a non-English rejection is
// the server's own localised text.
test('feedback sends the language and shows the localised rejection', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ai-foundations-language', JSON.stringify({ state: { code: 'hi' }, version: 0 })))
  await page.route('**/api/runtime', (r) => r.fulfill({ json: { hosted: true, authRequired: true, tutorEnabled: false, feedbackEnabled: true,
    languages: [{ code: 'en', name: 'English', speechLang: 'en-US' }, { code: 'hi', name: 'हिन्दी', speechLang: 'hi-IN' }] } }))
  await page.route('**/api/auth/session', (r) => r.fulfill({ json: session }))
  await page.route('**/api/lessons**', (r) => r.fulfill({ json: { lessons: [] } }))
  let sent: Record<string, unknown> = {}
  await page.route('**/api/feedback', (r) => {
    sent = r.request().postDataJSON()
    return r.fulfill({ status: 422, json: { code: 'pii_detected', kind: 'phone', error: 'कृपया निजी जानकारी (फ़ोन नंबर) हटाकर फिर से भेजें।' } })
  })
  await page.goto('/')
  // The button label is whatever the Hindi catalogue says (English until it exists).
  const hiFile = join(process.cwd(), 'src', 'i18n', 'hi.json')
  const label = existsSync(hiFile) ? JSON.parse(readFileSync(hiFile, 'utf8'))['feedback.button'] : 'Feedback'
  await page.getByRole('button', { name: label }).click()
  await page.getByRole('radio', { name: '4' }).check()
  await page.getByRole('dialog').getByRole('textbox').fill('मेरा नंबर ९८७६५४३२१० है')
  await page.locator('form button[type="submit"]').click()
  await expect(page.getByRole('status')).toContainText('कृपया निजी जानकारी (फ़ोन नंबर)')
  expect(sent.lang).toBe('hi')
})
