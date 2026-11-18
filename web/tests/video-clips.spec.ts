// SPEC: AC-80 (FR-UI-28, FR-CNT-13 amended 2.17.0); SPEC-014 clarifications 2026-11-15
import { test, expect, Page } from '@playwright/test'
import { join } from 'node:path'

const video = join(process.cwd(), 'public', 'brand', 'videos', 'turing-test.webm')
const poster = join(process.cwd(), 'public', 'brand', 'videos', 'turing-test-poster.jpg')
// Default cues are 0, 3.5, 6.5, 9.8 and 13 s. Caption 1 has 10 words: a muted hold of 10 / 2.5 + 1 = 5 s.
const captions = [
  'A judge types questions to two hidden partners and waits to see.',
  'One partner is a person.',
  'The other partner is a machine.',
  'The judge reads both answers.',
  'The judge cannot tell which is which.',
]

const lesson = {
  lessonId: 'video-test',
  mode: 'detailed',
  origin: 'own',
  title: 'Video Lesson',
  sections: [
    {
      id: 'idea',
      heading: 'The idea',
      bodyMarkdown: 'A judge talks to two partners.',
      diagram: { type: 'clip', clip: 'test-video', media: 'video', caption: 'Watch the test', alt: 'A judge cannot tell a person from a machine.', steps: captions },
    },
    { id: 'more', heading: 'More', bodyMarkdown: 'Another section with text to read.' },
  ],
}

// A speech engine that records what it says. While __flow is false a sentence keeps "speaking" until __end().
async function fakeSpeech(page: Page) {
  await page.addInitScript(() => {
    const w = window as any
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
        getVoices: () => [{ name: 'Google US English', lang: 'en-US', default: true }],
      },
    })
    w.SpeechSynthesisUtterance = class { text: string; constructor(text: string) { this.text = text } }
  })
}

async function open(page: Page, { broken = false } = {}) {
  const media: string[] = []
  page.on('request', (r) => { if (/test-video\.(webm|mp4)/.test(r.url())) media.push(r.url()) })
  await page.route('**/api/runtime', (r) => r.fulfill({ json: { hosted: false, authRequired: false, tutorEnabled: false, feedbackEnabled: false } }))
  await page.route('**/api/auth/session', (r) => r.fulfill({ json: { authenticated: false } }))
  await page.route('**/brand/videos/test-video-poster.jpg', (r) => r.fulfill({ path: poster, contentType: 'image/jpeg' }))
  await page.route('**/brand/videos/test-video.webm', (r) => (broken ? r.fulfill({ status: 404, body: '' }) : r.fulfill({ path: video, contentType: 'video/webm' })))
  await page.route('**/brand/videos/test-video.mp4', (r) => r.fulfill({ status: 404, body: '' }))
  await page.route('**/api/lessons/video-test?*', (r) => r.fulfill({ json: lesson }))
  await page.goto('/lesson/video-test')
  await expect(page.getByTestId('video-clip')).toBeVisible()
  return media
}

const v = (page: Page) => page.getByTestId('video-clip')
const paused = (page: Page) => page.getByTestId('video-element').evaluate((el) => (el as HTMLVideoElement).paused)
const now = (page: Page) => page.getByTestId('video-element').evaluate((el) => (el as HTMLVideoElement).currentTime)
const said = (page: Page) => page.evaluate(() => (window as any).__said as string[])

