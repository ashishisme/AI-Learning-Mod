// SPEC: SPEC-015 AC-84, FR-009, FR-I18N-10 (US1 Kannada, US2 Tamil T025); DC-11
import { test, expect, Page } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const EN = { code: 'en', name: 'English', speechLang: 'en-US' }
type Lang = { code: string; name: string; speechLang: string; english: string; font: RegExp; kidsFont: RegExp | null; others: RegExp }
const LANGS: Lang[] = [
  { code: 'kn', name: 'ಕನ್ನಡ', speechLang: 'kn-IN', english: 'Kannada', font: /NotoSansKannada/, kidsFont: /BalooTamma2/, others: /NotoSans(Tamil|Devanagari)|BalooThambi/ },
  { code: 'ta', name: 'தமிழ்', speechLang: 'ta-IN', english: 'Tamil', font: /NotoSansTamil/, kidsFont: /BalooThambi2/, others: /NotoSans(Kannada|Devanagari)|BalooTamma/ },
  // SPEC-018: Marathi uses Noto Sans Devanagari in every journey, Kids included (Baloo 2 is Latin-only), so it has no Kids-only font.
  { code: 'mr', name: 'मराठी', speechLang: 'mr-IN', english: 'Marathi', font: /NotoSansDevanagari/, kidsFont: null, others: /NotoSans(Kannada|Tamil)|BalooT/ },
  { code: 'te', name: 'తెలుగు', speechLang: 'te-IN', english: 'Telugu', font: /NotoSansTelugu/, kidsFont: /BalooTammudu2/, others: /NotoSans(Kannada|Tamil|Devanagari)|BalooT(amma2|hambi)/ },
]
const uiFile = (code: string) => join(process.cwd(), 'src', 'i18n', `${code}.json`)
const lessonFile = (code: string, id: string, mode: string) => join(process.cwd(), '..', 'public-content', 'lang', code, 'lessons', `${id}.${mode}.json`)

// The runtime offers the language as a beta. The server keeps a language hidden until the owner approves it, so
// until then the test serves the drafted lesson files itself, as the server will once it is listed.
async function offer(L: Lang, page: Page, opts: { stored?: boolean; feedback?: boolean } = { stored: true }) {
  const lang = { code: L.code, name: L.name, speechLang: L.speechLang, beta: true }
  const fb = opts.feedback === true // SPEC-016 T018: signed in with feedback on, so the report links and beta note show
  await page.route('**/api/runtime', (r) => r.fulfill({ json: { hosted: fb, authRequired: fb, tutorEnabled: false, feedbackEnabled: fb, languages: [EN, lang] } }))
  if (fb) await page.route('**/api/auth/session', (r) => r.fulfill({ json: { authenticated: true, betaId: 'BETA-7KQ3-M9XP', label: 'School A', expiresAt: '2027-01-01T08:30:00Z', daysLeft: 61, expiringSoon: false } }))
  await page.route(/\/api\/lessons\/[^/?]+\?/, async (r) => {
    const u = new URL(r.request().url())
    const id = decodeURIComponent(u.pathname.split('/').pop() || '')
    const mode = u.searchParams.get('mode')
    const file = mode ? lessonFile(L.code, id, mode) : ''
    if (u.searchParams.get('lang') !== L.code || !file || !existsSync(file)) return r.fallback()
    await r.fulfill({ body: readFileSync(file, 'utf8'), headers: { 'content-type': 'application/json', 'content-language': L.code } })
  })
  if (opts.stored) {
    await page.addInitScript((code) => {
      if (!localStorage.getItem('ai-foundations-language')) {
        localStorage.setItem('ai-foundations-language', JSON.stringify({ state: { code, chosenAt: '2026-11-18T00:00:00Z' }, version: 0 }))
      }
    }, L.code)
  }
}

const htmlLang = (page: Page) => page.evaluate(() => document.documentElement.lang)
const fontRequests = (page: Page) => {
  const urls: string[] = []
  page.on('request', (r) => { if (/\.woff2/.test(r.url())) urls.push(r.url()) })
  return urls
}

async function openJourney(page: Page, journey: 'junior' | 'plain-english' | 'standard', id = '1-intro') {
  await page.goto(`/lesson/${id}`)
  await expect(page.getByTestId('lesson-title')).toBeVisible()
  if (journey !== 'standard') {
    const loaded = page.waitForResponse((r) => r.url().includes(`/api/lessons/${id}?mode=${journey}`))
    await page.getByTestId(`journey-tab-${journey}`).click()
    await loaded
  }
  await page.waitForTimeout(300)
}

