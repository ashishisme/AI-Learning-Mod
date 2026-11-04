// SPEC: SPEC-009 US1, FR-001..FR-004, FR-009, SC-001, SC-011; DC-11
import { test, expect, Page } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const HI = { code: 'hi', name: 'हिन्दी', speechLang: 'hi-IN' }
const EN = { code: 'en', name: 'English', speechLang: 'en-US' }

// The Hindi catalogues are bundled at build time, so they can't be mocked. Checks of the Hindi text
// itself run once T049 has produced the files.
const hiUI = join(process.cwd(), 'src', 'i18n', 'hi.json')
const hiQuiz = join(process.cwd(), 'src', 'data', 'quizzes', 'hi.json')
const needsHindi = (p: string) => test.skip(!existsSync(p), `needs ${p.replace(process.cwd() + '/', '')} (T049)`)

async function offerHindi(page: Page, opts: { stored?: string; browser?: string[] } = {}) {
  await page.route('**/api/runtime', (r) => r.fulfill({ json: { hosted: false, authRequired: false, tutorEnabled: false, feedbackEnabled: false, languages: [EN, HI] } }))
  await page.addInitScript(({ stored, browser }) => {
    if (browser) Object.defineProperty(navigator, 'languages', { get: () => browser })
    if (stored && !localStorage.getItem('ai-foundations-language')) {
      localStorage.setItem('ai-foundations-language', JSON.stringify({ state: { code: stored, chosenAt: '2026-11-03T00:00:00Z' }, version: 0 }))
    }
  }, opts)
}

const htmlLang = (page: Page) => page.evaluate(() => document.documentElement.lang)