test.describe('Video clips (SPEC-014, 2026-11-15)', () => {
  test('AC-80: the poster shows first and no video is downloaded before Play', async ({ page }) => {
    await fakeSpeech(page)
    const media = await open(page)
    await expect(page.getByTestId('video-element')).toHaveAttribute('poster', '/brand/videos/test-video-poster.jpg')
    await expect(v(page).getByTestId('video-step')).toHaveText('Step 1 of 5')
    await page.waitForTimeout(800)
    expect(media).toEqual([])
    expect(await said(page)).toEqual([])
    const describedBy = await v(page).getAttribute('aria-describedby')
    await expect(page.locator(`[id="${describedBy}"]`)).toHaveText(lesson.sections[0].diagram!.alt)
  })

  test('AC-80: the video holds at the end of a cue until its caption has been read, then carries on', async ({ page }) => {
    await fakeSpeech(page)
    await open(page)
    await v(page).getByTestId('video-play').click()
    await expect.poll(() => said(page)).toEqual([captions[0]])
    // Cue 1 ends at 3.5 s; the caption is still being read, so the video waits on cue 1's last frame.
    await page.waitForTimeout(4500)
    await expect(v(page).getByTestId('video-step')).toHaveText('Step 1 of 5')
    expect(await paused(page)).toBe(true)
    expect(await now(page)).toBeLessThan(3.5)
    await expect(v(page).getByTestId('video-play')).toHaveText(/Pause/)
    await page.evaluate(() => (window as any).__end())
    await expect(v(page).getByTestId('video-step')).toHaveText('Step 2 of 5', { timeout: 3000 })
    await expect.poll(() => said(page)).toContain(captions[1])
    await expect.poll(() => paused(page)).toBe(false)
  })

  test('AC-80 (regression): a caption finishing does not pause the video', async ({ page }) => {
    await fakeSpeech(page)
    await page.addInitScript(() => { (window as any).__flow = true })
    await open(page)
    await v(page).getByTestId('video-play').click()
    await expect.poll(() => said(page)).toContain(captions[0])
    const t1 = await now(page)
    await page.waitForTimeout(1200)
    expect(await paused(page)).toBe(false)
    expect(await now(page)).toBeGreaterThan(t1)
    await expect(v(page).getByTestId('video-play')).toHaveText(/Pause/)
  })

  test('AC-80: when muted, a cue holds for its caption reading time', async ({ page }) => {
    await fakeSpeech(page)
    await open(page)
    await v(page).getByTestId('video-mute').click()
    await expect(v(page).getByTestId('video-mute')).toHaveAttribute('aria-pressed', 'true')
    await v(page).getByTestId('video-play').click()
    // Caption 1 holds for 5 s, beyond the 3.5 s cue.
    await page.waitForTimeout(4200)
    await expect(v(page).getByTestId('video-step')).toHaveText('Step 1 of 5')
    await expect(v(page).getByTestId('video-step')).toHaveText('Step 2 of 5', { timeout: 4000 })
    expect(await said(page)).toEqual([])
  })

  test('AC-80: Read section pauses a playing video', async ({ page }) => {
    await fakeSpeech(page)
    await open(page)
    await v(page).getByTestId('video-play').click()
    await expect(v(page).getByTestId('video-play')).toHaveText(/Pause/)
    await page.locator('article').nth(1).getByRole('button', { name: 'Read section' }).click()
    await expect(v(page).getByTestId('video-play')).toHaveText(/Play/)
    await expect.poll(() => paused(page)).toBe(true)
  })

  test('AC-80: under reduced motion there is no Play; Next shows the cue still and reads it once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await fakeSpeech(page)
    await open(page)
    await expect(v(page).getByTestId('video-play')).toHaveCount(0)
    await expect(v(page).getByTestId('video-overlay')).toHaveCount(0)
    await v(page).getByTestId('video-next').click()
    await expect(v(page).getByTestId('video-step')).toHaveText('Step 2 of 5')
    await expect(v(page).getByTestId('video-caption')).toHaveText(captions[1])
    await expect.poll(() => said(page)).toEqual([captions[1]])
    expect(await paused(page)).toBe(true)
    await v(page).getByTestId('video-cue-4').click()
    await expect(v(page).getByTestId('video-caption')).toHaveText(captions[3])
  })

  test('AC-80: the speed control changes the picture speed only', async ({ page }) => {
    await fakeSpeech(page)
    await open(page)
    await v(page).getByTestId('video-speed').click()
    await expect(v(page).getByTestId('video-speed')).toHaveText('1.25×')
    await v(page).getByTestId('video-play').click()
    await expect.poll(() => page.getByTestId('video-element').evaluate((el) => (el as HTMLVideoElement).playbackRate)).toBe(1.25)
  })

  test('AC-80: every control is at least 44×44 and reachable by keyboard; Previous keeps focus at cue 1', async ({ page }) => {
    await fakeSpeech(page)
    await open(page)
    for (const id of ['video-play', 'video-prev', 'video-next', 'video-speed', 'video-mute', 'video-cue-1', 'video-cue-5']) {
      const box = await v(page).getByTestId(id).boundingBox()
      expect(box!.height, id).toBeGreaterThanOrEqual(44)
      expect(box!.width, id).toBeGreaterThanOrEqual(44)
    }
    await v(page).getByTestId('video-next').focus()
    await page.keyboard.press('Enter')
    await expect(v(page).getByTestId('video-step')).toHaveText('Step 2 of 5')
    await page.keyboard.press('Shift+Tab')
    await expect(v(page).getByTestId('video-prev')).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(v(page).getByTestId('video-step')).toHaveText('Step 1 of 5')
    await expect(v(page).getByTestId('video-prev')).toBeFocused()
    await expect(v(page).getByTestId('video-prev')).toHaveAttribute('aria-disabled', 'true')
  })

  test('AC-80: a video that cannot play falls back to the poster and the captions', async ({ page }) => {
    await fakeSpeech(page)
    await open(page, { broken: true })
    await v(page).getByTestId('video-play').click()
    await expect(v(page).getByTestId('video-fallback').locator('li')).toHaveText(captions)
    await expect(v(page).getByTestId('video-fallback-poster')).toBeVisible()
  })
})