for (const L of LANGS) test.describe(`${L.english} (SPEC-015)`, () => {
  test.skip(!existsSync(uiFile(L.code)), `needs web/src/i18n/${L.code}.json`)

  test(`the menu shows ${L.english} as a beta, and choosing it switches the page without a reload`, async ({ page }) => {
    await offer(L, page, { stored: false })
    await page.goto('/')
    const switcher = page.getByTestId('language-switcher').first()
    await expect(switcher.locator('option')).toHaveText(['English', `${L.name} (beta)`])
    await page.evaluate(() => { (window as unknown as { marker: number }).marker = 1 })
    await switcher.selectOption(L.code)
    await expect.poll(() => htmlLang(page), { timeout: 1000 }).toBe(L.code)
    expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBe(1)
  })

  for (const journey of ['junior', 'plain-english', 'standard'] as const) {
    test(`a ${journey} lesson in ${L.english} has no not-translated notice and uses the ${L.english} font`, async ({ page }) => {
      const mode = journey === 'standard' ? 'detailed' : journey
      test.skip(!existsSync(lessonFile(L.code, '1-intro', mode)), `needs public-content/lang/${L.code}/lessons/1-intro.${mode}.json`)
      const fonts = fontRequests(page)
      await offer(L, page)
      await openJourney(page, journey)
      await expect(page.getByTestId('not-translated-notice')).toHaveCount(0)
      await expect.poll(() => fonts.some((u) => L.font.test(u))).toBe(true)
      expect(fonts.filter((u) => L.others.test(u))).toEqual([])
    })
  }

  // Analysis G3, FR-009: the Kids journey draws the script in its Baloo font; the adult journeys never fetch it.
  test(`a Kids lesson in ${L.english} uses its Baloo font, and a Plain English one does not`, async ({ browser }) => {
    test.skip(!existsSync(lessonFile(L.code, '1-intro', 'junior')), `needs the ${L.english} Kids lesson`)
    test.skip(L.kidsFont === null, `${L.english} has no Kids-only font`)
    const kidsFont = L.kidsFont as RegExp
    const kids = await browser.newPage()
    const kidsFonts = fontRequests(kids)
    await offer(L, kids)
    await openJourney(kids, 'junior')
    await expect.poll(() => kidsFonts.some((u) => kidsFont.test(u))).toBe(true)
    await kids.close()

    const plain = await browser.newPage()
    const plainFonts = fontRequests(plain)
    await offer(L, plain)
    await openJourney(plain, 'plain-english')
    await plain.waitForTimeout(500)
    expect(plainFonts.filter((u) => kidsFont.test(u))).toEqual([])
    await plain.close()
  })

  // Tablet and desktop, signed in with feedback on: no header item is squeezed below its text, and the
  // header wraps to at most two rows instead of overlapping (owner report 2026-11-21, Tamil header).
  for (const width of [768, 1024, 1280]) test(`at ${width} px the header items never overlap or spill`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await offer(L, page, { stored: true, feedback: true })
    await page.goto('/lesson/4-computervision')
    await expect(page.getByTestId('lesson-title')).toBeVisible()
    const r = await page.evaluate(() => {
      const spills: string[] = []
      for (const el of Array.from(document.querySelectorAll('header a, header button, header select, header span'))) {
        const e = el as HTMLElement
        if (e.offsetWidth && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX === 'visible') spills.push((e.textContent || '').trim().slice(0, 20))
      }
      return { spills, height: document.querySelector('header')!.getBoundingClientRect().height }
    })
    expect(r.spills).toEqual([])
    expect(r.height).toBeLessThanOrEqual(120)
  })

  // DC-11 at phone width: longer words must not push anything off screen or shrink a target.
  test('at 390 px nothing is wider than the screen and every button is at least 44 × 44', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await offer(L, page, { stored: true, feedback: true })
    const problems: string[] = []
    const check = async (where: string) => {
      await page.getByRole('heading').first().waitFor()
      await page.waitForTimeout(400)
      problems.push(...(await page.evaluate((where) => {
        const out: string[] = []
        const vw = document.documentElement.clientWidth
        if (document.documentElement.scrollWidth > vw + 1) out.push(`${where}: the page scrolls sideways (${document.documentElement.scrollWidth} > ${vw})`)
        const scrolls = (el: Element | null): boolean => {
          for (let p = el?.parentElement; p; p = p.parentElement) {
            if (/(auto|scroll|hidden)/.test(getComputedStyle(p).overflowX)) return true
          }
          return false
        }
        const name = (el: Element) => `${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40)}"`
        for (const el of Array.from(document.querySelectorAll('body *'))) {
          const r = el.getBoundingClientRect()
          if (r.width > vw + 1 && !scrolls(el)) out.push(`${where}: ${name(el)} is ${Math.round(r.width)} px wide`)
        }
        for (const el of Array.from(document.querySelectorAll('button, [role="button"]'))) {
          const r = el.getBoundingClientRect()
          const style = getComputedStyle(el)
          if (r.width === 0 || r.height === 0 || style.visibility === 'hidden') continue
          if (r.width < 43.5 || r.height < 43.5) out.push(`${where}: ${name(el)} is ${Math.round(r.width)}×${Math.round(r.height)}`)
        }
        return out
      }, where)))
    }
    await page.goto('/'); await check('home')
    for (const journey of ['junior', 'plain-english', 'standard'] as const) {
      await openJourney(page, journey)
      await check(`lesson ${journey}`)
    }
    await page.goto('/quiz/1-intro'); await check('quiz')
    await page.goto('/'); await page.getByTestId('open-settings-btn').click(); await check('settings')
    await page.goto('/'); await page.getByTestId('open-help-btn').click(); await check('help')
    expect(problems).toEqual([])
  })
})