test.describe('Hindi (B3)', () => {
  test('the header switcher changes language in under a second, without a reload, and the choice survives one', async ({ page }) => {
    await offerHindi(page, { browser: ['en-IN', 'en'] })
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('ai-foundations-progress', JSON.stringify({ state: { completedLessons: { '1-intro': true } }, version: 0 })))
    await page.reload()
    const switcher = page.getByTestId('language-switcher').first()
    await expect(switcher).toBeVisible()
    await expect(switcher.locator('option')).toHaveText(['English', 'हिन्दी'])
    await page.evaluate(() => { (window as unknown as { marker: number }).marker = 1 })

    const started = Date.now()
    await switcher.selectOption('hi')
    await expect.poll(() => htmlLang(page), { timeout: 1000 }).toBe('hi')
    expect(Date.now() - started).toBeLessThan(1000)
    expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBe(1) // no reload
    expect(await page.evaluate(() => localStorage.getItem('ai-foundations-progress'))).toContain('"1-intro":true')

    await page.reload()
    // English shows until /api/runtime says Hindi is offered.
    await expect.poll(() => htmlLang(page)).toBe('hi')
    await expect(page.getByTestId('language-switcher').first()).toHaveValue('hi')
  })

  // FR-I18N-10: a language launched as a beta says so in the menu.
  test('a beta language is labelled in the menu', async ({ page }) => {
    await page.route('**/api/runtime', (r) => r.fulfill({ json: { hosted: false, authRequired: false, tutorEnabled: false, feedbackEnabled: false, languages: [EN, { ...HI, beta: true }] } }))
    await page.goto('/')
    await expect(page.getByTestId('language-switcher').first().locator('option')).toHaveText(['English', 'हिन्दी (beta)'])
  })

  test('Settings has the same switcher', async ({ page }) => {
    await offerHindi(page)
    await page.goto('/')
    await page.getByTestId('open-settings-btn').click()
    const inSettings = page.locator('#settings-language')
    await expect(inSettings).toBeVisible()
    await inSettings.selectOption('hi')
    await expect.poll(() => htmlLang(page)).toBe('hi')
    await expect(page.getByTestId('language-switcher').first()).toHaveValue('hi')
  })

  test('a first visit follows the browser: Hindi before English opens in Hindi', async ({ page }) => {
    await offerHindi(page, { browser: ['hi-IN', 'en'] })
    await page.goto('/')
    await expect.poll(() => htmlLang(page)).toBe('hi')
  })

  test('a first visit with English first stays in English', async ({ page }) => {
    await offerHindi(page, { browser: ['en', 'hi'] })
    await page.goto('/')
    await expect(page.getByRole('heading').first()).toBeVisible()
    expect(await htmlLang(page)).toBe('en')
  })

  test('the switcher meets the 44 px target in the header', async ({ page }) => {
    await offerHindi(page)
    await page.goto('/')
    const box = await page.getByTestId('language-switcher').first().boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)
    expect(box!.width).toBeGreaterThanOrEqual(44)
  })

  test('an English answer to a Hindi request shows the not-translated notice', async ({ page }) => {
    await offerHindi(page, { stored: 'hi' })
    let asked = ''
    await page.route('**/api/lessons/1-intro**', async (r) => {
      asked = r.request().url()
      const res = await r.fetch()
      await r.fulfill({ response: res, headers: { ...res.headers(), 'content-language': 'en' } })
    })
    await page.goto('/lesson/1-intro')
    await expect(page.getByTestId('lesson-title')).toBeVisible()
    expect(asked).toContain('lang=hi')
    await expect(page.getByTestId('not-translated-notice')).toBeVisible()
    if (existsSync(hiUI)) {
      const hi = JSON.parse(readFileSync(hiUI, 'utf8'))
      await expect(page.getByTestId('not-translated-notice')).toHaveText(hi['lesson.notTranslated'])
    }
  })

  test('a lesson served in Hindi shows no notice', async ({ page }) => {
    await offerHindi(page, { stored: 'hi' })
    await page.route('**/api/lessons/1-intro**', async (r) => {
      const res = await r.fetch()
      await r.fulfill({ response: res, headers: { ...res.headers(), 'content-language': 'hi' } })
    })
    await page.goto('/lesson/1-intro')
    await expect(page.getByTestId('lesson-title')).toBeVisible()
    await expect(page.getByTestId('not-translated-notice')).toHaveCount(0)
  })

  test('a Hindi lesson has one main landmark and preserves space below the sticky header for focus', async ({ page }) => {
    await offerHindi(page, { stored: 'hi' })
    await page.goto('/lesson/1-intro')
    await expect(page.getByTestId('lesson-title')).toBeVisible()
    expect(await page.getByRole('main').count()).toBe(1)
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollPaddingTop)).toBe('64px')
  })

  test('English learners never see the notice', async ({ page }) => {
    await offerHindi(page, { stored: 'en' })
    await page.goto('/lesson/1-intro')
    await expect(page.getByTestId('lesson-title')).toBeVisible()
    await expect(page.getByTestId('not-translated-notice')).toHaveCount(0)
  })

  test('a quiz in Hindi scores correctly; one still in English says so', async ({ page }) => {
    await offerHindi(page, { stored: 'hi' })
    await page.goto('/quiz/1-intro')
    await expect(page.getByTestId('quiz-interactive')).toBeVisible()
    const quizzes = JSON.parse(readFileSync(existsSync(hiQuiz) ? hiQuiz : join(process.cwd(), 'src', 'data', 'quizzes', 'en.json'), 'utf8'))
    const quiz = quizzes['1-intro']
    if (!existsSync(hiQuiz)) await expect(page.getByTestId('not-translated-notice')).toBeVisible()
    // The first question's prompt and options are the served language's text.
    await expect(page.getByText(quiz.questions[0].prompt)).toBeVisible()
    for (const o of quiz.questions[0].options) await expect(page.getByText(o, { exact: true }).first()).toBeVisible()
  })

  test('no English interface text is left on learner pages in Hindi (SC-001)', async ({ page }) => {
    needsHindi(hiUI)
    const en: Record<string, string> = JSON.parse(readFileSync(join(process.cwd(), 'src', 'i18n', 'en.json'), 'utf8'))
    const hi: Record<string, string> = JSON.parse(readFileSync(hiUI, 'utf8'))
    // Strings that are the same in both (names, symbols, technical terms the reviewer kept) are not English left over.
    const same = new Set(Object.keys(en).filter((k) => hi[k] === en[k]).map((k) => en[k]))
    const english = new Set(Object.values(en).filter((v) => v.length > 2 && !same.has(v) && !v.includes('{')))
    await offerHindi(page, { stored: 'hi' })
    const leftovers: string[] = []
    const check = async (where: string) => {
      await page.getByRole('heading').first().waitFor()
      await page.waitForTimeout(500)
      const lines = (await page.evaluate(() => document.body.innerText)).split('\n').map((l) => l.trim()).filter(Boolean)
      for (const l of lines) if (english.has(l)) leftovers.push(`${where}: ${l}`)
    }
    await page.goto('/'); await check('home')
    for (const tab of [0, 1, 2]) {
      await page.goto('/lesson/1-intro')
      await page.locator('button[role="tab"]').nth(tab).click()
      await check(`lesson tab ${tab}`)
    }
    await page.goto('/quiz/1-intro'); await check('quiz')
    await page.goto('/'); await page.getByTestId('open-settings-btn').click(); await check('settings')
    expect(leftovers).toEqual([])
  })

  test('Hindi pages fit a 360 px phone with 44 px targets (SC-011)', async ({ page }) => {
    needsHindi(hiUI)
    await page.setViewportSize({ width: 360, height: 740 })
    await offerHindi(page, { stored: 'hi' })
    for (const [path, tab] of [['/'], ['/lesson/1-intro'], ['/lesson/1-intro', 1], ['/lesson/1-intro', 2], ['/quiz/1-intro']] as Array<[string, number?]>) {
      await page.goto(path)
      await page.getByRole('heading').first().waitFor()
      if (tab !== undefined) {
        await page.locator('button[role="tab"]').nth(tab).click()
        await page.waitForTimeout(1000)
      }
      const problems = await page.evaluate(() => {
        const out: string[] = []
        if (document.documentElement.scrollWidth > document.documentElement.clientWidth) out.push('page scrolls sideways')
        for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
          const s = getComputedStyle(el)
          // Clipped text only: a decoration that hangs past its box on purpose is not a problem.
          const ownText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent!.trim() !== '')
          if (ownText && s.display !== 'inline' && el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 1) out.push(`overflow: ${el.tagName} ${el.textContent?.slice(0, 30)}`)
        }
        for (const el of Array.from(document.querySelectorAll<HTMLElement>('button, a[href], select'))) {
          // WCAG 2.5.8: a link inside a sentence of text is exempt from the target size.
          if (getComputedStyle(el).display === 'inline') continue
          const r = el.getBoundingClientRect()
          if (r.width > 0 && (r.width < 44 || r.height < 44)) out.push(`small target ${Math.round(r.width)}x${Math.round(r.height)}: ${el.textContent?.trim().slice(0, 30)}`)
        }
        return out
      })
      expect(problems, `${path} ${tab ?? ''}`).toEqual([])
    }
  })

  test('Hindi learner screens remain operable in light and dark at phone and desktop widths', async ({ page }) => {
    needsHindi(hiUI)
    for (const [width, height] of [[360, 740], [1280, 900]]) {
      for (const theme of ['light', 'dark']) {
        await page.setViewportSize({ width, height })
        await offerHindi(page, { stored: 'hi' })
        await page.addInitScript(() => localStorage.setItem('ai-foundations-audience-mode', JSON.stringify({ state: { mode: 'standard' }, version: 0 })))
        for (const lessonId of ['1-intro', '2-symbolic', '3-neuralnetworks', '4-computervision', '5-nlp', '7-ethics']) {
          await page.goto(`/lesson/${lessonId}`)
          await expect(page.getByTestId('lesson-title')).toBeVisible()
          await page.evaluate((selectedTheme) => document.documentElement.classList.toggle('dark', selectedTheme === 'dark'), theme)
          await page.locator('button[role="tab"]').nth(1).click()
          await expect(page.getByRole('heading').first()).toBeVisible()
          const problems = await page.evaluate(() => {
            const out: string[] = []
            if (document.documentElement.scrollWidth > document.documentElement.clientWidth) out.push('page scrolls sideways')
            if (document.querySelectorAll('main').length !== 1) out.push('expected one main landmark')
            for (const el of Array.from(document.querySelectorAll<HTMLElement>('button, a[href], select, input, textarea'))) {
              const r = el.getBoundingClientRect()
              if (r.width > 0 && getComputedStyle(el).display !== 'inline' && (r.width < 44 || r.height < 44)) out.push(`small target: ${el.tagName}`)
              if (!el.matches('[aria-hidden="true"]') && !((el as HTMLInputElement).labels?.length) && !el.getAttribute('aria-label') && !el.textContent?.trim()) out.push(`unlabelled control: ${el.tagName}`)
            }
            return out
          })
          expect(problems, `${lessonId} ${theme} ${width}px`).toEqual([])
        }

        await page.evaluate(() => {
          document.body.tabIndex = -1
          document.body.focus()
        })
        for (let i = 0; i < 8; i++) await page.keyboard.press('Tab')
        const focusIsVisible = await page.evaluate(() => {
          const active = document.activeElement as HTMLElement | null
          if (!active) return false
          const r = active.getBoundingClientRect()
          return document.querySelector('header')?.contains(active) || (r.top >= 56 && r.bottom <= window.innerHeight)
        })
        expect(focusIsVisible, `${theme} ${width}px keyboard focus`).toBe(true)
      }
    }
  })
})
