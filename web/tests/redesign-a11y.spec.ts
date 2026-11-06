// SPEC: SPEC-011 FR-014, SC-003, SC-005, DC-11
import { test, expect, Page } from '@playwright/test'

const LESSONS = ['1-intro', '2-symbolic', '3-neuralnetworks', '4-computervision', '5-nlp', '7-ethics']
const JOURNEYS: Array<'standard' | 'junior' | 'plain-english'> = ['junior', 'plain-english', 'standard']
const LANGS = ['en', 'hi']
const THEMES = ['light', 'dark']
const VIEWPORTS = [
  { width: 360, height: 740, name: 'phone' },
  { width: 1280, height: 900, name: 'desktop' },
]

async function setupPage(
  page: Page,
  opts: {
    mode: 'standard' | 'junior' | 'plain-english'
    lang: string
    theme: string
    reducedMotion?: boolean
  }
) {
  if (opts.reducedMotion) {
    await page.emulateMedia({ reducedMotion: 'reduce' })
  }
  await page.addInitScript(({ mode, lang, theme }) => {
    localStorage.setItem(
      'ai-foundations-audience-mode',
      JSON.stringify({ state: { mode, hasChosenJourney: true }, version: 1 })
    )
    localStorage.setItem(
      'ai-foundations-language',
      JSON.stringify({ state: { code: lang, chosenAt: '2026-11-04T00:00:00Z' }, version: 0 })
    )
    localStorage.setItem(
      'ai-foundations-theme',
      JSON.stringify({ state: { theme }, version: 0 })
    )
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, opts)
}

test.describe('Accessibility & Responsive Floor (SPEC-011 User Story 4)', () => {
  for (const vp of VIEWPORTS) {
    test(`Home page satisfies accessibility floor at ${vp.name} (${vp.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await setupPage(page, { mode: 'junior', lang: 'en', theme: 'light' })
      await page.goto('/')
      await expect(page.getByTestId('kids-home')).toBeVisible()

      const problems = await page.evaluate(() => {
        const issues: string[] = []
        if (document.documentElement.scrollWidth > document.documentElement.clientWidth) {
          issues.push('Page scrolls sideways')
        }
        for (const el of Array.from(document.querySelectorAll<HTMLElement>('button, a[href], select, input'))) {
          if (getComputedStyle(el).display === 'inline') continue
          const r = el.getBoundingClientRect()
          if (r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44)) {
            issues.push(`Small touch target (${Math.round(r.width)}x${Math.round(r.height)}): ${el.tagName} ${el.textContent?.trim().slice(0, 20)}`)
          }
          if (!el.matches('[aria-hidden="true"]') && !el.getAttribute('aria-label') && !el.textContent?.trim() && !(el as HTMLInputElement).placeholder) {
            issues.push(`Unlabelled control: ${el.tagName}`)
          }
        }
        return issues
      })
      expect(problems).toEqual([])
    })
  }

  test('Keyboard navigation and sticky header clearance', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await setupPage(page, { mode: 'junior', lang: 'en', theme: 'light' })
    await page.goto('/lesson/1-intro')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()

    // Tab through first 10 interactive controls
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab')
      const clearOfHeader = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null
        if (!el || el === document.body) return true
        const header = document.querySelector('header')
        if (header?.contains(el)) return true
        const r = el.getBoundingClientRect()
        // If element is scrolled behind fixed/sticky header (h=56px)
        return r.top >= 50 && r.bottom <= window.innerHeight
      })
      expect(clearOfHeader).toBe(true)
    }
  })

  for (const mode of JOURNEYS) for (const lang of LANGS) for (const theme of THEMES) {
    test(`All lesson text meets 4.5:1 in ${mode}, ${lang}, ${theme}`, async ({ page }) => {
      test.setTimeout(90000)
      await page.setViewportSize({ width: 1280, height: 900 })
      await setupPage(page, { mode, lang, theme })
      for (const lesson of LESSONS) {
        await page.goto(`/lesson/${lesson}`)
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()

        const contrastIssues = await page.evaluate(() => {
      function getRGB(str: string): [number, number, number] | null {
        const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
        return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null
      }

      function lum([r, g, b]: [number, number, number]): number {
        const a = [r, g, b].map((v) => {
          v /= 255
          return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
        })
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722
      }

      function getBgColor(el: HTMLElement | null): [number, number, number] {
        while (el) {
          const bg = getComputedStyle(el).backgroundColor
          const rgb = getRGB(bg)
          if (rgb && (bg.indexOf('rgba') === -1 || !bg.endsWith(', 0)'))) return rgb
          el = el.parentElement
        }
        return [255, 255, 255]
      }

      const issues: string[] = []
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      let node: Node | null

      while ((node = walker.nextNode())) {
        const text = node.textContent?.trim()
        if (!text || text.length < 2) continue
        // WCAG exemption: pure emoji/pictograms
        if (/^[\p{Extended_Pictographic}\p{Symbol}\uFE0F\u200D\s]+$/u.test(text)) continue

        const parent = node.parentElement
        if (!parent || parent.closest('[aria-hidden="true"], script, style')) continue

        const style = getComputedStyle(parent)
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < 0.1) continue

        const fg = getRGB(style.color)
        if (!fg) continue
        const bg = getBgColor(parent)

        const l1 = lum(fg)
        const l2 = lum(bg)
        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)

        const minRatio = 4.5 // Project constitution applies this floor to headings too.

        if (ratio < minRatio) {
          issues.push(`Contrast ${ratio.toFixed(2)}:1 < ${minRatio}:1 on "${text.slice(0, 25)}" (fg: ${style.color}, bg: rgb(${bg.join(',')}))`)
        }
      }
      return issues.slice(0, 5) // return first 5 if any
        })

        expect(contrastIssues, `${mode}, ${lang}, ${theme}, ${lesson}`).toEqual([])
      }
    })
  }

  test('Reduced motion preference disables continuous animations', async ({ page }) => {
    await setupPage(page, { mode: 'junior', lang: 'en', theme: 'light', reducedMotion: true })
    await page.goto('/')
    await expect(page.getByTestId('kids-home')).toBeVisible()

    const hasInfiniteAnimation = await page.evaluate(() => {
      for (const el of Array.from(document.querySelectorAll<HTMLElement>('.kids-cheer, .kids-hop, .animate-bounce'))) {
        const anim = getComputedStyle(el).animationIterationCount
        if (anim === 'infinite') return true
      }
      return false
    })
    expect(hasInfiniteAnimation).toBe(false)
  })
})
