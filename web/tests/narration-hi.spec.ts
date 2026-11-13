// SPEC: SPEC-009 FR-013 (device voices: the learner's language or none, never another language's voice)
import { test, expect, Page } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanForSpeech, sectionNarration } from '../src/services/narrationText'

const HI = { code: 'hi', name: 'हिन्दी', speechLang: 'hi-IN' }
const EN = { code: 'en', name: 'English', speechLang: 'en-US' }

// A fake speech engine: Chromium only accepts real SpeechSynthesisVoice objects, so the utterance is
// faked too. Every utterance is recorded with the voice and language it would be spoken in.
async function fakeSpeech(page: Page, voices: Array<{ name: string; lang: string }>) {
  await page.addInitScript((list) => {
    const spoken: Array<{ text: string; lang: string; voice: string }> = []
    ;(window as unknown as { __spoken: typeof spoken }).__spoken = spoken
    class Utterance {
      text: string; lang = ''; voice: { name: string } | null = null; pitch = 1; rate = 1; volume = 1
      onend: (() => void) | null = null; onerror: (() => void) | null = null
      constructor(text: string) { this.text = text }
    }
    const synth = {
      speaking: false, onvoiceschanged: null as null | (() => void),
      getVoices: () => list.map((v) => ({ ...v, default: false, localService: true, voiceURI: v.name })),
      speak(u: Utterance) {
        spoken.push({ text: u.text, lang: u.lang, voice: u.voice?.name ?? '' })
        setTimeout(() => u.onend?.(), 5)
      },
      cancel() {}, pause() {}, resume() {},
    }
    Object.defineProperty(window, 'speechSynthesis', { value: synth })
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance })
  }, voices)
}

// Hindi chosen and offered, and the Kids lesson served as Hindi with a two-sentence Devanagari section.
async function hindiLesson(page: Page) {
  await page.route('**/api/runtime', (r) => r.fulfill({ json: { hosted: false, authRequired: false, tutorEnabled: false, feedbackEnabled: false, languages: [EN, HI] } }))
  await page.addInitScript(() => {
    localStorage.setItem('ai-foundations-language', JSON.stringify({ state: { code: 'hi', chosenAt: '2026-11-03T00:00:00Z' }, version: 0 }))
    localStorage.setItem('ai-foundations-audience-mode', JSON.stringify({ state: { mode: 'junior' }, version: 0 }))
  })
  await page.route('**/api/lessons/1-intro?mode=junior**', async (r) => {
    const res = await r.fetch()
    const body = await res.json()
    body.sections[0].heading = 'एआई क्या है'
    body.sections[0].chipQuote = ''
    delete body.sections[0].bigIdea // banded Kids cards also read their big idea; this test checks sentence splitting only
    body.sections[0].bodyMarkdown = 'पहला वाक्य यहाँ है। दूसरा वाक्य यहाँ है।'
    await r.fulfill({ json: body, headers: { 'content-language': 'hi' } })
  })
  await page.goto('/lesson/1-intro')
}

// Labels in the UI language: Hindi once its catalogue exists, else the English fallback the app shows.
const catalogue = (code: string) => {
  const p = join(process.cwd(), 'src', 'i18n', `${code}.json`)
  return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as Record<string, string>) : {}
}
const en = catalogue('en')
const hi = { ...en, ...catalogue('hi') }

const spoken = (page: Page) => page.evaluate(() => (window as unknown as { __spoken: Array<{ text: string; lang: string; voice: string }> }).__spoken)
const readFirstSection = (page: Page, labels = hi) => page.getByRole('button', { name: labels['narration.readSection'] }).first().click()

