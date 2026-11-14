// SPEC: AC-76, AC-78 (FR-UI-28); SPEC-014 US1, US3, SC-003, SC-004, SC-006
import { test, expect, Page } from '@playwright/test'
import { join } from 'node:path'

const svg = join(process.cwd(), 'tests', 'fixtures', 'clips', 'test-clip.svg')
const first = ['Two kinds of fruit wait.', 'A first line splits them.', 'One pear sits wrong now.', 'The line tilts and sorts.']
const second = ['Pixels hold small numbers.', 'A filter slides across them.', 'Edges light up brightly here.']

const lesson = {
  lessonId: 'clip-test',
  mode: 'detailed',
  origin: 'own',
  title: 'Clip Lesson',
  sections: [
    {
      id: 'learn',
      heading: 'How it learns',
      bodyMarkdown: 'The line learns.',
      diagram: { type: 'clip', clip: 'test-clip', caption: 'Watch the line learn', alt: 'A line tilts until the fruit is sorted.', steps: first },
    },
    {
      id: 'filter',
      heading: 'How a filter works',
      bodyMarkdown: 'The filter slides.',
      diagram: { type: 'clip', clip: 'test-clip', caption: 'Watch the filter', alt: 'A filter slides over pixels.', steps: second },
    },
  ],
}

// A speech engine that records what it is asked to say. While __flow is false a sentence keeps "speaking"
// until the test calls __end(); with __flow true each one ends at once.
async function fakeSpeech(page: Page, { none = false } = {}) {
  await page.addInitScript((none) => {
    const w = window as any
    if (none) {
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined })
      w.SpeechSynthesisUtterance = undefined
      return
    }
    w.__said = [] as string[]
    w.__pending = [] as Array<() => void>
    w.__flow = false
    w.__end = () => w.__pending.splice(0).forEach((f: () => void) => f())
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      writable: true,
      value: {
        speaking: false,
        speak: (u: { text: string; onend?: () => void }) => {
          w.__said.push(u.text)
          const end = () => u.onend?.()
          if (w.__flow) setTimeout(end, 0)
          else w.__pending.push(end)
        },
        cancel: () => { w.__pending = [] },
        pause: () => {},
        resume: () => {},
        getVoices: () => [
          { name: 'Google US English', lang: 'en-US', default: true },
          { name: 'Google हिन्दी', lang: 'hi-IN', default: false },
        ],
      },
    })
    w.SpeechSynthesisUtterance = class { text: string; constructor(text: string) { this.text = text } }
  }, none)
}

const said = (page: Page) => page.evaluate(() => ((window as any).__said ?? []) as string[])

async function open(page: Page, { tutor = false, hindi = false, brokenDrawing = false } = {}) {
  await page.route('**/api/runtime', (r) =>
    r.fulfill({
      json: {
        hosted: false, authRequired: false, tutorEnabled: tutor, feedbackEnabled: false,
        ...(hindi ? { languages: [{ code: 'en', name: 'English', speechLang: 'en-US' }, { code: 'hi', name: 'हिन्दी', speechLang: 'hi-IN' }] } : {}),
      },
    })
  )
  await page.route('**/api/auth/session', (r) => r.fulfill({ json: { authenticated: false } }))
  await page.route('**/brand/clips/test-clip.svg', (r) =>
    brokenDrawing ? r.fulfill({ status: 404, body: '' }) : r.fulfill({ path: svg, contentType: 'image/svg+xml' })
  )
  await page.route('**/api/lessons/clip-test?*', (r) => r.fulfill({ json: lesson, headers: { 'content-language': hindi ? 'hi' : 'en' } }))
  await page.goto('/lesson/clip-test')
  await expect(page.getByTestId('clip')).toHaveCount(2)
}

const clip = (page: Page, n = 0) => page.getByTestId('clip').nth(n)

