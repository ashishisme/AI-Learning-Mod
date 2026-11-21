// SPEC: SPEC-016 FR-004, FR-005, FR-007, FR-011, FR-013 (FR-I18N-11, AC-86, AC-87)
import { expect, test, Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { mockAdmin } from './helpers/admin-mock'

const session = { authenticated: true, betaId: 'BETA-7KQ3-M9XP', label: 'School A', expiresAt: '2027-01-01T08:30:00Z', daysLeft: 61, expiringSoon: false }
const EN = { code: 'en', name: 'English', speechLang: 'en-US' }
const TA = { code: 'ta', name: 'தமிழ்', speechLang: 'ta-IN', beta: true }
const ta = JSON.parse(readFileSync(join(process.cwd(), 'src', 'i18n', 'ta.json'), 'utf8')) as Record<string, string>

async function setup(page: Page, opts: { feedback: boolean; lang?: string }) {
  await page.route('**/api/runtime', (r) => r.fulfill({ json: { hosted: true, authRequired: true, tutorEnabled: false, feedbackEnabled: opts.feedback, languages: [EN, TA] } }))
  await page.route('**/api/auth/session', (r) => r.fulfill({ json: session }))
  await page.addInitScript((code) => {
    localStorage.setItem('ai-foundations-language', JSON.stringify({ state: { code, chosenAt: '2026-11-21T00:00:00Z' }, version: 0 }))
  }, opts.lang ?? 'en')
  const sent: Record<string, unknown>[] = []
  await page.route('**/api/feedback', (r) => { sent.push(r.request().postDataJSON()); return r.fulfill({ status: 201, json: { ok: true } }) })
  return sent
}

async function openLesson(page: Page, id: string, journey?: 'junior' | 'plain-english') {
  await page.goto(`/lesson/${id}`)
  await expect(page.getByTestId('lesson-title')).toBeVisible()
  if (journey) {
    const loaded = page.waitForResponse((r) => r.url().includes(`/api/lessons/${id}?mode=${journey}`))
    await page.getByTestId(`journey-tab-${journey}`).click()
    await loaded
  }
}

test('a Tamil learner reports a wording problem on a Detailed section, and its place goes with it', async ({ page }) => {
  const sent = await setup(page, { feedback: true, lang: 'ta' })
  await openLesson(page, '5-nlp')
  const links = page.locator('article > [data-testid="report-wording"]')
  await expect(links.first()).toHaveText(ta['feedback.report'])
  await links.first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText(ta['feedback.about'].replace('{place}', ''))
  await expect(dialog.getByRole('combobox')).toHaveValue('translation')
  await dialog.getByRole('radio', { name: '3' }).check()
  await dialog.getByRole('textbox').fill('வாக்கியம் இயல்பாக இல்லை')
  await dialog.getByRole('button', { name: ta['feedback.title'] }).click()
  await expect.poll(() => sent.length).toBe(1)
  expect(sent[0]).toMatchObject({ category: 'translation', lang: 'ta', lessonId: '5-nlp', mode: 'standard' })
  expect(String(sent[0].sectionId)).toMatch(/^[a-z0-9][a-z0-9-]*$/)
  expect(sent[0].step).toBeUndefined()
})

test('a report from a clip carries the step on screen', async ({ page }) => {
  const sent = await setup(page, { feedback: true })
  await openLesson(page, '5-nlp')
  const clip = page.locator('figure').filter({ has: page.getByTestId('report-wording') }).first()
  await clip.getByTestId('report-wording').click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('radio', { name: '4' }).check()
  await dialog.getByRole('button', { name: 'Send feedback' }).click()
  await expect.poll(() => sent.length).toBe(1)
  expect(sent[0]).toMatchObject({ category: 'translation', lang: 'en', step: 1 })
})

test('the Kids journey offers one wording report, for the whole lesson', async ({ page }) => {
  await setup(page, { feedback: true })
  await openLesson(page, '1-intro', 'junior')
  await expect(page.getByTestId('report-wording')).toHaveCount(1)
})

test('with feedback off there are no report links and the beta note does not invite reports', async ({ page }) => {
  await setup(page, { feedback: false, lang: 'ta' })
  await openLesson(page, '5-nlp')
  await expect(page.getByTestId('report-wording')).toHaveCount(0)
  await page.getByTestId('beta-note-button').first().click()
  await expect(page.getByTestId('beta-note')).toHaveText(ta['language.betaNote'])
})

test('the beta note opens in Tamil, invites reports when feedback is on, and closes with Esc', async ({ page }) => {
  await setup(page, { feedback: true, lang: 'ta' })
  await page.goto('/')
  const button = page.getByTestId('beta-note-button').first()
  await button.click()
  await expect(page.getByTestId('beta-note')).toHaveText(ta['language.betaNoteInvite'])
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('beta-note')).toHaveCount(0)
  await expect(button).toBeFocused()
})

test('admin filters feedback by language and sees where each report points', async ({ page }) => {
  let lastQuery = ''
  await mockAdmin(page, { feedback: (req) => {
    lastQuery = req.query.toString()
    return { items: [{ id: 'f1', at: '2026-11-21T10:00:00Z', rating: 3, category: 'translation', message: 'step reads oddly', label: 'School A', lessonId: '5-nlp', mode: 'standard', status: 'new', lang: 'ta', sectionId: 'worked-example', step: 2 }], total: 1, unread: 1, held: { waiting: 0, withheld: 0, byReason: {} } }
  } })
  await page.route('**/api/runtime', (r) => r.fulfill({ json: { hosted: true, authRequired: true, tutorEnabled: false, feedbackEnabled: true, languages: [EN, TA] } }))
  await page.goto('/admin/feedback')
  const table = page.getByRole('table', { name: 'Reviewed feedback' })
  await expect(table).toContainText('5-nlp › worked-example › step 2 · standard')
  await page.locator('label', { hasText: /^Language/ }).locator('select').selectOption('ta')
  await expect.poll(() => lastQuery).toContain('lang=ta')
  await expect(page.getByRole('link', { name: 'Export CSV' })).toHaveAttribute('href', /lang=ta/)
})
