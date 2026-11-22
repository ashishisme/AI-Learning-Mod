// Bug 2026-11-18: most in-lesson right answers were written first, so learners could just pick the first option.
// Options are now shown in a shuffled order; only the display changes, answers are still checked by their index.
import { test, expect } from '@playwright/test'

const lesson = {
  lessonId: 'order-test',
  mode: 'plain-english',
  origin: 'own',
  title: 'Order Lesson',
  sections: [{ id: 's1', heading: 'One', bodyMarkdown: 'Text.' }],
  miniQuiz: [{ question: 'Which one is right?', options: ['Right answer', 'Wrong one', 'Wrong two', 'Wrong three'], correctIndex: 0, explanation: 'Because.' }],
}

async function open(page: import('@playwright/test').Page) {
  await page.route('**/api/runtime', (r) => r.fulfill({ json: { hosted: false, authRequired: false, tutorEnabled: false, feedbackEnabled: false } }))
  await page.route('**/api/auth/session', (r) => r.fulfill({ json: { authenticated: false } }))
  await page.route('**/api/lessons/order-test?*', (r) => r.fulfill({ json: lesson }))
  await page.goto('/lesson/order-test')
  await expect(page.getByText('Which one is right?')).toBeVisible()
}

const optionTexts = (page: import('@playwright/test').Page) =>
  page.getByText('Which one is right?').locator('xpath=..').locator('button').allInnerTexts()

test('the right answer is not always shown first', async ({ page }) => {
  const firsts = new Set<string>()
  for (let i = 0; i < 10 && firsts.size < 2; i++) {
    await open(page)
    const texts = (await optionTexts(page)).map((t) => t.trim())
    expect([...texts].sort()).toEqual(['Right answer', 'Wrong one', 'Wrong three', 'Wrong two'])
    firsts.add(texts[0])
  }
  // Ten loads all starting with the same option would happen about once in 260,000 runs.
  expect(firsts.size).toBeGreaterThan(1)
})

test('the shown order stays put while answering, and the right answer is still marked right', async ({ page }) => {
  await open(page)
  const before = await optionTexts(page)
  await page.getByRole('button', { name: 'Right answer' }).click()
  await expect(page.getByRole('button', { name: /Right answer/ })).toContainText('✅')
  const after = (await optionTexts(page)).map((t) => t.replace('✅', '').trim())
  expect(after).toEqual(before.map((t) => t.trim()))
})
