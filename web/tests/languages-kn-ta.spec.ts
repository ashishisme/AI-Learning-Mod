// SPEC: SPEC-015 AC-84, FR-009, FR-I18N-10 (US1 Kannada); DC-11
import { test, expect, Page } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const EN = { code: 'en', name: 'English', speechLang: 'en-US' }
const KN = { code: 'kn', name: 'ಕನ್ನಡ', speechLang: 'kn-IN', beta: true }
const knUI = join(process.cwd(), 'src', 'i18n', 'kn.json')
const knLesson = (id: string, mode: string) => join(process.cwd(), '..', 'public-content', 'lang', 'kn', 'lessons', `${id}.${mode}.json`)

test.skip(!existsSync(knUI), 'needs web/src/i18n/kn.json (T016)')

// The runtime offers Kannada as a beta. The server keeps Kannada hidden until the owner approves it (T023), so
// until then the test serves the drafted Kannada lesson files itself, as the server will once it is listed.
async function offerKannada(page: Page, opts: { stored?: boolean } = { stored: true }) {
  await page.route('**/api/runtime', (r) => r.fulfill({ json: { hosted: false, authRequired: false, tutorEnabled: false, feedbackEnabled: false, languages: [EN, KN] } }))
  await page.route(/\/api\/lessons\/[^/?]+\?/, async (r) => {
    const u = new URL(r.request().url())
    const id = decodeURIComponent(u.pathname.split('/').pop() || '')
    const mode = u.searchParams.get('mode')
    const file = mode ? knLesson(id, mode) : ''
    if (u.searchParams.get('lang') !== 'kn' || !file || !existsSync(file)) return r.fallback()
    await r.fulfill({ body: readFileSync(file, 'utf8'), headers: { 'content-type': 'application/json', 'content-language': 'kn' } })
  })
  if (opts.stored) {
    await page.addInitScript(() => {
      if (!localStorage.getItem('ai-foundations-language')) {
        localStorage.setItem('ai-foundations-language', JSON.stringify({ state: { code: 'kn', chosenAt: '2026-11-18T00:00:00Z' }, version: 0 }))
      }
    })
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

test.describe('Kannada (SPEC-015 US1)', () => {
  test('the menu shows Kannada as a beta, and choosing it switches the page without a reload', async ({ page }) => {
    await offerKannada(page, { stored: false })
    await page.goto('/')
    const switcher = page.getByTestId('language-switcher').first()
    await expect(switcher.locator('option')).toHaveText(['English', 'ಕನ್ನಡ (beta)'])
    await page.evaluate(() => { (window as unknown as { marker: number }).marker = 1 })
    await switcher.selectOption('kn')
    await expect.poll(() => htmlLang(page), { timeout: 1000 }).toBe('kn')
    expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBe(1)
  })

  for (const journey of ['junior', 'plain-english', 'standard'] as const) {
    test(`a ${journey} lesson in Kannada has no not-translated notice and uses the Kannada font`, async ({ page }) => {
      const mode = journey === 'standard' ? 'detailed' : journey
      test.skip(!existsSync(knLesson('1-intro', mode)), `needs public-content/lang/kn/lessons/1-intro.${mode}.json (T018/T019)`)
      const fonts = fontRequests(page)
      await offerKannada(page)
      await openJourney(page, journey)
      await expect(page.getByTestId('not-translated-notice')).toHaveCount(0)
      await expect.poll(() => fonts.some((u) => /NotoSansKannada/.test(u))).toBe(true)
      expect(fonts.filter((u) => /NotoSans(Tamil|Devanagari)|BalooThambi/.test(u))).toEqual([])
    })
  }

  // Analysis G3, FR-009: the Kids journey draws Kannada in Baloo Tamma 2; the adult journeys never fetch it.
  test('a Kids lesson in Kannada uses Baloo Tamma 2, and a Plain English one does not', async ({ browser }) => {
    test.skip(!existsSync(knLesson('1-intro', 'junior')), 'needs the Kannada Kids lesson (T018)')
    const kids = await browser.newPage()
    const kidsFonts = fontRequests(kids)
    await offerKannada(kids)
    await openJourney(kids, 'junior')
    await expect.poll(() => kidsFonts.some((u) => /BalooTamma2/.test(u))).toBe(true)
    await kids.close()

    const plain = await browser.newPage()
    const plainFonts = fontRequests(plain)
    await offerKannada(plain)
    await openJourney(plain, 'plain-english')
    await plain.waitForTimeout(500)
    expect(plainFonts.filter((u) => /BalooTamma2/.test(u))).toEqual([])
    await plain.close()
  })

  // DC-11 at phone width: longer Kannada words must not push anything off screen or shrink a target.
  test('at 390 px nothing is wider than the screen and every button is at least 44 × 44', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await offerKannada(page)
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
