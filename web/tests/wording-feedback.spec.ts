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
  await dialog.getByRole('textbox').fill('வாக்கியம் இயல்பாக இல்லை')
  await dialog.getByRole('button', { name: ta['feedback.send'] }).click()
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
  await dialog.getByRole('textbox').fill('step 1 reads oddly')
  await dialog.getByRole('button', { name: 'Send message' }).click()
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

// FR-I18N-12: the Feedback page has Read and Controls; an admin raises the per-learner limits.
test('admin raises the per-learner feedback limits on the Controls tab', async ({ page }) => {
  const mock = await mockAdmin(page, {
    feedback: () => ({ items: [], total: 0, unread: 0, held: { waiting: 0, withheld: 0, byReason: {} } }),
    post: (req) => req.path === '/api/admin/feedback/limits' ? { status: 200, json: { ...(req.body as object), maxDaily: 100, maxTotal: 1000 } } : undefined,
  })
  await page.goto('/admin/feedback')
  await expect(page.getByRole('navigation', { name: 'Feedback sections' }).getByRole('link', { name: 'Read feedback' })).toBeVisible()
  await page.getByRole('link', { name: 'Controls' }).click()
  await expect(page.getByTestId('limits-now')).toHaveText('Now: 10 a day, 50 in total per learner.')
  await page.getByLabel('Per day').fill('5')
  await page.getByLabel('In total').fill('80')
  await page.getByRole('button', { name: 'Save limits' }).click()
  await expect(page.getByRole('status')).toContainText('Saved: 5 a day, 80 in total per learner.')
  expect(mock.posts().find((r) => r.path === '/api/admin/feedback/limits')?.body).toEqual({ daily: 5, total: 80 })
})

test('a learner at the daily or total limit sees a friendly message in their language', async ({ page }) => {
  await setup(page, { feedback: true, lang: 'ta' })
  let code = 'feedback_daily_limit'
  await page.route('**/api/feedback', (r) => r.fulfill({ status: 429, json: { code, error: 'limit' } }))
  await openLesson(page, '5-nlp')
  await page.locator('article > [data-testid="report-wording"]').first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox').fill('சொல் சரியில்லை')
  await dialog.getByRole('button', { name: ta['feedback.send'] }).click()
  await expect(dialog.getByRole('status')).toHaveText(ta['feedback.dailyLimit'])
  code = 'feedback_total_limit'
  await dialog.getByRole('button', { name: ta['feedback.send'] }).click()
  await expect(dialog.getByRole('status')).toHaveText(ta['feedback.totalLimit'])
})

// FR-I18N-13: part 1 is star ratings, one saved set per learner that a resubmit overwrites.
test('ratings show the saved stars, offer Translation only in another language, and save the new set', async ({ page }) => {
  await setup(page, { feedback: true, lang: 'ta' })
  let saved: Record<string, unknown> = {}
  await page.route('**/api/feedback/ratings', (r) => {
    if (r.request().method() === 'POST') { saved = r.request().postDataJSON(); return r.fulfill({ json: saved }) }
    return r.fulfill({ json: { lessons: 4, ease: 0, voice: 0, translation: 2, lang: 'ta' } })
  })
  await page.goto('/')
  await page.getByRole('button', { name: ta['feedback.button'] }).click()
  const part = page.getByTestId('ratings-part')
  await expect(part.getByRole('radio', { name: ta['feedback.stars'].replace('{n}', '4') }).first()).toBeChecked()
  await expect(part.getByRole('group', { name: ta['feedback.area.translation'] })).toBeVisible()
  await expect(part.getByRole('button', { name: ta['feedback.updateRatings'] })).toBeVisible()
  await part.getByRole('group', { name: ta['feedback.area.ease'] }).getByText('★').nth(4).click()
  await part.getByRole('button', { name: ta['feedback.updateRatings'] }).click()
  await expect(part.getByRole('status')).toHaveText(ta['feedback.ratingsSaved'])
  expect(saved).toMatchObject({ lessons: 4, ease: 5, translation: 2, lang: 'ta' })
})

test('in English there is no Translation rating, and a wording report shows only the written part', async ({ page }) => {
  await setup(page, { feedback: true })
  await page.route('**/api/feedback/ratings', (r) => r.fulfill({ json: { lessons: 0, ease: 0, voice: 0, translation: 0 } }))
  await page.goto('/')
  await page.getByRole('button', { name: 'Feedback' }).click()
  await expect(page.getByTestId('ratings-part').getByRole('group')).toHaveCount(3)
  await expect(page.getByRole('button', { name: 'Save ratings' })).toBeDisabled()
  await page.keyboard.press('Escape')
  await openLesson(page, '5-nlp')
  await page.locator('article > [data-testid="report-wording"]').first().click()
  await expect(page.getByTestId('ratings-part')).toHaveCount(0)
  await expect(page.getByTestId('write-part')).toBeVisible()
})

test('admin sees the ratings summary with Translation split by language', async ({ page }) => {
  await mockAdmin(page, { feedback: () => ({ items: [], total: 0, unread: 0, held: { waiting: 0, withheld: 0, byReason: {} } }) })
  await page.goto('/admin/feedback/ratings')
  await expect(page.getByTestId('ratings-learners')).toContainText('3 learners have rated')
  const table = page.getByRole('table', { name: 'Average ratings by area' })
  await expect(table).toContainText('4.33 ★')
  await expect(table).toContainText('Translation: Tamil')
})