test.describe('Concept clips (SPEC-014)', () => {
  test('AC-76: a clip shows step 1 still, with its caption, counter and description, and says nothing before Play', async ({ page }) => {
    await fakeSpeech(page)
    await open(page)
    const c = clip(page)
    await expect(c.getByTestId('clip-image')).toHaveAttribute('src', '/brand/clips/test-clip.svg#s1')
    await expect(c.getByTestId('clip-caption')).toHaveText(first[0])
    await expect(c.getByTestId('clip-step')).toHaveText('Step 1 of 4')
    const describedBy = await c.getAttribute('aria-describedby')
    await expect(page.locator(`[id="${describedBy}"]`)).toHaveText(lesson.sections[0].diagram.alt)
    await page.waitForTimeout(500)
    expect(await said(page)).toEqual([])
  })

  test('AC-76: Play reads a step and moves on; Pause holds; Play resumes from that step', async ({ page }) => {
    await fakeSpeech(page)
    await open(page)
    const c = clip(page)
    await c.getByTestId('clip-play').click()
    await expect(c.getByTestId('clip-play')).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(() => said(page)).toEqual([first[0]])
    // AC-78: the next step waits until its caption has been read.
    await page.waitForTimeout(2500)
    await expect(c.getByTestId('clip-step')).toHaveText('Step 1 of 4')
    await page.evaluate(() => (window as any).__end())
    await expect(c.getByTestId('clip-step')).toHaveText('Step 2 of 4')
    await expect(c.getByTestId('clip-image')).toHaveAttribute('src', /#s2$/)
    await expect(c.getByTestId('clip-caption')).toHaveText(first[1])

    await c.getByTestId('clip-play').click() // pause
    await expect(c.getByTestId('clip-play')).toHaveAttribute('aria-pressed', 'false')
    await page.evaluate(() => (window as any).__end())
    await page.waitForTimeout(2500)
    await expect(c.getByTestId('clip-step')).toHaveText('Step 2 of 4')

    await c.getByTestId('clip-play').click() // resume
    await expect.poll(async () => (await said(page)).at(-1)).toBe(first[1])
  })

  test('AC-76: Next and Previous show that step and read it once; Play again restarts from the end', async ({ page }) => {
    await fakeSpeech(page)
    await open(page)
    const c = clip(page)
    await c.getByTestId('clip-next').click()
    await expect(c.getByTestId('clip-caption')).toHaveText(first[1])
    await expect.poll(async () => (await said(page)).at(-1)).toBe(first[1])
    await c.getByTestId('clip-prev').click()
    await expect(c.getByTestId('clip-caption')).toHaveText(first[0])
    await expect(c.getByTestId('clip-prev')).toBeDisabled()

    await page.evaluate(() => { (window as any).__flow = true })
    await c.getByTestId('clip-play').click()
    await expect(c.getByTestId('clip-replay')).toBeVisible({ timeout: 15000 })
    await expect(c.getByTestId('clip-step')).toHaveText('Step 4 of 4')
    await c.getByTestId('clip-replay').click()
    await expect(c.getByTestId('clip-image')).toHaveAttribute('src', /#s1$/)
    await expect(c.getByTestId('clip-play')).toHaveAttribute('aria-pressed', 'true')
  })

  test('AC-76 (SC-004): under reduced motion there is no Play, and Next reaches every caption', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await fakeSpeech(page)
    await open(page)
    const c = clip(page)
    await expect(c.getByTestId('clip-play')).toHaveCount(0)
    for (let i = 1; i < first.length; i++) {
      await c.getByTestId('clip-next').click()
      await expect(c.getByTestId('clip-caption')).toHaveText(first[i])
    }
    await expect(c.getByTestId('clip-replay')).toHaveCount(0)
  })

  test('AC-76 (SC-003): every control is at least 44 by 44 and reachable by keyboard', async ({ page }) => {
    await fakeSpeech(page)
    await open(page)
    const c = clip(page)
    for (const id of ['clip-play', 'clip-prev', 'clip-next', 'clip-mute']) {
      const box = await c.getByTestId(id).boundingBox()
      expect(box!.width, id).toBeGreaterThanOrEqual(44)
      expect(box!.height, id).toBeGreaterThanOrEqual(44)
    }
    await c.getByTestId('clip-play').focus()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab') // Previous is disabled on step 1, so Tab moves to Next
    await expect(c.getByTestId('clip-mute')).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(c.getByTestId('clip-next')).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(c.getByTestId('clip-step')).toHaveText('Step 2 of 4')
  })

  test('AC-76: when the drawing fails to load, the captions are shown as text', async ({ page }) => {
    await fakeSpeech(page)
    await open(page, { brokenDrawing: true })
    await expect(clip(page).getByTestId('clip-fallback').locator('li')).toHaveText(first)
  })

  test('AC-78 (SC-006): Read section and another clip each pause a playing clip', async ({ page }) => {
    await fakeSpeech(page)
    await open(page)
    const c = clip(page)
    await c.getByTestId('clip-play').click()
    await expect(c.getByTestId('clip-play')).toHaveAttribute('aria-pressed', 'true')
    await page.locator('article').nth(1).getByRole('button', { name: 'Read section' }).click()
    await expect(c.getByTestId('clip-play')).toHaveAttribute('aria-pressed', 'false')

    await c.getByTestId('clip-play').click()
    await expect(c.getByTestId('clip-play')).toHaveAttribute('aria-pressed', 'true')
    await clip(page, 1).getByTestId('clip-play').click()
    await expect(clip(page, 1).getByTestId('clip-play')).toHaveAttribute('aria-pressed', 'true')
    await expect(c.getByTestId('clip-play')).toHaveAttribute('aria-pressed', 'false')
    await expect.poll(async () => (await said(page)).at(-1)).toBe(second[0])
  })

  test('AC-78 (SC-006): the tutor reading an answer pauses a playing clip', async ({ page }) => {
    await fakeSpeech(page)
    await page.route('**/api/tutor', (r) =>
      r.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: 'data: {"token":"A line learns. [Clip Lesson § How it learns]"}\n\ndata: {"done":true,"cited":true}\n\ndata: [DONE]\n\n',
      })
    )
    await open(page, { tutor: true })
    const c = clip(page)
    await page.getByTestId('tutor-input').fill('How does the line learn?')
    await page.getByTestId('tutor-submit').click()
    await expect(page.getByTestId('tutor-read-answer-btn')).toBeVisible()
    await c.getByTestId('clip-play').click()
    await expect(c.getByTestId('clip-play')).toHaveAttribute('aria-pressed', 'true')
    await page.getByTestId('tutor-read-answer-btn').click()
    await expect(c.getByTestId('clip-play')).toHaveAttribute('aria-pressed', 'false')
  })

  test('AC-78: Mute keeps every clip muted while it still moves', async ({ page }) => {
    await fakeSpeech(page)
    await open(page)
    await clip(page).getByTestId('clip-mute').click()
    await expect(clip(page).getByTestId('clip-mute')).toHaveAttribute('aria-pressed', 'true')
    const two = clip(page, 1)
    await expect(two.getByTestId('clip-mute')).toHaveAttribute('aria-pressed', 'true')
    await two.getByTestId('clip-play').click()
    await expect(two.getByTestId('clip-step')).toHaveText('Step 2 of 3', { timeout: 8000 })
    expect(await said(page)).toEqual([])
  })

  test('AC-78: with no speech on the device the clip still plays, with no error', async ({ page }) => {
    await fakeSpeech(page, { none: true })
    await open(page)
    const c = clip(page)
    await c.getByTestId('clip-play').click()
    await expect(c.getByTestId('clip-step')).toHaveText('Step 2 of 4', { timeout: 8000 })
    await expect(page.getByText(/error|unavailable/i)).toHaveCount(0)
  })

  test('AC-78: a Hindi clip asks for its step recording', async ({ page }) => {
    await fakeSpeech(page)
    await page.addInitScript(() => {
      localStorage.setItem('ai-foundations-language', JSON.stringify({ state: { code: 'hi', chosenAt: '2026-11-14T00:00:00Z' }, version: 0 }))
    })
    const file = 'clip-test/detailed/section-learn-clip-1'
    await page.route('**/api/audio/hi/manifest.json', (r) =>
      r.fulfill({ json: { tracks: { [file]: { chip: { file: 'a.mp3' }, nova: { file: 'a.mp3' }, alan: { file: 'a.mp3' } } } } })
    )
    let asked = false
    await page.route('**/api/audio/hi/a.mp3', (r) => { asked = true; return r.fulfill({ status: 404, body: '' }) })
    await open(page, { hindi: true })
    await clip(page).getByTestId('clip-play').click()
    await expect.poll(() => asked).toBe(true)
  })
})
