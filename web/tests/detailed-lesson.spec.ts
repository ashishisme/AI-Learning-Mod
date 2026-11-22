// SPEC: AC-69 (FR-UI-26), AC-72 (FR-CNT-11, FR-UI-08); SPEC-013 FR-003, FR-004, FR-016
import { test, expect } from '@playwright/test'

const detailed = {
  lessonId: '1-intro',
  mode: 'detailed',
  origin: 'own',
  title: 'What AI Is, in Detail',
  colabUrl: 'https://colab.research.google.com/github/ashishisme/AI-Learning-Mod/blob/cloud-beta/notebooks/1-intro.ipynb',
  sections: [
    { heading: 'What it is', bodyMarkdown: 'AI is **software** that learns patterns from [examples](https://example.org/examples).' },
    { heading: 'Worked example', bodyMarkdown: 'Sorting fruit by weight, step by step.' },
  ],
  goFurther: [
    { title: 'A free course', url: 'https://example.org/course', note: 'Short videos.' },
    { title: 'A glossary', url: 'https://example.org/glossary', note: 'Terms explained.' },
    { title: 'A paper', url: 'https://example.org/paper', note: 'For the curious.' },
  ],
}

test.describe('Detailed lessons (SPEC-013)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/runtime', (r) =>
      r.fulfill({ json: { hosted: false, authRequired: false, tutorEnabled: false, feedbackEnabled: false } })
    )
    await page.route('**/api/auth/session', (r) => r.fulfill({ json: { authenticated: false } }))
  })

  test('the Standard journey shows our Detailed lesson with Read section, Go further and our notebook', async ({ page }) => {
    await page.route('**/api/lessons/1-intro?mode=detailed*', (r) => r.fulfill({ json: detailed }))
    await page.goto('/lesson/1-intro')

    await expect(page.getByRole('heading', { name: 'What it is' })).toBeVisible()
    await expect(page.getByRole('button', { name: /read section/i })).toHaveCount(2)

    const links = page.getByTestId('go-further-link')
    await expect(links).toHaveCount(3)
    await expect(links.first()).toHaveAttribute('rel', 'noreferrer')

    const colab = page.getByTestId('colab-button')
    await expect(colab).toHaveAttribute('href', detailed.colabUrl)

    // SPEC-013 FR-017 (T040a): the journey chooser calls the Standard journey "Detailed"
    await expect(page.getByRole('tab', { name: /Detailed/ })).toHaveAttribute('aria-selected', 'true')
  })

  test('an own Detailed lesson never links to a notebook outside our repository', async ({ page }) => {
    await page.route('**/api/lessons/1-intro?mode=detailed*', (r) =>
      r.fulfill({ json: { ...detailed, colabUrl: 'https://colab.research.google.com/github/someone-else/x/blob/main/a.ipynb' } })
    )
    await page.goto('/lesson/1-intro')
    await expect(page.getByRole('heading', { name: 'What it is' })).toBeVisible()
    await expect(page.getByTestId('colab-button')).toHaveCount(0)
  })

  test('AC-69: Read section speaks its own heading and text, and a second section stops the first', async ({ page }) => {
    // A speech engine that records what it is asked to say and how often it is stopped.
    await page.addInitScript(() => {
      const w = window as any
      w.__said = [] as string[]
      w.__cancels = 0
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        writable: true,
        value: {
          speaking: false,
          // Sentences are spoken one at a time; while __flow is false each one stays "speaking".
          speak: (u: { text: string; onend?: () => void }) => {
            w.__said.push(u.text)
            if (w.__flow) setTimeout(() => u.onend?.(), 0)
          },
          cancel: () => { w.__cancels++ },
          pause: () => {},
          resume: () => {},
          getVoices: () => [{ name: 'Google US English', lang: 'en-US', default: true }],
        },
      })
      w.SpeechSynthesisUtterance = class { text: string; constructor(text: string) { this.text = text } }
    })
    await page.route('**/api/lessons/1-intro?mode=detailed*', (r) => r.fulfill({ json: detailed }))
    await page.goto('/lesson/1-intro')

    const sections = page.locator('article')
    // While the first section is still reading, starting the second stops it.
    await sections.nth(0).getByRole('button', { name: 'Read section' }).click()
    await expect(sections.nth(0).getByRole('button', { name: 'Stop reading section' })).toBeVisible()
    const cancels = (await page.evaluate(() => (window as any).__cancels)) as number
    await sections.nth(1).getByRole('button', { name: 'Read section' }).click()
    await expect(sections.nth(1).getByRole('button', { name: 'Stop reading section' })).toBeVisible()
    await expect(sections.nth(0).getByRole('button', { name: 'Read section' })).toBeVisible()
    expect(await page.evaluate(() => (window as any).__cancels)).toBeGreaterThan(cancels)
    await sections.nth(1).getByRole('button', { name: 'Stop reading section' }).click()

    // Read through, the first section speaks its heading and text without Markdown marks or links.
    await page.evaluate(() => { const w = window as any; w.__said = []; w.__flow = true })
    await sections.nth(0).getByRole('button', { name: 'Read section' }).click()
    const said = () => page.evaluate(() => (window as any).__said.join(' ') as string)
    await expect.poll(said).toContain('What it is. AI is software that learns patterns from examples.')
    expect(await said()).not.toMatch(/\*|https?:|Worked example/)
  })
})