test.describe('Hindi narration on device voices (B4 step A)', () => {
  test.beforeEach(async ({ page }) => {
    // Device voice tests test SpeechSynthesis fallback when no recorded audio track exists
    await page.route('**/api/audio/*/manifest.json', (r) => r.fulfill({ json: { tracks: {} } }))
  })

  test('a Hindi lesson is read by a Hindi voice, sentence by sentence at ।', async ({ page }) => {
    await fakeSpeech(page, [{ name: 'Samantha', lang: 'en-US' }, { name: 'Lekha', lang: 'hi-IN' }])
    await hindiLesson(page)
    await readFirstSection(page)
    await expect.poll(async () => (await spoken(page)).length).toBeGreaterThanOrEqual(3)
    const said = await spoken(page)
    expect(said.every((u) => u.voice === 'Lekha' && u.lang === 'hi-IN')).toBe(true)
    expect(said.map((u) => u.text)).toEqual(['एआई क्या है.', 'पहला वाक्य यहाँ है।', 'दूसरा वाक्य यहाँ है।'])
    await expect(page.getByRole('status').filter({ hasText: hi['narration.unavailable'] })).toHaveCount(0)
  })

  test('with no Hindi voice nothing is spoken and the learner is told why', async ({ page }) => {
    await fakeSpeech(page, [{ name: 'Samantha', lang: 'en-US' }, { name: 'Daniel', lang: 'en-GB' }])
    await hindiLesson(page)
    await readFirstSection(page)
    await expect(page.getByRole('status').filter({ hasText: hi['narration.unavailable'] })).toBeVisible()
    expect(await spoken(page)).toEqual([])
    // The button is usable again.
    await expect(page.getByRole('button', { name: hi['narration.readSection'] }).first()).toBeVisible()
  })

  test('a lesson that fell back to English is read by an English voice even in Hindi', async ({ page }) => {
    await fakeSpeech(page, [{ name: 'Samantha', lang: 'en-US' }, { name: 'Lekha', lang: 'hi-IN' }])
    await page.route('**/api/runtime', (r) => r.fulfill({ json: { hosted: false, authRequired: false, tutorEnabled: false, feedbackEnabled: false, languages: [EN, HI] } }))
    await page.addInitScript(() => {
      localStorage.setItem('ai-foundations-language', JSON.stringify({ state: { code: 'hi', chosenAt: '2026-11-03T00:00:00Z' }, version: 0 }))
      localStorage.setItem('ai-foundations-audience-mode', JSON.stringify({ state: { mode: 'junior' }, version: 0 }))
    })
    // Ask for the Kids lesson without the language, so the server answers in English as for a part that
    // is not translated yet.
    await page.route('**/api/lessons/1-intro?mode=junior**', async (r) => {
      const url = new URL(r.request().url())
      url.searchParams.delete('lang')
      await r.fulfill({ response: await r.fetch({ url: url.toString() }) })
    })
    await page.goto('/lesson/1-intro')
    await readFirstSection(page)
    await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(0)
    expect((await spoken(page)).every((u) => u.voice === 'Samantha' && u.lang === 'en-US')).toBe(true)
  })

  test('English learners hear English voices exactly as before', async ({ page }) => {
    await fakeSpeech(page, [{ name: 'Lekha', lang: 'hi-IN' }, { name: 'Samantha', lang: 'en-US' }])
    await page.addInitScript(() => localStorage.setItem('ai-foundations-audience-mode', JSON.stringify({ state: { mode: 'junior' }, version: 0 })))
    await page.goto('/lesson/1-intro')
    await readFirstSection(page, en)
    await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(0)
    expect((await spoken(page)).every((u) => u.voice === 'Samantha')).toBe(true)
  })
})

// Recorded narration (B4 step B). Media playback is stubbed: the test checks which file is asked for
// and that stop works, not the browser's MP3 decoder.
async function stubPlayer(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __played: string[]; __paused: number }
    w.__played = []
    w.__paused = 0
    HTMLMediaElement.prototype.play = function () { w.__played.push(this.src); return Promise.resolve() }
    HTMLMediaElement.prototype.pause = function () { w.__paused++ }
  })
}
const firstSectionId = () =>
  (JSON.parse(readFileSync(join(process.cwd(), '..', 'public-content', 'lessons', '1-intro.junior.json'), 'utf8')) as { sections: Array<{ id: string }> }).sections[0].id

test.describe('Hindi recorded narration (B4 step B)', () => {
  test('a recorded section plays its file in the chosen persona, and stop stops it', async ({ page }) => {
    await fakeSpeech(page, [{ name: 'Lekha', lang: 'hi-IN' }])
    await stubPlayer(page)
    const key = `1-intro/junior/section-${firstSectionId()}`
    let manifestAsked = 0
    await page.route('**/api/audio/hi/manifest.json', (r) => {
      manifestAsked++
      return r.fulfill({ json: { language: 'hi', tracks: { [key]: { chip: { file: `${key}-chip.mp3`, hash: 'h', bytes: 1 }, nova: { file: `${key}-nova.mp3`, hash: 'h', bytes: 1 } } } } })
    })
    // Hold the file request open: the player is stubbed, and a failed load would (rightly) fall back
    // to the device voice, which this test is not about.
    await page.route('**/api/audio/hi/**/*.mp3', () => {})
    await hindiLesson(page)
    await readFirstSection(page)
    await expect.poll(() => page.evaluate(() => (window as unknown as { __played: string[] }).__played)).toEqual([
      expect.stringMatching(new RegExp(`/api/audio/hi/${key}-chip\\.mp3$`)),
    ])
    expect(await spoken(page)).toEqual([]) // no device speech on top of the recording
    await page.getByRole('button', { name: hi['narration.stopSection'] }).first().click()
    expect(await page.evaluate(() => (window as unknown as { __paused: number }).__paused)).toBeGreaterThan(0)

    await readFirstSection(page)
    await expect.poll(() => page.evaluate(() => (window as unknown as { __played: string[] }).__played.length)).toBe(2)
    expect(manifestAsked).toBe(1) // the manifest is fetched once per language
  })

  test('a section without a recording falls back to the Hindi device voice', async ({ page }) => {
    await fakeSpeech(page, [{ name: 'Lekha', lang: 'hi-IN' }])
    await stubPlayer(page)
    await page.route('**/api/audio/hi/manifest.json', (r) => r.fulfill({ json: { language: 'hi', tracks: {} } }))
    await hindiLesson(page)
    await readFirstSection(page)
    await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(0)
    expect(await page.evaluate(() => (window as unknown as { __played: string[] }).__played)).toEqual([])
  })

  test('the browser builds narration text exactly like the recorder (shared fixture)', () => {
    const fixture = JSON.parse(readFileSync(join(process.cwd(), '..', 'content', 'fixtures', 'narration-text.json'), 'utf8')) as {
      sections: Array<{ heading: string; chipQuote: string; body: string; chipSays: string; want: string }>
    }
    for (const c of fixture.sections) {
      expect(cleanForSpeech(sectionNarration(c.heading, c.chipQuote, c.body, c.chipSays)), c.heading).toBe(c.want)
    }
  })
})
